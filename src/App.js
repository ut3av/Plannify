import { useCallback, useMemo, useState, useEffect } from "react";
import axios from "axios";
import SubjectsSection from "./components/SubjectsSection";
import RoomsSection from "./components/RoomsSection";
import TimeSlotsSection from "./components/TimeSlotsSection";
import ReschedulePanel from "./components/ReschedulePanel";
import TimetableGrid from "./components/TimetableGrid";
import IntegrationsSection from "./components/IntegrationsSection";
import HistorySection from "./components/HistorySection";
import AIChatBot from "./components/AIChatBot";
import LoginPage from "./components/LoginPage";
import LogsSection from "./components/LogsSection";
import { saveAs } from "file-saver";
import { supabase } from "./supabaseClient";
import { syncRelationalData } from "./services/supabaseService";
import TeacherDashboard from "./components/TeacherDashboard";
import FacultyDirectory from "./components/faculty/FacultyDirectory";
import FacultyProfile from "./components/faculty/FacultyProfile";
import LeaveManagement from "./components/faculty/LeaveManagement";
import AttendanceDashboard from "./components/faculty/AttendanceDashboard";
import SubstitutionPanel from "./components/faculty/SubstitutionPanel";
import FacultyDashboardStats from "./components/faculty/FacultyDashboardStats";
import FacultyAnalyticsModule from "./components/faculty/FacultyAnalyticsModule";
import AppShell from "./components/shell/AppShell";
import InstitutionalDashboard from "./components/dashboard/InstitutionalDashboard";
import SectionsManagement from "./components/sections/SectionsManagement";
import ReportsCenter from "./components/reports/ReportsCenter";
import DepartmentAnalyticsView from "./components/faculty/DepartmentAnalyticsView";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

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
    title: "Could not reach the scheduler API.",
    suggestions: ["Make sure the FastAPI backend is running on port 8080."],
    facts: [],
  };
}

