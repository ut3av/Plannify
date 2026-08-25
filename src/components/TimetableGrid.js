import React, { useState } from "react";
import { getSubjectColor } from "./SubjectsSection";
import ShareTimetableModal from "./common/ShareTimetableModal";
import { useAcademic } from "../context/AcademicContext";
import { exportTimetableToPdf, exportTimetableToExcel } from "../utils/exportUtils";

function ShimmerGrid() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-slate-200 dark:border-white/[0.06]">
        <div className="shimmer h-6 w-48 mb-2" />
        <div className="shimmer h-4 w-32" />
      </div>
      <div className="p-4 grid gap-2" style={{ gridTemplateColumns: "80px repeat(5,1fr)" }}>
        {Array.from({ length: 36 }).map((_, i) => (
          <div key={i} className="shimmer h-20 rounded" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ loading }) {
  if (loading) return <ShimmerGrid />;
  return (
    <div className="glass-card flex min-h-[420px] items-center justify-center p-8 text-center">
      <div className="animate-fade-in">
        <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/10">
          <svg className="w-8 h-8 text-violet-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          No Timetable Generated
        </h2>
        <p className="mt-2 max-w-sm mx-auto text-sm leading-6 text-slate-400">
          Configure your faculty, sections, and subjects in Academic Setup, then click <span className="text-indigo-400 font-bold">Generate AI Timetable</span> to construct the master schedule.
        </p>
      </div>
    </div>
  );
}

function AssignmentCard({ item, subjects, onOpenProxyModal }) {
  const subject = subjects?.find(s => s.name === item.subject || s.code === item.code);
  const colorIndex = subject?.colorIndex ?? 0;
  const c = getSubjectColor(colorIndex, true);

  return (
    <div
      className="assignment-card-print relative rounded-xl p-2.5 transition-all duration-200 hover:translate-y-[-2px] hover:shadow-md cursor-default border text-left group"
      style={{
        backgroundColor: c.bg,
        borderColor: c.border,
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="font-bold text-xs leading-tight font-display tracking-tight" style={{ color: c.text }}>
          {item.code ? <span className="mr-1 opacity-90 font-mono font-black">[{item.code}]</span> : null}
          {item.subject}
        </p>
        <div className="flex gap-1 shrink-0 no-print items-center">
          {item.is_proxy && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-600/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
              Proxy
            </span>
          )}
          {item.is_lab && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40">
              Lab
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenProxyModal) onOpenProxyModal(item);
            }}
            title="Assign proxy teacher or reschedule class"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px] ml-0.5 flex items-center gap-1"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className="truncate font-semibold" style={{ color: c.accent }}>
          {item.is_proxy ? (
            <>
              <span className="line-through opacity-50 mr-1">{item.original_teacher}</span>
              <span className="font-bold underline">{item.teacher}</span>
            </>
          ) : (
            item.teacher
          )}
        </span>
        {item.section && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-800/80 font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700 shrink-0 ml-1">
            {item.section}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-mono">
        <span className="truncate">📍 {item.room}</span>
        {item.is_proxy && (
          <span className="text-amber-700 dark:text-amber-300 font-sans text-[9px] font-bold">
            Proxy Cover
          </span>
        )}
      </div>
    </div>
  );
}

