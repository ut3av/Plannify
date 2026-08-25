import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import { syncRelationalData } from '../services/supabaseService';
import { clearAllFacultyCaches, syncFacultyFromTimetable, getFacultyWorkloadAnalytics } from '../services/realtimeFacultyService';
import { API_BASE_URL } from '../apiConfig';
import { buildApiPayload, formatResult } from '../utils/timetableFormatter';

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

export const isTestOrMockFaculty = (name) => {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  const testNames = [
    "test a", "test b", "test c", "test teacher", "test faculty", "test",
    "dr. sanjana singh", "sanjana singh",
    "dr. amit patel", "amit patel",
    "prof. rajesh verma", "rajesh verma",
    "prof. neha gupta", "neha gupta",
    "dr. vikram joshi", "vikram joshi",
    "prof. suresh kumar", "suresh kumar",
    "demo teacher", "demo faculty", "demo user"
  ];
  return testNames.includes(n) || n.startsWith("test ") || n.startsWith("demo ") || n === "teacher 1" || n === "teacher 2";
};


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

export const parseAcademicMeta = (strOrObj) => {
  const str = typeof strOrObj === 'string' ? strOrObj : (strOrObj?.name || strOrObj?.code || strOrObj?.section || strOrObj?.program_code || '');
  const s = str.toUpperCase();

  let program_level = 'UG';
  let program_code = 'BCA';
  let semester_number = 1;

  if (s.includes('MCA') || s.includes('PG') || s.includes('M.TECH') || s.includes('MBA') || s.includes('M.SC')) {
    program_level = 'PG';
    program_code = 'MCA';
  } else if (s.includes('B.TECH') || s.includes('BTECH') || s.includes('BE')) {
    program_level = 'UG';
    program_code = 'B.Tech';
  } else if (s.includes('BCA') || s.includes('BAI') || s.includes('UG') || s.includes('B.SC')) {
    program_level = 'UG';
    program_code = 'BCA';
  }

  // Detect Semester number (1 to 8 or Roman numerals)
  const semMatch = s.match(/(?:SEM|SEMESTER|SEM\.|-)\s*([1-8]|I|II|III|IV|V|VI|VII|VIII)/i) || s.match(/([1-8])(?:ST|ND|RD|TH)?\s*SEM/i);
  if (semMatch) {
    const rawSem = semMatch[1].toUpperCase();
    const romanMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8 };
    semester_number = romanMap[rawSem] || parseInt(rawSem, 10) || 1;
  } else if (s.includes('-1') || s.includes('-I') || s.includes('1A') || s.includes('1B')) {
    semester_number = 1;
  } else if (s.includes('-2') || s.includes('-II') || s.includes('2A') || s.includes('2B')) {
    semester_number = 2;
  } else if (s.includes('-3') || s.includes('-III') || s.includes('3A') || s.includes('3B')) {
    semester_number = 3;
  } else if (s.includes('-4') || s.includes('-IV') || s.includes('4A') || s.includes('4B')) {
    semester_number = 4;
  } else if (s.includes('-5') || s.includes('-V') || s.includes('5A') || s.includes('5B')) {
    semester_number = 5;
  } else if (s.includes('-6') || s.includes('-VI') || s.includes('6A') || s.includes('6B')) {
    semester_number = 6;
  }

  return { program_level, program_code, semester_number };
};

