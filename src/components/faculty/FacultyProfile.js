import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function FacultyProfile({ faculty, onBack, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    if (!faculty?.id) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API}/faculty/${faculty.id}`);
      setDetail(res.data);
      setForm(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [faculty?.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleSave = async () => {
    try {
      const updates = {};
      for (const key of ["teacher_name", "designation", "qualification", "employment_type", "phone", "emergency_contact", "address", "status"]) {
        if (form[key] !== detail[key]) updates[key] = form[key];
      }
      if (form.department_id !== detail.department_id) updates.department_id = form.department_id;
      if (Object.keys(updates).length > 0) {
        await axios.put(`${API}/faculty/${faculty.id}`, updates);
        fetchDetail();
        if (onUpdate) onUpdate();
      }
      setEditing(false);
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to update");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading profile...</p>
      </div>
    );
  }

  if (!detail) return null;

  const getInitials = (name) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const statusColor = { active: "badge-success", "on-leave": "badge-warning", resigned: "badge-danger", retired: "badge-neutral" };

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 mb-6 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Directory
      </button>

      {/* Profile Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-2xl shrink-0">
            {getInitials(detail.teacher_name)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{detail.teacher_name}</h2>
              <span className={`badge ${statusColor[detail.status] || "badge-neutral"}`}>{detail.status}</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{detail.designation} · {detail.department_name || "No Department"}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 font-mono">{detail.employee_id}</span>
              <span className="capitalize">{detail.employment_type}</span>
              {detail.phone && <span>{detail.phone}</span>}
            </div>
          </div>
          <button onClick={() => setEditing(!editing)} className={editing ? "btn-secondary" : "btn-primary"}>
            {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Full Name", key: "teacher_name" },
              { label: "Designation", key: "designation", type: "select", options: ["Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Lab Instructor", "Visiting Faculty"] },
              { label: "Qualification", key: "qualification" },
              { label: "Employment Type", key: "employment_type", type: "select", options: ["full-time", "part-time", "guest", "contractual"] },
              { label: "Phone", key: "phone" },
              { label: "Emergency Contact", key: "emergency_contact" },
              { label: "Joining Date", key: "joining_date", disabled: true },
              { label: "Status", key: "status", type: "select", options: ["active", "on-leave", "resigned", "retired"] },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{field.label}</label>
                {editing && !field.disabled ? (
                  field.type === "select" ? (
                    <select className="input" value={form[field.key] || ""} onChange={e => setForm({ ...form, [field.key]: e.target.value })}>
                      {field.options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                    </select>
                  ) : (
                    <input type="text" className="input" value={form[field.key] || ""} onChange={e => setForm({ ...form, [field.key]: e.target.value })} />
                  )
                ) : (
                  <p className="text-sm font-medium text-slate-900 dark:text-white py-2.5 capitalize">{detail[field.key] || "—"}</p>
                )}
              </div>
            ))}
            {editing && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                <textarea className="input min-h-[80px]" value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
            )}
          </div>
          {editing && (
            <div className="flex justify-end mt-6 pt-4 border-t" style={{ borderColor: "var(--border-default)" }}>
              <button onClick={handleSave} className="btn-primary">Save Changes</button>
            </div>
          )}
        </div>

        {/* Sidebar: Leave Balances + Attendance */}
        <div className="space-y-6">
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
