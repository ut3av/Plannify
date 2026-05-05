import { useCallback, useMemo, useState, useEffect } from "react";
import axios from "axios";
import TeachersSection from "./components/TeachersSection";
import SubjectsSection from "./components/SubjectsSection";
import RoomsSection from "./components/RoomsSection";
import SectionsSection from "./components/SectionsSection";
import TimeSlotsSection from "./components/TimeSlotsSection";
import ReschedulePanel from "./components/ReschedulePanel";
import TimetableGrid from "./components/TimetableGrid";
import HistorySection from "./components/HistorySection";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const TABS = [
  { id: "teachers", label: "Teachers", icon: "users" },
  { id: "sections", label: "Sections", icon: "book" },
  { id: "subjects", label: "Subjects", icon: "book" },
  { id: "rooms", label: "Classrooms", icon: "building" },
  { id: "slots", label: "Time Slots", icon: "clock" },
  { id: "timetable", label: "Timetable", icon: "grid" },
  { id: "reschedule", label: "Reschedule", icon: "refresh" },
  { id: "history", label: "History", icon: "clock" },
];

/* ── SVG icon map ── */
function TabIcon({ icon, className = "w-4 h-4" }) {
  const icons = {
    users: (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    book: (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
    building: (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <path d="M9 22v-4h6v4" />
        <line x1="8" y1="6" x2="8" y2="6" />
        <line x1="16" y1="6" x2="16" y2="6" />
        <line x1="12" y1="6" x2="12" y2="6" />
        <line x1="8" y1="10" x2="8" y2="10" />
        <line x1="16" y1="10" x2="16" y2="10" />
        <line x1="12" y1="10" x2="12" y2="10" />
        <line x1="8" y1="14" x2="8" y2="14" />
        <line x1="16" y1="14" x2="16" y2="14" />
        <line x1="12" y1="14" x2="12" y2="14" />
      </svg>
    ),
    clock: (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    grid: (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    refresh: (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
      </svg>
    ),
    sparkles: (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
      </svg>
    ),
  };
  return icons[icon] || null;
}

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(" ");
  if (typeof detail === "string") return detail;
  return "Could not reach the scheduler API. Make sure the FastAPI backend is running.";
}

export default function App() {
  const [activeTab, setActiveTab] = useState("teachers");
  const [teachers, setTeachers] = useState([
    { name: "Mohit Kumade", free_periods: 1 },
    { name: "Rohit Singh", free_periods: 1 },
    { name: "Deepa Waswani", free_periods: 1 },
    { name: "Pragya Shastri", free_periods: 1 },
  ]);
  const [sections, setSections] = useState([
    { name: "BCA-A", room: "Room 101", lab_room: "Lab 1" },
    { name: "BCA-B", room: "Room 102", lab_room: "Lab 1" },
    { name: "BCA-C", room: "", lab_room: "" },
    { name: "BCA-D", room: "", lab_room: "" },
    { name: "BCA-E", room: "", lab_room: "" },
    { name: "BCA-F", room: "", lab_room: "" },
  ]);
  const [subjects, setSubjects] = useState([
    {
      code: "201",
      name: "Data Structures",
      teacher: "Mohit Kumade",
      section: "BCA-A",
      required_slots: 4,
      colorIndex: 0,
    },
    {
      code: "202",
      name: "Operating System",
      teacher: "Rohit Singh",
      section: "BCA-A",
      required_slots: 3,
      colorIndex: 1,
    },
    {
      code: "203",
      name: "Environmental Studies",
      teacher: "Deepa Waswani",
      section: "BCA-B",
      required_slots: 3,
      colorIndex: 2,
    },
    {
      code: "205",
      name: "Basic Communication",
      teacher: "Pragya Shastri",
      section: undefined,
      required_slots: 2,
      colorIndex: 3,
    },
    {
      code: "206",
      name: "Programming Lab in Data Structures",
      teacher: "Mohit Kumade",
      section: "BCA-A",
      is_lab: true,
      required_slots: 2,
      colorIndex: 4,
    },
  ]);
  const [rooms, setRooms] = useState([
    "Room 401",
    "Room 402",
    "Lab 105",
    "Lab 003",
  ]);
  const [timeSlots, setTimeSlots] = useState([
    "10:30 AM - 11:20 AM",
    "11:20 AM - 12:10 PM",
    "01:00 PM - 01:50 PM",
    "01:50 PM - 02:40 PM",
    "02:40 PM - 03:30 PM",
  ]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add("dark");
    localStorage.setItem("theme", "dark");
  }, []);

  const payload = useMemo(
    () => ({
      teachers,
      subjects,
      rooms,
      sections,
      time_slots: timeSlots,
    }),
    [teachers, subjects, rooms, sections, timeSlots],
  );

  const generateTimetable = useCallback(async () => {
    setLoading(true);
    setError("");
    setRescheduleNote("");
    try {
      const response = await axios.post(`${API_BASE_URL}/generate`, payload);
      setResult(response.data);
      setActiveTab("timetable");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setLoading(false);
    }
  }, [payload]);

  const rescheduleTimetable = async (request) => {
    setLoading(true);
    setError("");
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
    setError("");
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
  const exportToExcel = useCallback(() => {
    if (!result) return;

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

  const totalSlots = useMemo(
    () => subjects.reduce((sum, s) => sum + s.required_slots, 0),
    [subjects],
  );

  const renderContent = () => {
    switch (activeTab) {
      case "teachers":
        return <TeachersSection teachers={teachers} onChange={setTeachers} />;
      case "sections":
        return (
          <SectionsSection
            sections={sections}
            rooms={rooms}
            onChange={setSections}
          />
        );
      case "subjects":
        return (
          <SubjectsSection
            subjects={subjects}
            teachers={teachers}
            sections={sections}
            rooms={rooms}
            onChange={setSubjects}
          />
        );
      case "rooms":
        return <RoomsSection rooms={rooms} onChange={setRooms} />;
      case "slots":
        return (
          <TimeSlotsSection timeSlots={timeSlots} onChange={setTimeSlots} />
        );
      case "timetable":
        return (
          <TimetableGrid
            result={result}
            subjects={subjects}
            loading={loading}
            onExport={exportToExcel}
            onSaveDb={saveToDatabase}
          />
        );
      case "reschedule":
        return (
          <ReschedulePanel
            teachers={teachers}
            days={result?.days || ["Mon", "Tue", "Wed", "Thu", "Fri"]}
            slots={result?.time_slots || timeSlots}
            disabled={!result || loading}
            onReschedule={rescheduleTimetable}
            onAssignProxy={assignProxy}
          />
        );
      case "history":
        return (
          <HistorySection
            onSelectTimetable={(data) => {
              setResult(data);
              setActiveTab("timetable");
              setRescheduleNote("Loaded saved timetable from database.");
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen text-slate-800 dark:text-slate-100">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-violet-600/[0.07] blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-indigo-500/[0.06] blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-purple-600/[0.05] blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-0 px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <header className="animate-fade-in glass-card p-6 mb-6">
          <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-violet-500/60 to-transparent rounded-full" />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <TabIcon
                  icon="sparkles"
                  className="w-6 h-6 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  AI Timetable<span className="text-violet-400">X</span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Constraint-based scheduler powered by OR-Tools CP-SAT
                </p>
              </div>
            </div>

            {/* Quick stats & generate button */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden sm:flex items-center gap-4 mr-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {teachers.length}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Teachers
                  </p>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {subjects.length}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Subjects
                  </p>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {totalSlots}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Slots
                  </p>
                </div>
              </div>



              <button
                className="btn-gradient flex items-center gap-2 px-6"
                disabled={
                  loading || teachers.length === 0 || subjects.length === 0
                }
                onClick={generateTimetable}
              >
                {loading ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Solving...
                  </>
                ) : (
                  <>
                    <TabIcon icon="sparkles" className="w-4 h-4" />
                    Generate Timetable
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Solver status bar */}
          {result && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.06] flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="status-dot status-dot-active" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {result.solver_status}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-1">
                <span className="text-[11px] text-violet-300">Score</span>
                <span className="text-xs font-bold text-violet-200">
                  {result.objective_score}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1">
                <span className="text-[11px] text-emerald-300">Classes</span>
                <span className="text-xs font-bold text-emerald-200">
                  {result.assignments?.length || 0}
                </span>
              </div>
            </div>
          )}
        </header>

        {/* ── Alerts ── */}
        {error && (
          <div className="animate-slide-down flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm px-5 py-4 text-sm text-red-200 mb-4">
            <svg
              className="w-4 h-4 flex-shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        {rescheduleNote && (
          <div className="animate-slide-down flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm px-5 py-4 text-sm text-emerald-200 mb-4">
            <svg
              className="w-4 h-4 flex-shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{rescheduleNote}</span>
          </div>
        )}

        {/* ── Tab Navigation ── */}
        <nav className="animate-fade-in-delay-1 mb-6">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200 whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? "bg-violet-500/20 text-violet-200 border border-violet-500/30 shadow-lg shadow-violet-500/10"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-white dark:bg-white/[0.04] border border-transparent"
                  }
                `}
              >
                <TabIcon icon={tab.icon} />
                {tab.label}
                {tab.id === "timetable" && result && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow" />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* ── Tab Content ── */}
        <div className="animate-fade-in-delay-2" key={activeTab}>
          {renderContent()}
        </div>
      </div>
    </main>
  );
}
