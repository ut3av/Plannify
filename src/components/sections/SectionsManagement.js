import React, { useState } from 'react';

const DEFAULT_DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electronics & Comm.",
  "Mechanical Eng.",
  "Business Admin"
];

export default function SectionsManagement({
  sections = [],
  rooms = [],
  subjects = [],
  teachers = [],
  onChange,
  onNavigate
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("");
  const [form, setForm] = useState({
    name: "",
    department: "Computer Science",
    room: "",
    lab_room: ""
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const updated = [...sections, { ...form }];
    onChange && onChange(updated);
    setForm({ name: "", department: "Computer Science", room: "", lab_room: "" });
    setShowAddModal(false);
  };

  const handleDelete = (index) => {
    if (window.confirm("Are you sure you want to delete this section/class?")) {
      const updated = sections.filter((_, i) => i !== index);
      onChange && onChange(updated);
    }
  };

  // Filter sections by department
  const filteredSections = selectedDeptFilter
    ? sections.filter(s => (s.department || "Computer Science") === selectedDeptFilter)
    : sections;

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
            Interlinked setup for academic sections, department mapping, classroom allocations, and subject-teacher bindings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate && onNavigate("departments")}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2"
          >
            🏛️ View Departments
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary gap-2 text-xs py-2.5 px-4 font-bold">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Section / Class
          </button>
        </div>
      </div>

      {/* Sections Table & Filters */}
      <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Registered Classes & Sections ({filteredSections.length})</h2>
            <p className="text-xs text-slate-400">Interlinked with active Department curricula</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Filter by Department:</span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {DEFAULT_DEPARTMENTS.map((dept, idx) => (
                <option key={idx} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredSections.length > 0 ? (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase">
                <tr>
                  <th className="p-3">Section / Class</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Lecture Room</th>
                  <th className="p-3">Lab Room</th>
                  <th className="p-3">Linked Subjects & Faculty</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredSections.map((sec, i) => {
                  const dept = sec.department || "Computer Science";
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
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-indigo-500/10 border border-amber-200 dark:border-indigo-500/30 text-amber-800 dark:text-indigo-300 font-bold text-[11px]">
                          🏛️ {dept}
                        </span>
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
                            📚 {linkedSubs.length} Subjects: <span className="text-slate-400 font-normal">{linkedSubs.map(s => s.name).join(", ") || "None assigned yet"}</span>
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            👨‍🏫 Faculty: {teacherNames.join(", ") || "Unassigned"}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 flex items-center gap-2">
                        <button
                          onClick={() => onNavigate && onNavigate("timetable")}
                          className="px-2.5 py-1 rounded bg-amber-100 dark:bg-indigo-600/30 hover:bg-amber-600 dark:hover:bg-indigo-600 text-amber-800 dark:text-indigo-200 hover:text-white font-semibold text-[11px] border border-amber-300 dark:border-indigo-500/30 transition-all flex items-center gap-1"
                        >
                          📅 Timetable
                        </button>
                        <button
                          onClick={() => handleDelete(i)}
                          className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 transition-colors"
                          title="Delete Section"
                        >
                          🗑️
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
            No sections registered {selectedDeptFilter ? `in ${selectedDeptFilter}` : ""}. Click "Add Section / Class" to create one.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card p-6 bg-slate-900 border border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Add New Section / Class</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
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
                <label className="block text-slate-300 font-semibold mb-1">Department *</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-1 focus:ring-indigo-500"
                >
                  {DEFAULT_DEPARTMENTS.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                </select>
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
