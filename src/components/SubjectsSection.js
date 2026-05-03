import { useState } from "react";

export default function SubjectsSection({ subjects, teachers, sections = [], onChange }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState(teachers[0]?.name || "");
  const [section, setSection] = useState(sections[0]?.name || "");
  const [slots, setSlots] = useState(3);
  const [isLab, setIsLab] = useState(false);

  const addSubject = () => {
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if (trimmedName && teacher) {
      onChange([...subjects, { code: trimmedCode, name: trimmedName, teacher, section: section || undefined, is_lab: isLab, required_slots: slots }]);
      setCode("");
      setName("");
      setSlots(3);
      setIsLab(false);
    }
  };

  const removeSubject = (index) => {
    onChange(subjects.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubject();
    }
  };

  /* Color palette for subject badges */
  const COLORS = [
    { bg: "from-violet-500/20 to-purple-500/20", border: "border-violet-500/30", dot: "bg-violet-400" },
    { bg: "from-rose-500/20 to-pink-500/20", border: "border-rose-500/30", dot: "bg-rose-400" },
    { bg: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/30", dot: "bg-amber-400" },
    { bg: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/30", dot: "bg-emerald-400" },
    { bg: "from-sky-500/20 to-cyan-500/20", border: "border-sky-500/30", dot: "bg-sky-400" },
    { bg: "from-indigo-500/20 to-blue-500/20", border: "border-indigo-500/30", dot: "bg-indigo-400" },
    { bg: "from-pink-500/20 to-fuchsia-500/20", border: "border-pink-500/30", dot: "bg-pink-400" },
    { bg: "from-teal-500/20 to-cyan-500/20", border: "border-teal-500/30", dot: "bg-teal-400" },
  ];

  return (
    <div className="glass-card p-6 animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </svg>
            </div>
            Subjects
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-10">
            Define subjects with their assigned teacher and weekly slot requirements.
          </p>
        </div>
        <span className="text-sm font-semibold text-slate-500 bg-white dark:bg-white/[0.04] rounded-lg px-3 py-1.5 border border-slate-200 dark:border-white/[0.06]">
          {subjects.reduce((s, sub) => s + sub.required_slots, 0)} total slots
        </span>
      </div>

      {/* Add form */}
      <div className={`grid gap-3 mb-6 items-end ${sections.length > 0 ? "sm:grid-cols-[80px_1fr_160px_160px_80px_auto_auto]" : "sm:grid-cols-[80px_1fr_160px_80px_auto_auto]"}`}>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Code</label>
          <input
            className="glass-input"
            type="number"
            placeholder="e.g. 201"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Subject name</label>
          <input
            className="glass-input"
            placeholder="e.g. Mathematics"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Teacher</label>
          <select
            className="glass-input cursor-pointer"
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
          >
            {teachers.map((t) => (
              <option key={t.name} value={t.name} className="bg-slate-900">{t.name}</option>
            ))}
          </select>
        </div>
        {sections.length > 0 && (
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Section</label>
            <select
              className="glass-input cursor-pointer"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              <option value="" className="bg-slate-900">None</option>
              {sections.map((s) => (
                <option key={s.name} value={s.name} className="bg-slate-900">{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Slots</label>
          <input
            className="glass-input text-center"
            type="number"
            min={isLab ? "2" : "1"}
            step={isLab ? "2" : "1"}
            max="20"
            value={slots}
            onChange={(e) => setSlots(Math.max(isLab ? 2 : 1, parseInt(e.target.value) || (isLab ? 2 : 1)))}
          />
        </div>
        <div className="flex items-center mb-2 mx-1">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-violet-500 focus:ring-violet-500/30 cursor-pointer"
              checked={isLab}
              onChange={(e) => {
                setIsLab(e.target.checked);
                if (e.target.checked && slots % 2 !== 0) setSlots(slots + 1);
              }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:text-slate-300">Lab (2 periods)</span>
          </label>
        </div>
        <button
          className="btn-gradient px-5 h-[42px]"
          onClick={addSubject}
          disabled={!name.trim() || !teacher}
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add
          </span>
        </button>
      </div>

      {/* Subject cards */}
      {subjects.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          <p className="text-sm">No subjects added yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {subjects.map((subject, index) => {
            const color = COLORS[index % COLORS.length];
            return (
              <div
                key={`${subject.name}-${index}`}
                className={`group flex items-center justify-between rounded-xl bg-gradient-to-r ${color.bg} border ${color.border} px-4 py-3 hover:scale-[1.005] transition-all duration-200`}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${color.dot} flex-shrink-0`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {subject.code ? <span className="text-violet-300 mr-2">{subject.code}</span> : null}
                        {subject.name}
                      </p>
                      {subject.is_lab && (
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold tracking-wider uppercase border border-rose-500/20">Lab</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {subject.teacher} {subject.section ? `• ${subject.section}` : "• Any Section (Auto)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1 flex-shrink-0">
                    <svg className="w-3 h-3 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{subject.required_slots} slots/week</span>
                  </div>
                </div>
                <button
                  onClick={() => removeSubject(index)}
                  className="ml-3 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove subject"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
