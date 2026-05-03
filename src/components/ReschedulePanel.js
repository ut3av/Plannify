import { useEffect, useState } from "react";

export default function ReschedulePanel({ teachers, days, slots, disabled, onReschedule, onAssignProxy }) {
  const [teacher, setTeacher] = useState("");
  const [day, setDay] = useState("Mon");
  const [selectedSlots, setSelectedSlots] = useState([]);

  useEffect(() => { setTeacher((c) => c || teachers[0]?.name || ""); }, [teachers]);
  useEffect(() => { setDay((c) => (days.includes(c) ? c : days[0] || "Mon")); }, [days]);

  const toggleSlot = (slot) => {
    setSelectedSlots((c) => c.includes(slot) ? c.filter((s) => s !== slot) : [...c, slot]);
  };

  const submit = () => { onReschedule({ teacher, day, slots: selectedSlots }); };
  const submitProxy = () => { onAssignProxy({ teacher, day, slots: selectedSlots }); };

  return (
    <div className="glass-card p-6 animate-scale-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
            </div>
            Dynamic Rescheduling
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-10">Mark a teacher unavailable for specific day/slots and generate a new valid timetable.</p>
        </div>
      </div>

      {disabled && (
        <div className="text-center py-8 text-slate-500">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
          <p className="text-sm">Generate a timetable first to enable rescheduling.</p>
        </div>
      )}

      {!disabled && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Teacher unavailable</label>
              <select className="glass-input cursor-pointer" value={teacher} onChange={(e) => setTeacher(e.target.value)}>
                {teachers.map((t) => (<option key={t.name} value={t.name} className="bg-slate-900">{t.name}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Day</label>
              <select className="glass-input cursor-pointer" value={day} onChange={(e) => setDay(e.target.value)}>
                {days.map((d) => (<option key={d} value={d} className="bg-slate-900">{d}</option>))}
              </select>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Block specific slots</p>
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => {
                const active = selectedSlots.includes(slot);
                return (
                  <button key={slot} onClick={() => toggleSlot(slot)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                      active
                        ? "bg-red-500/15 border-red-500/40 text-red-200"
                        : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-white/[0.04] hover:border-slate-300 dark:border-white/[0.1]"
                    }`}
                  >{slot}</button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Leave all unselected to block the teacher for the entire day.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="btn-outline flex-1 px-8" onClick={submit} disabled={!teacher}>
              Reschedule Entire Timetable
            </button>
            <button className="btn-gradient flex-1 px-8" onClick={submitProxy} disabled={!teacher || !day}>
              Find Proxy / Substitute
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
