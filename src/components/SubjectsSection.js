import React, { useState, useMemo } from "react";

/* Theme-Adaptive Professional Color Palettes for Subject Badges */
export const SUBJECT_PALETTES = {
  light: [
    { bg: "#FEF3C7", border: "#F59E0B", text: "#78350F", accent: "#92400E", tag: "Amber" },
    { bg: "#FFEDD5", border: "#FB923C", text: "#7C2D12", accent: "#C2410C", tag: "Terracotta" },
    { bg: "#ECFDF5", border: "#34D399", text: "#064E3B", accent: "#047857", tag: "Emerald" },
    { bg: "#EFF6FF", border: "#60A5FA", text: "#1E3A8A", accent: "#1D4ED8", tag: "Cobalt" },
    { bg: "#F5F3FF", border: "#A78BFA", text: "#4C1D95", accent: "#6D28D9", tag: "Plum" },
    { bg: "#FFF1F2", border: "#FB7185", text: "#881337", accent: "#BE123C", tag: "Rose" },
    { bg: "#F0FDFA", border: "#2DD4BF", text: "#134E4A", accent: "#0F766E", tag: "Teal" },
    { bg: "#FEF9C3", border: "#EAB308", text: "#713F12", accent: "#A16207", tag: "Gold" },
  ],
  warm: [
    { bg: "#FEF3C7", border: "#F59E0B", text: "#78350F", accent: "#92400E", tag: "Amber" },
    { bg: "#FFEDD5", border: "#FB923C", text: "#7C2D12", accent: "#C2410C", tag: "Terracotta" },
    { bg: "#ECFDF5", border: "#34D399", text: "#064E3B", accent: "#047857", tag: "Emerald" },
    { bg: "#EFF6FF", border: "#60A5FA", text: "#1E3A8A", accent: "#1D4ED8", tag: "Cobalt" },
    { bg: "#F5F3FF", border: "#A78BFA", text: "#4C1D95", accent: "#6D28D9", tag: "Plum" },
    { bg: "#FFF1F2", border: "#FB7185", text: "#881337", accent: "#BE123C", tag: "Rose" },
    { bg: "#F0FDFA", border: "#2DD4BF", text: "#134E4A", accent: "#0F766E", tag: "Teal" },
    { bg: "#FEF9C3", border: "#EAB308", text: "#713F12", accent: "#A16207", tag: "Gold" },
  ],
  dark: [
    { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.45)", text: "#FDE68A", accent: "#FBBF24", tag: "Amber" },
    { bg: "rgba(234,88,12,0.15)", border: "rgba(234,88,12,0.45)", text: "#FED7AA", accent: "#FB923C", tag: "Terracotta" },
    { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.45)", text: "#A7F3D0", accent: "#34D399", tag: "Emerald" },
    { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.45)", text: "#BFDBFE", accent: "#60A5FA", tag: "Cobalt" },
    { bg: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.45)", text: "#DDD6FE", accent: "#C084FC", tag: "Plum" },
    { bg: "rgba(244,63,94,0.15)", border: "rgba(244,63,94,0.45)", text: "#FECDD3", accent: "#FB7185", tag: "Rose" },
    { bg: "rgba(20,184,166,0.15)", border: "rgba(20,184,166,0.45)", text: "#99F6E4", accent: "#2DD4BF", tag: "Teal" },
    { bg: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.45)", text: "#FEF08A", accent: "#FACC15", tag: "Gold" },
  ]
};

export const SUBJECT_COLORS = SUBJECT_PALETTES.light;

export function getSubjectColor(colorIndex = 0, isLight = true) {
  const palette = isLight ? SUBJECT_PALETTES.light : SUBJECT_PALETTES.dark;
  return palette[colorIndex % palette.length] || palette[0];
}

