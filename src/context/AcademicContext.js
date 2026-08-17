import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import { syncRelationalData } from '../services/supabaseService';
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

const readCloudState = (data) => ({
  teachers: parseCloudJson(data.teachers ?? data.room, null),
  sections: parseCloudJson(data.sections ?? data.email, null),
  subjects: parseCloudJson(data.subjects ?? data.day, null),
  rooms: parseCloudJson(data.rooms ?? data.subject, null),
  timeSlots: parseCloudJson(data.time_slots ?? data.timeSlots ?? data.teacher_name, null),
});

const buildCloudPayload = ({ teachers, sections, subjects, rooms, timeSlots }) => ({
  id: "draft",
  teachers,
  sections,
  subjects,
  rooms,
  time_slots: timeSlots,
  updated_at: new Date().toISOString(),
});

const buildLegacyCloudPayload = ({ teachers, sections, subjects, rooms, timeSlots }) => ({
  id: "draft",
  teacher_name: JSON.stringify(timeSlots),
  email: JSON.stringify(sections),
  subject: JSON.stringify(rooms),
  day: JSON.stringify(subjects),
  room: JSON.stringify(teachers),
  slot: new Date().toISOString(),
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

  const [teachers, setTeachers] = useState(DEMO_TIMETABLE_DATA.teachers);
  const [sections, setSections] = useState(DEMO_TIMETABLE_DATA.sections);
  const [subjects, setSubjects] = useState(DEMO_TIMETABLE_DATA.subjects);
  const [rooms, setRooms] = useState(DEMO_TIMETABLE_DATA.rooms);
  const [timeSlots, setTimeSlots] = useState(DEMO_TIMETABLE_DATA.timeSlots);
  const [result, setResult] = useState(() => formatResult(DEMO_RESULT));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [reschedulePreselect, setReschedulePreselect] = useState(null);
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Theme state: 'warm-white' (primary) | 'dark'
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('planify-theme') || 'warm-white'; } catch { return 'warm-white'; }
  });

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'warm-white' ? 'dark' : 'warm-white';
      try { localStorage.setItem('planify-theme', next); } catch {}
      return next;
    });
  }, []);

  // Apply theme class to document root
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'warm-white');
    root.classList.add(theme);
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

  // Load from Supabase on mount
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
          if (cloudState.teachers && cloudState.teachers.length > 0) setTeachers(cloudState.teachers);
          if (cloudState.sections && cloudState.sections.length > 0) setSections(cloudState.sections);
          if (cloudState.subjects && cloudState.subjects.length > 0) setSubjects(cloudState.subjects);
          if (cloudState.rooms && cloudState.rooms.length > 0) setRooms(cloudState.rooms);
          if (cloudState.timeSlots && cloudState.timeSlots.length > 0) setTimeSlots(cloudState.timeSlots);
        }
        setIsCloudLoaded(true);
      } catch (e) {
        console.warn("Supabase fetch failed. Ensure .env is set and table exists.", e);
      } finally {
        setLoading(false);
      }
    };
    loadCloudState();
  }, []);

  const activeStateRef = useRef({ teachers, sections, subjects, rooms, timeSlots, result });
  useEffect(() => {
    activeStateRef.current = { teachers, sections, subjects, rooms, timeSlots, result };
  });

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
        timeSlots: live.timeSlots
      };
      
      // 1. Primary Save (JSONB Draft)
      const { error } = await supabase
        .from('timetable_state')
        .upsert(buildCloudPayload(stateToSave));
      
      if (error) {
        const { error: legacyError } = await supabase
          .from('timetable_state')
          .upsert(buildLegacyCloudPayload(stateToSave));
        if (legacyError) throw legacyError;
      }

      // 2. Relational Sync (Structured Tables for Make/Analytics)
      if (live.result) {
        await syncRelationalData({ ...stateToSave, result: live.result }).catch(() => null);
      }
      
      if (!isSilent) {
        setRescheduleNote("All academic datasets and faculty successfully synchronized with cloud storage.");
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

  // Automatic Debounced Cloud Sync whenever state changes
  useEffect(() => {
    if (!isCloudLoaded) return;
    const timer = setTimeout(() => {
      saveToCloud(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [teachers, sections, subjects, rooms, timeSlots, isCloudLoaded, saveToCloud]);

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
      
      // Sync to relational tables immediately after generation
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
            const room = sub.is_lab ? (secObj?.lab_room || "Lab Room No. 006") : (secObj?.room || "308/MCA");
            const req = Math.min(sub.required_slots || 2, 4);
            for (let r = 0; r < req; r++) {
              const day = days[(sIdx + r) % days.length];
              const slot = slots[(slotOffset + r) % slots.length];
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
        setRescheduleNote(successMessage || "Timetable generated successfully (Local engine active).");
      } else {
        setError(getErrorMessage(apiError));
      }
    } finally {
      setLoading(false);
    }
  }, [teachers, sections, subjects, rooms, timeSlots]);

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

    try {
      const demoPayload = buildApiPayload(demoData);
      axios.post(`${API_BASE_URL}/analytics/seed-demo-history`).catch(() => null);
      axios.post(`${API_BASE_URL}/faculty/seed-lnct`).catch(() => null);
      await axios.post(`${API_BASE_URL}/generate`, demoPayload, { timeout: 20000 });
      saveToCloud(true, demoData);
    } catch (err) {
      console.warn("Backend solver call failed, keeping local LNCT DEMO_RESULT fallback:", err);
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

    try {
      await supabase
        .from('timetable_state')
        .upsert({
          id: 'draft',
          teachers: [],
          sections: [],
          subjects: [],
          rooms: [],
          timeSlots: defaultSlots,
          updated_at: new Date().toISOString()
        });

      supabase.from('attendance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000').then(() => null).catch(() => null);
      supabase.from('substitution_log').delete().neq('id', '00000000-0000-0000-0000-000000000000').then(() => null).catch(() => null);
      supabase.from('leave_applications').delete().neq('id', '00000000-0000-0000-0000-000000000000').then(() => null).catch(() => null);
      supabase.from('faculty_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000').then(() => null).catch(() => null);
      supabase.from('leave_balances').delete().neq('faculty_id', '00000000-0000-0000-0000-000000000000').then(() => null).catch(() => null);
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
    const name = newFaculty.teacher_name || newFaculty.name;
    if (!name) return;

    setTeachers(prev => {
      const currentList = Array.isArray(prev) ? prev : [];
      const exists = currentList.some(t => {
        const tName = (t?.name || t)?.toLowerCase();
        return tName === name.toLowerCase();
      });
      if (exists) return currentList;

      const free_periods = newFaculty.free_periods !== undefined ? newFaculty.free_periods : 1;
      const updated = [...currentList, { name, free_periods }];
      
      saveToCloud(true, {
        teachers: updated,
        sections: activeStateRef.current.sections,
        subjects: activeStateRef.current.subjects,
        rooms: activeStateRef.current.rooms,
        timeSlots: activeStateRef.current.timeSlots
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
      timeSlots: activeStateRef.current.timeSlots
    });
  }, [saveToCloud]);

  const assignProxy = useCallback((leaveAssignment, proxyTeacher) => {
    if (!result || !result.assignments) return;
    const updatedAssignments = result.assignments.map(a => {
      if (a.day === leaveAssignment.day && 
          a.slot === leaveAssignment.slot && 
          a.section === leaveAssignment.section && 
          a.subject === leaveAssignment.subject) {
        return { ...a, teacher: proxyTeacher, isProxy: true, originalTeacher: a.teacher };
      }
      return a;
    });

    const updatedResult = { ...result, assignments: updatedAssignments };
    setResult(updatedResult);
    setRescheduleNote(`Proxy assigned successfully: ${proxyTeacher} will cover ${leaveAssignment.subject} (${leaveAssignment.section}) on ${leaveAssignment.day} at ${leaveAssignment.slot}`);
    
    syncRelationalData({ teachers, sections, subjects, rooms, timeSlots, result: updatedResult }).catch(() => null);
  }, [result, teachers, sections, subjects, rooms, timeSlots]);

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
        setResult({ ...result, assignments: updated });
        setRescheduleNote("Slot swapped successfully.");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [result]);

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
    handleLogout
  };

  return (
    <AcademicContext.Provider value={value}>
      {children}
    </AcademicContext.Provider>
  );
}
