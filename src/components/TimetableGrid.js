import React, { useState } from "react";
import { SUBJECT_COLORS } from "./SubjectsSection";

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
          Configure your teachers, subjects, rooms, and time slots, or click <span className="text-indigo-400 font-semibold">Load demo data</span> above for instant timetable setup.
        </p>
      </div>
    </div>
  );
}

function AssignmentCard({ item, subjects }) {
  const subject = subjects?.find(s => s.name === item.subject || s.code === item.code);
  const colorIndex = subject?.colorIndex ?? 0;
  const c = SUBJECT_COLORS[colorIndex % SUBJECT_COLORS.length] || SUBJECT_COLORS[0];

  return (
    <div
      className="assignment-card-print relative rounded-xl p-2.5 transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg cursor-default border group"
      style={{ background: c.bg, borderColor: c.border }}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="font-bold text-xs leading-tight" style={{ color: c.accent }}>
          {item.code ? <span className="mr-1 opacity-90 font-mono font-black">[{item.code}]</span> : null}
          {item.subject}
        </p>
        <div className="flex gap-1 shrink-0 no-print">
          {item.is_proxy && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Proxy
            </span>
          )}
          {item.is_lab && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              🔬 Lab
            </span>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-300">
        <span className="truncate font-semibold text-slate-200">
          {item.is_proxy ? (
            <>
              <span className="line-through opacity-40 mr-1">{item.original_teacher}</span>
              <span className="text-amber-300 font-bold">{item.teacher}</span>
            </>
          ) : (
            item.teacher
          )}
        </span>
        {item.section && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 font-mono text-slate-400 shrink-0 ml-1">
            {item.section.replace("Section ", "Sec ")}
          </span>
        )}
      </div>

      <p className="text-[10px] font-semibold mt-1 flex items-center gap-1 opacity-90" style={{ color: c.text }}>
        <span>📍</span> {item.room} {item.is_lab ? "(Lab Block)" : ""}
      </p>
    </div>
  );
}

