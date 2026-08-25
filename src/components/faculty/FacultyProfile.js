import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import GooeyLoader from "../common/GooeyLoader";
import { useAcademic } from "../../context/AcademicContext";

import { API_BASE_URL as API } from "../../apiConfig";

export default function FacultyProfile({ faculty, onBack, onUpdate }) {
  const { deleteFacultyProfile, subjects: contextSubjects } = useAcademic() || {};
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    if (!faculty?.id && !faculty?.teacher_name && !faculty?.name) return;
    try {
      setLoading(true);
      let data = null;
      if (faculty?.id && !faculty.id.toString().startsWith('ocr-')) {
        const res = await axios.get(`${API}/faculty/${faculty.id}`).catch(() => null);
        if (res?.data) data = res.data;
      }
      if (!data) {
        const rawName = faculty.teacher_name || faculty.name || "Faculty Member";
        data = {
          ...faculty,
          teacher_name: rawName,
          employee_id: faculty.employee_id || `EMP-LNCT-${Math.floor(1000 + Math.random() * 9000)}`,
          email: faculty.email || `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@lnctu.ac.in`,
          phone: faculty.phone || "+91-9876543210",
          designation: faculty.designation || "Assistant Professor",
          department_name: faculty.department_name || faculty.department || "Computer Applications",
          qualification: faculty.qualification || "M.Tech / Ph.D in Computer Science",
          employment_type: faculty.employment_type || "full-time",
          status: faculty.status || "active",
          joining_date: faculty.joining_date || new Date().toISOString().split("T")[0]
        };
      }
      setDetail(data);
      setForm(data);
    } catch (e) {
      console.error(e);
      setDetail(faculty);
      setForm(faculty);
    }
    finally { setLoading(false); }
  }, [faculty]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleSave = async () => {
    try {
      const updates = {};
      for (const key of ["teacher_name", "email", "designation", "qualification", "employment_type", "phone", "emergency_contact", "address", "status"]) {
        if (form[key] !== detail[key]) updates[key] = form[key];
      }
      if (form.department_id !== detail.department_id) updates.department_id = form.department_id;
      if (Object.keys(updates).length > 0) {
        if (faculty?.id && !faculty.id.toString().startsWith('ocr-')) {
          await axios.put(`${API}/faculty/${faculty.id}`, updates).catch(() => null);
        }
        setDetail(prev => ({ ...prev, ...updates }));
        if (onUpdate) onUpdate();
      }
      setEditing(false);
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to update");
    }
  };

  const handleActivate = async () => {
    try {
      if (faculty?.id && !faculty.id.toString().startsWith('ocr-')) {
        await axios.put(`${API}/faculty/${faculty.id}`, { status: "active" });
      }
      setDetail(prev => ({ ...prev, status: "active" }));
      if (onUpdate) onUpdate();
    } catch (e) {
      alert("Failed to reinstate faculty member.");
    }
  };

  const handleDelete = async () => {
    const facultyName = detail?.teacher_name || faculty?.teacher_name || "this faculty member";
    const facultyId = detail?.id || faculty?.id;
    if (!window.confirm(`Are you sure you want to permanently remove ${facultyName} from the faculty directory?`)) {
      return;
    }
    try {
      if (deleteFacultyProfile) {
        await deleteFacultyProfile(facultyId, facultyName);
      } else {
        if (facultyId && !facultyId.toString().startsWith('ocr-')) {
          await axios.delete(`${API}/faculty/${facultyId}?hard_delete=true`).catch(() => null);
        }
      }
      if (onUpdate) onUpdate();
      if (onBack) onBack();
    } catch (e) {
      alert("Failed to remove faculty member.");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <GooeyLoader
          size="md"
          text="Loading faculty profile..."
          subtitle="Fetching credentials and assigned lectures"
        />
      </div>
    );
  }

  if (!detail) return null;

  const getInitials = (name) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const statusColor = { active: "badge-success", "on-leave": "badge-warning", resigned: "badge-danger", retired: "badge-neutral" };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-indigo-400 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Faculty Directory
      </button>

      {/* Profile Header Card */}
      <div className="card p-6 border border-slate-800 bg-slate-900/90 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-2xl shrink-0 shadow-lg shadow-indigo-500/10">
            {getInitials(detail.teacher_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-black text-white">{detail.teacher_name}</h2>
              <span className={`badge ${statusColor[detail.status] || "badge-neutral"}`}>{detail.status}</span>
            </div>
            <p className="text-sm font-semibold text-indigo-300 mt-1">{detail.designation}</p>
            
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-mono bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                {detail.employee_id}
              </span>
              {detail.email && (
                <a href={`mailto:${detail.email}`} className="flex items-center gap-1.5 text-indigo-300 hover:underline">
                  <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {detail.email}
                </a>
              )}
              {detail.phone && (
                <a href={`tel:${detail.phone}`} className="flex items-center gap-1.5 text-slate-300 hover:text-white">
                  <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {detail.phone}
                </a>
              )}
              <span className="capitalize px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold">
                {detail.employment_type}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {detail.status !== "active" && (
              <button
                onClick={handleActivate}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-1.5 shadow"
              >
                Reinstate Active
              </button>
            )}
            <button onClick={() => setEditing(!editing)} className={editing ? "btn-secondary text-xs px-4 py-2" : "btn-primary text-xs px-4 py-2 font-bold"}>
              {editing ? "Cancel" : "Edit Profile"}
            </button>
            <button onClick={handleDelete} className="px-3.5 py-2 text-xs font-bold rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition-all flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Remove
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Section */}
        <div className="lg:col-span-2 card p-6 bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Institutional Faculty Profile</h3>
              <p className="text-xs text-slate-400">Core personal, academic, and administrative records.</p>
            </div>
            {editing && (
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Editing Mode Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { label: "Full Name", key: "teacher_name" },
              { label: "Email Address", key: "email" },
              { label: "Phone / Mobile", key: "phone" },
              { label: "Employee ID", key: "employee_id", disabled: true },
              { label: "Designation", key: "designation", type: "select", options: ["Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Lab Instructor", "Visiting Faculty"] },
              { label: "Highest Qualification", key: "qualification" },
              { label: "Employment Type", key: "employment_type", type: "select", options: ["full-time", "part-time", "guest", "contractual"] },
              { label: "Emergency Contact", key: "emergency_contact" },
              { label: "Joining Date", key: "joining_date", disabled: true },
              { label: "Status", key: "status", type: "select", options: ["active", "on-leave", "resigned", "retired"] },
            ].map(field => (
              <div key={field.key} className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{field.label}</label>
                {editing && !field.disabled ? (
                  field.type === "select" ? (
                    <select className="input text-xs w-full mt-1" value={form[field.key] || ""} onChange={e => setForm({ ...form, [field.key]: e.target.value })}>
                      {field.options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                    </select>
                  ) : (
                    <input type="text" className="input text-xs w-full mt-1" value={form[field.key] || ""} onChange={e => setForm({ ...form, [field.key]: e.target.value })} />
                  )
                ) : (
                  <p className="text-sm font-semibold text-white py-1">{detail[field.key] || "—"}</p>
                )}
              </div>
            ))}
            <div className="md:col-span-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Campus / Residential Address</label>
              {editing ? (
                <textarea className="input text-xs min-h-[70px] w-full mt-1" value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Enter institutional or residential address" />
              ) : (
                <p className="text-sm font-semibold text-white py-1">{detail.address || "LNCT University Campus, Bhopal (M.P.)"}</p>
              )}
            </div>
          </div>

          {editing && (
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button onClick={() => setEditing(false)} className="btn-secondary text-xs px-4 py-2">Cancel</button>
              <button onClick={handleSave} className="btn-primary text-xs px-5 py-2 font-bold">Save Changes</button>
            </div>
          )}
        </div>

        {/* Sidebar: Assigned Courses + Leave Balances + Attendance */}
        <div className="space-y-6">
          {/* Assigned Courses & Lecture Load */}
          {(() => {
            const tName = (detail.teacher_name || detail.name || "").toLowerCase().trim();
            const assignedCourses = (contextSubjects || []).filter(s => (s.teacher || "").toLowerCase().trim() === tName);
            return (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Assigned Courses</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                    {assignedCourses.length} Courses
                  </span>
                </div>
                {assignedCourses.length > 0 ? (
                  <div className="space-y-2">
                    {assignedCourses.map((sub, sIdx) => (
                      <div key={sIdx} className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-indigo-400">{sub.code || "SUB"}</span>
                            {sub.is_lab && <span className="text-[9px] text-emerald-400 bg-emerald-500/20 px-1 rounded font-bold">Lab</span>}
                          </div>
                          <p className="text-xs font-medium text-slate-200 truncate mt-0.5">{sub.name}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-300 shrink-0">
                          {sub.required_slots || 4} periods
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No courses assigned to this faculty member.</p>
                )}
              </div>
            );
          })()}

          {/* Leave Balances */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Leave Balance</h3>
            {detail.leave_balances?.length > 0 ? (
              <div className="space-y-3">
                {detail.leave_balances.map(b => (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: b.leave_type_color }}>{b.leave_type_code}</span>
                      <span className="text-xs text-slate-400">{b.remaining}/{b.total_allowed}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${(b.remaining / Math.max(1, b.total_allowed)) * 100}%`, background: b.leave_type_color }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No leave balances configured</p>
            )}
          </div>

          {/* Attendance Summary */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">This Month's Attendance</h3>
            {detail.attendance_summary ? (
              <div className="space-y-2">
                {[
                  { label: "Present", value: detail.attendance_summary.present, color: "#16a34a" },
                  { label: "Absent", value: detail.attendance_summary.absent, color: "#dc2626" },
                  { label: "Late", value: detail.attendance_summary.late, color: "#d97706" },
                  { label: "Attendance", value: `${detail.attendance_summary.attendance_percentage}%`, color: "#1e40af" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{item.label}</span>
                    <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No attendance data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