function ErrorAlert({ error }) {
  if (!error) return null;
  const info = typeof error === "string"
    ? { title: error, suggestions: [], facts: [] }
    : error;

  return (
    <div className="animate-slide-down flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm px-5 py-4 text-sm text-red-100 mb-4">
      <svg
        className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div className="min-w-0">
        <p className="font-semibold text-red-50">{info.title}</p>
        {info.facts?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {info.facts.map((fact, index) => (
              <span key={`${fact}-${index}`} className="rounded-md border border-red-400/20 bg-red-950/30 px-2 py-1 text-xs text-red-100">
                {fact}
              </span>
            ))}
          </div>
        )}
        {info.suggestions?.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-red-100/90">
            {info.suggestions.map((suggestion, index) => (
              <li key={`${suggestion}-${index}`}>{suggestion}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


const DEMO_TIMETABLE_DATA = {
  teachers: [
    { name: "Dr. Arvind Kumar", department: "Computer Science", free_periods: 1, email: "arvind.kumar@univ.edu", phone: "+91-9876543210" },
    { name: "Prof. Sarah Jenkins", department: "Computer Science", free_periods: 1, email: "s.jenkins@univ.edu", phone: "+91-9876543211" },
    { name: "Rajesh Malhotra", department: "Information Technology", free_periods: 1, email: "r.malhotra@univ.edu", phone: "+91-9876543212" },
    { name: "Anita Desai", department: "Information Technology", free_periods: 1, email: "a.desai@univ.edu", phone: "+91-9876543213" },
    { name: "Kevin Peterson", department: "Computer Science", free_periods: 1, email: "k.peterson@univ.edu", phone: "+91-9876543214" },
    { name: "Dr. Meenakshi Iyer", department: "Electronics & Comm.", free_periods: 1, email: "m.iyer@univ.edu", phone: "+91-9876543215" },
    { name: "Suresh Raina", department: "Information Technology", free_periods: 1, email: "s.raina@univ.edu", phone: "+91-9876543216" },
    { name: "Monica Geller", department: "Business Admin", free_periods: 1, email: "m.geller@univ.edu", phone: "+91-9876543217" },
    { name: "Vikram Seth", department: "Business Admin", free_periods: 1, email: "v.seth@univ.edu", phone: "+91-9876543218" },
    { name: "Librarian", department: "General Academic", free_periods: 0, email: "library@univ.edu", phone: "+91-9876543219" },
  ],
  sections: [
    { name: "BCA-I", department: "Computer Science", room: "Room 101", lab_room: "Computer Lab A" },
    { name: "BCA-II", department: "Information Technology", room: "Room 102", lab_room: "Computer Lab B" },
    { name: "BCA-III", department: "Information Technology", room: "Room 103", lab_room: "Computer Lab A" },
    { name: "CS-A", department: "Computer Science", room: "Room 101", lab_room: "Computer Lab A" },
    { name: "EC-A", department: "Electronics & Comm.", room: "Room 102", lab_room: "Computer Lab B" },
    { name: "MBA-I", department: "Business Admin", room: "Seminar Hall", lab_room: "Computer Lab A" },
  ],
  rooms: ["Room 101", "Room 102", "Room 103", "Computer Lab A", "Computer Lab B", "Seminar Hall"],
  timeSlots: [
    "09:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM",
    "11:15 AM - 12:15 PM",
    "12:15 PM - 01:15 PM",
    "02:00 PM - 03:00 PM",
  ],
  subjects: [
    { code: "CS101", name: "Python Programming", teacher: "Dr. Arvind Kumar", sections: ["BCA-I", "BCA-II", "CS-A"], department: "Computer Science", required_slots: 3, colorIndex: 0 },
    { code: "CS102", name: "Data Structures", teacher: "Prof. Sarah Jenkins", sections: ["BCA-I", "BCA-II", "CS-A"], department: "Computer Science", required_slots: 3, colorIndex: 1 },
    { code: "CS103", name: "Operating Systems", teacher: "Rajesh Malhotra", sections: ["BCA-I", "BCA-II", "BCA-III"], department: "Information Technology", required_slots: 3, colorIndex: 2 },
    { code: "CS104", name: "Computer Networks", teacher: "Anita Desai", sections: ["BCA-I", "BCA-II", "BCA-III"], department: "Information Technology", required_slots: 3, colorIndex: 3 },
    { code: "CS105", name: "Database Management", teacher: "Kevin Peterson", sections: ["BCA-I", "BCA-II", "CS-A"], department: "Computer Science", required_slots: 2, colorIndex: 4 },
    { code: "CS106", name: "Software Engineering", teacher: "Dr. Meenakshi Iyer", sections: ["EC-A", "BCA-III"], department: "Electronics & Comm.", required_slots: 2, colorIndex: 5 },
    { code: "CS107", name: "Web Technologies", teacher: "Suresh Raina", sections: ["BCA-I", "BCA-II", "BCA-III"], department: "Information Technology", required_slots: 2, colorIndex: 6 },
    { code: "MGT101", name: "Principles of Management", teacher: "Monica Geller", sections: ["MBA-I", "BCA-I"], department: "Business Admin", required_slots: 2, colorIndex: 7 },
    { code: "MAT101", name: "Discrete Mathematics", teacher: "Vikram Seth", sections: ["BCA-I", "BCA-II", "MBA-I"], department: "Business Admin", required_slots: 2, colorIndex: 8 },
    { code: "LAB101", name: "Coding Lab", teacher: "Dr. Arvind Kumar", sections: ["BCA-I", "CS-A"], department: "Computer Science", is_lab: true, required_slots: 2, colorIndex: 9 },
    { code: "LIB", name: "Library", teacher: "Librarian", sections: ["BCA-I", "BCA-II", "BCA-III"], department: "General Academic", required_slots: 1, colorIndex: 0 },
  ],
};

const DEMO_RESULT = {
  solver_status: "FEASIBLE (Optimal)",
  objective_score: 0,
  days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  time_slots: [
    "09:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM",
    "11:15 AM - 12:15 PM",
    "12:15 PM - 01:15 PM",
    "02:00 PM - 03:00 PM",
  ],
  assignments: [
    { day: "Mon", slot: "09:00 AM - 10:00 AM", section: "BCA-I", subject: "Python Programming", teacher: "Dr. Arvind Kumar", room: "Room 101" },
    { day: "Mon", slot: "10:00 AM - 11:00 AM", section: "BCA-I", subject: "Data Structures", teacher: "Prof. Sarah Jenkins", room: "Room 101" },
    { day: "Mon", slot: "11:15 AM - 12:15 PM", section: "BCA-I", subject: "Operating Systems", teacher: "Rajesh Malhotra", room: "Room 101" },
    { day: "Mon", slot: "12:15 PM - 01:15 PM", section: "BCA-I", subject: "Computer Networks", teacher: "Anita Desai", room: "Room 101" },
    { day: "Mon", slot: "02:00 PM - 03:00 PM", section: "BCA-I", subject: "Coding Lab", teacher: "Dr. Arvind Kumar", room: "Computer Lab A" },

    { day: "Mon", slot: "09:00 AM - 10:00 AM", section: "BCA-II", subject: "Database Management", teacher: "Kevin Peterson", room: "Room 102" },
    { day: "Mon", slot: "10:00 AM - 11:00 AM", section: "BCA-II", subject: "Python Programming", teacher: "Dr. Arvind Kumar", room: "Room 102" },
    { day: "Mon", slot: "11:15 AM - 12:15 PM", section: "BCA-II", subject: "Web Technologies", teacher: "Suresh Raina", room: "Room 102" },
    { day: "Mon", slot: "12:15 PM - 01:15 PM", section: "BCA-II", subject: "Principles of Management", teacher: "Monica Geller", room: "Room 102" },
    { day: "Mon", slot: "02:00 PM - 03:00 PM", section: "BCA-II", subject: "Coding Lab", teacher: "Prof. Sarah Jenkins", room: "Computer Lab B" },

    { day: "Mon", slot: "09:00 AM - 10:00 AM", section: "CS-A", subject: "Python Programming", teacher: "Dr. Arvind Kumar", room: "Room 101" },
    { day: "Mon", slot: "10:00 AM - 11:00 AM", section: "CS-A", subject: "Database Management", teacher: "Kevin Peterson", room: "Room 101" },

    { day: "Mon", slot: "09:00 AM - 10:00 AM", section: "EC-A", subject: "Software Engineering", teacher: "Dr. Meenakshi Iyer", room: "Room 102" },
    { day: "Mon", slot: "10:00 AM - 11:00 AM", section: "MBA-I", subject: "Principles of Management", teacher: "Monica Geller", room: "Seminar Hall" },

    { day: "Tue", slot: "09:00 AM - 10:00 AM", section: "BCA-I", subject: "Principles of Management", teacher: "Monica Geller", room: "Room 101" },
    { day: "Tue", slot: "10:00 AM - 11:00 AM", section: "BCA-I", subject: "Python Programming", teacher: "Dr. Arvind Kumar", room: "Room 101" },
    { day: "Tue", slot: "11:15 AM - 12:15 PM", section: "BCA-I", subject: "Data Structures", teacher: "Prof. Sarah Jenkins", room: "Room 101" },
    { day: "Tue", slot: "12:15 PM - 01:15 PM", section: "BCA-I", subject: "Discrete Mathematics", teacher: "Vikram Seth", room: "Room 101" },
    { day: "Tue", slot: "02:00 PM - 03:00 PM", section: "BCA-I", subject: "Library", teacher: "Librarian", room: "Seminar Hall" },

    { day: "Tue", slot: "09:00 AM - 10:00 AM", section: "BCA-II", subject: "Operating Systems", teacher: "Rajesh Malhotra", room: "Room 102" },
    { day: "Tue", slot: "10:00 AM - 11:00 AM", section: "BCA-II", subject: "Computer Networks", teacher: "Anita Desai", room: "Room 102" },
    { day: "Tue", slot: "11:15 AM - 12:15 PM", section: "BCA-II", subject: "Database Management", teacher: "Kevin Peterson", room: "Room 102" },

    { day: "Wed", slot: "09:00 AM - 10:00 AM", section: "BCA-I", subject: "Web Technologies", teacher: "Suresh Raina", room: "Room 101" },
    { day: "Wed", slot: "10:00 AM - 11:00 AM", section: "BCA-I", subject: "Software Engineering", teacher: "Dr. Meenakshi Iyer", room: "Room 101" },
    { day: "Wed", slot: "11:15 AM - 12:15 PM", section: "BCA-I", subject: "Data Structures", teacher: "Prof. Sarah Jenkins", room: "Room 101" },

    { day: "Wed", slot: "09:00 AM - 10:00 AM", section: "BCA-II", subject: "Discrete Mathematics", teacher: "Vikram Seth", room: "Room 102" },
    { day: "Wed", slot: "10:00 AM - 11:00 AM", section: "BCA-II", subject: "Principles of Management", teacher: "Monica Geller", room: "Room 102" },

    { day: "Thu", slot: "09:00 AM - 10:00 AM", section: "BCA-I", subject: "Operating Systems", teacher: "Rajesh Malhotra", room: "Room 101" },
    { day: "Thu", slot: "10:00 AM - 11:00 AM", section: "BCA-I", subject: "Computer Networks", teacher: "Anita Desai", room: "Room 101" },

    { day: "Fri", slot: "09:00 AM - 10:00 AM", section: "BCA-I", subject: "Python Programming", teacher: "Dr. Arvind Kumar", room: "Room 101" },
    { day: "Fri", slot: "10:00 AM - 11:00 AM", section: "BCA-I", subject: "Coding Lab", teacher: "Dr. Arvind Kumar", room: "Computer Lab A" },
  ]
};

function buildApiPayload(data) {
  return {
    teachers: data.teachers,
    subjects: data.subjects,
    rooms: data.rooms,
    sections: data.sections,
    time_slots: data.timeSlots,
  };
}

const getBreadcrumbsForPage = (page) => {
  switch (page) {
    case "dashboard": return ["Dashboard"];
    case "timetable": return ["Main", "Timetable Workspace"];
    case "faculty": return ["Main", "Faculty Directory"];
    case "attendance": return ["Main", "Attendance Tracking"];
    case "leave": return ["Main", "Leave Management"];
    case "substitutions": return ["Main", "Substitution Center"];
    case "analytics": return ["Main", "Operational Analytics 360°"];
    case "departments": return ["Academic Setup", "Departments"];
    case "subjects": return ["Academic Setup", "Subjects Catalog"];
    case "sections": return ["Academic Setup", "Sections & Classes"];
    case "rooms": return ["Academic Setup", "Classrooms & Labs"];
    case "slots": return ["Academic Setup", "Daily Time Slots"];
    case "reschedule": return ["Operations", "Reschedule Engine"];
    case "history": return ["Operations", "Audit History Logs"];
    case "integrations": return ["Operations", "Automation & n8n"];
    case "logs": return ["Operations", "System Logs"];
    case "reports": return ["Reports", "Centralized Reports Hub"];
    default: return ["Main", page];
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("Admin");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  const [teachers, setTeachers] = useState(DEMO_TIMETABLE_DATA.teachers);
  const [sections, setSections] = useState(DEMO_TIMETABLE_DATA.sections);
  const [subjects, setSubjects] = useState(DEMO_TIMETABLE_DATA.subjects);
  const [rooms, setRooms] = useState(DEMO_TIMETABLE_DATA.rooms);
  const [timeSlots, setTimeSlots] = useState(DEMO_TIMETABLE_DATA.timeSlots);
  const [result, setResult] = useState(DEMO_RESULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);

  // Load from Supabase on mount
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add("dark");

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

  // Manual Save to Cloud function
  const saveToCloud = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRescheduleNote("");
    try {
      const stateToSave = { teachers, sections, subjects, rooms, timeSlots };
      
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

      // 2. Relational Sync (Structured Tables for n8n/Analytics)
      await syncRelationalData({ ...stateToSave, result });

      setRescheduleNote("Saved successfully to Supabase Cloud & Relational Tables!");
    } catch (e) {
      console.error(e);
      setError({
        title: "Failed to save to Supabase Cloud.",
        suggestions: [e?.message || "Check the Supabase table schema, URL, and anon key, then try again."],
        facts: [],
      });
    } finally {
      setLoading(false);
    }
  }, [teachers, sections, subjects, rooms, timeSlots, result]);

  // --- Periodic Auto-sync (1 min interval) ---
  useEffect(() => {
    if (!user || !isCloudLoaded) return;
    
    // Auto-save every 60 seconds
    const saveInterval = setInterval(() => {
      saveToCloud();
    }, 60000); 

    // Auto-refresh (pull) every 60 seconds to stay in sync
    const refreshInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('timetable_state')
          .select('*')
          .eq('id', 'draft')
          .single();
        
        if (data && !error && !loading) {
          const cloudState = readCloudState(data);
          // Compare strings to avoid unnecessary state updates
          if (cloudState.teachers && JSON.stringify(cloudState.teachers) !== JSON.stringify(teachers)) setTeachers(cloudState.teachers);
          if (cloudState.sections && JSON.stringify(cloudState.sections) !== JSON.stringify(sections)) setSections(cloudState.sections);
          if (cloudState.subjects && JSON.stringify(cloudState.subjects) !== JSON.stringify(subjects)) setSubjects(cloudState.subjects);
          if (cloudState.rooms && JSON.stringify(cloudState.rooms) !== JSON.stringify(rooms)) setRooms(cloudState.rooms);
          if (cloudState.timeSlots && JSON.stringify(cloudState.timeSlots) !== JSON.stringify(timeSlots)) setTimeSlots(cloudState.timeSlots);
        }
      } catch (e) {
        console.warn("Periodic refresh failed", e);
      }
    }, 60000);

    return () => {
      clearInterval(saveInterval);
      clearInterval(refreshInterval);
    };
  }, [teachers, sections, subjects, rooms, timeSlots, user, saveToCloud, isCloudLoaded, loading]);

  const payload = useMemo(
    () => buildApiPayload({ teachers, subjects, rooms, sections, timeSlots }),
    [teachers, subjects, rooms, sections, timeSlots],
  );

  const generateFromPayload = useCallback(async (nextPayload, successMessage = "") => {
    setLoading(true);
    setError(null);
    setRescheduleNote("");
    try {
      const response = await axios.post(`${API_BASE_URL}/generate`, nextPayload);
      setResult(response.data);
      
      // Sync to relational tables immediately after generation
      try {
        await syncRelationalData({ teachers, sections, subjects, rooms, timeSlots, result: response.data });
      } catch (syncErr) {
        console.warn("Relational sync failed after generation", syncErr);
      }

      if (successMessage) setRescheduleNote(successMessage);
      setActiveTab("timetable");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
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
    setResult(DEMO_RESULT);
    setRescheduleNote("⚡ Complete Demo Academic Data & Timetable Solution Loaded!");

    try {
      await generateFromPayload(
        buildApiPayload(demoData),
        "✨ AI-Optimized Demo Timetable generated for 6 sections across 5 departments."
      );
    } catch (err) {
      console.warn("Backend solver call failed, keeping local DEMO_RESULT fallback:", err);
    }
  }, [generateFromPayload]);

  const rescheduleTimetable = async (request) => {
    setLoading(true);
    setError(null);
    setRescheduleNote("");
    try {
      const response = await axios.post(`${API_BASE_URL}/reschedule`, request);
      setResult(response.data);
      const blocked = response.data.reschedule_note?.blocked?.length || 0;
      setRescheduleNote(
        `${request.teacher} unavailable rule applied to ${blocked} slot(s).`,
      );
      setActiveTab("timetable");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setLoading(false);
    }
  };

  const assignProxy = async (request) => {
    setLoading(true);
    setError(null);
    setRescheduleNote("");
    try {
      const response = await axios.post(`${API_BASE_URL}/proxy`, request);
      setResult(response.data);
      setRescheduleNote(
        response.data.reschedule_note?.message || "Proxies assigned.",
      );
      setActiveTab("timetable");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setLoading(false);
    }
  };

  /* ── Export to Excel & Save to DB ── */
  const exportToExcel = useCallback(async () => {
    if (!result) return;

    // Dynamically import xlsx to reduce initial bundle size
    const XLSX = await import("xlsx");

    // Find all unique sections in the assignments
    const sectionsSet = new Set();
    if (result.assignments) {
      result.assignments.forEach((a) => {
        if (a.section) sectionsSet.add(a.section);
      });
    }
    // If no sections were used, provide a default
    if (sectionsSet.size === 0) sectionsSet.add("Default");

    const workbook = XLSX.utils.book_new();

    sectionsSet.forEach((section) => {
      // 1. Header Info Row
      const branchName = section.includes("-")
        ? section.split("-")[0]
        : "Default";
      const sectionName = section.includes("-")
        ? section.split("-")[1]
        : section;
      const sectionObj = sections.find((s) => s.name === section);
      const roomDisplay = sectionObj && sectionObj.room ? sectionObj.room : "Auto";
      const headerInfoRow = [
        `Branch: ${branchName}`,
        "",
        `Section: ${sectionName}`,
        "",
        `Room No.: ${roomDisplay}`,
        "",
        `Classes w.e.f.: ${new Date().toLocaleDateString()}`,
      ];

      // 2. Period Numbers Row
      const periodNums = ["Day / (Period & Time)"];
      const timeSlotsRow = [""];
      const lunchColIdxList = []; // store index where lunch is inserted

      let periodCounter = 1;
      for (let i = 0; i < result.time_slots.length; i++) {
        periodNums.push(
          ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][
            periodCounter - 1
          ] || periodCounter.toString(),
        );
        timeSlotsRow.push(result.time_slots[i]);

        // Check for gap (lunch) between this slot and the next
        if (i < result.time_slots.length - 1) {
          const endMatch = result.time_slots[i].split("-")[1].trim();
          const nextStartMatch = result.time_slots[i + 1].split("-")[0].trim();
          if (endMatch !== nextStartMatch) {
            // We insert a LUNCH column here
            periodNums.push("");
            timeSlotsRow.push("LUNCH");
            lunchColIdxList.push(timeSlotsRow.length - 1);
          }
        }
        periodCounter++;
      }

      const rows = [];
      rows.push(headerInfoRow);
      rows.push(periodNums);
      rows.push(timeSlotsRow);

      const sectionSubjectsMap = new Map();

      // 4. Grid Rows
      result.days.forEach((day) => {
        const row = [day];
        let slotCounter = 0;

        for (let i = 1; i < timeSlotsRow.length; i++) {
          if (lunchColIdxList.includes(i)) {
            row.push(""); // Lunch cell
            continue;
          }
          const slotName = result.time_slots[slotCounter];
          const assignments = result.timetable?.[day]?.[slotName] || [];
          const secAssigned = assignments.find(
            (a) =>
              a.section === section || (!a.section && section === "Default"),
          );

          if (!secAssigned) {
            row.push("");
          } else {
            if (secAssigned.code || secAssigned.subject) {
              sectionSubjectsMap.set(
                secAssigned.code || secAssigned.subject,
                secAssigned,
              );
            }
            row.push(secAssigned.code ? secAssigned.code : secAssigned.subject);
          }
          slotCounter++;
        }
        rows.push(row);
      });

      // 5. Blank Row
      rows.push([]);

      // 6. Subjects Table
      rows.push([
        "Subjects as per University Scheme",
        "",
        "Lab. Room No.",
        "Name of Faculty",
      ]);
      rows.push(["Code No.", "Name of Subject", "", ""]);

      sectionSubjectsMap.forEach((info) => {
        rows.push([
          info.code || "-",
          info.subject || "-",
          info.is_lab ? info.room : "",
          info.teacher || "-",
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(rows);

      // Add simple merges for the subjects table header
      if (!worksheet["!merges"]) worksheet["!merges"] = [];
      const subjHeaderRowIdx = 4 + result.days.length; // 0-indexed: 3 rows top + days length + 1 blank
      worksheet["!merges"].push({
        s: { r: subjHeaderRowIdx, c: 0 },
        e: { r: subjHeaderRowIdx, c: 1 },
      });

      // Sheet name max length is 31
      let sheetName = section.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 31);
      if (!sheetName) sheetName = "Sheet1";
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Merge Lunch cells vertically if there is a lunch column
      lunchColIdxList.forEach((colIdx) => {
        // Merge from row 2 (timeSlotsRow) down to last day row
        const startRow = 2; // index of timeSlotsRow
        const endRow = 2 + result.days.length;
        worksheet["!merges"].push({
          s: { r: startRow, c: colIdx },
          e: { r: endRow, c: colIdx },
        });
      });
    });

    // Generate Teacher Sheets
    const teachersSet = new Set();
    if (result.assignments) {
      result.assignments.forEach((a) => {
        if (a.teacher) teachersSet.add(a.teacher);
      });
    }

    teachersSet.forEach((teacherName) => {
      const headerInfoRow = [
        `Teacher: ${teacherName}`,
        "",
        "",
        "",
        "",
        "",
        `Generated: ${new Date().toLocaleDateString()}`,
      ];

      const periodNums = ["Day / (Period & Time)"];
      const timeSlotsRow = [""];
      const lunchColIdxList = [];

      let periodCounter = 1;
      for (let i = 0; i < result.time_slots.length; i++) {
        periodNums.push(
          ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][
            periodCounter - 1
          ] || periodCounter.toString(),
        );
        timeSlotsRow.push(result.time_slots[i]);
        if (i < result.time_slots.length - 1) {
          const endMatch = result.time_slots[i].split("-")[1].trim();
          const nextStartMatch = result.time_slots[i + 1].split("-")[0].trim();
          if (endMatch !== nextStartMatch) {
            periodNums.push("");
            timeSlotsRow.push("LUNCH");
            lunchColIdxList.push(timeSlotsRow.length - 1);
          }
        }
        periodCounter++;
      }

      const rows = [];
      rows.push(headerInfoRow);
      rows.push(periodNums);
      rows.push(timeSlotsRow);

      result.days.forEach((day) => {
        const row = [day];
        let slotCounter = 0;

        for (let i = 1; i < timeSlotsRow.length; i++) {
          if (lunchColIdxList.includes(i)) {
            row.push(""); // Lunch cell
            continue;
          }
          const slotName = result.time_slots[slotCounter];
          const assignments = result.timetable?.[day]?.[slotName] || [];
          const teacherAssigned = assignments.find(
            (a) => a.teacher === teacherName,
          );

          if (!teacherAssigned) {
            row.push("");
          } else {
            const codeDisplay = teacherAssigned.code
              ? teacherAssigned.code
              : teacherAssigned.subject;
            row.push(
              `${codeDisplay} (${teacherAssigned.room}) [${teacherAssigned.section || "Auto"}]`,
            );
          }
          slotCounter++;
        }
        rows.push(row);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      if (!worksheet["!merges"]) worksheet["!merges"] = [];

      lunchColIdxList.forEach((colIdx) => {
        const startRow = 2;
        const endRow = 2 + result.days.length;
        worksheet["!merges"].push({
          s: { r: startRow, c: colIdx },
          e: { r: endRow, c: colIdx },
        });
      });

      let sheetName = teacherName
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .substring(0, 31);
      if (!sheetName) sheetName = "Teacher1";
      // ensure unique
      while (workbook.SheetNames.includes(sheetName))
        sheetName =
          sheetName.substring(0, 28) + Math.floor(Math.random() * 100);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(data, `timetable_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [result, sections]);

  const saveToDatabase = async () => {
    if (!result) return;
    setLoading(true);
    setError(null);
    try {
      await axios.post(`${API_BASE_URL}/save`, {
        name: `Timetable - ${new Date().toLocaleString()}`,
        timetable_data: result,
      });
      setRescheduleNote(
        "Timetable saved to free SQLite database successfully!",
      );
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ 
           role: session.user.user_metadata?.role || "teacher", 
           name: session.user.user_metadata?.name || session.user.email 
        });
      }
    });

    // Listen for auth state changes (login/logout/signup)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ 
           role: session.user.user_metadata?.role || "teacher", 
           name: session.user.user_metadata?.name || session.user.email 
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    setUser(null);
  };

  if (!user) {
    return <LoginPage />;
  }

  if (user.role === "teacher") {
    return <TeacherDashboard user={user} result={result} onLogout={handleLogout} />;
  }

  return (
    <AppShell
      activePage={activeTab}
      onSelectPage={(page, id) => {
        setActiveTab(page);
        if (id) setSelectedFaculty({ id });
      }}
      pageTitle={getBreadcrumbsForPage(activeTab).slice(-1)[0]}
      breadcrumbs={getBreadcrumbsForPage(activeTab)}
      userRole={userRole}
      onRoleChange={setUserRole}
      onSaveCloud={saveToCloud}
      isCloudSaving={loading}
      onLoadDemo={generateDemoTimetable}
      user={user}
      onLogout={handleLogout}
    >
      {/* Global Alerts */}
      <ErrorAlert error={error} />
      {rescheduleNote && (
        <div className="animate-slide-down flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm px-5 py-4 text-sm text-emerald-200 mb-4">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{rescheduleNote}</span>
        </div>
      )}

      {/* ── Active Module Rendering ── */}
      {/* 1. DASHBOARD */}
      {activeTab === "dashboard" && (
        <InstitutionalDashboard
          teachersCount={teachers.length}
          sectionsCount={sections.length}
          subjectsCount={subjects.length}
          roomsCount={rooms.length}
          hasResult={!!result}
          onNavigate={(page) => setActiveTab(page)}
        />
      )}

      {/* 2. TIMETABLE WORKSPACE */}
      {activeTab === "timetable" && (
        <div className="space-y-6">
          {/* Solver Controls Header Bar */}
          <div className="card p-5 bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Academic Timetable Solver Workspace</h2>
              <p className="text-xs text-slate-400 mt-0.5">Generate, optimize, view, and export constraint-validated timetable grids.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="btn-gradient text-xs py-2.5 px-5 font-bold flex items-center gap-2"
                disabled={loading || teachers.length === 0 || subjects.length === 0}
                onClick={generateTimetable}
              >
                {loading ? "Solving..." : "✨ Generate AI Timetable"}
              </button>
            </div>
          </div>

          {result && (
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-slate-300">Status: {result.solver_status}</span>
              </div>
              <div className="text-violet-300">Score: <strong className="text-white">{result.objective_score}</strong></div>
              <div className="text-emerald-300">Scheduled Classes: <strong className="text-white">{result.assignments?.length || 0}</strong></div>
            </div>
          )}

          <TimetableGrid result={result} subjects={subjects} loading={loading} onExport={exportToExcel} onSaveDb={saveToDatabase} />
        </div>
      )}

      {/* 3. FACULTY SYSTEM */}
      {activeTab === "faculty" && (
        <div>
          <FacultyDashboardStats />
          {selectedFaculty ? (
            <FacultyProfile faculty={selectedFaculty} onBack={() => setSelectedFaculty(null)} />
          ) : (
            <div className="space-y-8">
              <FacultyDirectory onSelectFaculty={(f) => setSelectedFaculty(f)} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <LeaveManagement />
                <SubstitutionPanel />
              </div>
              <AttendanceDashboard />
            </div>
          )}
        </div>
      )}

      {/* 4. ATTENDANCE WORKSPACE */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          <FacultyDashboardStats />
          <AttendanceDashboard />
        </div>
      )}

      {/* 5. OPERATIONAL ANALYTICS 360° */}
      {activeTab === "analytics" && (
        <FacultyAnalyticsModule initialFacultyId={selectedFaculty?.id} />
      )}

      {/* 9. ACADEMIC SETUP: SUBJECTS */}
      {activeTab === "subjects" && (
        <SubjectsSection subjects={subjects} teachers={teachers} sections={sections} rooms={rooms} onChange={setSubjects} />
      )}

      {/* 10. ACADEMIC SETUP: SECTIONS */}
      {activeTab === "sections" && (
        <SectionsManagement
          sections={sections}
          rooms={rooms}
          subjects={subjects}
          teachers={teachers}
          onChange={setSections}
          onNavigate={(p) => setActiveTab(p)}
        />
      )}

      {/* 11. ACADEMIC SETUP: ROOMS */}
      {activeTab === "rooms" && (
        <RoomsSection rooms={rooms} onChange={setRooms} result={result} timeSlots={timeSlots} />
      )}

      {/* 12. ACADEMIC SETUP: SLOTS */}
      {activeTab === "slots" && (
        <TimeSlotsSection timeSlots={timeSlots} onChange={setTimeSlots} />
      )}

      {/* 13. OPERATIONS: RESCHEDULE */}
      {activeTab === "reschedule" && (
        <ReschedulePanel teachers={teachers} days={result?.days || ["Mon", "Tue", "Wed", "Thu", "Fri"]} slots={result?.time_slots || timeSlots} hasResult={!!result} loading={loading} onReschedule={rescheduleTimetable} onAssignProxy={assignProxy} />
      )}

      {/* 14. OPERATIONS: HISTORY */}
      {activeTab === "history" && (
        <HistorySection onSelectTimetable={(data) => { setResult(data); setActiveTab("timetable"); setRescheduleNote("Loaded saved timetable from database."); }} />
      )}

      {/* 15. OPERATIONS: INTEGRATIONS */}
      {activeTab === "integrations" && (
        <IntegrationsSection />
      )}

      {/* 16. OPERATIONS: LOGS */}
      {activeTab === "logs" && (
        <LogsSection />
      )}

      {/* 17. REPORTS CENTER */}
      {activeTab === "reports" && (
        <ReportsCenter />
      )}

      {/* AIChatBot Floating Assistant */}
      <AIChatBot 
        result={result} 
        onLoadDemo={generateDemoTimetable}
        onExtractedData={(data) => {
          if (data.teachers && data.teachers.length > 0) {
             const cleanTeachers = data.teachers.map(t => {
                let parsedFP = parseInt(t.free_periods);
                return {
                   name: t.name,
                   free_periods: isNaN(parsedFP) ? 1 : Math.max(0, parsedFP)
                };
             });
             setTeachers(cleanTeachers);
          }
          if (data.sections && data.sections.length > 0) setSections(data.sections);
          if (data.subjects && data.subjects.length > 0) setSubjects(data.subjects);
          if (data.rooms && data.rooms.length > 0) setRooms(data.rooms);
          if (data.timeSlots && data.timeSlots.length > 0) setTimeSlots(data.timeSlots);
          setRescheduleNote("AI successfully extracted and seamlessly filled timetable data from your image!");
        }}
      />

      {/* Global Loading Overlay */}
      {loading && activeTab !== "timetable" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md animate-fade-in">
          <div className="glass-card flex flex-col items-center gap-6 p-10 animate-scale-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-violet-500/10 animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">AI Engine Working</h3>
              <p className="text-sm text-slate-400 mt-1">Processing complex academic constraints...</p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
