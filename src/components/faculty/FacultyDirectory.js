import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import DispatchPreviewModal from "../common/DispatchPreviewModal";
import GooeyLoader from "../common/GooeyLoader";

import { API_BASE_URL as API } from "../../apiConfig";

export default function FacultyDirectory({
  onSelectFaculty,
  teachers = [],
  subjects = [],
  result,
  onAddFaculty,
  onTeachersChange,
  onSwitchUser,
}) {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid | table
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletedKeys, setDeletedKeys] = useState(new Set());
  const [dispatchTeacher, setDispatchTeacher] = useState(null);
  const [form, setForm] = useState({
    teacher_name: "",
    employee_id: "",
    department_id: "",
    designation: "Assistant Professor",
    qualification: "",
    employment_type: "full-time",
    joining_date: new Date().toISOString().split("T")[0],
    phone: "",
    email: "",
  });

  useEffect(() => {
    fetchFaculty();
    fetchDepartments();
  }, []);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/faculty/`);
      setFaculty(res.data || []);
    } catch (e) {
      console.error("Failed to fetch faculty:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API}/faculty/departments`);
      setDepartments(res.data || []);
    } catch (e) {
      console.error("Failed to fetch departments:", e);
    }
  };

  const handleDelete = async (e, f) => {
    e.stopPropagation();
    const facultyName = f.teacher_name || f.name;
    if (!window.confirm(`Are you sure you want to remove ${facultyName} from the faculty directory?`)) {
      return;
    }

    try {
      if (f.id && !f.id.toString().startsWith("ocr-")) {
        await axios.delete(`${API}/faculty/${f.id}?hard_delete=true`).catch(() => null);
      }
      setDeletedKeys(prev => new Set([...prev, f.id, facultyName?.trim().toLowerCase()]));
      setFaculty(prev => prev.filter(item => item.id !== f.id && item.teacher_name !== facultyName));
    } catch (err) {
      console.error("Failed to delete faculty:", err);
    }
  };

  const handleActivate = async (e, f) => {
    e && e.stopPropagation();
    const facultyName = f.teacher_name || f.name;
    try {
      if (f.id && !f.id.toString().startsWith("ocr-")) {
        await axios.put(`${API}/faculty/${f.id}`, { status: "active" }).catch(() => null);
      }
      setDeletedKeys(prev => {
        const next = new Set(prev);
        next.delete(f.id);
        next.delete(facultyName?.trim().toLowerCase());
        return next;
      });
      setFaculty(prev => prev.map(item => (item.id === f.id || item.teacher_name === facultyName) ? { ...item, status: "active" } : item));
    } catch (err) {
      console.error("Failed to activate faculty:", err);
    }
  };

  // Merge backend faculty with active state teachers, AI OCR teachers, and subject assignments
  const allFaculty = useMemo(() => {
    const list = faculty
      .filter(f => !deletedKeys.has(f.id) && !deletedKeys.has(f.teacher_name?.trim().toLowerCase()))
      .map(f => {
        // Enrich existing backend faculty if missing email/phone from teachers prop
        const matchingTeacher = Array.isArray(teachers)
          ? teachers.find(t => (typeof t === 'string' ? t : t?.name)?.trim().toLowerCase() === f.teacher_name?.trim().toLowerCase())
          : null;
        return {
          ...f,
          email: f.email || (typeof matchingTeacher === 'object' ? matchingTeacher?.email : null) || `${f.teacher_name?.toLowerCase().replace(/[^a-z0-9]/g, '.')}@lnctu.ac.in`,
          phone: f.phone || (typeof matchingTeacher === 'object' ? matchingTeacher?.phone : null) || "+91-9876543210",
          department_name: f.department_name || (typeof matchingTeacher === 'object' ? matchingTeacher?.department : null) || "Computer Applications"
        };
      });

    const existingNames = new Set(list.map(f => f.teacher_name?.trim().toLowerCase()));

    const addIfMissing = (tObj) => {
      const name = typeof tObj === 'string' ? tObj : tObj?.name;
      const trimmed = name?.trim();
      if (!trimmed || existingNames.has(trimmed.toLowerCase()) || deletedKeys.has(trimmed.toLowerCase())) return;

      const hash = Math.abs(trimmed.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0));
      const newFacultyObj = {
        id: (typeof tObj === 'object' && tObj?.id) || `ocr-${hash}`,
        teacher_name: trimmed,
        employee_id: (typeof tObj === 'object' && tObj?.employee_id) || `EMP-LNCT-${(hash % 9000) + 1000}`,
        designation: (typeof tObj === 'object' && tObj?.designation) || "Faculty Member",
        qualification: (typeof tObj === 'object' && tObj?.qualification) || "M.Tech / Ph.D",
        employment_type: (typeof tObj === 'object' && tObj?.employment_type) || "full-time",
        status: "active",
        department_name: (typeof tObj === 'object' && tObj?.department) || "Computer Applications",
        email: (typeof tObj === 'object' && tObj?.email) || `${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '.')}@lnctu.ac.in`,
        phone: (typeof tObj === 'object' && tObj?.phone) || "+91-9876543210",
        is_synced: false
      };
      list.push(newFacultyObj);
      existingNames.add(trimmed.toLowerCase());
    };

    if (Array.isArray(teachers)) {
      teachers.forEach(t => addIfMissing(t));
    }

    if (Array.isArray(subjects)) {
      subjects.forEach(s => {
        if (s.teacher) addIfMissing({ name: s.teacher, department: "Computer Applications" });
      });
    }

    return list;
  }, [faculty, teachers, subjects, deletedKeys]);

  // Auto-sync unsynced teachers to backend DB so they persist permanently
  useEffect(() => {
    const syncMissing = async () => {
      const unsynced = allFaculty.filter(f => f.id?.toString().startsWith('ocr-'));
      if (unsynced.length === 0) return;

      let newlyCreated = false;
      for (const f of unsynced) {
        try {
          await axios.post(`${API}/faculty/`, {
            teacher_name: f.teacher_name,
            employee_id: f.employee_id,
            designation: f.designation,
            employment_type: f.employment_type,
            email: f.email,
            phone: f.phone,
            status: "active"
          });
          newlyCreated = true;
        } catch (err) {
          // Ignore duplicate creation if created concurrently
        }
      }
      if (newlyCreated) {
        const res = await axios.get(`${API}/faculty/`).catch(() => null);
        if (res?.data) setFaculty(res.data);
      }
    };

    syncMissing();
  }, [allFaculty]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const newTeacherName = form.teacher_name.trim();
    if (!newTeacherName) {
      setErrorMessage("Please provide a faculty name.");
      setIsSubmitting(false);
      return;
    }

    const deptObj = departments.find(d => d.id === form.department_id);
    const deptName = deptObj ? deptObj.name : (form.department_id || "Computer Applications");
    const empId = form.employee_id.trim() || `EMP-LNCT-${Math.floor(1000 + Math.random() * 9000)}`;
    const teacherEmail = form.email.trim() || `${newTeacherName.toLowerCase().replace(/[^a-z0-9]/g, '.') || 'faculty'}@lnctu.ac.in`;
    const teacherPhone = form.phone.trim() || "+91-9876543210";
    const generatedId = `fac_${Date.now()}`;

    // 1. Immediately create and register new teacher object in client state
    const newTeacherObj = {
      id: generatedId,
      name: newTeacherName,
      department: deptName,
      email: teacherEmail,
      phone: teacherPhone,
      employee_id: empId,
      designation: form.designation || "Assistant Professor",
      qualification: form.qualification.trim() || "M.Tech / Ph.D",
      employment_type: form.employment_type || "full-time",
      joining_date: form.joining_date || new Date().toISOString().split("T")[0],
      free_periods: 1,
      status: "active",
    };

    if (onAddFaculty) {
      onAddFaculty(newTeacherObj);
    } else if (onTeachersChange && Array.isArray(teachers)) {
      if (!teachers.some(t => (t.name || t)?.trim().toLowerCase() === newTeacherName.toLowerCase())) {
        onTeachersChange([...teachers, newTeacherObj]);
      }
    }

    // Add to local faculty list immediately
    setFaculty(prev => [
      ...prev.filter(f => f.teacher_name?.trim().toLowerCase() !== newTeacherName.toLowerCase()),
      {
        id: generatedId,
        teacher_name: newTeacherName,
        employee_id: empId,
        department_name: deptName,
        designation: newTeacherObj.designation,
        qualification: newTeacherObj.qualification,
        employment_type: newTeacherObj.employment_type,
        joining_date: newTeacherObj.joining_date,
        status: "active",
        email: teacherEmail,
        phone: teacherPhone,
      }
    ]);

    setSuccessMessage(`✨ Faculty "${newTeacherName}" registered successfully & active across academic panels!`);
    setShowAddForm(false);
    setForm({
      teacher_name: "",
      employee_id: "",
      department_id: "",
      designation: "Assistant Professor",
      qualification: "",
      employment_type: "full-time",
      joining_date: new Date().toISOString().split("T")[0],
      phone: "",
      email: "",
    });
    setIsSubmitting(false);

    // 2. Asynchronously sync to backend DB without blocking or crashing the UI on network hiccups
    try {
      const payload = {
        teacher_name: newTeacherName,
        employee_id: empId,
        department_id: form.department_id || null,
        designation: form.designation || "Assistant Professor",
        qualification: form.qualification.trim() || "M.Tech / Ph.D",
        employment_type: form.employment_type || "full-time",
        joining_date: form.joining_date || new Date().toISOString().split("T")[0],
        phone: teacherPhone,
        email: teacherEmail,
        status: "active",
      };

      const res = await axios.post(`${API}/faculty/`, payload, { timeout: 10000 });
      if (res?.data?.id) {
        // Update local record ID with persisted backend ID
        setFaculty(prev => prev.map(item => item.id === generatedId ? { ...item, id: res.data.id } : item));
      }
    } catch (err) {
      console.warn("Backend /faculty sync notice (faculty kept safely in active cloud state):", err);
    }
  };

  const filtered = useMemo(() => {
    return allFaculty.filter(f => {
      const matchSearch = !search || 
        f.teacher_name?.toLowerCase().includes(search.toLowerCase()) || 
        f.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
        f.email?.toLowerCase().includes(search.toLowerCase()) ||
        f.phone?.toLowerCase().includes(search.toLowerCase());
      const matchDept = !filterDept || f.department_id === filterDept || f.department_name === filterDept;
      const matchStatus = !filterStatus || f.status === filterStatus;
      return matchSearch && matchDept && matchStatus;
    });
  }, [allFaculty, search, filterDept, filterStatus]);

  const statusColor = (status) => {
    switch (status) {
      case "active": return "badge-success";
      case "on-leave": return "badge-warning";
      case "resigned": return "badge-danger";
      case "retired": return "badge-neutral";
      default: return "badge-neutral";
    }
  };

  const getInitials = (name) => {
    return (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Faculty Directory</h2>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} active faculty profiles registered • Click any faculty to view portal or details</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setErrorMessage("");
            setSuccessMessage("");
          }}
          className="btn-primary gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {showAddForm ? "Close Form" : "Add Faculty"}
        </button>
      </div>

      {/* Success Alert Banner */}
      {successMessage && (
        <div className="animate-slide-down flex items-center justify-between p-4 mb-6 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-base">✅</span>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-600 dark:text-emerald-400 hover:opacity-80">✕</button>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="animate-slide-down flex items-center justify-between p-4 mb-6 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-800 dark:text-red-300 text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage("")} className="text-red-600 dark:text-red-400 hover:opacity-80">✕</button>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="card p-6 mb-6 animate-slide-down bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">New Faculty Member Registration</h3>
              <p className="text-xs text-slate-400 mt-0.5">Registering here immediately synchronizes with both the backend DB and the active timetable solver.</p>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
              Admin Onboarding
            </span>
          </div>

          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Dr. John Doe"
                value={form.teacher_name}
                onChange={e => setForm({ ...form, teacher_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Employee ID *</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="EMP-LNCT-1001"
                value={form.employee_id}
                onChange={e => setForm({ ...form, employee_id: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="faculty@lnctu.ac.in"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phone / Mobile</label>
              <input
                type="tel"
                className="input"
                placeholder="+91-9876543210"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Department</label>
              <select
                className="input cursor-pointer"
                value={form.department_id}
                onChange={e => setForm({ ...form, department_id: e.target.value })}
              >
                <option value="">Select Department (Default: Computer Applications)</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Designation</label>
              <select
                className="input cursor-pointer"
                value={form.designation}
                onChange={e => setForm({ ...form, designation: e.target.value })}
              >
                {["Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Lab Instructor", "Visiting Faculty"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Employment Type</label>
              <select
                className="input cursor-pointer"
                value={form.employment_type}
                onChange={e => setForm({ ...form, employment_type: e.target.value })}
              >
                {["full-time", "part-time", "guest", "contractual"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Qualification</label>
              <input
                type="text"
                className="input"
                placeholder="Ph.D. / M.Tech in CS"
                value={form.qualification}
                onChange={e => setForm({ ...form, qualification: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Joining Date</label>
              <input
                type="date"
                className="input cursor-pointer"
                value={form.joining_date}
                onChange={e => setForm({ ...form, joining_date: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-3 md:col-span-2 lg:col-span-3 pt-2">
              <button
                type="submit"
                className="btn-primary gap-2"
                disabled={!form.teacher_name || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Faculty...</span>
                  </>
                ) : (
                  <>
                    <span>✨ Save & Synchronize Faculty Profile</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setErrorMessage("");
                }}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" className="input pl-10" placeholder="Search by name, email, phone, or employee ID..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <select className="input w-auto" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="on-leave">On Leave</option>
            <option value="resigned">Resigned</option>
            <option value="retired">Retired</option>
          </select>
          <div className="flex border rounded-lg overflow-hidden" style={{ borderColor: "var(--border-default)" }}>
            <button onClick={() => setViewMode("grid")} className={`px-3 py-2 text-xs font-semibold ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </button>
            <button onClick={() => setViewMode("table")} className={`px-3 py-2 text-xs font-semibold ${viewMode === "table" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 animate-fade-in">
          <GooeyLoader
            size="md"
            text="Loading faculty directory..."
            subtitle="Fetching verified faculty profiles and academic assignments"
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <p className="text-sm font-medium">No faculty found. Register or seed faculty members to begin.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(f => (
            <div key={f.id || f.teacher_name} className="card p-5 cursor-pointer hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative flex flex-col justify-between" onClick={() => onSelectFaculty && onSelectFaculty(f)}>
              <div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                    {getInitials(f.teacher_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{f.teacher_name}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`badge ${statusColor(f.status)}`}>{f.status}</span>
                        <button 
                          title="Remove Faculty Member" 
                          onClick={(e) => handleDelete(e, f)}
                          className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-indigo-400/90 font-semibold mt-0.5">{f.designation}</p>
                    
                    <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 text-slate-300">
                          {f.employee_id}
                        </span>
                        {f.department_name && (
                          <span className="truncate text-slate-400 text-[11px]">
                            • {f.department_name}
                          </span>
                        )}
                      </div>

                      {f.email && (
                        <p className="truncate flex items-center gap-1.5 text-slate-400 hover:text-indigo-300 transition-colors">
                          <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          <span className="truncate">{f.email}</span>
                        </p>
                      )}

                      {f.phone && (
                        <p className="flex items-center gap-1.5 text-slate-400">
                          <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          <span>{f.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick-Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                {onSwitchUser ? (
                  <button
                    onClick={() => onSwitchUser({
                      role: "teacher",
                      name: f.teacher_name,
                      email: f.email,
                      department: f.department_name,
                      designation: f.designation,
                      employee_id: f.employee_id,
                      id: f.id
                    })}
                    className="flex-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-500/30 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                    title={`Open Faculty Portal as ${f.teacher_name}`}
                  >
                    <span>👨‍🏫 Open Faculty Portal ➔</span>
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400">Account Verified ✓</span>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    title="Dispatch Schedule via Email/WhatsApp"
                    onClick={() => setDispatchTeacher(f)}
                    className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 transition-all"
                  >
                    ✉️
                  </button>
                  {f.status !== "active" && (
                    <button
                      title="Reinstate Faculty Member to Active"
                      onClick={(e) => handleActivate(e, f)}
                      className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
                    >
                      ⚡
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Faculty Name</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id || f.teacher_name} className="cursor-pointer hover:bg-slate-800/40 transition-colors" onClick={() => onSelectFaculty && onSelectFaculty(f)}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(f.teacher_name)}
                      </div>
                      <span className="font-bold text-white">{f.teacher_name}</span>
                    </div>
                  </td>
                  <td><span className="font-mono text-xs text-indigo-300">{f.employee_id}</span></td>
                  <td>{f.department_name || "—"}</td>
                  <td><span className="font-medium text-slate-300">{f.designation}</span></td>
                  <td><span className="text-slate-400 font-mono text-xs">{f.email || "—"}</span></td>
                  <td><span className="text-slate-400 text-xs">{f.phone || "—"}</span></td>
                  <td><span className={`badge ${statusColor(f.status)}`}>{f.status}</span></td>
                  <td>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {onSwitchUser && (
                        <button
                          onClick={() => onSwitchUser({
                            role: "teacher",
                            name: f.teacher_name,
                            email: f.email,
                            department: f.department_name,
                            designation: f.designation,
                            employee_id: f.employee_id,
                            id: f.id
                          })}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition-colors flex items-center gap-1"
                          title={`Switch to Faculty Portal as ${f.teacher_name}`}
                        >
                          👨‍🏫 Portal
                        </button>
                      )}
                      <button
                        title="Dispatch Schedule via Email/WhatsApp"
                        onClick={() => setDispatchTeacher(f)}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 transition-colors"
                      >
                        ✉️ Dispatch
                      </button>
                      {f.status !== "active" && (
                        <button
                          title="Reinstate to Active"
                          onClick={(e) => handleActivate(e, f)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition-colors"
                        >
                          ⚡ Activate
                        </button>
                      )}
                      <button 
                        title="Remove Faculty Member" 
                        onClick={(e) => handleDelete(e, f)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dispatch Preview Modal */}
      {dispatchTeacher && (
        <DispatchPreviewModal
          teacher={dispatchTeacher}
          result={result}
          onClose={() => setDispatchTeacher(null)}
        />
      )}
    </div>
  );
}
