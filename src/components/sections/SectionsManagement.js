import React, { useState } from 'react';

export default function SectionsManagement({ sections = [], rooms = [], onChange, onNavigate }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: "", room: "", lab_room: "" });

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

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Module Header */}
      <div className="card p-6 bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Sections & Classes Setup</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage academic program sections, lecture classroom assignments, and lab room allocations.
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary gap-2 text-xs py-2.5 px-4 font-bold">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Section / Class
        </button>
      </div>

      {/* Sections Table */}
      <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Registered Sections ({sections.length})</h2>
        </div>

        {sections.length > 0 ? (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase">
                <tr>
                  <th className="p-3">Section / Class Name</th>
                  <th className="p-3">Primary Lecture Room</th>
                  <th className="p-3">Specialized Lab Room</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {sections.map((sec, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center border border-indigo-500/30">
                        {sec.name ? sec.name[0] : 'S'}
                      </div>
                      {sec.name}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-medium">
                        {sec.room || "Auto Assigned"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-purple-300 font-medium">
                        {sec.lab_room || "Auto Assigned"}
                      </span>
                    </td>
                    <td className="p-3 flex items-center gap-2">
                      <button
                        onClick={() => onNavigate && onNavigate("timetable")}
                        className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 font-semibold text-[11px] border border-indigo-500/30 transition-all"
                      >
                        View Timetable
                      </button>
                      <button
                        onClick={() => handleDelete(i)}
                        className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Delete Section"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 italic">
            No sections registered yet. Click "Add Section / Class" to begin configuration.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card p-6 bg-slate-900 border border-slate-700 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Add New Section / Class</h3>
            <form onSubmit={handleAdd} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Section Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BCA-I, MCA-II, CS-A"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
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