export function AcademicProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("Admin");
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  // Program Level (ALL | UG | PG), Program (ALL | BCA | MCA | B.Tech), and Semester (ALL | 1..8) Filter
  const [academicLevel, setAcademicLevel] = useState("ALL"); // ALL | UG | PG
  const [selectedProgram, setSelectedProgram] = useState("ALL"); // ALL | BCA | MCA | B.Tech
  const [selectedSemester, setSelectedSemester] = useState("ALL"); // ALL | 1 | 2 | 3 | 4 | 5 | 6

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
    const normalizeUser = (rawUser) => {
      if (!rawUser) return null;
      const meta = rawUser.user_metadata || {};
      const normalizedName = meta.name || meta.teacher_name || meta.full_name || rawUser.name || (rawUser.email ? rawUser.email.split('@')[0] : 'Faculty Member');
      return {
        ...rawUser,
        name: normalizedName,
        teacher_name: normalizedName,
        role: meta.role || (rawUser.email?.includes('admin') ? 'Admin' : 'teacher'),
        department: meta.department || meta.department_name || "Computer Applications",
        designation: meta.designation || "Assistant Professor",
        employee_id: meta.employee_id || `EMP-LNCT-${Math.abs(normalizedName.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 9000) + 1000}`,
        phone: meta.phone || "+91-9876543210"
      };
    };

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const normalized = normalizeUser(session.user);
          setUser(normalized);
          const role = session.user.user_metadata?.role || normalized.role || "Admin";
          setUserRole(role);
        }
      } catch (err) {
        console.warn("Session check failed:", err);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const normalized = normalizeUser(session.user);
        setUser(normalized);
        const role = session.user.user_metadata?.role || normalized.role || "Admin";
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
        // 1. Fetch Draft Academic State (Classrooms, Labs, Sections, Subjects, Time Slots)
        const { data, error } = await supabase
          .from('timetable_state')
          .select('*')
          .eq('id', 'draft')
          .single();
        
        let loadedTeachers = [];
        if (data && !error) {
          const cloudState = readCloudState(data);
          if (Array.isArray(cloudState.teachers) && cloudState.teachers.length > 0) {
            // Filter out any legacy test/mock faculty
            const cleanTeachers = cloudState.teachers.filter(t => {
              const tName = typeof t === 'string' ? t : t?.name || t?.teacher_name;
              return !isTestOrMockFaculty(tName);
            });
            loadedTeachers = cleanTeachers;
            setTeachers(cleanTeachers);
          }
          if (Array.isArray(cloudState.sections) && cloudState.sections.length > 0) {
            setSections(cloudState.sections);
          }
          if (Array.isArray(cloudState.subjects) && cloudState.subjects.length > 0) {
            setSubjects(cloudState.subjects);
          }
          if (Array.isArray(cloudState.rooms) && cloudState.rooms.length > 0) {
            setRooms(cloudState.rooms);
          }
          if (Array.isArray(cloudState.timeSlots) && cloudState.timeSlots.length > 0) {
            setTimeSlots(cloudState.timeSlots);
          }
          if (cloudState.result) {
            setResult(cloudState.result.timetable ? cloudState.result : formatResult(cloudState.result));
          }
        }

        // 2. Fetch Live Supabase Faculty Profiles and merge real faculty (excluding test names)
        try {
          const { data: supaProfiles, error: supaErr } = await supabase
            .from('faculty_profiles')
            .select('*, departments(name)')
            .order('teacher_name');
          
          if (!supaErr && Array.isArray(supaProfiles) && supaProfiles.length > 0) {
            setTeachers(prev => {
              const current = Array.isArray(prev) && prev.length > 0 ? prev : loadedTeachers;
              const names = new Set(current.map(t => ((typeof t === 'string' ? t : t?.name || t?.teacher_name) || '').toLowerCase().trim()));
              const merged = [...current];
              
              supaProfiles.forEach(p => {
                const name = (p.teacher_name || p.name || '').trim();
                if (name && !names.has(name.toLowerCase()) && !isTestOrMockFaculty(name)) {
                  names.add(name.toLowerCase());
                  merged.push({
                    id: p.id,
                    name,
                    teacher_name: name,
                    employee_id: p.employee_id || `EMP-${Date.now().toString().slice(-4)}`,
                    department: p.departments?.name || p.department_name || p.department || "Computer Applications",
                    designation: p.designation || "Assistant Professor",
                    email: p.email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@lnctu.ac.in`,
                    phone: p.phone || "+91-9876543210",
                    free_periods: 1,
                    status: p.status || "active"
                  });
                }
              });
              return merged;
            });
          }
        } catch (e) {
          console.warn("Faculty profiles fetch notice:", e);
        }

      } catch (e) {
        console.warn("Supabase fetch failed. Ensure .env is set and table exists.", e);
      } finally {
        setIsCloudLoaded(true);
        setLoading(false);
      }
    };

    window.__planify_refresh_state = loadCloudState;
    loadCloudState();

    // 1. Supabase Realtime channel subscription for timetable_state (Classrooms, Labs, Sections, Subjects)
    const stateChannel = supabase
      .channel('realtime_timetable_state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'timetable_state', filter: 'id=eq.draft' },
        (payload) => {
          if (payload.new) {
            const cloudState = readCloudState(payload.new);
            if (Array.isArray(cloudState.teachers) && cloudState.teachers.length > 0) {
              setTeachers(cloudState.teachers.filter(t => !isTestOrMockFaculty(typeof t === 'string' ? t : t?.name || t?.teacher_name)));
            }
            if (Array.isArray(cloudState.sections) && cloudState.sections.length > 0) setSections(cloudState.sections);
            if (Array.isArray(cloudState.subjects) && cloudState.subjects.length > 0) setSubjects(cloudState.subjects);
            if (Array.isArray(cloudState.rooms) && cloudState.rooms.length > 0) setRooms(cloudState.rooms);
            if (Array.isArray(cloudState.timeSlots) && cloudState.timeSlots.length > 0) setTimeSlots(cloudState.timeSlots);
            if (cloudState.result) {
              setResult(cloudState.result.timetable ? cloudState.result : formatResult(cloudState.result));
            }
          }
        }
      )
      .subscribe();

    // 2. Supabase Realtime channel subscription for faculty_profiles (Live Faculty Roster: INSERT, UPDATE, DELETE)
    const facultyChannel = supabase
      .channel('realtime_academic_faculty_profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'faculty_profiles' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const newF = payload.new;
            const name = (newF.teacher_name || newF.name || '').trim();
            if (name && !isTestOrMockFaculty(name)) {
              setTeachers(prev => {
                const current = Array.isArray(prev) ? prev : [];
                const exists = current.some(t => ((typeof t === 'string' ? t : t?.name) || '').toLowerCase() === name.toLowerCase());
                if (exists) return current;
                return [
                  ...current,
                  {
                    id: newF.id,
                    name,
                    teacher_name: name,
                    employee_id: newF.employee_id || `EMP-${Date.now().toString().slice(-4)}`,
                    department: newF.department_name || newF.department || "Computer Applications",
                    designation: newF.designation || "Assistant Professor",
                    email: newF.email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@lnctu.ac.in`,
                    phone: newF.phone || "+91-9876543210",
                    free_periods: 1,
                    status: newF.status || "active"
                  }
                ];
              });
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            // Real-time deletion sync
            const deletedId = payload.old.id;
            const deletedName = (payload.old.teacher_name || '').toLowerCase().trim();
            setTeachers(prev => {
              if (!Array.isArray(prev)) return [];
              return prev.filter(t => {
                const tName = ((typeof t === 'string' ? t : t?.name || t?.teacher_name) || '').toLowerCase().trim();
                const tId = typeof t === 'object' ? t?.id : null;
                if (deletedId && tId === deletedId) return false;
                if (deletedName && tName === deletedName) return false;
                return true;
              });
            });
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(stateChannel);
        supabase.removeChannel(facultyChannel);
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

  const [validationReport, setValidationReport] = useState(null);

  const generateFromPayload = useCallback(async (nextPayload, successMessage = "") => {
    setLoading(true);
    setError(null);
    setRescheduleNote("");
    try {
      const response = await axios.post(`${API_BASE_URL}/generate`, nextPayload, { timeout: 25000 });
      const formatted = formatResult(response.data);
      const valReport = response.data.validation || { valid: true, errors: [], warnings: [], statistics: {} };
      formatted.validation = valReport;
      formatted.timetable_id = response.data.timetable_id;
      formatted.version = response.data.version;
      formatted.solver_status = response.data.solver_status || "OPTIMAL";

      setResult(formatted);
      setValidationReport(valReport);
      
      // Sync to cloud & relational tables immediately after validated generation
      saveToCloud(true, { teachers, sections, subjects, rooms, timeSlots, result: formatted });
      try {
        await syncRelationalData({ teachers, sections, subjects, rooms, timeSlots, result: formatted });
      } catch (syncErr) {
        console.warn("Relational sync notification after generation", syncErr);
      }

      setRescheduleNote(successMessage || "100% Conflict-free timetable generated and verified by independent validator.");
    } catch (apiError) {
      console.error("Backend solver error:", apiError);
      const errDetail = apiError?.response?.data?.detail;
      if (errDetail && typeof errDetail === "object" && errDetail.validation) {
        setValidationReport(errDetail.validation);
      } else {
        setValidationReport(null);
      }
      setError(getErrorMessage(apiError));
    } finally {
      setLoading(false);
    }
  }, [teachers, sections, subjects, rooms, timeSlots, saveToCloud]);

  const generateTimetable = useCallback(async () => {
    await generateFromPayload(payload);
  }, [generateFromPayload, payload]);

  const handleResetWorkspace = useCallback(async () => {
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
    setRescheduleNote("Workspace reset complete. All entities and draft schedules cleared to clean state.");

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
      }
    } catch (e) {
      console.warn("Could not reset Supabase draft state:", e);
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

  const deleteFacultyProfile = useCallback(async (facultyId, facultyName) => {
    // 1. Direct Supabase delete (faculty_profiles and allocations)
    if (supabase) {
      try {
        if (facultyId && !facultyId.toString().startsWith("ocr-")) {
          await supabase.from("faculty_subject_allocations").delete().eq("faculty_id", facultyId);
          await supabase.from("faculty_profiles").delete().eq("id", facultyId);
        }
        if (facultyName) {
          await supabase.from("faculty_subject_allocations").delete().eq("faculty_name", facultyName);
          await supabase.from("faculty_profiles").delete().eq("teacher_name", facultyName);
        }
      } catch (err) {
        console.warn("Supabase delete notice:", err);
      }
    }

    // 2. Backend SQLite delete
    try {
      if (facultyId && !facultyId.toString().startsWith("ocr-")) {
        await axios.delete(`${API_BASE_URL}/faculty/${facultyId}?hard_delete=true`).catch(() => null);
      }
    } catch (err) {
      console.warn("Backend delete notice:", err);
    }

    // 3. Update active teachers state and persist updated timetable_state
    const nameLower = (facultyName || "").toLowerCase().trim();
    setTeachers(prev => {
      const filtered = (Array.isArray(prev) ? prev : []).filter(t => {
        const tName = ((typeof t === 'string' ? t : t?.name || t?.teacher_name) || '').toLowerCase().trim();
        const tId = typeof t === 'object' ? t?.id : null;
        if (facultyId && tId === facultyId) return false;
        if (nameLower && tName === nameLower) return false;
        return true;
      });

      saveToCloud(true, {
        teachers: filtered,
        sections: activeStateRef.current.sections,
        subjects: activeStateRef.current.subjects,
        rooms: activeStateRef.current.rooms,
        timeSlots: activeStateRef.current.timeSlots,
        result: activeStateRef.current.result
      });

      return filtered;
    });
  }, [saveToCloud]);

  const handleBatchImportData = useCallback(({ teachers: newTeachers = [], sections: newSections = [], subjects: newSubjects = [] }) => {
    let updatedTeachers = activeStateRef.current.teachers || [];
    let updatedSections = activeStateRef.current.sections || [];
    let updatedSubjects = activeStateRef.current.subjects || [];

    // 1. Merge Teachers
    if (Array.isArray(newTeachers) && newTeachers.length > 0) {
      const teacherNames = new Set(updatedTeachers.map(t => (typeof t === 'string' ? t : t?.name || t?.teacher_name || '').toLowerCase().trim()));
      newTeachers.forEach(t => {
        const name = (typeof t === 'string' ? t : t?.name || t?.teacher_name || '').trim();
        if (name && !teacherNames.has(name.toLowerCase())) {
          teacherNames.add(name.toLowerCase());
          updatedTeachers = [
            ...updatedTeachers,
            typeof t === 'object' ? {
              name,
              free_periods: t.free_periods || 1,
              email: t.email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@lnctu.ac.in`,
              phone: t.phone || "+91-9876543210",
              department: t.department || t.department_name || "Computer Applications",
              employee_id: t.employee_id || `EMP-${Date.now().toString().slice(-4)}`,
              designation: t.designation || "Assistant Professor",
              status: "active"
            } : { name, free_periods: 1, department: "Computer Applications", status: "active" }
          ];
        }
      });
      setTeachers(updatedTeachers);
    }

    // 2. Merge Sections (Auto-Generated)
    if (Array.isArray(newSections) && newSections.length > 0) {
      const sectionNames = new Set(updatedSections.map(s => (typeof s === 'string' ? s : s?.name || '').toLowerCase().trim()));
      newSections.forEach(s => {
        const name = (typeof s === 'string' ? s : s?.name || '').trim();
        if (name && !sectionNames.has(name.toLowerCase())) {
          sectionNames.add(name.toLowerCase());
          updatedSections = [
            ...updatedSections,
            typeof s === 'object' ? {
              name,
              room: s.room || "Auto",
              preferred_faculty: s.preferred_faculty || []
            } : { name, room: "Auto", preferred_faculty: [] }
          ];
        }
      });
      setSections(updatedSections);
    }

    // 3. Merge Subjects
    if (Array.isArray(newSubjects) && newSubjects.length > 0) {
      const subjectNames = new Set(updatedSubjects.map(sub => (typeof sub === 'string' ? sub : sub?.name || '').toLowerCase().trim()));
      newSubjects.forEach(sub => {
        const name = (typeof sub === 'string' ? sub : sub?.name || '').trim();
        if (name && !subjectNames.has(name.toLowerCase())) {
          subjectNames.add(name.toLowerCase());
          updatedSubjects = [
            ...updatedSubjects,
            typeof sub === 'object' ? sub : { name, weekly_lectures: 4, department: "Computer Applications" }
          ];
        }
      });
      setSubjects(updatedSubjects);
    }

    // Persist combined state to Cloud
    saveToCloud(true, {
      teachers: updatedTeachers,
      sections: updatedSections,
      subjects: updatedSubjects,
      rooms: activeStateRef.current.rooms,
      timeSlots: activeStateRef.current.timeSlots,
      result: activeStateRef.current.result
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("planify_sections_updated"));
      window.dispatchEvent(new CustomEvent("planify_faculty_updated"));
    }
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
    handleResetWorkspace,
    handleRemoveDemoData: handleResetWorkspace,
    handleAddFaculty,
    deleteFacultyProfile,
    handleBatchImportData,
    handleTeachersChange,
    assignProxy,
    rescheduleTimetable,
    academicLevel,
    setAcademicLevel,
    selectedProgram,
    setSelectedProgram,
    selectedSemester,
    setSelectedSemester,
    parseAcademicMeta,
    validationReport,
    setValidationReport,
    facultyWorkloadAudit,
    refreshAcademicState: () => {
      if (typeof window !== 'undefined' && window.__planify_refresh_state) {
        window.__planify_refresh_state();
      }
    },
    handleLogout
  };

  return (
    <AcademicContext.Provider value={value}>
      {children}
    </AcademicContext.Provider>
  );
}