export default function TimetableGrid({ result, subjects = [], loading, onExport, onSaveDb }) {
  const [viewMode, setViewMode] = useState("section"); // "section" | "teacher" | "room" | "master"
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedTeacher, setSelectedTeacher] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (!result || (!result.assignments && !result.timetable)) {
    return <EmptyState loading={loading} />;
  }

  const days = result.days || ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const timeSlots = result.time_slots || [
    "09:00 AM - 09:45 AM",
    "09:45 AM - 10:30 AM",
    "10:30 AM - 11:20 AM",
    "11:20 AM - 12:10 PM",
    "01:00 PM - 01:50 PM",
    "01:50 PM - 02:40 PM",
    "02:40 PM - 03:30 PM",
  ];
  const assignments = result.assignments || [];

  // Extract Unique Sections, Teachers, and Rooms from assignments
  const sectionList = Array.from(new Set(assignments.map(a => a.section).filter(Boolean))).sort();
  const teacherList = Array.from(new Set(assignments.map(a => a.teacher).filter(Boolean))).sort();
  const roomList = Array.from(new Set(assignments.map(a => a.room).filter(Boolean))).sort();

  // Filtered assignments based on selected view mode and filters
  const filteredAssignments = assignments.filter(item => {
    if (viewMode === "section" && selectedSection !== "all" && item.section !== selectedSection) return false;
    if (viewMode === "teacher" && selectedTeacher !== "all" && item.teacher !== selectedTeacher) return false;
    if (viewMode === "room" && selectedRoom !== "all" && item.room !== selectedRoom) return false;

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

  // Build filtered timetable matrix
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

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const getActiveFilterTitle = () => {
    if (viewMode === "section") {
      return selectedSection === "all" ? "All Sections (Consolidated Master)" : `Class Timetable: ${selectedSection}`;
    }
    if (viewMode === "teacher") {
      return selectedTeacher === "all" ? "Faculty Workload Timetable" : `Teacher Schedule: ${selectedTeacher}`;
    }
    if (viewMode === "room") {
      return selectedRoom === "all" ? "Room Occupancy Timetable" : `Room Schedule: ${selectedRoom}`;
    }
    return "Consolidated Master Timetable";
  };

  return (
    <section className="glass-card overflow-hidden animate-fade-in text-slate-100">
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
              {getActiveFilterTitle()}
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
      <div className="p-6 border-b border-slate-800 bg-slate-900/90 no-print space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  📅
                </span>
                Weekly Timetable Workspace
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {result.solver_status || "OPTIMAL"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active Schedule: <strong className="text-indigo-300 font-semibold">{getActiveFilterTitle()}</strong> ({filteredAssignments.length} sessions scheduled)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
              Print Clean View
            </button>

            {onExport && (
              <button
                onClick={onExport}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center gap-2"
              >
                📥 Export Excel
              </button>
            )}
          </div>
        </div>

        {/* ── VIEW MODE TABS & FILTERS BAR ── */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs font-bold">
            {[
              { id: "section", label: "👥 By Section / Class" },
              { id: "teacher", label: "👨‍🏫 By Teacher" },
              { id: "room", label: "🏛️ By Room / Lab" },
              { id: "master", label: "📊 Master View" },
            ].map(vm => (
              <button
                key={vm.id}
                onClick={() => setViewMode(vm.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === vm.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {vm.label}
              </button>
            ))}
          </div>

          {/* Dynamic Filter Dropdowns */}
          <div className="flex items-center gap-3">
            {viewMode === "section" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-semibold">Select Section:</span>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="input-premium py-1.5 px-3 bg-slate-800 border-slate-700 text-white text-xs font-bold cursor-pointer"
                >
                  <option value="all">All Sections (Consolidated)</option>
                  {sectionList.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>
            )}

            {viewMode === "teacher" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-semibold">Select Teacher:</span>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="input-premium py-1.5 px-3 bg-slate-800 border-slate-700 text-white text-xs font-bold cursor-pointer"
                >
                  <option value="all">All Faculty Members</option>
                  {teacherList.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            {viewMode === "room" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-semibold">Select Venue:</span>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="input-premium py-1.5 px-3 bg-slate-800 border-slate-700 text-white text-xs font-bold cursor-pointer"
                >
                  <option value="all">All Classrooms & Labs</option>
                  {roomList.map(rm => (
                    <option key={rm} value={rm}>{rm}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Keyword Quick Filter */}
            <input
              type="text"
              placeholder="Search keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-premium py-1.5 px-3 bg-slate-800 border-slate-700 text-white text-xs placeholder:text-slate-500 w-36 sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* ── MAIN TIMETABLE GRID TABLE ── */}
      <div className="overflow-x-auto p-4">
        <table className="w-full min-w-[920px] border-collapse text-left text-xs">
          <thead>
            <tr>
              <th className="w-24 p-3.5 text-xs font-black uppercase tracking-wider text-slate-400 border-b border-r border-slate-800 bg-slate-900/90">
                Day / Period
              </th>
              {timeSlots.map((slot, sIdx) => (
                <th
                  key={slot}
                  className="min-w-[150px] p-3 text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-r border-slate-800 bg-slate-900/80 text-center"
                >
                  <span className="block font-black text-indigo-400 text-[10px]">
                    Period #{sIdx + 1}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{slot}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day} className="border-b border-slate-800/80">
                <th className="p-3.5 text-sm font-black text-white border-r border-slate-800 bg-slate-900/90 text-center align-middle">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 inline-block font-mono">
                    {day}
                  </span>
                </th>
                {timeSlots.map((slot) => {
                  const cellItems = displayTimetable?.[day]?.[slot] || [];
                  return (
                    <td
                      key={`${day}-${slot}`}
                      className="min-h-[110px] h-28 align-top border-r border-slate-800/80 p-2 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex flex-col gap-1.5">
                        {cellItems.length === 0 ? (
                          <div className="h-full flex items-center justify-center py-6 text-slate-600 font-mono text-xs select-none">
                            —
                          </div>
                        ) : (
                          cellItems.map((item, i) => (
                            <AssignmentCard
                              key={`${item.subject}-${item.room}-${item.section}-${i}`}
                              item={item}
                              subjects={subjects}
                            />
                          ))
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Print-Only Institutional Footer with Signatures ── */}
      <div className="print-only mt-10 pt-6 border-t-2 border-slate-900">
        <div className="grid grid-cols-4 gap-6 text-center text-xs text-slate-900">
          <div>
            <div className="h-12 border-b border-slate-400 mb-2"></div>
            <p className="font-bold">Prepared By</p>
            <p className="text-[10px] text-slate-600">Timetable In-Charge</p>
          </div>
          <div>
            <div className="h-12 border-b border-slate-400 mb-2"></div>
            <p className="font-bold">Verified By</p>
            <p className="text-[10px] text-slate-600">Head of Department (HOD)</p>
          </div>
          <div>
            <div className="h-12 border-b border-slate-400 mb-2"></div>
            <p className="font-bold">Approved By</p>
            <p className="text-[10px] text-slate-600">Dean / Principal</p>
          </div>
          <div>
            <div className="h-12 border-2 border-dashed border-slate-400 mb-2 flex items-center justify-center text-[10px] text-slate-400">
              OFFICIAL STAMP
            </div>
            <p className="font-bold">Date & Institutional Seal</p>
            <p className="text-[10px] text-slate-600">LNCT University Academic Cell</p>
          </div>
        </div>
      </div>
    </section>
  );
}
