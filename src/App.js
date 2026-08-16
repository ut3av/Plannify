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
import AttendanceDashboard from "./components/faculty/AttendanceDashboard";
import FacultyDashboardStats from "./components/faculty/FacultyDashboardStats";
import FacultyAnalyticsModule from "./components/faculty/FacultyAnalyticsModule";
import AppShell from "./components/shell/AppShell";
import InstitutionalDashboard from "./components/dashboard/InstitutionalDashboard";
import SectionsManagement from "./components/sections/SectionsManagement";
import ReportsCenter from "./components/reports/ReportsCenter";

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
    { name: "Prof Ripusoodan Sharma", department: "Computer Applications", free_periods: 1, email: "ripusoodan.sharma@lnctu.ac.in", phone: "+91-7869543871" },
    { name: "Prof Anshu Gangwar", department: "Computer Applications", free_periods: 1, email: "anshu.gangwar@lnctu.ac.in", phone: "+91-8519064890" },
    { name: "Dr Satish Manwani", department: "Computer Applications", free_periods: 1, email: "satish.manwani@lnctu.ac.in", phone: "+91-9893724144" },
    { name: "Prof Pragya Shastri", department: "Computer Applications", free_periods: 1, email: "pragya.shastri@lnctu.ac.in", phone: "+91-9589952503" },
    { name: "Prof Mohit Kubade", department: "Computer Applications", free_periods: 1, email: "mohit.kubade@lnctu.ac.in", phone: "+91-7804817594" },
    { name: "Dr Sonal Sharma", department: "Computer Applications", free_periods: 1, email: "sonal.sharma@lnctu.ac.in", phone: "+91-9425644974" },
    { name: "Mr. Aniket Satpute", department: "AI & DA", free_periods: 1, email: "aniket.satpute@lnctu.ac.in", phone: "+91-7028467010" },
    { name: "Prof Jagruti Durugkar", department: "AI & DA", free_periods: 1, email: "jagruti.durugkar@lnctu.ac.in", phone: "+91-8964877562" },
    { name: "Mr Kaiwalya Zankar", department: "AI & DA", free_periods: 1, email: "kaiwalya.zankar@lnctu.ac.in", phone: "+91-9834921305" },
    { name: "Ms. Swarupa Waghmare", department: "AI & DA", free_periods: 1, email: "swarupa.waghmare@lnctu.ac.in", phone: "+91-8482894207" },
    { name: "Prof Dipanshu Jha", department: "Computer Applications", free_periods: 1, email: "dipanshu.jha@lnctu.ac.in", phone: "+91-8462821467" },
    { name: "Dr Alka Gulati", department: "AI & DA", free_periods: 1, email: "alka.gulati@lnctu.ac.in", phone: "+91-9826722264" },
    { name: "Prof Neha Swanakar", department: "Computer Applications", free_periods: 1, email: "neha.swanakar@lnctu.ac.in", phone: "+91-9300787622" },
    { name: "Dr Swagatika Lenka", department: "Computer Applications", free_periods: 1, email: "swagatika.lenka@lnctu.ac.in", phone: "+91-8637248598" },
    { name: "Mr Jitendra Maind", department: "AI & DA", free_periods: 1, email: "jitendra.maind@lnctu.ac.in", phone: "+91-7875492545" },
    { name: "Prof Pramod Kumar Saket", department: "Computer Applications", free_periods: 1, email: "pramod.saket@lnctu.ac.in", phone: "+91-9039371123" },
    { name: "Prof Atul Verma", department: "Computer Applications", free_periods: 1, email: "atul.verma@lnctu.ac.in", phone: "+91-9569455529" }
  ],
  sections: [
    { name: "Section A (BCA-III)", room: "308/MCA", lab_room: "Lab Room No. 006" },
    { name: "Section B (BCA-III)", room: "401/MCA", lab_room: "Lab Room No. 006" },
    { name: "Section C (BCA-III)", room: "402/MCA", lab_room: "Lab Room No. 002" },
    { name: "Section D (BCA-III)", room: "404/MCA", lab_room: "Lab Room No. 003" },
    { name: "Section E (BCA-III)", room: "407/MCA", lab_room: "Lab Room No. 003" },
    { name: "Section F (BCA-III)", room: "408/MCA", lab_room: "Lab Room No. 007" },
  ],
  rooms: ["308/MCA", "401/MCA", "402/MCA", "403/MCA", "404/MCA", "407/MCA", "408/MCA", "Lab Room No. 002", "Lab Room No. 003", "Lab Room No. 006", "Lab Room No. 007", "Seminar Hall"],
  timeSlots: [
    "09:00 AM - 09:45 AM",
    "09:45 AM - 10:30 AM",
    "10:30 AM - 11:20 AM",
    "11:20 AM - 12:10 PM",
    "12:10 PM - 01:00 PM",
    "01:00 PM - 01:50 PM",
    "01:50 PM - 02:40 PM",
    "02:40 PM - 03:30 PM"
  ],
  subjects: [
    { code: "BCA-301", name: "Object Oriented Programming in C++", teacher: "Prof Ripusoodan Sharma", sections: ["Section A (BCA-III)"], required_slots: 3, colorIndex: 0 },
    { code: "BCA-302", name: "Data Base Management System", teacher: "Prof Anshu Gangwar", sections: ["Section A (BCA-III)"], required_slots: 3, colorIndex: 1 },
    { code: "BCA-303", name: "Accounting and Management Control", teacher: "Dr Satish Manwani", sections: ["Section A (BCA-III)"], required_slots: 3, colorIndex: 2 },
    { code: "BCA-304", name: "Soft Skills & Entrepreneurship", teacher: "Prof Pragya Shastri", sections: ["Section A (BCA-III)"], required_slots: 3, colorIndex: 3 },
    { code: "BCA-305", name: "Linux & Shell Programming", teacher: "Prof Mohit Kubade", sections: ["Section A (BCA-III)"], required_slots: 3, colorIndex: 4 },
    { code: "BCA-306", name: "Programming Lab in C++", teacher: "Prof Ripusoodan Sharma", sections: ["Section A (BCA-III)"], is_lab: true, required_slots: 2, colorIndex: 5 },
    { code: "BCA-307", name: "Programming Lab in DBMS", teacher: "Prof Anshu Gangwar", sections: ["Section A (BCA-III)"], is_lab: true, required_slots: 2, colorIndex: 6 },
    { code: "BAI-301", name: "Object Oriented Programming in C++", teacher: "Dr Alka Gulati", sections: ["Section B (BCA-III)", "Section C (BCA-III)", "Section D (BCA-III)", "Section E (BCA-III)", "Section F (BCA-III)"], required_slots: 3, colorIndex: 7 },
    { code: "BAI-302", name: "Data Base Management System", teacher: "Prof Dipanshu Jha", sections: ["Section B (BCA-III)", "Section C (BCA-III)", "Section D (BCA-III)", "Section E (BCA-III)", "Section F (BCA-III)"], required_slots: 3, colorIndex: 8 },
    { code: "BAI-303", name: "Statistical Modelling & Python", teacher: "Mr. Aniket Satpute", sections: ["Section B (BCA-III)", "Section C (BCA-III)", "Section D (BCA-III)", "Section E (BCA-III)", "Section F (BCA-III)"], required_slots: 3, colorIndex: 0 },
    { code: "BAI-304", name: "Discrete Maths", teacher: "Prof Jagruti Durugkar", sections: ["Section B (BCA-III)", "Section C (BCA-III)", "Section D (BCA-III)", "Section E (BCA-III)", "Section F (BCA-III)"], required_slots: 3, colorIndex: 1 },
    { code: "BAI-305", name: "Data Visualization", teacher: "Ms. Swarupa Waghmare", sections: ["Section B (BCA-III)", "Section C (BCA-III)", "Section D (BCA-III)", "Section E (BCA-III)", "Section F (BCA-III)"], required_slots: 3, colorIndex: 2 },
    { code: "BAI-306", name: "Programming Lab in C++", teacher: "Prof Mohit Kubade", sections: ["Section B (BCA-III)", "Section C (BCA-III)", "Section D (BCA-III)", "Section E (BCA-III)", "Section F (BCA-III)"], is_lab: true, required_slots: 2, colorIndex: 3 },
    { code: "BAI-307", name: "Programming Lab in DBMS", teacher: "Prof Pramod Kumar Saket", sections: ["Section B (BCA-III)", "Section C (BCA-III)", "Section D (BCA-III)", "Section E (BCA-III)", "Section F (BCA-III)"], is_lab: true, required_slots: 2, colorIndex: 4 },
  ],
};

