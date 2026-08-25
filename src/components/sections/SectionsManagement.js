import React, { useState, useMemo } from 'react';
import { isTestOrMockFaculty, useAcademic } from '../../context/AcademicContext';

export default function SectionsManagement({
  sections = [],
  rooms = [],
  subjects = [],
  teachers = [],
  onChange,
  onNavigate
}) {
  const {
    academicLevel = "ALL",
    setAcademicLevel,
    selectedProgram = "ALL",
    setSelectedProgram,
    selectedSemester = "ALL",
    setSelectedSemester,
    parseAcademicMeta,
  } = useAcademic();

  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [facultySearch, setFacultySearch] = useState("");
  const [labSearch, setLabSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    room: "",
    lab_room: "",
    lab_rooms: [],
    preferred_faculty: []
  });

  // Extract clean teacher names from teachers prop / faculty directory
  const teacherList = useMemo(() => {
    return (teachers || []).map(t => {
      const name = typeof t === 'string' ? t : (t?.name || t?.teacher_name);
      const dept = typeof t === 'object' ? (t?.department || t?.department_name || "") : "";
      return { name: (name || "").trim(), department: dept };
    }).filter(t => Boolean(t.name) && !isTestOrMockFaculty(t.name));
  }, [teachers]);

  // Extract clean rooms list
  const roomList = useMemo(() => {
    return (rooms || []).map(r => {
      const name = typeof r === 'string' ? r : r?.name;
      const isLab = typeof r === 'object' ? Boolean(r?.is_lab) : (name && name.toLowerCase().includes('lab'));
      return { name, isLab };
    }).filter(r => Boolean(r.name));
  }, [rooms]);

  const openAddModal = () => {
    setEditingIndex(null);
    setForm({
      name: "",
      room: "",
      lab_room: "",
      lab_rooms: [],
      preferred_faculty: []
    });
    setFacultySearch("");
    setLabSearch("");
    setShowModal(true);
  };

  const openEditModal = (sec, index) => {
    setEditingIndex(index);
    const existingLabs = sec.lab_rooms && Array.isArray(sec.lab_rooms) && sec.lab_rooms.length > 0
      ? sec.lab_rooms
      : (sec.lab_room ? [sec.lab_room] : []);
    
    setForm({
      name: sec.name || "",
      room: sec.room || "",
      lab_room: existingLabs[0] || "",
      lab_rooms: existingLabs,
      preferred_faculty: Array.isArray(sec.preferred_faculty) ? [...sec.preferred_faculty] : []
    });
    setFacultySearch("");
    setLabSearch("");
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = {
      name: form.name.trim(),
      room: form.room || "",
      lab_room: form.lab_rooms[0] || form.lab_room || "",
      lab_rooms: form.lab_rooms,
      preferred_faculty: form.preferred_faculty
    };

    let updated;
    if (editingIndex !== null) {
      updated = sections.map((s, idx) => idx === editingIndex ? payload : s);
    } else {
      updated = [...sections, payload];
    }

    onChange && onChange(updated);
    setShowModal(false);
  };

  const handleDelete = (index) => {
    if (window.confirm("Are you sure you want to delete this section/class?")) {
      const updated = sections.filter((_, i) => i !== index);
      onChange && onChange(updated);
    }
  };

  const toggleLabRoom = (roomName) => {
    setForm(prev => {
      const exists = prev.lab_rooms.includes(roomName);
      const nextLabs = exists
        ? prev.lab_rooms.filter(r => r !== roomName)
        : [...prev.lab_rooms, roomName];
      return {
        ...prev,
        lab_rooms: nextLabs,
        lab_room: nextLabs[0] || ""
      };
    });
  };

  const togglePreferredFaculty = (facultyName) => {
    setForm(prev => {
      const exists = prev.preferred_faculty.includes(facultyName);
      const nextFaculty = exists
        ? prev.preferred_faculty.filter(f => f !== facultyName)
        : [...prev.preferred_faculty, facultyName];
      return {
        ...prev,
        preferred_faculty: nextFaculty
      };
    });
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

  // Filter sections by UG/PG Level, Program, and Semester
  const filteredSections = useMemo(() => {
    return sections.filter(sec => {
      const sName = sec.name || sec;
      if (academicLevel !== "ALL" || selectedProgram !== "ALL" || selectedSemester !== "ALL") {
        const meta = parseAcademicMeta ? parseAcademicMeta(sName) : {};
        if (academicLevel !== "ALL" && meta.program_level !== academicLevel) {
          return false;
        }
        if (selectedProgram !== "ALL" && meta.program_code !== selectedProgram) {
          return false;
        }
        if (selectedSemester !== "ALL" && String(meta.semester_number) !== String(selectedSemester)) {
          return false;
        }
      }
      return true;
    });
  }, [sections, academicLevel, selectedProgram, selectedSemester, parseAcademicMeta]);

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
            Configure academic cohorts with multi-select preferred lab rooms and fixed faculty directory assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={openAddModal} className="btn-primary gap-2 text-xs py-2.5 px-4 font-bold shadow-lg shadow-indigo-500/20">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Section / Class
          </button>
        </div>
      </div>

      {/* Sections Table with Scope Filter Toolbar */}
      <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Registered Classes & Cohorts ({filteredSections.length} of {sections.length})</h2>
            <p className="text-xs text-slate-400">Classrooms, multi-lab room allocation, and preferred faculty pool</p>
          </div>

          {/* Academic Scope Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Level Toggle */}
            <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
              {["ALL", "UG", "PG"].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setAcademicLevel && setAcademicLevel(lvl);
                    if (lvl === "UG" && selectedProgram === "MCA") {
                      setSelectedProgram && setSelectedProgram("BCA");
                    } else if (lvl === "PG" && (selectedProgram === "BCA" || selectedProgram === "B.Tech")) {
                      setSelectedProgram && setSelectedProgram("MCA");
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition-all ${
                    academicLevel === lvl
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Program Selector */}
            <select
              value={selectedProgram}
              onChange={(e) => {
                const p = e.target.value;
                setSelectedProgram && setSelectedProgram(p);
                if (p === "MCA") setAcademicLevel && setAcademicLevel("PG");
                if (p === "BCA" || p === "B.Tech") setAcademicLevel && setAcademicLevel("UG");
              }}
              className="input-premium text-xs py-1.5 px-2.5 bg-slate-800 border-slate-700 text-white cursor-pointer rounded-xl font-bold"
            >
              <option value="ALL">All Programs</option>
              {(academicLevel === "ALL" || academicLevel === "UG") && <option value="BCA">BCA (UG)</option>}
              {(academicLevel === "ALL" || academicLevel === "PG") && <option value="MCA">MCA (PG)</option>}
              {(academicLevel === "ALL" || academicLevel === "UG") && <option value="B.Tech">B.Tech (UG)</option>}
            </select>

            {/* Semester Selector */}
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester && setSelectedSemester(e.target.value)}
              className="input-premium text-xs py-1.5 px-2.5 bg-slate-800 border-slate-700 text-white cursor-pointer rounded-xl font-bold"
            >
              <option value="ALL">All Semesters</option>
              <option value="1">Sem 1 (I)</option>
              <option value="2">Sem 2 (II)</option>
              <option value="3">Sem 3 (III)</option>
              <option value="4">Sem 4 (IV)</option>
              {selectedProgram !== "MCA" && (
                <>
                  <option value="5">Sem 5 (V)</option>
                  <option value="6">Sem 6 (VI)</option>
                </>
              )}
              {selectedProgram === "B.Tech" && (
                <>
                  <option value="7">Sem 7 (VII)</option>
                  <option value="8">Sem 8 (VIII)</option>
                </>
              )}
            </select>
          </div>
        </div>

        {filteredSections.length > 0 ? (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase">
                <tr>
                  <th className="p-3">Section / Class</th>
                  <th className="p-3">Lecture Room</th>
                  <th className="p-3">Specialized Lab Rooms</th>
                  <th className="p-3">Preferred Faculty Pool</th>
                  <th className="p-3">Linked Curriculum</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredSections.map((sec, i) => {
                  const { linkedSubs } = getLinkedData(sec.name);
                  const assignedLabs = sec.lab_rooms && Array.isArray(sec.lab_rooms) && sec.lab_rooms.length > 0
                    ? sec.lab_rooms
                    : (sec.lab_room ? [sec.lab_room] : []);
                  const assignedFaculty = Array.isArray(sec.preferred_faculty) ? sec.preferred_faculty : [];

                  return (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-indigo-600/30 text-indigo-300 font-black text-xs flex items-center justify-center border border-indigo-500/30 shrink-0">
                            {sec.name ? sec.name.slice(0, 3).toUpperCase() : 'SEC'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{sec.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: SEC-{(i + 1).toString().padStart(2, '0')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/80 text-indigo-300 font-medium inline-flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
                          {sec.room || "Auto Assign"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {assignedLabs.length > 0 ? (
                            assignedLabs.map((lab, lIdx) => (
                              <span key={lIdx} className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                {lab}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Auto Assign Labs</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {assignedFaculty.length > 0 ? (
                            assignedFaculty.map((fName, fIdx) => (
                              <span key={fIdx} className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {fName}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">All Faculty Eligible</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="text-slate-300 font-semibold text-xs">
                            {linkedSubs.length} Courses Linked
                          </div>
                          <div className="text-slate-400 text-[10px] truncate max-w-xs" title={linkedSubs.map(s => s.name).join(", ")}>
                            {linkedSubs.map(s => s.name).join(", ") || "No courses linked yet"}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(sec, i)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                            title="Edit Section & Preferences"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button
                            onClick={() => onNavigate && onNavigate("timetable")}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-semibold text-[11px] border border-indigo-500/30 transition-all flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            Timetable
                          </button>
                          <button
                            onClick={() => handleDelete(i)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-colors"
                            title="Delete Section"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 italic bg-slate-950/40 rounded-2xl border border-slate-800">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polygon points="2 17 12 22 22 17"/><polygon points="2 12 12 17 22 12"/></svg>
            <p className="font-semibold text-slate-400">No sections registered yet.</p>
            <p className="text-xs text-slate-500 mt-1">Click "Add Section / Class" to configure classrooms, labs, and faculty pools.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Section Modal with Multi-Select Controls */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="card p-6 bg-slate-900 border border-slate-700 max-w-xl w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingIndex !== null ? "Edit Section & Preferences" : "Add New Section / Class"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Assign primary classrooms, multiple specialized labs, and preferred faculty</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Section Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Section / Class Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BCA-I, MCA-II, CS-A, Section B"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Primary Lecture Classroom */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Primary Lecture Classroom
                </label>
                <select
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer"
                >
                  <option value="">Auto Assign Theory Classroom</option>
                  {roomList.map((r, idx) => (
                    <option key={idx} value={r.name}>
                      {r.name} {r.isLab ? "(Lab Venue)" : "(Classroom)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Multi-Select: Specialized Lab Rooms */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold">
                    Specialized Lab Rooms (Multi-Select)
                  </label>
                  <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    {form.lab_rooms.length} Labs Selected
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Select 2 or 3 specialized labs (e.g. AI Lab, Hardware Lab, Programming Lab) that can host practical blocks for this section.
                </p>

                {/* Selected Lab Chips */}
                {form.lab_rooms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    {form.lab_rooms.map((lab, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1.5 animate-scale-up">
                        <span>{lab}</span>
                        <button
                          type="button"
                          onClick={() => toggleLabRoom(lab)}
                          className="hover:text-rose-300 text-purple-400 p-0.5"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Lab Selection Dropdown / Grid */}
                <div className="border border-slate-700 rounded-xl p-3 bg-slate-800/60 space-y-2">
                  <input
                    type="text"
                    placeholder="Search lab rooms..."
                    value={labSearch}
                    onChange={(e) => setLabSearch(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 outline-none"
                  />
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {roomList
                      .filter(r => !labSearch || r.name.toLowerCase().includes(labSearch.toLowerCase()))
                      .map((r, idx) => {
                        const isSelected = form.lab_rooms.includes(r.name);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleLabRoom(r.name)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                              isSelected
                                ? "bg-purple-600/30 border border-purple-500/50 text-white font-bold"
                                : "hover:bg-slate-700/50 text-slate-300 border border-transparent"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${r.isLab ? "bg-purple-400" : "bg-slate-500"}`} />
                              {r.name}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              {isSelected ? "✓ Assigned" : "+ Assign"}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Multi-Select: Preferred Faculty Pool */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold">
                    Preferred Faculty Pool (Multi-Select)
                  </label>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {form.preferred_faculty.length} Faculty Assigned
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Select a fixed pool of faculty members from the Faculty Directory who will be prioritized and assigned to teach this section.
                </p>

                {/* Selected Faculty Chips */}
                {form.preferred_faculty.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    {form.preferred_faculty.map((fName, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 animate-scale-up">
                        <span>{fName}</span>
                        <button
                          type="button"
                          onClick={() => togglePreferredFaculty(fName)}
                          className="hover:text-rose-300 text-emerald-400 p-0.5"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Faculty Selection Search & Scroll */}
                <div className="border border-slate-700 rounded-xl p-3 bg-slate-800/60 space-y-2">
                  <input
                    type="text"
                    placeholder="Search faculty by name or department..."
                    value={facultySearch}
                    onChange={(e) => setFacultySearch(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 outline-none"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {teacherList
                      .filter(t => !facultySearch || t.name.toLowerCase().includes(facultySearch.toLowerCase()) || t.department.toLowerCase().includes(facultySearch.toLowerCase()))
                      .map((t, idx) => {
                        const isSelected = form.preferred_faculty.includes(t.name);
                        return (
                          <div
                            key={idx}
                            onClick={() => togglePreferredFaculty(t.name)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                              isSelected
                                ? "bg-emerald-600/30 border border-emerald-500/50 text-white font-bold"
                                : "hover:bg-slate-700/50 text-slate-300 border border-transparent"
                            }`}
                          >
                            <div>
                              <div className="font-semibold">{t.name}</div>
                              {t.department && <div className="text-[10px] text-slate-400">{t.department}</div>}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              {isSelected ? "✓ Selected" : "+ Select"}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs px-5 py-2 font-bold shadow-lg shadow-indigo-500/20"
                >
                  {editingIndex !== null ? "Save Changes" : "Create Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
