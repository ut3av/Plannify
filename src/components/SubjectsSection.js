import { useState } from "react";

/* Color palette for subject badges */
export const SUBJECT_COLORS = [
  { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)", text: "#c4b5fd", accent: "#a78bfa" },
  { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.3)", text: "#fda4af", accent: "#fb7185" },
  { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#fcd34d", accent: "#fbbf24" },
  { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "#6ee7b7", accent: "#34d399" },
  { bg: "rgba(14,165,233,0.12)", border: "rgba(14,165,233,0.3)", text: "#7dd3fc", accent: "#38bdf8" },
  { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)", text: "#d8b4fe", accent: "#c084fc" },
  { bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.3)", text: "#f9a8d4", accent: "#f472b6" },
  { bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.3)", text: "#67e8f9", accent: "#22d3ee" },
  { bg: "rgba(234,88,12,0.12)", border: "rgba(234,88,12,0.3)", text: "#fdba74", accent: "#fb923c" },
  { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", text: "#86efac", accent: "#4ade80" },
];

export default function SubjectsSection({ subjects, teachers, sections = [], rooms = [], onChange }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState(teachers[0]?.name || "");
  const [selectedSections, setSelectedSections] = useState([]);
  const [slots, setSlots] = useState(3);
  const [isLab, setIsLab] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);
  const [isSectionOpen, setIsSectionOpen] = useState(false);

  const addSubject = () => {
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if (trimmedName && teacher) {
      const newSubject = { 
        code: trimmedCode, 
        name: trimmedName, 
        teacher, 
        section: undefined, 
        sections: selectedSections.length > 0 ? selectedSections : undefined,
        is_lab: isLab, 
        required_slots: slots, 
        colorIndex 
      };
      
      onChange([...subjects, newSubject]);
      setCode("");
      setName("");
      setSlots(3);
      setIsLab(false);
      setSelectedSections([]);
      setColorIndex((colorIndex + 1) % SUBJECT_COLORS.length);
    }
  };

  const removeSubject = (index) => {
    onChange(subjects.filter((_, i) => i !== index));
  };

  const updateSubjectSlots = (index, delta) => {
    const newSubjects = [...subjects];
    const subject = { ...newSubjects[index] };
    const step = subject.is_lab ? 2 : 1;
    const minSlots = subject.is_lab ? 2 : 1;
    const newSlots = Math.max(minSlots, subject.required_slots + (delta * step));
    if (newSlots !== subject.required_slots) {
      subject.required_slots = newSlots;
      newSubjects[index] = subject;
      onChange(newSubjects);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubject();
    }
  };

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
      <div className={`grid gap-3 mb-6 items-end ${sections.length > 0 ? "sm:grid-cols-[80px_1fr_140px_120px_120px_70px_auto_auto]" : "sm:grid-cols-[80px_1fr_160px_120px_80px_auto_auto]"}`}>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Code</label>
          <input
            className="glass-input"
            type="text"
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
          <div className="relative">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Sections</label>
            <div 
              className="glass-input cursor-pointer flex items-center justify-between" 
              style={{ height: '42px', padding: '0 12px' }}
              onClick={() => setIsSectionOpen(!isSectionOpen)}
            >
              <span className="truncate text-sm pr-2 text-slate-800 dark:text-slate-200">
                {selectedSections.length === 0 ? "None" : selectedSections.join(", ")}
              </span>
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${isSectionOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
            
            {isSectionOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSectionOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 z-50 glass-card p-2 flex flex-col gap-1 max-h-48 overflow-y-auto shadow-xl border border-slate-200 dark:border-white/[0.1] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                  {sections.map((s) => (
                    <label key={s.name} className="flex items-center gap-2.5 p-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-slate-300 dark:border-white/[0.2] bg-white dark:bg-white/[0.04] text-violet-500 focus:ring-violet-500/30 cursor-pointer"
                        checked={selectedSections.includes(s.name)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedSections([...selectedSections, s.name]);
                          else setSelectedSections(selectedSections.filter(x => x !== s.name));
                        }}
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.name}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Lectures in a week</label>
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

      {/* Color Picker */}
      <div className="mb-6">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">Subject Color</label>
        <div className="flex gap-2 flex-wrap">
          {SUBJECT_COLORS.map((color, index) => (
            <button
              key={index}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${colorIndex === index ? 'scale-110 shadow-lg' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
              style={{ backgroundColor: color.accent, borderColor: colorIndex === index ? 'white' : 'transparent' }}
              onClick={() => setColorIndex(index)}
              title={`Color ${index + 1}`}
            />
          ))}
        </div>
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
            const color = SUBJECT_COLORS[subject.colorIndex % SUBJECT_COLORS.length] || SUBJECT_COLORS[0];
            return (
              <div
                key={`${subject.name}-${index}`}
                className="group flex items-center justify-between rounded-xl px-4 py-3 hover:scale-[1.005] transition-all duration-200"
                style={{ background: color.bg, border: `1px solid ${color.border}` }}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color.accent }} />
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
                      {subject.teacher} 
                      {subject.sections && subject.sections.length > 0 
                        ? ` • ${subject.sections.join(", ")}` 
                        : (subject.section ? ` • ${subject.section}` : " • Any Section (Auto)")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] p-1 flex-shrink-0 border border-white/[0.05]">
                    <button 
                      onClick={() => updateSubjectSlots(index, -1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.1] transition-colors"
                      title="Decrease slots"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <div className="flex items-center gap-1 px-1">
                      <svg className="w-3 h-3 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-4 text-center">{subject.required_slots}</span>
                    </div>
                    <button 
                      onClick={() => updateSubjectSlots(index, 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.1] transition-colors"
                      title="Increase slots"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
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
