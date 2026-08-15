import { useState, useEffect } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function SubstitutionPanel() {
  const [substitutions, setSubstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);

  useEffect(() => {
    fetchSubstitutions();
    fetchApprovedLeaves();
  }, []);

  const fetchSubstitutions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/substitution/history`);
      setSubstitutions(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchApprovedLeaves = async () => {
    try {
      const res = await axios.get(`${API}/leaves/`, { params: { status: "approved" } });
      // Filter to upcoming leaves that need substitutes
      const today = new Date().toISOString().split("T")[0];
      const upcoming = (res.data || []).filter(l => l.to_date >= today && !l.substitute_id);
      setPendingLeaves(upcoming);
    } catch (e) { console.error(e); }
  };

  const fetchSuggestions = async (leave) => {
    setSelectedLeave(leave);
    try {
      const res = await axios.get(`${API}/substitution/suggest/${leave.id}`, {
        params: { date: leave.from_date, slot: "9-10" }
      });
      setSuggestions(res.data || []);
    } catch (e) { console.error(e); }
  };

  const assignSubstitute = async (facultyId, facultyName) => {
    if (!selectedLeave) return;
    try {
      await axios.post(`${API}/substitution/assign`, {
        leave_application_id: selectedLeave.id,
        original_faculty_id: selectedLeave.faculty_id,
        substitute_faculty_id: facultyId,
        date: selectedLeave.from_date,
        slot: "All Day",
        subject: "",
        section: "",
        room: "",
      });
      alert(`${facultyName} assigned as substitute`);
      setSelectedLeave(null);
      setSuggestions([]);
      fetchSubstitutions();
      fetchApprovedLeaves();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to assign substitute");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Substitution Management</h2>
        <p className="text-sm text-slate-500 mt-1">Assign substitute faculty for approved leaves</p>
      </div>

      {/* Pending Substitution Needs */}
      {pendingLeaves.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Needs Substitute ({pendingLeaves.length})</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingLeaves.map(l => (
              <div key={l.id} className={`card p-4 cursor-pointer transition-all ${selectedLeave?.id === l.id ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900" : "hover:border-blue-300"}`} onClick={() => fetchSuggestions(l)}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{l.faculty_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{l.leave_type_name} — {l.reason}</p>
                  </div>
                  <span className="badge badge-warning text-[10px]">{l.leave_type_code}</span>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                  {l.from_date} → {l.to_date}
                  <span className="ml-auto font-semibold text-blue-600">
                    {selectedLeave?.id === l.id ? "Selected" : "Click to find substitute →"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Substitute Suggestions */}
      {selectedLeave && suggestions.length > 0 && (
        <div className="card p-5 mb-6 animate-slide-down">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
            Suggested Substitutes for <span className="text-blue-600">{selectedLeave.faculty_name}</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">Sorted by workload — least loaded first</p>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={s.faculty_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{s.faculty_name}</p>
                    <p className="text-xs text-slate-400">{s.employee_id} · {s.department || "—"} · {s.reason}</p>
                  </div>
                </div>
                <button onClick={() => assignSubstitute(s.faculty_id, s.faculty_name)} className="btn-primary text-xs px-4 py-1.5">
                  Assign
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Substitution History */}
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">History</h3>
      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        </div>
      ) : substitutions.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
          <p className="text-sm font-medium">No substitutions recorded yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Original Faculty</th>
                <th>Substitute</th>
                <th>Slot</th>
                <th>Subject</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {substitutions.map(s => (
                <tr key={s.id}>
                  <td className="text-sm">{s.date}</td>
                  <td><span className="font-semibold">{s.original_faculty_name}</span></td>
                  <td><span className="font-semibold text-blue-600">{s.substitute_faculty_name}</span></td>
                  <td>{s.slot}</td>
                  <td>{s.subject || "—"}</td>
                  <td>
                    <span className={`badge ${s.status === "completed" ? "badge-success" : s.status === "declined" ? "badge-danger" : "badge-primary"}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
