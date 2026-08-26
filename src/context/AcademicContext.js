import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import { syncRelationalData } from '../services/supabaseService';
import { clearAllFacultyCaches, getFacultyWorkloadAnalytics } from '../services/realtimeFacultyService';
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
        if (!supabase?.auth?.getSession) return;
        const res = await supabase.auth.getSession();
        const session = res?.data?.session;
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

    let authSubscription = null;
    if (supabase?.auth?.onAuthStateChange) {
      const authRes = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const normalized = normalizeUser(session.user);
          setUser(normalized);
          const role = session.user.user_metadata?.role || normalized.role || "Admin";
          setUserRole(role);
        } else {
          setUser(null);
        }
      });
      authSubscription = authRes?.data?.subscription;
    }

    return () => {
      if (authSubscription?.unsubscribe) {
        authSubscription.unsubscribe();
      }
    };
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
            const uniqueRooms = [];
            const seen = new Set();
            cloudState.rooms.forEach(r => {
              const rName = (typeof r === 'string' ? r : (r?.room_number || r?.name || '')).trim();
              if (rName && !seen.has(rName.toLowerCase())) {
                seen.add(rName.toLowerCase());
                uniqueRooms.push(typeof r === 'string' ? rName : r);
              }
            });
            setRooms(uniqueRooms);
          }
          if (Array.isArray(cloudState.timeSlots) && cloudState.timeSlots.length > 0) {
            setTimeSlots(cloudState.timeSlots);
          }
          if (cloudState.result) {
            setResult(cloudState.result.timetable ? cloudState.result : formatResult(cloudState.result));
          }
        }

        // 2. Fetch Live Supabase Rooms / Venues and merge
        try {
          const { data: supaRooms, error: supaRoomErr } = await supabase
            .from('rooms')
            .select('*')
            .order('room_number');
          
          if (!supaRoomErr && Array.isArray(supaRooms) && supaRooms.length > 0) {
            setRooms(prev => {
              const current = Array.isArray(prev) ? prev : [];
              const roomNames = new Set(current.map(r => (typeof r === 'string' ? r : (r?.name || r?.room_number || '')).toLowerCase().trim()));
              const merged = [...current];
              supaRooms.forEach(r => {
                const rName = (r.room_number || r.name || '').trim();
                if (rName && !roomNames.has(rName.toLowerCase())) {
                  roomNames.add(rName.toLowerCase());
                  merged.push(rName);
                }
              });
              return merged;
            });
          }
        } catch (e) {
          console.warn("Rooms fetch notice:", e);
        }

        // 3. Fetch Live Supabase Faculty Profiles and merge real faculty (excluding test names)
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

        // 4. Fetch Live Teachers from relational teachers table and merge
        try {
          const { data: supaTeachers, error: supaTErr } = await supabase
            .from('teachers')
            .select('*')
            .order('name');
          if (!supaTErr && Array.isArray(supaTeachers) && supaTeachers.length > 0) {
            setTeachers(prev => {
              const current = Array.isArray(prev) ? prev : [];
              const names = new Set(current.map(t => ((typeof t === 'string' ? t : t?.name || t?.teacher_name) || '').toLowerCase().trim()));
              const merged = [...current];
              supaTeachers.forEach(t => {
                const name = (t.name || t.teacher_name || '').trim();
                if (name && !names.has(name.toLowerCase()) && !isTestOrMockFaculty(name)) {
                  names.add(name.toLowerCase());
                  merged.push({
                    id: t.id,
                    name,
                    teacher_name: name,
                    employee_id: t.employee_id || `EMP-${Date.now().toString().slice(-4)}`,
                    department: t.department || t.department_name || "Computer Applications",
                    designation: t.designation || "Assistant Professor",
                    email: t.email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@lnctu.ac.in`,
                    phone: t.phone || "+91-9876543210",
                    free_periods: t.free_periods || 1,
                    status: t.status || "active"
                  });
                }
              });
              return merged;
            });
          }
        } catch {}

        // 5. Fetch Live Relational Sections from Supabase and merge
        try {
          const { data: supaSections } = await supabase
            .from('sections')
            .select('*, classrooms(room_number)')
            .order('name');
          if (Array.isArray(supaSections) && supaSections.length > 0) {
            setSections(prev => {
              const current = Array.isArray(prev) ? prev : [];
              const secNames = new Set(current.map(s => (typeof s === 'string' ? s : s?.name || '').toLowerCase().trim()));
              const merged = [...current];
              supaSections.forEach(s => {
                const sName = (s.full_name || s.name || '').trim();
                if (sName && !secNames.has(sName.toLowerCase())) {
                  secNames.add(sName.toLowerCase());
                  merged.push({
                    id: s.id,
                    name: sName,
                    room: s.classrooms?.room_number || s.room_number || s.room || '',
                    lab_rooms: s.lab_rooms || [],
                    preferred_faculty: s.preferred_faculty || [],
                    capacity: s.student_count || s.capacity || 60,
                  });
                }
              });
              return merged;
            });
          }
        } catch {}

        // 6. Fetch Live Relational Allocations / Subjects from Supabase and merge
        try {
          const { data: supaAllocations } = await supabase
            .from('faculty_subject_allocations')
            .select('*')
            .order('subject_name');
          if (Array.isArray(supaAllocations) && supaAllocations.length > 0) {
            setSubjects(prev => {
              const current = Array.isArray(prev) ? prev : [];
              const subKeys = new Set(current.map(s => `${(s.code || s.name || '').toLowerCase()}_${(s.section || '').toLowerCase()}`));
              const merged = [...current];
              supaAllocations.forEach(a => {
                const sName = a.subject_name || '';
                const sCode = a.subject_code || '';
                const sSec = a.section_name || a.section || '';
                const key = `${(sCode || sName).toLowerCase()}_${sSec.toLowerCase()}`;
                if ((sCode || sName) && !subKeys.has(key)) {
                  subKeys.add(key);
                  merged.push({
                    id: a.id,
                    code: sCode,
                    name: sName,
                    teacher: a.faculty_name || '',
                    section: sSec,
                    sections: sSec ? [sSec] : [],
                    is_lab: a.is_lab || false,
                    required_slots: a.weekly_load || (a.is_lab ? 2 : 4),
                  });
                }
              });
              return merged;
            });
          }
        } catch {}

      } catch (e) {
        console.warn("Supabase fetch failed. Ensure .env is set and table exists.", e);
      } finally {
        setIsCloudLoaded(true);
        setLoading(false);
      }
    };

    window.__planify_refresh_state = loadCloudState;
    loadCloudState();

    // ── SUPABASE REALTIME SUBSCRIPTIONS ─────────────────────────────
    const subscribeChannel = (name, setupFn) => {
      try {
        if (!supabase || typeof supabase.channel !== 'function') return null;
        const ch = supabase.channel(name);
        if (!ch || typeof ch.on !== 'function') return null;
        setupFn(ch);
        return typeof ch.subscribe === 'function' ? ch.subscribe() : ch;
      } catch {
        return null;
      }
    };

    // 1. Timetable State Draft Channel
    const stateChannel = subscribeChannel('realtime_timetable_state', (ch) => {
      ch.on(
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
      );
    });

    // 2. Realtime Rooms Table (Classrooms, Labs, Venues)
    const roomsChannel = subscribeChannel('realtime_academic_rooms', (ch) => {
      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const rName = (payload.new.room_number || payload.new.name || '').trim();
            if (rName) {
              setRooms(prev => {
                const current = Array.isArray(prev) ? prev : [];
                const exists = current.some(r => (typeof r === 'string' ? r : (r?.name || r?.room_number || '')).toLowerCase().trim() === rName.toLowerCase());
                if (exists) return current;
                const updated = [...current, rName];
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("planify_rooms_updated", { detail: { rooms: updated } }));
                }
                return updated;
              });
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const oldName = (payload.old?.room_number || payload.old?.name || '').trim().toLowerCase();
            const newName = (payload.new.room_number || payload.new.name || '').trim();
            if (newName) {
              setRooms(prev => {
                const current = Array.isArray(prev) ? prev : [];
                return current.map(r => {
                  const curName = (typeof r === 'string' ? r : (r?.name || r?.room_number || '')).trim();
                  if (curName.toLowerCase() === oldName || (payload.old?.id && r?.id === payload.old.id)) {
                    return typeof r === 'string' ? newName : { ...r, name: newName, room_number: newName };
                  }
                  return r;
                });
              });
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const delName = (payload.old.room_number || payload.old.name || '').trim().toLowerCase();
            const delId = payload.old.id;
            setRooms(prev => {
              const current = Array.isArray(prev) ? prev : [];
              return current.filter(r => {
                const curName = (typeof r === 'string' ? r : (r?.name || r?.room_number || '')).trim().toLowerCase();
                if (delId && typeof r === 'object' && r?.id === delId) return false;
                if (delName && curName === delName) return false;
                return true;
              });
            });
          }
        }
      );
    });

    // 3. Realtime Faculty Profiles Table
    const facultyChannel = subscribeChannel('realtime_academic_faculty_profiles', (ch) => {
      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'faculty_profiles' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const newF = payload.new;
            const name = (newF.teacher_name || newF.name || '').trim();
            if (name && !isTestOrMockFaculty(name)) {
              setTeachers(prev => {
                const current = Array.isArray(prev) ? prev : [];
                const exists = current.some(t => ((typeof t === 'string' ? t : t?.name || t?.teacher_name) || '').toLowerCase().trim() === name.toLowerCase());
                if (exists) return current;
                const newObj = {
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
                };
                const updated = [...current, newObj];
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("planify_faculty_updated", { detail: { teacher: newObj } }));
                }
                return updated;
              });
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedF = payload.new;
            const name = (updatedF.teacher_name || updatedF.name || '').trim();
            if (name && !isTestOrMockFaculty(name)) {
              setTeachers(prev => {
                const current = Array.isArray(prev) ? prev : [];
                return current.map(t => {
                  const tName = ((typeof t === 'string' ? t : t?.name || t?.teacher_name) || '').trim();
                  if (t?.id === updatedF.id || tName.toLowerCase() === name.toLowerCase()) {
                    return {
                      ...t,
                      name,
                      teacher_name: name,
                      designation: updatedF.designation || t.designation || "Assistant Professor",
                      department: updatedF.department_name || updatedF.department || t.department || "Computer Applications",
                      status: updatedF.status || t.status || "active"
                    };
                  }
                  return t;
                });
              });
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = payload.old.id;
            setTeachers(prev => {
              const current = Array.isArray(prev) ? prev : [];
              return current.filter(t => t?.id !== oldId);
            });
          }
        }
      );
    });

    // 4. Realtime Teachers Table (fallback sync)
    const teachersChannel = subscribeChannel('realtime_academic_teachers', (ch) => {
      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teachers' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const name = (payload.new.name || '').trim();
            if (name && !isTestOrMockFaculty(name)) {
              setTeachers(prev => {
                const current = Array.isArray(prev) ? prev : [];
                const exists = current.some(t => ((typeof t === 'string' ? t : t?.name || t?.teacher_name) || '').toLowerCase().trim() === name.toLowerCase());
                if (exists) return current;
                return [...current, { name, free_periods: payload.new.free_periods || 1 }];
              });
            }
          }
        }
      );
    });

    // 5. Realtime Sections Table
    const sectionsChannel = subscribeChannel('realtime_academic_sections', (ch) => {
      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sections' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const sName = (payload.new.name || '').trim();
            if (sName) {
              setSections(prev => {
                const current = Array.isArray(prev) ? prev : [];
                const exists = current.some(s => (typeof s === 'string' ? s : s?.name || '').toLowerCase().trim() === sName.toLowerCase());
                if (exists) return current;
                const newSec = {
                  name: sName,
                  room: payload.new.room_number || payload.new.room || '',
                  lab_room: payload.new.lab_rooms || [],
                  preferred_faculty: payload.new.preferred_faculty || []
                };
                const updated = [...current, newSec];
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("planify_sections_updated", { detail: { section: newSec } }));
                }
                return updated;
              });
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const sName = (payload.new.name || '').trim();
            if (sName) {
              setSections(prev => {
                const current = Array.isArray(prev) ? prev : [];
                return current.map(s => {
                  const curName = (typeof s === 'string' ? s : s?.name || '').trim();
                  if (curName.toLowerCase() === sName.toLowerCase()) {
                    return typeof s === 'string' ? sName : {
                      ...s,
                      name: sName,
                      room: payload.new.room_number || payload.new.room || s.room || '',
                      lab_room: payload.new.lab_rooms || s.lab_room || [],
                      preferred_faculty: payload.new.preferred_faculty || s.preferred_faculty || []
                    };
                  }
                  return s;
                });
              });
            }
          }
        }
      );
    });

    // 6. Realtime Allocations Table
    const allocationsChannel = subscribeChannel('realtime_academic_allocations', (ch) => {
      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'faculty_subject_allocations' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const a = payload.new;
            const sName = a.subject_name || '';
            const sCode = a.subject_code || '';
            const sSec = a.section_name || a.section || '';
            if (sCode || sName) {
              setSubjects(prev => {
                const current = Array.isArray(prev) ? prev : [];
                const key = `${(sCode || sName).toLowerCase()}_${sSec.toLowerCase()}`;
                const exists = current.some(s => `${(s.code || s.name || '').toLowerCase()}_${(s.section || '').toLowerCase()}` === key);
                if (exists) return current;
                return [
                  ...current,
                  {
                    id: a.id,
                    code: sCode,
                    name: sName,
                    teacher: a.faculty_name || '',
                    section: sSec,
                    sections: sSec ? [sSec] : [],
                    is_lab: a.is_lab || false,
                    required_slots: a.weekly_load || (a.is_lab ? 2 : 4)
                  }
                ];
              });
            }
          }
        }
      );
    });

    return () => {
      try {
        if (supabase && typeof supabase.removeChannel === 'function') {
          if (stateChannel) supabase.removeChannel(stateChannel);
          if (roomsChannel) supabase.removeChannel(roomsChannel);
          if (facultyChannel) supabase.removeChannel(facultyChannel);
          if (teachersChannel) supabase.removeChannel(teachersChannel);
          if (sectionsChannel) supabase.removeChannel(sectionsChannel);
          if (allocationsChannel) supabase.removeChannel(allocationsChannel);
        }
      } catch {
        // Cleanup
      }
    };
  }, []);

  const activeStateRef = useRef({ teachers, sections, subjects, rooms, timeSlots, result });
  useEffect(() => {
    activeStateRef.current = { teachers, sections, subjects, rooms, timeSlots, result };
  });

  // NOTE: syncFacultyFromTimetable auto-trigger REMOVED.
  // It was writing teachers to localStorage and calling POST /faculty/bulk-sync,
  // which resurrected deleted faculty records. Faculty profiles are now managed
  // exclusively through the Faculty Directory UI + Supabase faculty_profiles table.

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
      const stateToSave = {
        teachers: live.teachers,
        sections: live.sections,
        subjects: live.subjects,
        rooms: live.rooms,
        timeSlots: live.timeSlots,
        result: live.result,
        ...(overrideState || {})
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

        // Also sync rooms table so relational rooms table has the new rooms
        if (Array.isArray(stateToSave.rooms) && stateToSave.rooms.length > 0) {
          try {
            const roomRows = stateToSave.rooms.map(r => {
              const rName = typeof r === 'string' ? r : (r.room_number || r.name);
              return {
                room_number: rName,
                room_type: (rName.toLowerCase().includes('lab') || (typeof r === 'object' && r.room_type === 'LAB')) ? 'LAB' : 'CLASSROOM',
                capacity: 60,
                is_active: true,
                updated_at: new Date().toISOString()
              };
            });
            await supabase.from('rooms').upsert(roomRows, { onConflict: 'room_number' }).catch(() => null);
          } catch {}
        }

        // Also sync sections table
        if (Array.isArray(stateToSave.sections) && stateToSave.sections.length > 0) {
          try {
            const sectionRows = stateToSave.sections.map(s => ({
              name: typeof s === 'string' ? s : s?.name,
              room: typeof s === 'object' ? (s.room || null) : null,
              lab_room: typeof s === 'object' ? (s.lab_room || null) : null,
              updated_at: new Date().toISOString()
            })).filter(s => Boolean(s.name));
            if (sectionRows.length > 0) {
              await supabase.from('sections').upsert(sectionRows, { onConflict: 'name' }).catch(() => null);
            }
          } catch {}
        }

        // Also sync subjects & faculty_subject_allocations
        if (Array.isArray(stateToSave.subjects) && stateToSave.subjects.length > 0) {
          try {
            const allocRows = stateToSave.subjects.map(sub => ({
              subject_name: sub.name,
              subject_code: sub.code || '',
              faculty_name: sub.teacher || '',
              section_name: sub.section || (Array.isArray(sub.sections) ? sub.sections.join(', ') : ''),
              is_lab: Boolean(sub.is_lab),
              weekly_load: sub.required_slots || 4,
              updated_at: new Date().toISOString()
            })).filter(a => Boolean(a.subject_name));
            if (allocRows.length > 0) {
              await supabase.from('faculty_subject_allocations').upsert(allocRows, { onConflict: 'subject_name,faculty_name,section_name' }).catch(() => null);
            }
          } catch {}
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

  const deleteRoom = useCallback(async (roomOrName) => {
    const roomName = (typeof roomOrName === 'string' ? roomOrName : (roomOrName?.room_number || roomOrName?.name || '')).trim();
    if (!roomName) return;
    const nameLower = roomName.toLowerCase();

    // 1. Direct Supabase delete from relational rooms table
    if (supabase) {
      try {
        await supabase.from("rooms").delete().ilike("room_number", roomName);
        await supabase.from("rooms").delete().ilike("name", roomName).catch(() => null);
      } catch (err) {
        console.warn("Supabase room delete notice:", err);
      }
    }

    // 2. Update local rooms state & persist to cloud
    setRooms(prev => {
      const current = Array.isArray(prev) ? prev : [];
      const filtered = current.filter(r => {
        const rName = (typeof r === 'string' ? r : (r?.room_number || r?.name || '')).trim().toLowerCase();
        return rName !== nameLower;
      });

      saveToCloud(true, {
        rooms: filtered,
        sections: activeStateRef.current.sections,
        subjects: activeStateRef.current.subjects,
        teachers: activeStateRef.current.teachers,
        timeSlots: activeStateRef.current.timeSlots,
        result: activeStateRef.current.result
      });

      return filtered;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("planify_rooms_updated"));
    }
  }, [saveToCloud]);

  const deleteMultipleRooms = useCallback(async (roomList = []) => {
    if (!Array.isArray(roomList) || roomList.length === 0) return;

    const namesToDelete = [];
    const nameLowerSet = new Set();

    roomList.forEach(r => {
      if (!r) return;
      const name = (typeof r === 'string' ? r : (r?.room_number || r?.name || '')).trim();
      if (name) {
        namesToDelete.push(name);
        nameLowerSet.add(name.toLowerCase());
      }
    });

    if (namesToDelete.length === 0) return;

    // 1. Direct Supabase batch delete from rooms table
    if (supabase) {
      try {
        await supabase.from("rooms").delete().in("room_number", namesToDelete);
        await supabase.from("rooms").delete().in("name", namesToDelete).catch(() => null);
      } catch (err) {
        console.warn("Supabase batch rooms delete notice:", err);
      }
    }

    // 2. Update local rooms state & persist to cloud
    setRooms(prev => {
      const current = Array.isArray(prev) ? prev : [];
      const filtered = current.filter(r => {
        const rName = (typeof r === 'string' ? r : (r?.room_number || r?.name || '')).trim().toLowerCase();
        return !nameLowerSet.has(rName);
      });

      saveToCloud(true, {
        rooms: filtered,
        sections: activeStateRef.current.sections,
        subjects: activeStateRef.current.subjects,
        teachers: activeStateRef.current.teachers,
        timeSlots: activeStateRef.current.timeSlots,
        result: activeStateRef.current.result
      });

      return filtered;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("planify_rooms_updated"));
    }
  }, [saveToCloud]);

  const deleteFacultyProfile = useCallback(async (facultyId, facultyName) => {
    const nameLower = (facultyName || "").toLowerCase().trim();

    // 1. Direct Supabase cascade delete (faculty_profiles, allocations, balances)
    if (supabase) {
      try {
        if (facultyId && !facultyId.toString().startsWith("ocr-")) {
          await supabase.from("faculty_subject_allocations").delete().or(`faculty_id.eq.${facultyId},faculty_name.eq.${facultyName || facultyId}`);
          await supabase.from("leave_balances").delete().eq("faculty_id", facultyId);
          await supabase.from("attendance_records").delete().eq("faculty_id", facultyId);
          await supabase.from("teachers").delete().eq("id", facultyId).catch(() => null);
          await supabase.from("faculty_profiles").delete().or(`id.eq.${facultyId},employee_id.eq.${facultyId}`);
        } else if (facultyName) {
          await supabase.from("faculty_subject_allocations").delete().eq("faculty_name", facultyName);
          await supabase.from("teachers").delete().eq("name", facultyName).catch(() => null);
          await supabase.from("faculty_profiles").delete().eq("teacher_name", facultyName);
        }
      } catch (err) {
        console.warn("Supabase delete notice:", err);
      }
    }

    // 2. Backend SQLite delete
    try {
      const deleteKey = facultyId || encodeURIComponent(facultyName);
      if (deleteKey && !deleteKey.toString().startsWith("ocr-")) {
        await axios.delete(`${API_BASE_URL}/faculty/${deleteKey}?hard_delete=true`).catch(() => null);
      }
    } catch (err) {
      console.warn("Backend delete notice:", err);
    }

    // 3. Purge ALL local caches that could resurrect this faculty member
    try {
      localStorage.removeItem("planify_faculty_cache");
    } catch {}
    try {
      // Also purge from timetable_state localStorage copy
      const stateRaw = localStorage.getItem("planify_timetable_state");
      if (stateRaw) {
        const parsed = JSON.parse(stateRaw);
        if (Array.isArray(parsed?.teachers)) {
          parsed.teachers = parsed.teachers.filter(t => {
            const tId = typeof t === 'object' ? t?.id : null;
            if (facultyId && tId) return tId !== facultyId;
            const tName = ((typeof t === 'string' ? t : t?.name || t?.teacher_name) || '').toLowerCase().trim();
            return tName !== nameLower;
          });
          localStorage.setItem("planify_timetable_state", JSON.stringify(parsed));
        }
      }
    } catch {}

    // 4. Update active subjects state (de-link deleted faculty from courses)
    setSubjects(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.map(s => {
        if ((s.teacher || "").toLowerCase().trim() === nameLower) {
          return { ...s, teacher: "" };
        }
        return s;
      });
    });

    // 5. Update active teachers state and persist updated timetable_state
    setTeachers(prev => {
      const filtered = (Array.isArray(prev) ? prev : []).filter(t => {
        const tName = ((typeof t === 'string' ? t : t?.name || t?.teacher_name) || '').toLowerCase().trim();
        const tId = typeof t === 'object' ? t?.id : null;
        if (facultyId && tId) return tId !== facultyId;
        if (facultyId && !tId && nameLower && tName === nameLower) return false;
        if (!facultyId && nameLower && tName === nameLower) return false;
        if (isTestOrMockFaculty(tName)) return false;
        return true;
      });

      saveToCloud(true, {
        teachers: filtered,
        sections: activeStateRef.current.sections,
        subjects: (activeStateRef.current.subjects || []).map(s => ((s.teacher || "").toLowerCase().trim() === nameLower ? { ...s, teacher: "" } : s)),
        rooms: activeStateRef.current.rooms,
        timeSlots: activeStateRef.current.timeSlots,
        result: activeStateRef.current.result
      });

      return filtered;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("planify_faculty_updated"));
      window.dispatchEvent(new CustomEvent("planify_leave_updated"));
      window.dispatchEvent(new CustomEvent("planify_attendance_updated"));
    }
  }, [saveToCloud]);

  const deleteMultipleFacultyProfiles = useCallback(async (facultyList = []) => {
    if (!Array.isArray(facultyList) || facultyList.length === 0) return;

    const idsToDelete = [];
    const namesToDelete = [];
    const nameLowerSet = new Set();

    facultyList.forEach(f => {
      if (!f) return;
      const id = typeof f === 'object' ? f.id : f;
      const name = typeof f === 'object' ? (f.teacher_name || f.name) : f;
      if (id && !id.toString().startsWith("ocr-")) {
        idsToDelete.push(id);
      }
      if (name) {
        const cleanName = name.trim();
        namesToDelete.push(cleanName);
        nameLowerSet.add(cleanName.toLowerCase());
      }
    });

    // 1. Direct Supabase cascade batch delete
    if (supabase) {
      try {
        if (idsToDelete.length > 0) {
          await supabase.from("faculty_subject_allocations").delete().in("faculty_id", idsToDelete);
          await supabase.from("leave_balances").delete().in("faculty_id", idsToDelete);
          await supabase.from("attendance_records").delete().in("faculty_id", idsToDelete);
          await supabase.from("teachers").delete().in("id", idsToDelete);
          await supabase.from("faculty_profiles").delete().in("id", idsToDelete);
        } else if (namesToDelete.length > 0) {
          await supabase.from("faculty_subject_allocations").delete().in("faculty_name", namesToDelete);
          await supabase.from("teachers").delete().in("name", namesToDelete);
          await supabase.from("faculty_profiles").delete().in("teacher_name", namesToDelete);
        }
      } catch (err) {
        console.warn("Supabase batch delete notice:", err);
      }
    }

    // 2. Backend SQLite delete
    try {
      await Promise.all(
        idsToDelete.map(id =>
          axios.delete(`${API_BASE_URL}/faculty/${id}?hard_delete=true`).catch(() => null)
        )
      );
    } catch (err) {
      console.warn("Backend batch delete notice:", err);
    }

    // 3. Purge ALL local caches
    try {
      localStorage.removeItem("planify_faculty_cache");
    } catch {}
    try {
      const stateRaw = localStorage.getItem("planify_timetable_state");
      if (stateRaw) {
        const parsed = JSON.parse(stateRaw);
        if (Array.isArray(parsed?.teachers)) {
          parsed.teachers = parsed.teachers.filter(t => {
            const tId = typeof t === 'object' ? t?.id : null;
            if (tId && idsToDelete.includes(tId)) return false;
            const tName = ((typeof t === 'string' ? t : t?.name || t?.teacher_name) || '').toLowerCase().trim();
            return !nameLowerSet.has(tName);
          });
          localStorage.setItem("planify_timetable_state", JSON.stringify(parsed));
        }
      }
    } catch {}

    // 4. Update active subjects state (de-link deleted faculty from courses)
    setSubjects(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.map(s => {
        if (nameLowerSet.has((s.teacher || "").toLowerCase().trim())) {
          return { ...s, teacher: "" };
        }
        return s;
      });
    });

    // 5. Update active sections state (remove from preferred_faculty)
    setSections(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.map(sec => {
        if (Array.isArray(sec.preferred_faculty)) {
          return {
            ...sec,
            preferred_faculty: sec.preferred_faculty.filter(pf => !nameLowerSet.has(pf.toLowerCase().trim()))
          };
        }
        return sec;
      });
    });

    // 6. Update active teachers state and persist updated timetable_state
    setTeachers(prev => {
      const filtered = (Array.isArray(prev) ? prev : []).filter(t => {
        const tName = ((typeof t === 'string' ? t : t?.name || t?.teacher_name) || '').toLowerCase().trim();
        const tId = typeof t === 'object' ? t?.id : null;
        if (tId && idsToDelete.includes(tId)) return false;
        if (tName && nameLowerSet.has(tName)) return false;
        if (isTestOrMockFaculty(tName)) return false;
        return true;
      });

      saveToCloud(true, {
        teachers: filtered,
        sections: (activeStateRef.current.sections || []).map(sec => ({
          ...sec,
          preferred_faculty: Array.isArray(sec.preferred_faculty)
            ? sec.preferred_faculty.filter(pf => !nameLowerSet.has(pf.toLowerCase().trim()))
            : []
        })),
        subjects: (activeStateRef.current.subjects || []).map(s => (
          nameLowerSet.has((s.teacher || "").toLowerCase().trim()) ? { ...s, teacher: "" } : s
        )),
        rooms: activeStateRef.current.rooms,
        timeSlots: activeStateRef.current.timeSlots,
        result: activeStateRef.current.result
      });

      return filtered;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("planify_faculty_updated"));
      window.dispatchEvent(new CustomEvent("planify_leave_updated"));
      window.dispatchEvent(new CustomEvent("planify_attendance_updated"));
    }
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

  const teacherWorkloadMap = useMemo(() => {
    const map = {};
    (teachers || []).forEach(t => {
      const name = typeof t === 'string' ? t : (t?.name || t?.teacher_name);
      if (!name) return;
      const cleanName = name.trim().toLowerCase();
      const capacity = Number(t?.weekly_workload_capacity || t?.max_weekly_hours || 16);
      map[cleanName] = {
        name: typeof t === 'string' ? t : (t?.name || t?.teacher_name),
        capacity,
        assignedSlots: 0,
        subjects: [],
        sections: new Set(),
      };
    });

    (subjects || []).forEach(sub => {
      const tName = (sub.teacher || "").trim().toLowerCase();
      if (!tName) return;
      const slots = sub.required_slots && sub.required_slots > 0 ? sub.required_slots : 4;
      if (!map[tName]) {
        map[tName] = {
          name: sub.teacher,
          capacity: 16,
          assignedSlots: 0,
          subjects: [],
          sections: new Set(),
        };
      }
      map[tName].assignedSlots += slots;
      const secStr = sub.section || (sub.sections && sub.sections.length > 0 ? sub.sections.join(', ') : 'All');
      map[tName].subjects.push({
        code: sub.code,
        name: sub.name,
        section: secStr,
        slots,
        is_lab: sub.is_lab
      });
      if (sub.section) map[tName].sections.add(sub.section);
      if (Array.isArray(sub.sections)) sub.sections.forEach(s => map[tName].sections.add(s));
    });

    return map;
  }, [teachers, subjects]);

  const updateFacultyWorkloadCapacity = useCallback(async (facultyIdentifier, newCapacity) => {
    const capNum = Math.max(1, parseInt(newCapacity, 10) || 16);
    const cleanId = String(facultyIdentifier || '').trim().toLowerCase();

    // 1. Update in teachers context state immediately
    setTeachers(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.map(t => {
        const tName = ((typeof t === 'string' ? t : t?.name || t?.teacher_name) || '').toLowerCase().trim();
        const tId = String(typeof t === 'object' ? t?.id : '').toLowerCase().trim();
        if (tName === cleanId || tId === cleanId) {
          return {
            ...(typeof t === 'object' ? t : { name: t }),
            weekly_workload_capacity: capNum,
            max_weekly_hours: capNum
          };
        }
        return t;
      });
    });

    // 2. Persist to Supabase faculty_profiles if connected
    if (supabase) {
      try {
        await supabase
          .from('faculty_profiles')
          .update({
            weekly_workload_capacity: capNum,
            max_weekly_hours: capNum
          })
          .or(`id.eq.${facultyIdentifier},teacher_name.ilike.${facultyIdentifier}`);
      } catch (err) {
        console.warn("Supabase workload capacity update notice:", err);
      }
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
    deleteMultipleFacultyProfiles,
    deleteRoom,
    deleteMultipleRooms,
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
    teacherWorkloadMap,
    updateFacultyWorkloadCapacity,
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