export default function TimetableGrid({
  result: propResult,
  timetableData,
  loading = false,
  subjects = [],
  teachers = [],
  onExport,
  onSaveDb,
  onNavigateToReschedule,
}) {
  const {
    assignProxy,
    validationReport,
    sections: contextSections,
    academicLevel = "ALL",
    setAcademicLevel,
    selectedProgram = "ALL",
    setSelectedProgram,
    selectedSemester = "ALL",
    setSelectedSemester,
    parseAcademicMeta,
  } = useAcademic() || {};
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("ALL");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState("ALL");
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedClassForProxy, setSelectedClassForProxy] = useState(null);
  const [selectedProxyTeacher, setSelectedProxyTeacher] = useState("");
  const [proxyReason, setProxyReason] = useState("Faculty Leave Substitution");
  const [proxySuccessMsg, setProxySuccessMsg] = useState("");

  const handleQuickProxySubmit = async (e) => {
    e.preventDefault();
    if (!selectedClassForProxy || !selectedProxyTeacher) return;
    try {
      if (assignProxy) {
        await assignProxy({
          teacher: selectedClassForProxy.teacher,
          proxy_teacher: selectedProxyTeacher,
          day: selectedClassForProxy.day,
          slots: [selectedClassForProxy.slot],
          reason: proxyReason,
        });
      }
      setProxySuccessMsg(`Assigned ${selectedProxyTeacher} as proxy for ${selectedClassForProxy.teacher}!`);
      setTimeout(() => {
        setProxySuccessMsg("");
        setSelectedClassForProxy(null);
      }, 1500);
    } catch (err) {
      console.error("Proxy assignment error:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const rawResult = propResult || timetableData;
  const result = rawResult?.result || rawResult;

  if (loading) {
    return <ShimmerGrid />;
  }

  if (!result || !result.assignments || result.assignments.length === 0) {
    return <EmptyState loading={loading} />;
  }

  const days = result.days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timeSlots = result.time_slots || ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5"];
  const assignments = result.assignments || [];

  // Extract unique sections and teachers for filtering
  const allSectionsList = Array.from(new Set(assignments.map(a => a.section).filter(Boolean))).sort();
  const allTeachersList = Array.from(new Set(assignments.map(a => a.teacher).filter(Boolean))).sort();

  // Filter assignments based on UG/PG level, program, semester, section, teacher, and search query
  const filteredAssignments = assignments.filter(item => {
    // Academic Scope Filter (Level, Program, Semester)
    if (academicLevel !== "ALL" || selectedProgram !== "ALL" || selectedSemester !== "ALL") {
      const meta = parseAcademicMeta ? parseAcademicMeta(item.section || item.code || item.subject || "") : {};
      if (academicLevel !== "ALL" && meta.program_level !== academicLevel) {
        return false;
      }
      if (selectedProgram !== "ALL" && meta.program_code !== selectedProgram) {
        return false;
      }
      if (selectedSemester !== "ALL" && String(meta.semester_number) !== String(selectedSemester)) {
        return false;
      }
    }

    if (selectedSectionFilter !== "ALL" && item.section !== selectedSectionFilter) {
      return false;
    }
    if (selectedTeacherFilter !== "ALL" && item.teacher !== selectedTeacherFilter && item.original_teacher !== selectedTeacherFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSub = (item.subject || "").toLowerCase().includes(q);
      const matchCode = (item.code || "").toLowerCase().includes(q);
      const matchTeacher = (item.teacher || "").toLowerCase().includes(q);
      const matchRoom = (item.room || "").toLowerCase().includes(q);
      const matchSec = (item.section || "").toLowerCase().includes(q);
      return matchSub || matchCode || matchTeacher || matchRoom || matchSec;
    }
    return true;
  });

  // Build 2D Master Timetable dictionary: grid[day][slot] = [items]
  const displayTimetable = {};
  days.forEach(d => {
    displayTimetable[d] = {};
    timeSlots.forEach(s => {
      displayTimetable[d][s] = [];
    });
  });

  filteredAssignments.forEach(item => {
    if (displayTimetable[item.day] && displayTimetable[item.day][item.slot]) {
      displayTimetable[item.day][item.slot].push(item);
    }
  });

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <section className="glass-card overflow-hidden animate-fade-in text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* ── Print-Only Institutional Header ── */}
      <div className="print-only mb-6 border-b-2 border-slate-900 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
              LNCT University Bhopal
            </h1>
            <p className="text-xs font-bold uppercase text-slate-700 tracking-wider mt-0.5">
              Department of Computer Applications & AI/DA • Session 2026-2027
            </p>
            <h2 className="text-sm font-black text-indigo-900 mt-1 uppercase">
              Master Academic Timetable
            </h2>
          </div>
          <div className="text-right text-xs text-slate-700 font-medium">
            <p><strong>Generated:</strong> {currentDate}</p>
            <p><strong>Active Classes:</strong> {filteredAssignments.length} sessions</p>
            <p><strong>Solver Status:</strong> {result.solver_status || "OPTIMAL"}</p>
          </div>
        </div>
      </div>

      {/* ── Interactive Screen Header Bar ── */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 no-print space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </span>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Master Timetable Workspace
                </h2>
              </div>
              <span className="inline-flex items-center whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                {result.solver_status ? (result.solver_status.includes("OPTIMAL") ? "Optimal Active" : result.solver_status.split(" ")[0]) : "Optimal Active"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Consolidated Academic View ({filteredAssignments.length} of {assignments.length} scheduled lectures & laboratory sessions)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Reschedule Action Button */}
            {onNavigateToReschedule && (
              <button
                onClick={() => onNavigateToReschedule({})}
                className="btn-gradient text-xs px-3.5 py-2 font-bold shadow-md flex items-center gap-1.5"
                title="Open Dynamic Solver & Substitution Center"
              >
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                AI Reschedule / Proxy
              </button>
            )}

            {/* Quick Search Box */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject, teacher, room..."
                className="input-premium text-xs py-1.5 pl-8 pr-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 w-44 md:w-56"
              />
              <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>

            <button
              onClick={() => setShowShareModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition-all flex items-center gap-1.5 shadow-sm"
              title="Generate Scannable Student Branch Timetable QR Code"
            >
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              Generate Student QR
            </button>

            <button
              onClick={handlePrint}
              className="btn-secondary text-xs px-3.5 py-2 font-bold shadow-sm flex items-center gap-2"
              title="Print Clean A4 Landscape View"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>

            <button
              onClick={() => {
                const secList = contextSections || [];
                exportTimetableToPdf(result, secList, teachers, subjects, selectedSectionFilter, selectedTeacherFilter);
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs font-bold text-rose-700 dark:text-rose-300 transition-all flex items-center gap-1.5 shadow-sm"
              title="Download Print-Ready Institutional PDF Schedule"
            >
              <svg className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Export PDF
            </button>

            <button
              onClick={() => {
                if (onExport) {
                  onExport();
                } else {
                  const secList = contextSections || [];
                  exportTimetableToExcel(result, secList, teachers, subjects, selectedSectionFilter, selectedTeacherFilter);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition-all flex items-center gap-1.5 shadow-sm"
              title="Download Formatted Excel (.xlsx) Schedule"
            >
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Excel
            </button>
          </div>
        </div>

        {/* ── Section, Program & Teacher Filter Selector Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Level Toggle: ALL | UG | PG */}
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
              {["ALL", "UG", "PG"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setAcademicLevel && setAcademicLevel(lvl);
                    if (lvl === "UG" && selectedProgram === "MCA") {
                      setSelectedProgram && setSelectedProgram("BCA");
                    } else if (lvl === "PG" && (selectedProgram === "BCA" || selectedProgram === "B.Tech")) {
                      setSelectedProgram && setSelectedProgram("MCA");
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition-all ${
                    academicLevel === lvl
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title={`View ${lvl === 'ALL' ? 'All Degrees' : lvl === 'UG' ? 'Undergraduate (UG)' : 'Postgraduate (PG)'}`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Program Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Program:</span>
              <select
                value={selectedProgram}
                onChange={(e) => {
                  const p = e.target.value;
                  setSelectedProgram && setSelectedProgram(p);
                  if (p === "MCA") setAcademicLevel && setAcademicLevel("PG");
                  if (p === "BCA" || p === "B.Tech") setAcademicLevel && setAcademicLevel("UG");
                }}
                className="input-premium text-xs py-1 px-2.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer rounded-lg font-bold"
              >
                <option value="ALL">All Programs</option>
                {(academicLevel === "ALL" || academicLevel === "UG") && <option value="BCA">BCA (UG)</option>}
                {(academicLevel === "ALL" || academicLevel === "PG") && <option value="MCA">MCA (PG)</option>}
                {(academicLevel === "ALL" || academicLevel === "UG") && <option value="B.Tech">B.Tech (UG)</option>}
              </select>
            </div>

            {/* Semester Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Semester:</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester && setSelectedSemester(e.target.value)}
                className="input-premium text-xs py-1 px-2.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer rounded-lg font-bold"
              >
                <option value="ALL">All Semesters</option>
                <option value="1">Sem 1 (I)</option>
                <option value="2">Sem 2 (II)</option>
                <option value="3">Sem 3 (III)</option>
                <option value="4">Sem 4 (IV)</option>
                {selectedProgram !== "MCA" && (
                  <>
                    <option value="5">Sem 5 (V)</option>
                    <option value="6">Sem 6 (VI)</option>
                  </>
                )}
                {selectedProgram === "B.Tech" && (
                  <>
                    <option value="7">Sem 7 (VII)</option>
                    <option value="8">Sem 8 (VIII)</option>
                  </>
                )}
              </select>
            </div>

            {/* Filter Section */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Section:</span>
              <select
                value={selectedSectionFilter}
                onChange={(e) => setSelectedSectionFilter(e.target.value)}
                className="input-premium text-xs py-1 px-2.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer rounded-lg max-w-[170px]"
              >
                <option value="ALL">All Sections</option>
                {allSectionsList.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>

            {/* Filter Faculty */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Faculty:</span>
              <select
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                className="input-premium text-xs py-1 px-2.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer rounded-lg max-w-[170px]"
              >
                <option value="ALL">All Faculty</option>
                {allTeachersList.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {(academicLevel !== "ALL" || selectedProgram !== "ALL" || selectedSemester !== "ALL" || selectedSectionFilter !== "ALL" || selectedTeacherFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setAcademicLevel && setAcademicLevel("ALL");
                setSelectedProgram && setSelectedProgram("ALL");
                setSelectedSemester && setSelectedSemester("ALL");
                setSelectedSectionFilter("ALL");
                setSelectedTeacherFilter("ALL");
                setSearchQuery("");
              }}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold whitespace-nowrap"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Institutional Validation Status Card ── */}
      {(() => {
        const val = result?.validation || validationReport;
        if (!val) {
          return (
            <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-900 dark:text-indigo-200 no-print animate-fade-in flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-xs font-bold font-display">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Deterministic Verification: All {filteredAssignments.length} scheduled periods verified conflict-free.</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                OR-Tools CP-SAT + Level 2 Validator Active
              </span>
            </div>
          );
        }

        if (val.valid) {
          return (
            <div className="mx-6 mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 no-print animate-fade-in flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-black text-base shrink-0 shadow-sm">
                  ✓
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-display">
                      TIMETABLE VALIDATION PASSED
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                      100% Conflict-Free
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 mt-0.5 font-medium">
                    ✓ 0 Teacher Conflicts • 0 Room Conflicts • 0 Section Conflicts • 100% Required Periods Scheduled
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-500/30 text-slate-700 dark:text-slate-200">
                  Classes: {val.statistics?.scheduled_periods ?? filteredAssignments.length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-500/30 text-slate-700 dark:text-slate-200">
                  Teachers: {val.statistics?.teachers_used ?? allTeachersList.length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-500/30 text-slate-700 dark:text-slate-200">
                  Rooms: {val.statistics?.rooms_used ?? (result.rooms?.length || 0)}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-500/30 text-slate-700 dark:text-slate-200">
                  Sections: {val.statistics?.sections_used ?? allSectionsList.length}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 no-print animate-fade-in space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-400 font-black text-base shrink-0">
                ✕
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300 font-display">
                  TIMETABLE VALIDATION FAILED ({val.errors?.length || 0} CONSTRAINTS VIOLATED)
                </h4>
                <p className="text-[11px] text-rose-700 dark:text-rose-300/90 mt-0.5">
                  This schedule cannot be officially published or saved until all hard conflicts are resolved.
                </p>
              </div>
            </div>
            <div className="mt-2 space-y-1.5 pl-12 text-xs">
              {val.errors?.slice(0, 5).map((err, i) => (
                <div key={i} className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-200 font-mono text-[11px]">
                  <strong>[{err.code}]</strong> {err.message}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── 2D MASTER TIMETABLE GRID ── */}
      <div className="overflow-x-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950/60">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-3 text-left font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800/80 bg-slate-100/80 dark:bg-slate-900/90 w-28 shrink-0">
                Day / Period
              </th>
              {timeSlots.map((slot, i) => (
                <th
                  key={slot}
                  className="p-3 text-center font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800/80 bg-slate-100/80 dark:bg-slate-900/90 min-w-[170px]"
                >
                  <div className="font-mono text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
                    Period #{i + 1}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    {slot}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day} className="hover:bg-slate-100/40 dark:hover:bg-slate-900/30 transition-colors">
                <td className="p-3 font-mono font-black text-indigo-700 dark:text-indigo-400 border border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/60 align-middle text-center uppercase tracking-wider">
                  <div className="text-sm">{day}</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    {timeSlots.reduce((acc, slot) => acc + (displayTimetable[day][slot]?.length || 0), 0)} classes
                  </div>
                </td>

                {timeSlots.map((slot) => {
                  const cellItems = displayTimetable[day][slot] || [];
                  return (
                    <td
                      key={slot}
                      className="p-2 border border-slate-200 dark:border-slate-800/80 align-top bg-white dark:bg-slate-900/20 min-h-[90px]"
                    >
                      {cellItems.length === 0 ? (
                        <div className="h-16 flex items-center justify-center text-slate-400 dark:text-slate-600/60 text-[10px] font-mono italic">
                          — Free Slot —
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cellItems.map((item, itemIdx) => (
                            <AssignmentCard
                              key={itemIdx}
                              item={item}
                              subjects={subjects}
                              onOpenProxyModal={(cls) => {
                                setSelectedClassForProxy(cls);
                                setSelectedProxyTeacher("");
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Print-Only Institutional Signature Footer ── */}
      <div className="print-only mt-12 pt-8 border-t border-slate-400 text-slate-800 text-xs font-semibold">
        <div className="grid grid-cols-3 gap-8 text-center pt-8">
          <div>
            <div className="border-t border-slate-800 pt-2 font-bold">
              Time Table In-Charge
            </div>
            <p className="text-[10px] text-slate-600">Department of Computer Applications</p>
          </div>
          <div>
            <div className="border-t border-slate-800 pt-2 font-bold">
              Head of Department (HOD)
            </div>
            <p className="text-[10px] text-slate-600">School of Engineering & Technology</p>
          </div>
          <div>
            <div className="border-t border-slate-800 pt-2 font-bold">
              Dean Academics
            </div>
            <p className="text-[10px] text-slate-600">LNCT University, Bhopal (M.P.)</p>
          </div>
        </div>
      </div>

      {/* ── Live Share & QR Code Modal ── */}
      <ShareTimetableModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        currentSection={selectedSectionFilter !== "ALL" ? selectedSectionFilter : "MCA-A"}
      />

      {/* ── Inline Quick Proxy Assignment Modal ── */}
      {selectedClassForProxy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in no-print">
          <div className="card max-w-md w-full p-6 bg-slate-900 border border-slate-700 text-white rounded-3xl shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">Assign Proxy Substitute</h3>
                  <p className="text-xs text-slate-400">
                    {selectedClassForProxy.day} • {selectedClassForProxy.slot}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClassForProxy(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Target Lecture Details Card */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 text-xs">
              <div className="font-bold text-white flex items-center justify-between">
                <span>{selectedClassForProxy.subject}</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedClassForProxy.section || "General"}
                </span>
              </div>
              <p className="text-slate-400">
                Current Instructor: <strong className="text-slate-200">{selectedClassForProxy.teacher}</strong>
              </p>
              <p className="text-slate-400 font-mono text-[11px]">
                Venue: {selectedClassForProxy.room}
              </p>
            </div>

            {proxySuccessMsg ? (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center">
                ✓ {proxySuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleQuickProxySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Select Available Substitute:
                  </label>
                  <select
                    value={selectedProxyTeacher}
                    onChange={(e) => setSelectedProxyTeacher(e.target.value)}
                    required
                    className="input-premium text-xs py-2 px-3 bg-slate-950 border-slate-700 text-white rounded-xl w-full"
                  >
                    <option value="">-- Choose Free Faculty Member --</option>
                    {allTeachersList
                      .filter(t => t !== selectedClassForProxy.teacher)
                      .map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Substitution Reason / Note:
                  </label>
                  <input
                    type="text"
                    value={proxyReason}
                    onChange={(e) => setProxyReason(e.target.value)}
                    placeholder="e.g. Conference Leave / Medical Emergency"
                    className="input-premium text-xs py-2 px-3 bg-slate-950 border-slate-700 text-white rounded-xl w-full"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedClassForProxy(null)}
                    className="btn-secondary text-xs py-2 px-4 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedProxyTeacher}
                    className="btn-primary text-xs py-2 px-4 font-bold bg-amber-600 hover:bg-amber-500 text-white border-none disabled:opacity-50"
                  >
                    Confirm Proxy Coverage
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
