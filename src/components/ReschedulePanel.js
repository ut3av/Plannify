import React, { useEffect, useState, useMemo } from "react";

export default function ReschedulePanel({
  teachers = [],
  days = ["Mon", "Tue", "Wed", "Thu", "Fri"],
  slots = [],
  hasResult,
  result,
  loading,
  onReschedule,
  onAssignProxy,
}) {
  const [teacher, setTeacher] = useState("");
  const [day, setDay] = useState("Mon");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [reason, setReason] = useState("Medical Leave");
  const [selectedProxy, setSelectedProxy] = useState("");

  useEffect(() => {
    setTeacher((c) => c || teachers[0]?.name || "");
  }, [teachers]);

  useEffect(() => {
    setDay((c) => (days.includes(c) ? c : days[0] || "Mon"));
  }, [days]);

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
    if (!result?.assignments) return [];
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
      if (a.day === day && targetSlots.includes(a.slot)) {
        busyTeachersAtSlots.add(a.teacher);
      }
    });

    const teacherObj = teachers.find((t) => t.name === teacher);
    const teacherDept = teacherObj?.department || "";

    return teachers
      .filter((t) => t.name !== teacher && !busyTeachersAtSlots.has(t.name))
      .map((t) => ({
        name: t.name,
        department: t.department || "Academic",
        isSameDept: t.department === teacherDept,
        phone: t.phone,
      }))
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
    onAssignProxy({
      teacher,
      proxy_teacher: selectedProxy || availableProxies[0]?.name,
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
        <div className="absolute inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in text-white">
          <div className="w-16 h-16 relative mb-6">
            <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
            <svg
              className="w-6 h-6 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">
            AI Rescheduling & Constraint Re-optimization
          </h3>
          <p className="text-sm text-slate-300">
            Reallocating impacted student sections with zero room/teacher
            clashes...
          </p>
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
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Reschedule Engine & Substitution Center
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DYNAMIC SOLVER
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Handle sudden teacher leaves, room closures, emergency proxies,
              and live timetable adjustments.
            </p>
          </div>
        </div>

        <span className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-amber-300">
          ⚡ AI Conflict-Free Matcher
        </span>
      </div>

      {!hasResult ? (
        <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
          <svg
            className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          <p className="text-sm font-semibold">
            Generate or load a timetable first to enable dynamic AI
            rescheduling.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Absence Setup (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="card p-6 bg-slate-900 border border-slate-800 space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span>📋</span> Step 1: Mark Teacher Absence & Scope
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Select Absent Faculty *
                  </label>
                  <select
                    className="input-premium w-full text-xs bg-slate-800 border-slate-700 text-white cursor-pointer"
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                  >
                    {teachers.map((t) => (
                      <option
                        key={t.name}
                        value={t.name}
                        className="bg-slate-900"
                      >
                        {t.name} ({t.department || "Faculty"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Day of Absence *
                  </label>
                  <select
                    className="input-premium w-full text-xs bg-slate-800 border-slate-700 text-white cursor-pointer"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  >
                    {days.map((d) => (
                      <option key={d} value={d} className="bg-slate-900">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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

              {/* Impacted Classes Scanner */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <span>⚠️</span> Impacted Classes on {day} (
                    {teacherImpactedClasses.length} Scheduled)
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
                              👥 {c.section} • 📍 {c.room}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {c.slot}
                            </span>
                            <p className="text-[10px] mt-1 font-bold">
                              {isSelected ? "🔴 Marked Absent" : "⚪ Regular"}
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

          {/* Right Column: AI Resolution Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Resolution Option 1: AI Substitute Proxy Matcher */}
            <div className="card p-6 bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <span>🤖</span> AI Proxy Recommendation
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  CONFLICT-FREE
                </span>
              </div>

              <p className="text-xs text-slate-400">
                AI scans all faculty timetables to find free professors in the
                same discipline with zero period clashes:
              </p>

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
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {p.department}
                        </p>
                      </div>

                      <span className="text-xs">
                        {(selectedProxy || availableProxies[0]?.name) ===
                        p.name ? (
                          <span className="text-emerald-400 font-bold">
                            ✓ Selected
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
                <span>⚡</span> Assign Substitute Proxy (Instant)
              </button>
            </div>

            {/* Resolution Option 2: Full Schedule Optimization */}
            <div className="card p-5 bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Alternative: Full Section Re-optimization
              </h3>
              <p className="text-[11px] text-slate-400">
                Let the constraint solver re-distribute these classes to another
                free period in the week for the section.
              </p>
              <button
                className="px-4 py-2.5 w-full rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-2"
                onClick={submit}
                disabled={!teacher}
              >
                <span>🔄</span> Run Full Solver Re-Optimization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
