import React, { useEffect, useState, useMemo } from "react";
import GooeyLoader from "./common/GooeyLoader";

export default function ReschedulePanel({
  teachers = [],
  days = ["Mon", "Tue", "Wed", "Thu", "Fri"],
  slots = [],
  hasResult,
  result,
  loading,
  preselect,
  onBackToTimetable,
  onReschedule,
  onAssignProxy,
}) {
  const [teacher, setTeacher] = useState("");
  const [day, setDay] = useState("Mon");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [reason, setReason] = useState("Medical Leave");
  const [selectedProxy, setSelectedProxy] = useState("");

  useEffect(() => {
    if (preselect) {
      if (preselect.teacher) setTeacher(preselect.teacher);
      if (preselect.day) setDay(preselect.day);
      if (preselect.slot) setSelectedSlots([preselect.slot]);
    }
  }, [preselect]);

  useEffect(() => {
    if (teachers && teachers.length > 0 && !teacher) {
      const first = teachers[0];
      setTeacher(typeof first === "string" ? first : (first?.name || ""));
    }
  }, [teachers, teacher]);

  useEffect(() => {
    setDay((c) => (days.includes(c) ? c : days[0] || "Mon"));
  }, [days]);

  // Compute selected teacher's full weekly class distribution across Monday-Friday
  const teacherWeeklySchedule = useMemo(() => {
    if (!result?.assignments || !teacher) return { total: 0, byDay: {} };
    const classes = result.assignments.filter((a) => a.teacher === teacher);
    const byDay = {};
    days.forEach((d) => {
      byDay[d] = classes.filter((a) => a.day === d).length;
    });
    return { total: classes.length, byDay };
  }, [result, teacher, days]);

  const toggleSlot = (slot) => {
    setSelectedSlots((c) =>
      c.includes(slot) ? c.filter((s) => s !== slot) : [...c, slot],
    );
  };

  const selectAllDaySlots = () => {
    if (selectedSlots.length === teacherImpactedClasses.length) {
      setSelectedSlots([]);
    } else {
      setSelectedSlots(teacherImpactedClasses.map((c) => c.slot));
    }
  };

  // Find all classes taught by this teacher on this day from the active timetable result
  const teacherImpactedClasses = useMemo(() => {
    if (!result?.assignments || !teacher) return [];
    return result.assignments.filter(
      (a) => a.teacher === teacher && a.day === day,
    );
  }, [result, teacher, day]);

  // Find available substitute teachers who are FREE at the teacher's scheduled slots
  const availableProxies = useMemo(() => {
    if (!teacher || teacherImpactedClasses.length === 0) return [];
    const busyTeachersAtSlots = new Set();

    const targetSlots =
      selectedSlots.length > 0
        ? selectedSlots
        : teacherImpactedClasses.map((c) => c.slot);

    (result?.assignments || []).forEach((a) => {
      if (a.day === day && targetSlots.includes(a.slot) && a.teacher) {
        busyTeachersAtSlots.add(a.teacher);
      }
    });

    const teacherObj = teachers.find((t) => (typeof t === "string" ? t : t.name) === teacher);
    const teacherDept = (typeof teacherObj === "object" ? teacherObj?.department : "") || "";

    return teachers
      .map((t) => {
        const name = typeof t === "string" ? t : t.name;
        const department = typeof t === "string" ? "Academic" : (t.department || "Academic");
        const phone = typeof t === "object" ? t.phone : "";
        return {
          name,
          department,
          isSameDept: department === teacherDept,
          phone,
        };
      })
      .filter((t) => t.name && t.name !== teacher && !busyTeachersAtSlots.has(t.name))
      .sort((a, b) => (b.isSameDept ? 1 : 0) - (a.isSameDept ? 1 : 0));
  }, [teachers, teacher, day, selectedSlots, teacherImpactedClasses, result]);

  const submit = () => {
    onReschedule({
      teacher,
      day,
      slots:
        selectedSlots.length > 0
          ? selectedSlots
          : teacherImpactedClasses.map((c) => c.slot),
      reason,
    });
  };

  const submitProxy = () => {
    const proxyToAssign = selectedProxy || availableProxies[0]?.name || "Substitute Faculty";
    onAssignProxy({
      teacher,
      proxy_teacher: proxyToAssign,
      day,
      slots:
        selectedSlots.length > 0
          ? selectedSlots
          : teacherImpactedClasses.map((c) => c.slot),
      reason,
    });
  };

  return (
    <div className="glass-card p-6 animate-fade-in relative overflow-hidden text-slate-100 space-y-6">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in text-white p-6">
          <GooeyLoader
            size="lg"
            text="AI Rescheduling & Constraint Re-optimization"
            subtitle="Reallocating impacted student sections with zero room/teacher clashes..."
          />
        </div>
      )}

      {/* Header Banner */}
      <div className="card p-6 bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <svg
              className="w-5 h-5 text-amber-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Reschedule Engine & Substitution Center
              </h1>
              <span className="inline-flex items-center whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                Dynamic Solver
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Handle sudden teacher leaves, room closures, emergency proxies,
              and live timetable adjustments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onBackToTimetable && (
            <button
              onClick={onBackToTimetable}
              className="btn-secondary text-xs px-3.5 py-2 font-bold shadow-sm flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Live Timetable
            </button>
          )}
          <span className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            AI Conflict-Free Matcher
          </span>
        </div>
      </div>

      {!hasResult ? (
        <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
          <p className="text-sm font-semibold">
            Generate or load a timetable first to enable dynamic AI
            rescheduling.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="card p-6 bg-slate-900 border border-slate-800 space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                Step 1: Mark Teacher Absence & Scope
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Select Absent Faculty *
                  </label>
                  <select
                    className="input-premium bg-slate-800 border-slate-700 text-white text-xs w-full"
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                  >
                    {teachers.map((t) => {
                      const tName = typeof t === "string" ? t : t.name;
                      return (
                        <option key={tName} value={tName}>
                          {tName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Day of Absence *
                  </label>
                  <select
                    className="input-premium bg-slate-800 border-slate-700 text-white text-xs w-full"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {teacher && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400 font-medium">
                    Weekly Workload: <strong className="text-amber-300 font-bold">{teacherWeeklySchedule.total} scheduled classes</strong>
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {days.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDay(d)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                          day === d
                            ? "bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {d}: {teacherWeeklySchedule.byDay[d] || 0}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Reason for Absence
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    "Medical Leave",
                    "Casual Leave",
                    "Official University Duty",
                    "Exam Invigilation",
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`p-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        reason === r
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Impacted Classes on {day} ({teacherImpactedClasses.length} Scheduled)
                  </h4>
                  {teacherImpactedClasses.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllDaySlots}
                      className="text-[11px] text-indigo-400 hover:underline font-bold"
                    >
                      {selectedSlots.length === teacherImpactedClasses.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  )}
                </div>

                {teacherImpactedClasses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No classes scheduled for {teacher} on {day}.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {teacherImpactedClasses.map((c, i) => {
                      const isSelected = selectedSlots.includes(c.slot);
                      return (
                        <div
                          key={i}
                          onClick={() => toggleSlot(c.slot)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-rose-500/20 border-rose-500/50 text-rose-200 shadow-sm"
                              : "bg-slate-900/80 border-slate-700/80 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          <div>
                            <p className="font-bold text-xs">
                              {c.subject}{" "}
                              <span className="font-mono text-[10px] opacity-80">
                                [{c.code}]
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Section {c.section} • Room {c.room}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {c.slot}
                            </span>
                            <p className="text-[10px] mt-1 font-bold">
                              {isSelected ? "Marked Absent" : "Regular"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="card p-6 bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  AI Proxy Recommendation
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  CONFLICT-FREE
                </span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {availableProxies.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 text-center">
                    Select an impacted class to view eligible free substitutes.
                  </p>
                ) : (
                  availableProxies.slice(0, 5).map((p, idx) => (
                    <div
                      key={p.name}
                      onClick={() => setSelectedProxy(p.name)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        (selectedProxy || availableProxies[0]?.name) === p.name
                          ? "bg-indigo-600/25 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                          : "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">{p.name}</span>
                          {p.isSameDept && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-bold">
                              Dept Match
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-xs">
                        {(selectedProxy || availableProxies[0]?.name) ===
                        p.name ? (
                          <span className="text-emerald-400 font-bold">
                            Selected
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">
                            Select
                          </span>
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <button
                className="btn-gradient w-full py-3 text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                onClick={submitProxy}
                disabled={!teacher || teacherImpactedClasses.length === 0}
              >
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Assign Substitute Proxy (Instant)
              </button>
            </div>

            <div className="card p-5 bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Alternative: Full Section Re-optimization
              </h3>
              <button
                className="px-4 py-2.5 w-full rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-2"
                onClick={submit}
                disabled={!teacher}
              >
                <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Run Full Solver Re-Optimization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
