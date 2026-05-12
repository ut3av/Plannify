import { useState } from "react";

export default function SectionsSection({ sections, rooms, onChange }) {
  const [branch, setBranch] = useState("");
  const [numSections, setNumSections] = useState(1);

  const generateSections = (e) => {
    e.preventDefault();
    const val = branch.trim();
    if (!val) return;
    
    const newSections = [];
    const baseCharCode = 65; // 'A'
    for (let i = 0; i < numSections; i++) {
      const secName = `${val}-${String.fromCharCode(baseCharCode + i)}`;
      if (!sections.find((s) => s.name === secName)) {
        newSections.push({
          name: secName,
          room: "",
          lab_room: ""
        });
      }
    }
    onChange([...sections, ...newSections]);
    setBranch("");
    setNumSections(1);
  };

  const removeSection = (secName) => {
    onChange(sections.filter((s) => s.name !== secName));
  };

  const updateSection = (secName, field, value) => {
    onChange(sections.map((s) => s.name === secName ? { ...s, [field]: value } : s));
  };

  return (
    <section className="glass-card p-6 animate-scale-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          Branches & Sections
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Generate sections for a branch and assign fixed rooms/labs.</p>
      </div>

      <form onSubmit={generateSections} className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Branch Name</label>
          <input
            type="text"
            placeholder="e.g. CS"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="input-premium"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5 text-center">Sections</label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setNumSections(Math.max(1, numSections - 1))} className="w-10 h-[46px] rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white transition-all">-</button>
            <span className="w-8 text-center font-black text-white text-lg">{numSections}</span>
            <button type="button" onClick={() => setNumSections(Math.min(10, numSections + 1))} className="w-10 h-[46px] rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white transition-all">+</button>
          </div>
        </div>
        <button type="submit" disabled={!branch.trim()} className="btn-premium whitespace-nowrap h-[46px] px-8 py-0 rounded-xl">
          Generate Sections
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-2">No sections added yet.</p>
        ) : (
          sections.map((sec) => (
            <div key={sec.name} className="glass-card p-4 relative group">
              <button
                onClick={() => removeSection(sec.name)}
                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
              <h3 className="font-bold text-slate-800 dark:text-white mb-3">{sec.name}</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] uppercase text-slate-500 block mb-1">Fixed Room</label>
                  <select
                    className="input-premium text-xs py-2 px-2 w-full"
                    value={sec.room || ""}
                    onChange={(e) => updateSection(sec.name, "room", e.target.value)}
                  >
                    <option value="" className="bg-slate-900">Any Room</option>
                    {rooms.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase text-slate-500 block mb-1">Lab Room</label>
                  <select
                    className="input-premium text-xs py-2 px-2 w-full"
                    value={sec.lab_room || ""}
                    onChange={(e) => updateSection(sec.name, "lab_room", e.target.value)}
                  >
                    <option value="" className="bg-slate-900">Any Lab</option>
                    {rooms.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
