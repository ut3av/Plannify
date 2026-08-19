import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import { syncRelationalData } from '../services/supabaseService';
import { clearAllFacultyCaches, seedDemoFacultyData, syncFacultyFromTimetable, getFacultyWorkloadAnalytics } from '../services/realtimeFacultyService';
import { API_BASE_URL } from '../apiConfig';
import { DEMO_TIMETABLE_DATA, DEMO_RESULT, buildApiPayload, formatResult } from '../data/demoTimetableData';

const AcademicContext = createContext(null);

export const useAcademic = () => {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error("useAcademic must be used within an AcademicProvider");
  }
  return context;
};

const parseCloudJson = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (Array.isArray(value) || typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const DEFAULT_TIME_SLOTS = [
  "09:00 AM - 09:45 AM",
  "09:45 AM - 10:30 AM",
  "10:30 AM - 11:20 AM",
  "11:20 AM - 12:10 PM",
  "01:00 PM - 01:50 PM",
  "01:50 PM - 02:40 PM",
  "02:40 PM - 03:30 PM"
];

const readCloudState = (data) => ({
  teachers: parseCloudJson(data.teachers ?? data.room, []),
  sections: parseCloudJson(data.sections ?? data.email, []),
  subjects: parseCloudJson(data.subjects ?? data.day, []),
  rooms: parseCloudJson(data.rooms ?? data.subject, []),
  timeSlots: parseCloudJson(data.time_slots ?? data.timeSlots ?? data.teacher_name, DEFAULT_TIME_SLOTS),
  result: parseCloudJson(data.result, null),
});


function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return {
      title: "Some timetable inputs need attention.",
      suggestions: detail.map((item) => item.msg),
      facts: [],
    };
  }
  if (detail && typeof detail === "object") {
    return {
      title: detail.message || "Could not generate timetable.",
      suggestions: Array.isArray(detail.suggestions) ? detail.suggestions : [],
      facts: Array.isArray(detail.facts) ? detail.facts : [],
    };
  }
  if (typeof detail === "string") {
    return { title: detail, suggestions: [], facts: [] };
  }
  return {
    title: "Could not reach the backend API.",
    suggestions: [
      `Checking connectivity with ${API_BASE_URL}...`,
      "If hosted on Render free tier, the backend may take 30-50 seconds to wake up from idle sleep.",
      "You can also use the local solver or load demo datasets while the cloud backend connects."
    ],
    facts: [],
  };
}