const DEMO_RESULT = {
  solver_status: "FEASIBLE (Optimal)",
  objective_score: 0,
  days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  time_slots: [
    "09:00 AM - 09:45 AM",
    "09:45 AM - 10:30 AM",
    "10:30 AM - 11:20 AM",
    "11:20 AM - 12:10 PM",
    "12:10 PM - 01:00 PM",
    "01:00 PM - 01:50 PM",
    "01:50 PM - 02:40 PM",
    "02:40 PM - 03:30 PM"
  ],
  assignments: [
    // SECTION A
    { day: "Mon", slot: "10:30 AM - 11:20 AM", section: "Section A (BCA-III)", subject: "Linux & Shell Programming", code: "BCA-305", teacher: "Prof Mohit Kubade", room: "308/MCA" },
    { day: "Mon", slot: "11:20 AM - 12:10 PM", section: "Section A (BCA-III)", subject: "Soft Skills & Entrepreneurship", code: "BCA-304", teacher: "Prof Pragya Shastri", room: "308/MCA" },
    { day: "Mon", slot: "01:00 PM - 01:50 PM", section: "Section A (BCA-III)", subject: "Accounting & Management Control", code: "BCA-303", teacher: "Dr Satish Manwani", room: "308/MCA" },
    { day: "Mon", slot: "02:40 PM - 03:30 PM", section: "Section A (BCA-III)", subject: "Programming Lab in C++", code: "BCA-306", teacher: "Prof Ripusoodan Sharma", room: "Lab Room No. 006" },

    { day: "Tue", slot: "10:30 AM - 11:20 AM", section: "Section A (BCA-III)", subject: "Soft Skills & Entrepreneurship", code: "BCA-304", teacher: "Prof Pragya Shastri", room: "308/MCA" },
    { day: "Tue", slot: "11:20 AM - 12:10 PM", section: "Section A (BCA-III)", subject: "Accounting Tutorial", code: "BCA-303/T", teacher: "Dr Satish Manwani", room: "308/MCA" },
    { day: "Tue", slot: "01:00 PM - 01:50 PM", section: "Section A (BCA-III)", subject: "Linux & Shell Programming", code: "BCA-305", teacher: "Prof Mohit Kubade", room: "308/MCA" },
    { day: "Tue", slot: "02:40 PM - 03:30 PM", section: "Section A (BCA-III)", subject: "Programming Lab in C++", code: "BCA-306", teacher: "Prof Ripusoodan Sharma", room: "Lab Room No. 006" },

    { day: "Wed", slot: "10:30 AM - 11:20 AM", section: "Section A (BCA-III)", subject: "Accounting & Management Control", code: "BCA-303", teacher: "Dr Satish Manwani", room: "308/MCA" },
    { day: "Wed", slot: "11:20 AM - 12:10 PM", section: "Section A (BCA-III)", subject: "Soft Skills Tutorial", code: "BCA-304/T", teacher: "Prof Pragya Shastri", room: "308/MCA" },
    { day: "Wed", slot: "01:00 PM - 01:50 PM", section: "Section A (BCA-III)", subject: "Object Oriented Programming in C++", code: "BCA-301", teacher: "Prof Ripusoodan Sharma", room: "308/MCA" },
    { day: "Wed", slot: "02:40 PM - 03:30 PM", section: "Section A (BCA-III)", subject: "Programming Lab in DBMS", code: "BCA-307", teacher: "Prof Anshu Gangwar", room: "Lab Room No. 007" },

    { day: "Thu", slot: "10:30 AM - 11:20 AM", section: "Section A (BCA-III)", subject: "Accounting & Management Control", code: "BCA-303", teacher: "Dr Satish Manwani", room: "308/MCA" },
    { day: "Thu", slot: "11:20 AM - 12:10 PM", section: "Section A (BCA-III)", subject: "Object Oriented Programming in C++", code: "BCA-301", teacher: "Prof Ripusoodan Sharma", room: "308/MCA" },
    { day: "Thu", slot: "01:00 PM - 01:50 PM", section: "Section A (BCA-III)", subject: "Data Base Management System", code: "BCA-302", teacher: "Prof Anshu Gangwar", room: "308/MCA" },
    { day: "Thu", slot: "01:50 PM - 02:40 PM", section: "Section A (BCA-III)", subject: "Library Session", code: "Library", teacher: "Prof Anshu Gangwar", room: "308/MCA" },
    { day: "Thu", slot: "02:40 PM - 03:30 PM", section: "Section A (BCA-III)", subject: "Linux & Shell Programming", code: "BCA-305", teacher: "Prof Mohit Kubade", room: "308/MCA" },

    { day: "Fri", slot: "10:30 AM - 11:20 AM", section: "Section A (BCA-III)", subject: "Data Base Management System", code: "BCA-302", teacher: "Prof Anshu Gangwar", room: "308/MCA" },
    { day: "Fri", slot: "11:20 AM - 12:10 PM", section: "Section A (BCA-III)", subject: "Soft Skills & Entrepreneurship", code: "BCA-304", teacher: "Prof Pragya Shastri", room: "308/MCA" },
    { day: "Fri", slot: "01:00 PM - 01:50 PM", section: "Section A (BCA-III)", subject: "Data Base Management System", code: "BCA-302", teacher: "Prof Anshu Gangwar", room: "308/MCA" },
    { day: "Fri", slot: "01:50 PM - 02:40 PM", section: "Section A (BCA-III)", subject: "Linux Tutorial", code: "BCA-305/T", teacher: "Prof Mohit Kubade", room: "308/MCA" },
    { day: "Fri", slot: "02:40 PM - 03:30 PM", section: "Section A (BCA-III)", subject: "Object Oriented Programming in C++", code: "BCA-301", teacher: "Prof Ripusoodan Sharma", room: "308/MCA" },

    // SECTION B
    { day: "Mon", slot: "11:20 AM - 12:10 PM", section: "Section B (BCA-III)", subject: "Programming Lab in C++", code: "BAI-306", teacher: "Prof Ripusoodan Sharma", room: "Lab Room No. 006" },
    { day: "Mon", slot: "01:00 PM - 01:50 PM", section: "Section B (BCA-III)", subject: "Statistical Modelling & Python", code: "BAI-303", teacher: "Mr. Aniket Satpute", room: "401/MCA" },
    { day: "Mon", slot: "01:50 PM - 02:40 PM", section: "Section B (BCA-III)", subject: "Data Visualization", code: "BAI-305", teacher: "Mr Kaiwalya Zankar", room: "401/MCA" },
    { day: "Mon", slot: "02:40 PM - 03:30 PM", section: "Section B (BCA-III)", subject: "Library Session", code: "Library", teacher: "Prof Jagruti Durugkar", room: "401/MCA" },

    { day: "Tue", slot: "10:30 AM - 11:20 AM", section: "Section B (BCA-III)", subject: "Discrete Maths", code: "BAI-304", teacher: "Prof Jagruti Durugkar", room: "401/MCA" },
    { day: "Tue", slot: "11:20 AM - 12:10 PM", section: "Section B (BCA-III)", subject: "Python Tutorial", code: "BAI-303/T", teacher: "Mr. Aniket Satpute", room: "401/MCA" },
    { day: "Tue", slot: "01:00 PM - 01:50 PM", section: "Section B (BCA-III)", subject: "Object Oriented Programming in C++", code: "BAI-301", teacher: "Prof Ripusoodan Sharma", room: "401/MCA" },
    { day: "Tue", slot: "02:40 PM - 03:30 PM", section: "Section B (BCA-III)", subject: "Programming Lab in DBMS", code: "BAI-307", teacher: "Prof Anshu Gangwar", room: "Lab Room No. 007" },

    { day: "Wed", slot: "10:30 AM - 11:20 AM", section: "Section B (BCA-III)", subject: "Discrete Maths", code: "BAI-304", teacher: "Prof Jagruti Durugkar", room: "401/MCA" },
    { day: "Wed", slot: "11:20 AM - 12:10 PM", section: "Section B (BCA-III)", subject: "Statistical Modelling & Python", code: "BAI-303", teacher: "Mr. Aniket Satpute", room: "401/MCA" },
    { day: "Wed", slot: "01:00 PM - 01:50 PM", section: "Section B (BCA-III)", subject: "Data Base Management System", code: "BAI-302", teacher: "Prof Anshu Gangwar", room: "401/MCA" },
    { day: "Wed", slot: "01:50 PM - 02:40 PM", section: "Section B (BCA-III)", subject: "Object Oriented Programming in C++", code: "BAI-301", teacher: "Prof Ripusoodan Sharma", room: "401/MCA" },
    { day: "Wed", slot: "02:40 PM - 03:30 PM", section: "Section B (BCA-III)", subject: "Data Visualization", code: "BAI-305", teacher: "Mr Kaiwalya Zankar", room: "401/MCA" },

    // SECTION C
    { day: "Mon", slot: "10:30 AM - 11:20 AM", section: "Section C (BCA-III)", subject: "Programming Lab in DBMS", code: "BAI-307", teacher: "Prof Anshu Gangwar", room: "Lab Room No. 007" },
    { day: "Mon", slot: "01:00 PM - 01:50 PM", section: "Section C (BCA-III)", subject: "Object Oriented Programming in C++", code: "BAI-301", teacher: "Prof Ripusoodan Sharma", room: "402/MCA" },
    { day: "Mon", slot: "01:50 PM - 02:40 PM", section: "Section C (BCA-III)", subject: "Discrete Maths", code: "BAI-304", teacher: "Prof Jagruti Durugkar", room: "402/MCA" },
    { day: "Mon", slot: "02:40 PM - 03:30 PM", section: "Section C (BCA-III)", subject: "Python Tutorial", code: "BAI-303/T", teacher: "Mr. Aniket Satpute", room: "402/MCA" },

    { day: "Tue", slot: "10:30 AM - 11:20 AM", section: "Section C (BCA-III)", subject: "Object Oriented Programming in C++", code: "BAI-301", teacher: "Prof Ripusoodan Sharma", room: "402/MCA" },
    { day: "Tue", slot: "11:20 AM - 12:10 PM", section: "Section C (BCA-III)", subject: "Data Visualization", code: "BAI-305", teacher: "Ms. Swarupa Waghmare", room: "402/MCA" },
    { day: "Tue", slot: "01:00 PM - 01:50 PM", section: "Section C (BCA-III)", subject: "Data Base Management System", code: "BAI-302", teacher: "Prof Anshu Gangwar", room: "402/MCA" },

    // SECTION D
    { day: "Mon", slot: "10:30 AM - 11:20 AM", section: "Section D (BCA-III)", subject: "Programming Lab in C++", code: "BAI-306", teacher: "Prof Mohit Kubade", room: "Lab Room No. 006" },
    { day: "Mon", slot: "11:20 AM - 12:10 PM", section: "Section D (BCA-III)", subject: "Data Visualization", code: "BAI-305", teacher: "Ms. Swarupa Waghmare", room: "404/MCA" },
    { day: "Mon", slot: "01:00 PM - 01:50 PM", section: "Section D (BCA-III)", subject: "Object Oriented Programming in C++", code: "BAI-301", teacher: "Prof Mohit Kubade", room: "404/MCA" },
    { day: "Mon", slot: "02:40 PM - 03:30 PM", section: "Section D (BCA-III)", subject: "Data Base Management System", code: "BAI-302", teacher: "Prof Dipanshu Jha", room: "404/MCA" },

    // SECTION E
    { day: "Mon", slot: "10:30 AM - 11:20 AM", section: "Section E (BCA-III)", subject: "Data Base Management System", code: "BAI-302", teacher: "Dr Alka Gulati", room: "407/MCA" },
    { day: "Mon", slot: "11:20 AM - 12:10 PM", section: "Section E (BCA-III)", subject: "Discrete Maths", code: "BAI-304", teacher: "Prof Jagruti Durugkar", room: "407/MCA" },
    { day: "Mon", slot: "01:00 PM - 01:50 PM", section: "Section E (BCA-III)", subject: "Object Oriented Programming in C++", code: "BAI-301", teacher: "Dr Alka Gulati", room: "407/MCA" },
    { day: "Mon", slot: "02:40 PM - 03:30 PM", section: "Section E (BCA-III)", subject: "Statistical Modelling & Python", code: "BAI-303", teacher: "Mr Jitendra Maind", room: "407/MCA" },

    // SECTION F
    { day: "Mon", slot: "10:30 AM - 11:20 AM", section: "Section F (BCA-III)", subject: "Statistical Modelling & Python", code: "BAI-303", teacher: "Mr Jitendra Maind", room: "408/MCA" },
    { day: "Mon", slot: "11:20 AM - 12:10 PM", section: "Section F (BCA-III)", subject: "Object Oriented Programming in C++", code: "BAI-301", teacher: "Prof Mohit Kubade", room: "408/MCA" },
    { day: "Mon", slot: "02:40 PM - 03:30 PM", section: "Section F (BCA-III)", subject: "Programming Lab in C++", code: "BAI-306", teacher: "Prof Mohit Kubade", room: "Lab Room No. 002" },
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
    case "slots": return ["Academic Setup", "Time Slots"];
    case "reschedule": return ["Operations", "Reschedule Engine"];
    case "history": return ["Operations", "History & Audit Logs"];
    case "integrations": return ["Operations", "Automation & n8n"];
    case "logs": return ["Operations", "System Logs"];
    case "reports": return ["Reports", "Reports Center"];
    default: return ["Main"];
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

  // Cloud Save function (supports silent background sync)
  const saveToCloud = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setError(null);
      setRescheduleNote("");
    }
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

      if (!isSilent) {
        setRescheduleNote("Saved successfully to Supabase Cloud & Relational Tables!");
      }
    } catch (e) {
      console.error(e);
      if (!isSilent) {
        setError({
          title: "Failed to save to Supabase Cloud.",
          suggestions: [e?.message || "Check the Supabase table schema, URL, and anon key, then try again."],
          facts: [],
        });
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [teachers, sections, subjects, rooms, timeSlots, result]);

  // --- Periodic Background Auto-sync (1 min interval, completely silent) ---
  useEffect(() => {
    if (!user || !isCloudLoaded) return;
    
    // Auto-save silently every 60 seconds
    const saveInterval = setInterval(() => {
      saveToCloud(true);
    }, 60000); 

    // Auto-refresh (pull) silently every 60 seconds to stay in sync
    const refreshInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('timetable_state')
          .select('*')
          .eq('id', 'draft')
          .single();
        
        if (data && !error) {
          const cloudState = readCloudState(data);
          // Compare strings to avoid unnecessary state updates
          if (cloudState.teachers && JSON.stringify(cloudState.teachers) !== JSON.stringify(teachers)) setTeachers(cloudState.teachers);
          if (cloudState.sections && JSON.stringify(cloudState.sections) !== JSON.stringify(sections)) setSections(cloudState.sections);
          if (cloudState.subjects && JSON.stringify(cloudState.subjects) !== JSON.stringify(subjects)) setSubjects(cloudState.subjects);
          if (cloudState.rooms && JSON.stringify(cloudState.rooms) !== JSON.stringify(rooms)) setRooms(cloudState.rooms);
          if (cloudState.timeSlots && JSON.stringify(cloudState.timeSlots) !== JSON.stringify(timeSlots)) setTimeSlots(cloudState.timeSlots);
        }
      } catch (e) {
        console.warn("Background refresh failed silently", e);
      }
    }, 60000);

    return () => {
      clearInterval(saveInterval);
      clearInterval(refreshInterval);
    };
  }, [teachers, sections, subjects, rooms, timeSlots, user, saveToCloud, isCloudLoaded]);

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
    setRescheduleNote("⚡ LNCT University Bhopal BCA (Sections A-F) Official Timetable & Faculty Dataset Loaded!");

    // Post LNCT Faculty Members & punch logs to backend API for Attendance & Analytics sections
    if (demoData.teachers && demoData.teachers.length > 0) {
      const todayDate = new Date().toISOString().split("T")[0];
      demoData.teachers.forEach(async (t) => {
        try {
          const facRes = await axios.post(`${API_BASE_URL}/faculty/`, {
            teacher_name: t.name,
            employee_id: `EMP-LNCT-${Math.floor(1000 + Math.random() * 9000)}`,
            designation: "Faculty Member",
            employment_type: "full-time",
            status: "active",
            phone: t.phone
          });
          const facId = facRes.data?.id;
          if (facId) {
            await axios.post(`${API_BASE_URL}/attendance/record`, {
              faculty_id: facId,
              date: todayDate,
              punch_in: `${todayDate}T09:00:00`,
              punch_out: `${todayDate}T15:30:00`,
              status: "present",
              remarks: "LNCT University Class Session Punch"
            }).catch(() => null);
          }
        } catch (err) {
          // Ignore duplicate creation
        }
      });
    }

    try {
      await generateFromPayload(
        buildApiPayload(demoData),
        "✨ LNCT University BCA (Sections A-F) Timetable Solution Active!"
      );
    } catch (err) {
      console.warn("Backend solver call failed, keeping local LNCT DEMO_RESULT fallback:", err);
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
              <FacultyDirectory teachers={teachers} subjects={subjects} onSelectFaculty={(f) => setSelectedFaculty(f)} />
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
          const teacherMap = new Map();

          // 1. Process explicit teacher list
          if (data.teachers && data.teachers.length > 0) {
            data.teachers.forEach(t => {
              if (t.name && t.name.trim()) {
                let parsedFP = parseInt(t.free_periods);
                teacherMap.set(t.name.trim(), {
                  name: t.name.trim(),
                  free_periods: isNaN(parsedFP) ? 1 : Math.max(0, parsedFP)
                });
              }
            });
          }

          // 2. Process subjects to extract any assigned teacher names
          if (data.subjects && data.subjects.length > 0) {
            data.subjects.forEach(s => {
              if (s.teacher && s.teacher.trim() && !teacherMap.has(s.teacher.trim())) {
                teacherMap.set(s.teacher.trim(), {
                  name: s.teacher.trim(),
                  free_periods: 1
                });
              }
            });
            setSubjects(data.subjects);
          }

          const cleanTeachers = Array.from(teacherMap.values());
          if (cleanTeachers.length > 0) {
            setTeachers(cleanTeachers);
            // Auto-sync extracted teachers to backend Faculty Directory
            cleanTeachers.forEach(async (t) => {
              try {
                await axios.post(`${API_BASE_URL}/faculty/`, {
                  teacher_name: t.name,
                  employee_id: `EMP-AI-${Math.floor(1000 + Math.random() * 9000)}`,
                  designation: "Lecturer",
                  employment_type: "full-time",
                  status: "active"
                });
              } catch (err) {
                // Ignore duplicate creation
              }
            });
          }

          if (data.sections && data.sections.length > 0) setSections(data.sections);
          if (data.rooms && data.rooms.length > 0) setRooms(data.rooms);
          if (data.timeSlots && data.timeSlots.length > 0) setTimeSlots(data.timeSlots);
          setRescheduleNote("AI OCR successfully extracted timetable data and synced faculty with Faculty Directory!");
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
