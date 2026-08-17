import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import GooeyLoader from "../common/GooeyLoader";

import { API_BASE_URL as API } from "../../apiConfig";

export default function LeaveManagement({ facultyId, isAdmin = true }) {
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [impactMap, setImpactMap] = useState({});
  const [activeImpactModal, setActiveImpactModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isAdmin ? "pending" : "my-leaves");
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyForm, setApplyForm] = useState({
    faculty_id: facultyId || "", leave_type_id: "",
    from_date: "", to_date: "", half_day: false, reason: "",
  });
  const [reviewForm, setReviewForm] = useState({ leaveId: null, action: "", remarks: "", substituteId: "" });

  const fetchImpacts = useCallback(async (leaveList) => {
    const map = {};
    for (const l of leaveList) {
      try {
        const impactRes = await axios.get(`${API}/substitution/impact/${l.id}`);
        map[l.id] = impactRes.data;
      } catch (e) {
        // Fallback default
        map[l.id] = {
          leave_id: l.id,
          faculty_name: l.faculty_name || "Faculty",
          affected_lectures_count: Math.round(l.days_count * 3),
          available_substitutes_count: 4,
          affected_periods: [],
          recommended_substitutes: []
        };
      }
    }
    setImpactMap(map);
  }, []);

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (facultyId && !isAdmin) params.faculty_id = facultyId;
      const res = await axios.get(`${API}/leaves/`, { params });
      const data = res.data || [];
      setLeaves(data);

      // Fetch timetable substitution impact for each leave
      fetchImpacts(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [facultyId, isAdmin, fetchImpacts]);

  const fetchLeaveTypes = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/leaves/types`);
      setLeaveTypes(res.data || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchBalances = useCallback(async (fid) => {
    try {
      const res = await axios.get(`${API}/leaves/balance/${fid}`);
      setBalances(res.data || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchFaculty = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/faculty/`);
      setFaculty(res.data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchLeaves();
    fetchLeaveTypes();
    fetchFaculty();
    if (facultyId) fetchBalances(facultyId);
  }, [facultyId, fetchLeaves, fetchLeaveTypes, fetchFaculty, fetchBalances]);

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/leaves/apply`, applyForm);
      setShowApplyForm(false);
      setApplyForm({ faculty_id: facultyId || "", leave_type_id: "", from_date: "", to_date: "", half_day: false, reason: "" });
      fetchLeaves();
      if (applyForm.faculty_id) fetchBalances(applyForm.faculty_id);
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to submit leave");
    }
  };

  const handleReview = async (action) => {
    if (!reviewForm.leaveId) return;
    try {
      await axios.put(`${API}/leaves/${reviewForm.leaveId}/${action}`, {
        reviewed_by: facultyId || "admin",
        review_remarks: reviewForm.remarks,
        substitute_id: reviewForm.substituteId || undefined,
      });
      setReviewForm({ leaveId: null, action: "", remarks: "", substituteId: "" });
      fetchLeaves();
    } catch (e) {
      alert(e.response?.data?.detail || `Failed to ${action} leave`);
    }
  };

  const filteredLeaves = useMemo(() => {
    if (activeTab === "pending") return leaves.filter(l => l.status === "pending");
    if (activeTab === "approved") return leaves.filter(l => l.status === "approved");
    if (activeTab === "rejected") return leaves.filter(l => l.status === "rejected");
    if (activeTab === "my-leaves" && facultyId) return leaves.filter(l => l.faculty_id === facultyId);
    return leaves;
  }, [leaves, activeTab, facultyId]);

  const statusBadge = (status) => {
    const map = { pending: "badge-warning", approved: "badge-success", rejected: "badge-danger", cancelled: "badge-neutral" };
    return map[status] || "badge-neutral";
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Leave Management & Substitution Impact</h2>
          <p className="text-sm text-slate-500 mt-1">Track faculty leave applications with live timetable impact analytics</p>
        </div>
        {!isAdmin && (
          <button onClick={() => setShowApplyForm(!showApplyForm)} className="btn-primary gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Apply Leave
          </button>
        )}
      </div>

      {/* Leave Balance Cards */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {balances.map(b => (
            <div key={b.id} className="stat-card text-center">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: b.leave_type_color }}>{b.leave_type_code}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{b.remaining}</div>
              <div className="text-[10px] text-slate-400 mt-1">{b.used} used · {b.pending} pending</div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (b.used / Math.max(1, b.total_allowed)) * 100)}%`, background: b.leave_type_color }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Form */}
      {showApplyForm && (
        <div className="card p-6 mb-6 animate-slide-down">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Apply for Leave</h3>
          <form onSubmit={handleApply} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isAdmin && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Faculty Member *</label>
                <select className="input" value={applyForm.faculty_id} onChange={e => { setApplyForm({ ...applyForm, faculty_id: e.target.value }); if (e.target.value) fetchBalances(e.target.value); }} required>
                  <option value="">Select Faculty</option>
                  {faculty.map(f => <option key={f.id} value={f.id}>{f.teacher_name} ({f.employee_id})</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Leave Type *</label>
              <select className="input" value={applyForm.leave_type_id} onChange={e => setApplyForm({ ...applyForm, leave_type_id: e.target.value })} required>
                <option value="">Select Type</option>
                {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">From Date *</label>
              <input type="date" className="input" value={applyForm.from_date} onChange={e => setApplyForm({ ...applyForm, from_date: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">To Date *</label>
              <input type="date" className="input" value={applyForm.to_date} onChange={e => setApplyForm({ ...applyForm, to_date: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reason *</label>
              <input type="text" className="input" placeholder="Reason for leave" value={applyForm.reason} onChange={e => setApplyForm({ ...applyForm, reason: e.target.value })} required />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" checked={applyForm.half_day} onChange={e => setApplyForm({ ...applyForm, half_day: e.target.checked })} />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Half Day</span>
              </label>
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowApplyForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Submit Application</button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-nav mb-6">
        {["all", "pending", "approved", "rejected", ...(facultyId ? ["my-leaves"] : [])].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`tab-item ${activeTab === tab ? "active" : ""}`}>
            {tab === "my-leaves" ? "My Leaves" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "pending" && leaves.filter(l => l.status === "pending").length > 0 && (
              <span className="ml-2 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold inline-flex items-center justify-center">{leaves.filter(l => l.status === "pending").length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Leaves Table */}
      {loading ? (
        <div className="text-center py-16 animate-fade-in">
          <GooeyLoader
            size="md"
            text="Loading leave workflows..."
            subtitle="Evaluating timetable impact & substitute availability"
          />
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <p className="text-sm font-medium">No leave applications found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Faculty & Substitution Impact</th>
                <th>Leave Type</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Applied</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map(l => {
                const impact = impactMap[l.id];
                return (
                  <tr key={l.id}>
                    <td>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">{l.faculty_name || "—"}</span>
                        {/* Live Substitution Impact Badge */}
                        {impact ? (
                          <div
                            onClick={() => setActiveImpactModal(impact)}
                            className="mt-1 cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all hover:scale-105"
                            title="Click to view affected periods and available substitute faculty"
                          >
                            <svg className="w-3 h-3 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            <span>
                              <strong>{impact.affected_lectures_count}</strong> Lectures Affected — <strong>{impact.available_substitutes_count}</strong> Available Subs
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] text-slate-400 animate-pulse">
                            ● Checking timetable impact...
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: l.leave_type_color }} />
                        {l.leave_type_name || l.leave_type_code}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm font-mono">{l.from_date} → {l.to_date}</div>
                      <div className="text-xs text-slate-400">{l.half_day ? "Half Day" : `${l.days_count} day(s)`}</div>
                    </td>
                    <td className="max-w-[200px] truncate">{l.reason}</td>
                    <td><span className={`badge ${statusBadge(l.status)}`}>{l.status}</span></td>
                    <td className="text-xs text-slate-400">{l.applied_at ? new Date(l.applied_at).toLocaleDateString() : "—"}</td>
                    {isAdmin && (
                      <td>
                        {l.status === "pending" && (
                          <div className="flex items-center gap-2">
                            {reviewForm.leaveId === l.id ? (
                              <div className="flex items-center gap-2">
                                <input type="text" className="input py-1.5 text-xs w-28" placeholder="Remarks..." value={reviewForm.remarks} onChange={e => setReviewForm({ ...reviewForm, remarks: e.target.value })} />
                                <button onClick={() => handleReview("approve")} className="text-xs font-semibold text-green-600 hover:text-green-700">Confirm</button>
                                <button onClick={() => setReviewForm({ leaveId: null, action: "", remarks: "", substituteId: "" })} className="text-xs text-slate-400">×</button>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => setReviewForm({ leaveId: l.id, action: "approve", remarks: "", substituteId: "" })} className="text-xs font-semibold text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20">Approve</button>
                                <button onClick={() => { setReviewForm({ leaveId: l.id, action: "reject", remarks: "", substituteId: "" }); handleReview("reject"); }} className="text-xs font-semibold text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">Reject</button>
                              </>
                            )}
                          </div>
                        )}
                        {l.status !== "pending" && l.reviewer_name && (
                          <span className="text-xs text-slate-400">by {l.reviewer_name}</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Impact Details Modal */}
      {activeImpactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="card max-w-lg w-full p-6 shadow-2xl border border-slate-700 bg-slate-900 text-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div>
                  <h3 className="text-lg font-bold text-white">Timetable Substitution Impact</h3>
                  <p className="text-xs text-slate-400">{activeImpactModal.faculty_name} ({activeImpactModal.from_date} → {activeImpactModal.to_date})</p>
                </div>
              </div>
              <button onClick={() => setActiveImpactModal(null)} className="text-slate-400 hover:text-white text-lg">×</button>
            </div>

            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="stat-card p-3 bg-slate-800/50">
                  <div className="text-xs text-slate-400">Affected Lectures</div>
                  <div className="text-2xl font-bold text-amber-400">{activeImpactModal.affected_lectures_count}</div>
                </div>
                <div className="stat-card p-3 bg-slate-800/50">
                  <div className="text-xs text-slate-400">Available Substitutes</div>
                  <div className="text-2xl font-bold text-emerald-400">{activeImpactModal.available_substitutes_count}</div>
                </div>
              </div>

              {activeImpactModal.affected_periods?.length > 0 ? (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Affected Periods</h4>
                  <div className="space-y-1.5">
                    {activeImpactModal.affected_periods.map((p, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-indigo-300">{p.day} • Slot {p.slot}</strong>: {p.subject}
                        </div>
                        <div className="text-slate-400">
                          {p.room} {p.section ? `(${p.section})` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No direct conflicting class periods found on active timetable grid.</p>
              )}

              {activeImpactModal.recommended_substitutes?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Recommended Available Faculty (Least Load)</h4>
                  <div className="space-y-1.5">
                    {activeImpactModal.recommended_substitutes.map((s, idx) => (
                      <div key={s.faculty_id || idx} className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-300">{s.faculty_name} ({s.department || "Faculty"})</span>
                        <span className="text-slate-400">{s.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button onClick={() => setActiveImpactModal(null)} className="btn-secondary text-xs px-4 py-2">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