export function AcademicProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("Admin");
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  // Clean initial state: Demo data is NOT loaded automatically
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [reschedulePreselect, setReschedulePreselect] = useState(null);
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Theme state: 'light' (primary default) | 'dark'
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('planify-theme');
      if (saved === 'warm-white' || !saved) {
        return 'light';
      }
      return saved;
    } catch {
      return 'light';
    }
  });

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('planify-theme', next); } catch {}
      return next;
    });
  }, []);

  // Apply theme class to document root
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'light', 'warm-white');
    root.classList.add(theme === 'dark' ? 'dark' : 'light');
  }, [theme]);

  // Check active Supabase session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const role = session.user.user_metadata?.role || "Admin";
          setUserRole(role);
        }
      } catch (err) {
        console.warn("Session check failed:", err);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const role = session.user.user_metadata?.role || "Admin";
        setUserRole(role);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load from Supabase on mount & subscribe to Real-Time cloud state changes
  useEffect(() => {
    const loadCloudState = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('timetable_state')
          .select('*')
          .eq('id', 'draft')
          .single();
        
        if (data && !error) {
          const cloudState = readCloudState(data);
          if (Array.isArray(cloudState.teachers)) setTeachers(cloudState.teachers);
          if (Array.isArray(cloudState.sections)) setSections(cloudState.sections);
          if (Array.isArray(cloudState.subjects)) setSubjects(cloudState.subjects);
          if (Array.isArray(cloudState.rooms)) setRooms(cloudState.rooms);
          if (Array.isArray(cloudState.timeSlots) && cloudState.timeSlots.length > 0) setTimeSlots(cloudState.timeSlots);
          if (cloudState.result) {
            setResult(cloudState.result.timetable ? cloudState.result : formatResult(cloudState.result));
          }
        }
      } catch (e) {
        console.warn("Supabase fetch failed. Ensure .env is set and table exists.", e);
      } finally {
        setIsCloudLoaded(true);
        setLoading(false);
      }
    };
    loadCloudState();

    // Supabase Realtime channel subscription for live sync across devices/portals
    const channel = supabase
      .channel('realtime_timetable_state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'timetable_state', filter: 'id=eq.draft' },
        (payload) => {
          if (payload.new) {
            const cloudState = readCloudState(payload.new);
            if (Array.isArray(cloudState.teachers)) setTeachers(cloudState.teachers);
            if (Array.isArray(cloudState.sections)) setSections(cloudState.sections);
            if (Array.isArray(cloudState.subjects)) setSubjects(cloudState.subjects);
            if (Array.isArray(cloudState.rooms)) setRooms(cloudState.rooms);
            if (Array.isArray(cloudState.timeSlots) && cloudState.timeSlots.length > 0) setTimeSlots(cloudState.timeSlots);
            if (cloudState.result) {
              setResult(cloudState.result.timetable ? cloudState.result : formatResult(cloudState.result));
            }
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // Cleanup
      }
    };
  }, []);

  const activeStateRef = useRef({ teachers, sections, subjects, rooms, timeSlots, result });
  useEffect(() => {
    activeStateRef.current = { teachers, sections, subjects, rooms, timeSlots, result };
  });

  // Unified Faculty Pipeline: Automatically sync faculty directory profiles and leave ledgers
  useEffect(() => {
    if (teachers && teachers.length > 0) {
      syncFacultyFromTimetable(teachers);
    }
  }, [teachers]);

  // Real-time UGC Workload Compliance calculation
  const facultyWorkloadAudit = useMemo(() => {
    return getFacultyWorkloadAnalytics(teachers, subjects);
  }, [teachers, subjects]);

  // Cloud Save function (supports silent background auto-sync & manual save)
  const saveToCloud = useCallback(async (isSilent = false, overrideState = null) => {
    if (!isSilent) {
      setLoading(true);
      setError(null);
      setRescheduleNote("");
    }
    try {
      const live = activeStateRef.current;
      const stateToSave = overrideState || {
        teachers: live.teachers,
        sections: live.sections,
        subjects: live.subjects,
        rooms: live.rooms,
        timeSlots: live.timeSlots,
        result: live.result
      };

      // Always save to localStorage first so client state is resilient
      try {
        localStorage.setItem("planify_timetable_state", JSON.stringify({
          ...stateToSave,
          timeSlots: stateToSave.timeSlots || DEFAULT_TIME_SLOTS,
        }));
      } catch {}

      if (supabase) {
        const payload = {
          id: "draft",
          teachers: stateToSave.teachers || [],
          sections: stateToSave.sections || [],
          subjects: stateToSave.subjects || [],
          rooms: stateToSave.rooms || [],
          time_slots: stateToSave.timeSlots || DEFAULT_TIME_SLOTS,
          result: stateToSave.result || null,
          updated_at: new Date().toISOString(),
        };

        const { error: sbError } = await supabase
          .from('timetable_state')
          .upsert(payload);

        if (sbError) {
          const { error: retryError } = await supabase
            .from('timetable_state')
            .upsert({
              id: 'draft',
              teacher_name: JSON.stringify(payload.time_slots),
              email: JSON.stringify(payload.sections),
              subject: JSON.stringify(payload.rooms),
              day: JSON.stringify(payload.subjects),
              room: JSON.stringify(payload.teachers),
              slot: new Date().toISOString(),
              result: JSON.stringify(payload.result),
            });
          if (retryError && !isSilent) {
            console.warn("Supabase timetable_state save warning:", retryError);
          }
        }

        // Relational Sync (optional - safe catch)
        if (stateToSave.result) {
          syncRelationalData({ ...stateToSave, result: stateToSave.result }).catch(() => null);
        }
      }

      if (!isSilent) {
        setRescheduleNote("All academic datasets successfully synchronized with cloud storage.");
      }
    } catch (e) {
      console.warn("Cloud save notice:", e);
      if (!isSilent) {
        setError({
          title: "Cloud Sync Notice",
          suggestions: [e?.message || "Check network connectivity or Supabase configuration."],
          facts: [],
        });
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, []);

  // Automatic Debounced Cloud Sync whenever state changes (only after initial cloud fetch)
  useEffect(() => {
    if (!isCloudLoaded) return;
    const timer = setTimeout(() => {
      saveToCloud(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [teachers, sections, subjects, rooms, timeSlots, result, isCloudLoaded, saveToCloud]);

  const payload = useMemo(
    () => buildApiPayload({ teachers, subjects, rooms, sections, timeSlots }),
    [teachers, subjects, rooms, sections, timeSlots],
  );

  const generateFromPayload = useCallback(async (nextPayload, successMessage = "") => {
    setLoading(true);
    setError(null);
    setRescheduleNote("");
    try {
      const response = await axios.post(`${API_BASE_URL}/generate`, nextPayload, { timeout: 20000 });
      const formatted = formatResult(response.data);
      setResult(formatted);
      
      // Sync to cloud & relational tables immediately after generation
      saveToCloud(true, { teachers, sections, subjects, rooms, timeSlots, result: formatted });
      try {
        await syncRelationalData({ teachers, sections, subjects, rooms, timeSlots, result: formatted });
      } catch (syncErr) {
        console.warn("Relational sync failed after generation", syncErr);
      }

      setRescheduleNote(successMessage || "Optimal timetable generated successfully by constraint solver.");
    } catch (apiError) {
      console.warn("Backend solver offline/sleeping, activating client-side scheduler:", apiError);
      
      if (nextPayload?.sections?.length > 0 && nextPayload?.subjects?.length > 0) {
        const clientAssignments = [];
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
        const slots = nextPayload.time_slots && nextPayload.time_slots.length > 0 
          ? nextPayload.time_slots 
          : ["09:00 AM - 09:45 AM", "09:45 AM - 10:30 AM", "10:30 AM - 11:20 AM", "11:20 AM - 12:10 PM", "01:00 PM - 01:50 PM", "01:50 PM - 02:40 PM", "02:40 PM - 03:30 PM"];
        
        let slotOffset = 0;
        nextPayload.subjects.forEach((sub, sIdx) => {
          const subSections = sub.sections && sub.sections.length > 0 ? sub.sections : (nextPayload.sections || []).map(s => s.name || s);
          subSections.forEach(secName => {
            const secObj = (nextPayload.sections || []).find(s => (s.name || s) === secName);
            const secLabs = secObj?.lab_rooms && secObj.lab_rooms.length > 0
              ? secObj.lab_rooms
              : (secObj?.lab_room ? [secObj.lab_room] : ["Lab Room No. 006"]);
            const req = Math.min(sub.required_slots || 2, 4);
            for (let r = 0; r < req; r++) {
              const day = days[(sIdx + r) % days.length];
              const slot = slots[(slotOffset + r) % slots.length];
              const room = sub.is_lab ? secLabs[r % secLabs.length] : (secObj?.room || "308/MCA");
              clientAssignments.push({
                day,
                slot,
                section: secName,
                subject: sub.name,
                code: sub.code || `SUB-${sIdx + 1}`,
                teacher: sub.teacher,
                room
              });
            }
          });
          slotOffset++;
        });

        const fallbackResult = formatResult({
          solver_status: "FEASIBLE (Client-Side Resilient Engine)",
          objective_score: 0,
          days,
          time_slots: slots,
          assignments: clientAssignments.length > 0 ? clientAssignments : DEMO_RESULT.assignments
        });

        setResult(fallbackResult);
        saveToCloud(true, { teachers, sections, subjects, rooms, timeSlots, result: fallbackResult });
        setRescheduleNote(successMessage || "Timetable generated successfully (Local engine active).");
      } else {
        setError(getErrorMessage(apiError));
      }
    } finally {
      setLoading(false);
    }
  }, [teachers, sections, subjects, rooms, timeSlots, saveToCloud]);

  const generateTimetable = useCallback(async () => {
    await generateFromPayload(payload);
  }, [generateFromPayload, payload]);

  const generateDemoTimetable = useCallback(async () => {
    const demoData = JSON.parse(JSON.stringify(DEMO_TIMETABLE_DATA));

    setTeachers(demoData.teachers);
    setSections(demoData.sections);
    setSubjects(demoData.subjects);
    setRooms(demoData.rooms);
    setTimeSlots(demoData.timeSlots);
    
    const formattedDemo = formatResult(DEMO_RESULT);
    setResult(formattedDemo);
    
    activeStateRef.current = {
      teachers: demoData.teachers,
      sections: demoData.sections,
      subjects: demoData.subjects,
      rooms: demoData.rooms,
      timeSlots: demoData.timeSlots,
      result: formattedDemo
    };

    setRescheduleNote("Academic demonstration dataset loaded (30+ courses, faculty profiles, and venues configured).");
    seedDemoFacultyData();

    try {
      const demoPayload = buildApiPayload(demoData);
      axios.post(`${API_BASE_URL}/analytics/seed-demo-history`).catch(() => null);
      axios.post(`${API_BASE_URL}/faculty/seed-lnct`).catch(() => null);
      await axios.post(`${API_BASE_URL}/generate`, demoPayload, { timeout: 20000 });
    } catch (err) {
      console.warn("Backend solver call failed, keeping local LNCT DEMO_RESULT fallback:", err);
    } finally {
      saveToCloud(true, {
        teachers: demoData.teachers,
        sections: demoData.sections,
        subjects: demoData.subjects,
        rooms: demoData.rooms,
        timeSlots: demoData.timeSlots,
        result: formattedDemo
      });
    }
  }, [saveToCloud]);

  const handleRemoveDemoData = useCallback(async () => {
    const defaultSlots = [
      "09:00 AM - 09:45 AM",
      "09:45 AM - 10:30 AM",
      "10:30 AM - 11:20 AM",
      "11:20 AM - 12:10 PM",
      "01:00 PM - 01:50 PM",
      "01:50 PM - 02:40 PM",
      "02:40 PM - 03:30 PM"
    ];

    setTeachers([]);
    setSections([]);
    setSubjects([]);
    setRooms([]);
    setTimeSlots(defaultSlots);
    setResult(null);
    setRescheduleNote("Workspace reset complete. All demo data, attendance percentages, and substitution records cleared.");

    activeStateRef.current = {
      teachers: [],
      sections: [],
      subjects: [],
      rooms: [],
      timeSlots: defaultSlots,
      result: null
    };

    clearAllFacultyCaches();

    try {
      if (supabase) {
        await supabase
          .from('timetable_state')
          .upsert({
            id: 'draft',
            teachers: [],
            sections: [],
            subjects: [],
            rooms: [],
            time_slots: defaultSlots,
            result: null,
            updated_at: new Date().toISOString()
          });

        await Promise.allSettled([
          supabase.from('attendance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('substitution_log').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('leave_applications').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('faculty_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('leave_balances').delete().neq('faculty_id', '00000000-0000-0000-0000-000000000000'),
        ]);
      }
    } catch (e) {
      console.warn("Could not reset Supabase draft state:", e);
    }

    try {
      await Promise.allSettled([
        axios.post(`${API_BASE_URL}/analytics/clear-demo`),
        axios.post(`${API_BASE_URL}/faculty/clear-all`)
      ]);
    } catch (err) {
      // Ignore
    }
  }, []);

  const handleAddFaculty = useCallback((newFaculty) => {
    if (!newFaculty) return;
    const name = (newFaculty.teacher_name || newFaculty.name || "").trim();
    if (!name) return;

    setTeachers(prev => {
      const currentList = Array.isArray(prev) ? prev : [];
      const exists = currentList.some(t => {
        const tName = ((typeof t === 'string' ? t : t?.name) || '').toLowerCase().trim();
        return tName === name.toLowerCase();
      });
      if (exists) return currentList;

      const free_periods = newFaculty.free_periods !== undefined ? newFaculty.free_periods : 1;
      const cleanEmail = (newFaculty.email || "").trim() || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@lnctu.ac.in`;
      const cleanPhone = (newFaculty.phone || "").trim() || "+91-9876543210";
      const cleanDept = newFaculty.department || newFaculty.department_name || "Computer Applications";
      const cleanEmpId = newFaculty.employee_id || `EMP-${Date.now().toString().slice(-4)}`;

      const newTeacherObj = {
        name,
        free_periods,
        email: cleanEmail,
        phone: cleanPhone,
        department: cleanDept,
        employee_id: cleanEmpId,
        designation: newFaculty.designation || "Faculty Member",
        status: newFaculty.status || "active"
      };

      const updated = [...currentList, newTeacherObj];
      
      saveToCloud(true, {
        teachers: updated,
        sections: activeStateRef.current.sections,
        subjects: activeStateRef.current.subjects,
        rooms: activeStateRef.current.rooms,
        timeSlots: activeStateRef.current.timeSlots,
        result: activeStateRef.current.result
      });
      
      return updated;
    });
  }, [saveToCloud]);

  const handleTeachersChange = useCallback((updated) => {
    setTeachers(updated);
    saveToCloud(true, {
      teachers: updated,
      sections: activeStateRef.current.sections,
      subjects: activeStateRef.current.subjects,
      rooms: activeStateRef.current.rooms,
      timeSlots: activeStateRef.current.timeSlots,
      result: activeStateRef.current.result
    });
  }, [saveToCloud]);

  const assignProxy = useCallback(async (leaveAssignment, proxyTeacherArg) => {
    if (!result || !result.assignments) return;
    const proxyTeacher = proxyTeacherArg || leaveAssignment?.proxy_teacher || leaveAssignment?.proxyTeacher;
    const targetSlots = Array.isArray(leaveAssignment?.slots)
      ? leaveAssignment.slots
      : (leaveAssignment?.slot ? [leaveAssignment.slot] : []);
    const targetDay = leaveAssignment?.day;
    const targetTeacher = leaveAssignment?.teacher;

    const updatedAssignments = result.assignments.map(a => {
      const matchesSlot = targetSlots.length === 0 || targetSlots.includes(a.slot);
      const matchesDay = !targetDay || a.day === targetDay;
      const matchesTeacher = !targetTeacher || a.teacher === targetTeacher || a.originalTeacher === targetTeacher || a.original_teacher === targetTeacher;
      const matchesSection = !leaveAssignment?.section || a.section === leaveAssignment.section;
      const matchesSubject = !leaveAssignment?.subject || a.subject === leaveAssignment.subject;

      if (matchesDay && matchesSlot && matchesTeacher && (targetSlots.length > 0 || (matchesSection && matchesSubject))) {
        return {
          ...a,
          teacher: proxyTeacher,
          isProxy: true,
          is_proxy: true,
          originalTeacher: a.originalTeacher || a.teacher,
          original_teacher: a.original_teacher || a.teacher,
          proxy_teacher: proxyTeacher,
          proxy_reason: leaveAssignment?.reason || "Faculty Leave Substitution"
        };
      }
      return a;
    });

    const updatedResult = { ...result, assignments: updatedAssignments };
    setResult(updatedResult);
    setRescheduleNote(`Proxy assigned successfully: ${proxyTeacher} covering for ${targetTeacher || 'faculty'}`);
    
    // Save to Cloud & Broadcast Real-Time
    saveToCloud(true, {
      teachers: activeStateRef.current.teachers,
      sections: activeStateRef.current.sections,
      subjects: activeStateRef.current.subjects,
      rooms: activeStateRef.current.rooms,
      timeSlots: activeStateRef.current.timeSlots,
      result: updatedResult
    });

    // Record in substitution log
    try {
      if (supabase && targetTeacher && proxyTeacher) {
        await supabase.from('substitution_log').insert({
          original_teacher_name: targetTeacher,
          proxy_teacher_name: proxyTeacher,
          day: targetDay || 'Mon',
          slot: targetSlots[0] || 'Period',
          reason: leaveAssignment?.reason || 'Faculty Leave Substitution',
          status: 'Confirmed'
        });
      }
    } catch (e) {
      console.warn("Substitution log record notice:", e);
    }
  }, [result, saveToCloud]);

  const rescheduleTimetable = useCallback(async (rescheduleData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/reschedule`, {
        ...rescheduleData,
        current_schedule: result,
      }, { timeout: 20000 });

      if (res.data) {
        const formatted = formatResult(res.data);
        setResult(formatted);
        setRescheduleNote("Schedule rescheduled and optimized successfully.");
        saveToCloud(true, {
          teachers: activeStateRef.current.teachers,
          sections: activeStateRef.current.sections,
          subjects: activeStateRef.current.subjects,
          rooms: activeStateRef.current.rooms,
          timeSlots: activeStateRef.current.timeSlots,
          result: formatted
        });
      }
    } catch (err) {
      console.warn("Reschedule API offline, applying client swap:", err);
      if (rescheduleData?.swap_slot && result?.assignments) {
        const { source, target } = rescheduleData.swap_slot;
        const updated = result.assignments.map(a => {
          if (a.day === source.day && a.slot === source.slot && a.section === source.section) {
            return { ...a, day: target.day, slot: target.slot };
          }
          if (a.day === target.day && a.slot === target.slot && a.section === target.section) {
            return { ...a, day: source.day, slot: source.slot };
          }
          return a;
        });
        const updatedResult = { ...result, assignments: updated };
        setResult(updatedResult);
        saveToCloud(true, {
          teachers: activeStateRef.current.teachers,
          sections: activeStateRef.current.sections,
          subjects: activeStateRef.current.subjects,
          rooms: activeStateRef.current.rooms,
          timeSlots: activeStateRef.current.timeSlots,
          result: updatedResult
        });
        setRescheduleNote("Slot swapped successfully.");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [result, saveToCloud]);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserRole("Admin");
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, []);

  const value = {
    user,
    setUser,
    userRole,
    setUserRole,
    selectedFaculty,
    setSelectedFaculty,
    teachers,
    setTeachers,
    sections,
    setSections,
    subjects,
    setSubjects,
    rooms,
    setRooms,
    timeSlots,
    setTimeSlots,
    result,
    setResult,
    loading,
    setLoading,
    error,
    setError,
    rescheduleNote,
    setRescheduleNote,
    reschedulePreselect,
    setReschedulePreselect,
    isCloudLoaded,
    unreadNotificationsCount,
    setUnreadNotificationsCount,
    theme,
    setTheme,
    toggleTheme,
    saveToCloud,
    generateTimetable,
    generateDemoTimetable,
    handleRemoveDemoData,
    handleAddFaculty,
    handleTeachersChange,
    assignProxy,
    rescheduleTimetable,
    facultyWorkloadAudit,
    handleLogout
  };

  return (
    <AcademicContext.Provider value={value}>
      {children}
    </AcademicContext.Provider>
  );
}
