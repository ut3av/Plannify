import { useState, useEffect, useMemo } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function FacultyDirectory({ onSelectFaculty }) {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid | table
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    teacher_name: "", employee_id: "", department_id: "",
    designation: "Lecturer", qualification: "", employment_type: "full-time",
    joining_date: new Date().toISOString().split("T")[0],
    phone: "", email: "",
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

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/faculty/`, form);
      setShowAddForm(false);
      setForm({ teacher_name: "", employee_id: "", department_id: "", designation: "Lecturer", qualification: "", employment_type: "full-time", joining_date: new Date().toISOString().split("T")[0], phone: "", email: "" });
      fetchFaculty();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to add faculty");
    }
  };

  const filtered = useMemo(() => {
    return faculty.filter(f => {
      const matchSearch = !search || f.teacher_name?.toLowerCase().includes(search.toLowerCase()) || f.employee_id?.toLowerCase().includes(search.toLowerCase());
      const matchDept = !filterDept || f.department_id === filterDept;
      const matchStatus = !filterStatus || f.status === filterStatus;
      return matchSearch && matchDept && matchStatus;
    });
  }, [faculty, search, filterDept, filterStatus]);

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
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Faculty Directory</h2>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} faculty members</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Faculty
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card p-6 mb-6 animate-slide-down">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">New Faculty Member</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input type="text" className="input" placeholder="Dr. John Doe" value={form.teacher_name} onChange={e => setForm({ ...form, teacher_name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Employee ID *</label>
              <input type="text" className="input" placeholder="EMP-2024-001" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
              <select className="input" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Designation</label>
              <select className="input" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}>
                {["Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Lab Instructor", "Visiting Faculty"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Employment Type</label>
              <select className="input" value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}>
                {["full-time", "part-time", "guest", "contractual"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Qualification</label>
              <input type="text" className="input" placeholder="Ph.D. in CS" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
              <input type="tel" className="input" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Joining Date</label>
              <input type="date" className="input" value={form.joining_date} onChange={e => setForm({ ...form, joining_date: e.target.value })} />
            </div>
            <div className="flex items-end gap-3">
              <button type="submit" className="btn-primary flex-1" disabled={!form.teacher_name || !form.employee_id}>Save Faculty</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
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
              <input type="text" className="input pl-10" placeholder="Search by name or employee ID..." value={search} onChange={e => setSearch(e.target.value)} />
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
            <button onClick={() => setViewMode("grid")} className={`px-3 py-2 text-xs font-semibold ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </button>
            <button onClick={() => setViewMode("table")} className={`px-3 py-2 text-xs font-semibold ${viewMode === "table" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Loading faculty...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <p className="text-sm font-medium">No faculty found. Add your first faculty member above.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(f => (
            <div key={f.id} className="card p-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-all" onClick={() => onSelectFaculty && onSelectFaculty(f)}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm shrink-0">
                  {getInitials(f.teacher_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{f.teacher_name}</p>
                  <p className="text-xs text-slate-500 font-medium">{f.designation}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400 font-mono">{f.employee_id}</span>
                    <span className={`badge ${statusColor(f.status)}`}>{f.status}</span>
                  </div>
                  {f.department_name && (
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                      {f.department_name}
                    </p>
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
                <th>Name</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="cursor-pointer" onClick={() => onSelectFaculty && onSelectFaculty(f)}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs shrink-0">
                        {getInitials(f.teacher_name)}
                      </div>
                      <span className="font-semibold">{f.teacher_name}</span>
                    </div>
                  </td>
                  <td><span className="font-mono text-xs">{f.employee_id}</span></td>
                  <td>{f.department_name || "—"}</td>
                  <td>{f.designation}</td>
                  <td className="capitalize">{f.employment_type}</td>
                  <td><span className={`badge ${statusColor(f.status)}`}>{f.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