export default function SubjectsSection({ subjects = [], teachers = [], sections = [], rooms = [], onChange }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState(teachers[0]?.name || "");
  const [selectedSections, setSelectedSections] = useState([]);
  const [slots, setSlots] = useState(4);
  const [isLab, setIsLab] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "theory" | "lab"
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isSectionOpen, setIsSectionOpen] = useState(false);

  const addSubject = (e) => {
    e && e.preventDefault();
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if (trimmedName && teacher) {
      const newSubject = {
        code: trimmedCode,
        name: trimmedName,
        teacher,
        sections: selectedSections.length > 0 ? selectedSections : undefined,
        section: selectedSections.length === 1 ? selectedSections[0] : undefined,
        is_lab: isLab,
        required_slots: isLab && slots % 2 !== 0 ? slots + 1 : slots,
        colorIndex
      };

      onChange([...subjects, newSubject]);
      setCode("");
      setName("");
      setSlots(4);
      setIsLab(false);
      setSelectedSections([]);
      setColorIndex((colorIndex + 1) % SUBJECT_COLORS.length);
    }
  };

  const removeSubject = (index) => {
    if (window.confirm("Are you sure you want to remove this subject from curriculum?")) {
      onChange(subjects.filter((_, i) => i !== index));
    }
  };

  const duplicateSubject = (sub) => {
    const dup = {
      ...sub,
      code: sub.code ? `${sub.code}-COPY` : "",
      colorIndex: (sub.colorIndex + 1) % SUBJECT_COLORS.length
    };
    onChange([...subjects, dup]);
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

  // Drag and drop re-order
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newSubs = [...subjects];
    const draggedItem = newSubs[draggedIndex];
    newSubs.splice(draggedIndex, 1);
    newSubs.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    onChange(newSubs);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleSection = (secName) => {
    if (selectedSections.includes(secName)) {
      setSelectedSections(selectedSections.filter(s => s !== secName));
    } else {
      setSelectedSections([...selectedSections, secName]);
    }
  };

  const selectAllSections = () => {
    if (selectedSections.length === sections.length) {
      setSelectedSections([]);
    } else {
      setSelectedSections(sections.map(s => s.name || s));
    }
  };

  const filteredSubjects = useMemo(() => {
    return subjects.filter(sub => {
      // Type Filter
      if (filterType === "theory" && sub.is_lab) return false;
      if (filterType === "lab" && !sub.is_lab) return false;

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = (sub.name || "").toLowerCase().includes(q);
      const matchCode = (sub.code || "").toLowerCase().includes(q);
      const matchTeacher = (sub.teacher || "").toLowerCase().includes(q);
      const matchSection = (sub.section || (sub.sections || []).join(" ")).toLowerCase().includes(q);
      return matchName || matchCode || matchTeacher || matchSection;
    });
  }, [subjects, filterType, searchQuery]);

  const totalSlotsSum = subjects.reduce((sum, s) => sum + (s.required_slots || 0), 0);
  const labCount = subjects.filter(s => s.is_lab).length;
  const theoryCount = subjects.length - labCount;

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Header Banner */}
      <div className="card p-6 bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </svg>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Subjects & Curriculum Matrix
                </h1>
                <span className="inline-flex items-center whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30">
                  Priority Order
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage subject codes, weekly period allocations, teacher bindings, and multi-section delivery.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-amber-800 dark:text-indigo-300">
            {subjects.length} Subjects ({totalSlotsSum} weekly periods)
          </span>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Subjects</p>
          <h3 className="text-2xl font-black text-white mt-1">{subjects.length}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Across all departments</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">Theory Lectures</p>
          <h3 className="text-2xl font-black text-sky-700 dark:text-sky-400 mt-1">{theoryCount}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Standard 1-slot periods</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Practical Labs</p>
          <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{labCount}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Continuous 2-slot blocks</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Total Period Load</p>
          <h3 className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">{totalSlotsSum}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Weekly scheduled periods</p>
        </div>
      </div>

      {/* ── CREATE / ADD SUBJECT COMPACT WIZARD ── */}
      <form onSubmit={addSubject} className="card p-6 bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          Add New Subject to Curriculum
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
          {/* Code */}
          <div className="lg:col-span-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Code</label>
            <input
              className="input-premium w-full text-xs font-mono bg-slate-800 border-slate-700 text-white"
              placeholder="e.g. BCA-301"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          {/* Name */}
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Subject Name *</label>
            <input
              className="input-premium w-full text-xs bg-slate-800 border-slate-700 text-white"
              placeholder="e.g. Object Oriented Programming"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Teacher */}
          <div className="lg:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Assigned Teacher *</label>
            <select
              className="input-premium w-full text-xs bg-slate-800 border-slate-700 text-white cursor-pointer"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              required
            >
              {teachers.map((t) => (
                <option key={t.name} value={t.name} className="bg-slate-900 text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Weekly Slots Stepper */}
          <div className="lg:col-span-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Periods / Week</label>
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setSlots(Math.max(isLab ? 2 : 1, slots - (isLab ? 2 : 1)))}
                className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
              >
                -
              </button>
              <span className="flex-1 text-center font-bold text-white text-xs">{slots}</span>
              <button
                type="button"
                onClick={() => setSlots(slots + (isLab ? 2 : 1))}
                className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Add Action Button */}
          <div className="lg:col-span-1">
            <button
              type="submit"
              disabled={!name.trim()}
              className="btn-primary w-full py-2.5 text-xs font-bold shadow-lg gap-1.5"
            >
              <span>+</span> Add
            </button>
          </div>
        </div>

        {/* Lab Toggle & Section Multi-Picker */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500/30"
              checked={isLab}
              onChange={(e) => {
                const nextLab = e.target.checked;
                setIsLab(nextLab);
                if (nextLab && slots % 2 !== 0) setSlots(slots + 1);
              }}
            />
            <span className="text-xs font-bold text-slate-200">
              Laboratory Course (Schedules continuous 2-period lab blocks in dedicated lab room)
            </span>
          </label>

          {/* Section selector dropdown toggle */}
          {sections.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSectionOpen(!isSectionOpen)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <span>Assign Sections:</span>
                <span className="text-indigo-400 font-bold">
                  {selectedSections.length === 0 ? "All Sections" : `${selectedSections.length} Selected`}
                </span>
                <span className="text-[10px]">▼</span>
              </button>

              {isSectionOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-20 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                    <span className="font-bold text-white">Select Sections</span>
                    <button
                      type="button"
                      onClick={selectAllSections}
                      className="text-[10px] text-indigo-400 hover:underline font-bold"
                    >
                      {selectedSections.length === sections.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {sections.map(sec => {
                      const sName = sec.name || sec;
                      const isChecked = selectedSections.includes(sName);
                      return (
                        <label key={sName} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSection(sName)}
                            className="rounded text-indigo-500"
                          />
                          <span className="text-slate-200">{sName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </form>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className="card p-5 bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="input-premium w-full pl-10 bg-slate-800 border-slate-700 text-white text-xs placeholder:text-slate-500"
            placeholder="Search subjects by name, code, teacher, or section..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { id: "all", label: `All (${subjects.length})` },
            { id: "theory", label: `Theory (${theoryCount})` },
            { id: "lab", label: `Labs (${labCount})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === f.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SUBJECT CARDS GRID (DRAGGABLE) ── */}
      {filteredSubjects.length === 0 ? (
        <div className="card p-12 text-center text-slate-500 border border-slate-800 bg-slate-900/50">
          <p className="text-sm font-semibold">No subjects match the search filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((sub, index) => {
            const originalIndex = subjects.indexOf(sub);
            const c = SUBJECT_COLORS[sub.colorIndex % SUBJECT_COLORS.length] || SUBJECT_COLORS[0];
            const secDisplay = sub.sections && sub.sections.length > 0 
              ? sub.sections.join(", ") 
              : (sub.section || "All Assigned Sections");

            return (
              <div
                key={`${sub.name}-${sub.teacher}-${index}`}
                draggable
                onDragStart={(e) => handleDragStart(e, originalIndex)}
                onDragOver={(e) => handleDragOver(e, originalIndex)}
                onDragEnd={handleDragEnd}
                className={`card p-5 border transition-all flex flex-col justify-between gap-3 group select-none ${
                  draggedIndex === originalIndex
                    ? "opacity-40 scale-95 border-indigo-500 bg-indigo-500/20"
                    : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 shadow-md"
                }`}
              >
                <div>
                  {/* Top Bar: Code Badge, Lab Tag & Actions */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {sub.code && (
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border" style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}>
                          {sub.code}
                        </span>
                      )}
                      {sub.is_lab ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                          Lab (2-Slot)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30">
                          Theory
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => duplicateSubject(sub)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                        title="Duplicate for another section"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                      <button
                        onClick={() => removeSubject(originalIndex)}
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                        title="Remove subject"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* Subject Name */}
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {sub.name}
                  </h3>

                  {/* Assigned Teacher */}
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">
                      <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </span>
                    <span className="font-semibold truncate">{sub.teacher}</span>
                  </div>

                  {/* Section Badge */}
                  <p className="text-[11px] text-slate-400 mt-2 truncate flex items-center gap-1">
                    <svg className="w-3 h-3 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    <span>{secDisplay}</span>
                  </p>
                </div>

                {/* Footer Controls: Slots Stepper */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-semibold">Weekly Load:</span>
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-0.5">
                    <button
                      onClick={() => updateSubjectSlots(originalIndex, -1)}
                      className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-white flex items-center justify-center text-xs"
                      title="Decrease weekly classes"
                    >
                      -
                    </button>
                    <span className="px-2.5 font-black text-white text-xs">
                      {sub.required_slots} slots
                    </span>
                    <button
                      onClick={() => updateSubjectSlots(originalIndex, 1)}
                      className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-white flex items-center justify-center text-xs"
                      title="Increase weekly classes"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
