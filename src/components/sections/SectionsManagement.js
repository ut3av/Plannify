import React, { useState } from 'react';

export default function SectionsManagement({
  sections = [],
  rooms = [],
  subjects = [],
  teachers = [],
  onChange,
  onNavigate
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    room: "",
    lab_room: ""
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const updated = [...sections, { ...form }];
    onChange && onChange(updated);
    setForm({ name: "", room: "", lab_room: "" });
    setShowAddModal(false);
  };

  const handleDelete = (index) => {
    if (window.confirm("Are you sure you want to delete this section/class?")) {
      const updated = sections.filter((_, i) => i !== index);
      onChange && onChange(updated);
    }
  };

  // Helper to find linked subjects & teachers for a section
  const getLinkedData = (secName) => {
    const linkedSubs = subjects.filter(sub => {
      if (Array.isArray(sub.sections)) return sub.sections.includes(secName);
      return sub.section === secName;
    });
    const teacherNames = [...new Set(linkedSubs.map(s => s.teacher).filter(Boolean))];
    return { linkedSubs, teacherNames };
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Module Header */}
      <div className="card p-6 bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polygon points="2 17 12 22 22 17"/><polygon points="2 12 12 17 22 12"/></svg>
            </span>
            Sections & Classes Setup
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Setup for academic sections, classroom allocations, and subject-teacher bindings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowAddModal(true)} className="btn-primary gap-2 text-xs py-2.5 px-4 font-bold">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Section / Class
          </button>
        </div>
      </div>

      {/* Sections Table */}
      <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Registered Classes & Sections ({sections.length})</h2>
            <p className="text-xs text-slate-400">Classrooms and lab allocations</p>
          </div>
        </div>

        {sections.length > 0 ? (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase">
                <tr>
                  <th className="p-3">Section / Class</th>
                  <th className="p-3">Lecture Room</th>
                  <th className="p-3">Lab Room</th>
                  <th className="p-3">Linked Subjects & Faculty</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {sections.map((sec, i) => {
                  const { linkedSubs, teacherNames } = getLinkedData(sec.name);
                  return (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-indigo-600/30 text-amber-800 dark:text-indigo-300 font-black text-xs flex items-center justify-center border border-amber-300 dark:border-indigo-500/40">
                            {sec.name ? sec.name.slice(0, 3) : 'SEC'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{sec.name}</div>
                            <div className="text-[10px] text-slate-500">Active Cohort</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-800 dark:text-indigo-300 font-medium">
                          {sec.room || "Auto Assigned"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-purple-800 dark:text-purple-300 font-medium">
                          {sec.lab_room || "Auto Assigned"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="text-slate-300 font-semibold">
                            {linkedSubs.length} Subjects: <span className="text-slate-400 font-normal">{linkedSubs.map(s => s.name).join(", ") || "None assigned yet"}</span>
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            Faculty: {teacherNames.join(", ") || "Unassigned"}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 flex items-center gap-2">
                        <button
                          onClick={() => onNavigate && onNavigate("timetable")}
                          className="px-2.5 py-1 rounded bg-amber-100 dark:bg-indigo-600/30 hover:bg-amber-600 dark:hover:bg-indigo-600 text-amber-800 dark:text-indigo-200 hover:text-white font-semibold text-[11px] border border-amber-300 dark:border-indigo-500/30 transition-all flex items-center gap-1.5"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          Timetable
                        </button>
                        <button
                          onClick={() => handleDelete(i)}
                          className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 transition-colors"
                          title="Delete Section"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 italic">
            No sections registered. Click "Add Section / Class" to create one.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card p-6 bg-slate-900 border border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Add New Section / Class</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Section / Class Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BCA-I, MCA-II, CS-A"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Primary Classroom</label>
                <select
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Auto Assign</option>
                  {rooms.map((r, idx) => (
                    <option key={idx} value={typeof r === 'string' ? r : r.name}>
                      {typeof r === 'string' ? r : r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Specialized Lab Room</label>
                <select
                  value={form.lab_room}
                  onChange={(e) => setForm({ ...form, lab_room: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Auto Assign</option>
                  {rooms.map((r, idx) => (
                    <option key={idx} value={typeof r === 'string' ? r : r.name}>
                      {typeof r === 'string' ? r : r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Section</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
