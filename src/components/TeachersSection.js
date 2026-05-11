import { useState } from "react";

const DEFAULT_TEACHER_COLOR = { bg: "rgba(14,165,233,0.12)", border: "rgba(14,165,233,0.3)", text: "#7dd3fc", accent: "#38bdf8" };

export default function TeachersSection({ teachers, onChange }) {
  const [name, setName] = useState("");
  const [freePeriods, setFreePeriods] = useState(1);

  const addTeacher = () => {
    const trimmed = name.trim();
    if (trimmed && !teachers.find(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...teachers, { name: trimmed, free_periods: freePeriods }]);
      setName("");
      setFreePeriods(1);
    }
  };

  const removeTeacher = (index) => {
    onChange(teachers.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTeacher();
    }
  };

  return (
    <div className="glass-card p-6 animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            Teachers
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-10">
            Add the teachers who will be scheduled. Each teacher can teach multiple subjects.
          </p>
        </div>
        <span className="text-sm font-semibold text-slate-500 bg-white dark:bg-white/[0.04] rounded-lg px-3 py-1.5 border border-slate-200 dark:border-white/[0.06]">
          {teachers.length} added
        </span>
      </div>

      {/* Add input */}
      <div className="flex items-end gap-3 mb-6">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold ml-1">Teacher Name</label>
          <input type="text" className="glass-input w-full" placeholder="e.g. John Doe..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} />
        </div>
        <div className="w-32 flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold ml-1">Free Periods / Day</label>
          <input type="number" min="0" className="glass-input w-full" value={freePeriods} onChange={(e) => setFreePeriods(parseInt(e.target.value) || 0)} title="Free Periods Per Day" />
        </div>
        <button className="btn-gradient px-5 h-[42px]" onClick={addTeacher} disabled={!name.trim()}>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add
          </span>
        </button>
      </div>

      {/* Teacher cards */}
      {teachers.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
          <p className="text-sm">No teachers added yet. Add your first teacher above.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {teachers.map((t, index) => {
            const color = DEFAULT_TEACHER_COLOR;
            return (
              <div key={index} className="group relative rounded-xl p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ background: color.bg, border: `1px solid ${color.border}` }}>
                <div className="flex items-start justify-between gap-3 overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-sm shrink-0`} style={{ color: color.accent, backgroundColor: color.bg, border: `1px solid ${color.border}` }}>
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{t.name}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: color.accent }}>{t.free_periods} free period{t.free_periods !== 1 ? 's' : ''}/day</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeTeacher(index)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    title="Remove teacher"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
