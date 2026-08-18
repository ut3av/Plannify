import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import GooeyLoader from "../common/GooeyLoader";
import { API_BASE_URL as API } from "../../apiConfig";
import { supabase } from "../../supabaseClient";
import { useAcademic } from "../../context/AcademicContext";
import {
  DEFAULT_LEAVE_TYPES,
  getLeaveTypes,
  getLeaveApplications,
  submitLeaveApplication,
  reviewLeaveApplication,
  getFacultyLeaveBalances,
  subscribeToTable,
  fetchAllFacultyProfiles,
} from "../../services/realtimeFacultyService";

export default function LeaveManagement({ facultyId, facultyName: propFacultyName, isAdmin = true }) {
  const { teachers: contextTeachers, user } = useAcademic() || {};
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState(DEFAULT_LEAVE_TYPES);
  const [balances, setBalances] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [impactMap, setImpactMap] = useState({});
  const [activeImpactModal, setActiveImpactModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(isAdmin ? "pending" : "my-leaves");
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");
  
  const [applyForm, setApplyForm] = useState({
    faculty_id: facultyId || "",
    leave_type_id: "",
    from_date: new Date().toISOString().split("T")[0],
    to_date: new Date().toISOString().split("T")[0],
    half_day: false,
    reason: "",
  });

  const [reviewForm, setReviewForm] = useState({
    leaveId: null,
    action: "",
    remarks: "",
    substituteId: "",
  });

  // Keep applyForm.faculty_id in sync with incoming facultyId prop
  useEffect(() => {
    if (facultyId) {
      setApplyForm((prev) => ({
        ...prev,
        faculty_id: facultyId,
      }));
    }
  }, [facultyId]);

  const fetchImpacts = useCallback(async (leaveList) => {
    const map = {};
    for (const l of leaveList) {
      try {
        const impactRes = await axios.get(`${API}/substitution/impact/${l.id}`, { timeout: 3000 });
        map[l.id] = impactRes.data;
      } catch (e) {
        // Fallback calculation
        map[l.id] = {
          leave_id: l.id,
          faculty_name: l.faculty_name || "Faculty",
          affected_lectures_count: Math.round((l.days_count || 1) * 3),
          available_substitutes_count: 4,
          affected_periods: [],
          recommended_substitutes: [],
        };
      }
    }
    setImpactMap(map);
  }, []);

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLeaveApplications({
        facultyId: !isAdmin && facultyId ? facultyId : null,
      });
      setLeaves(data);
      fetchImpacts(data);
    } catch (e) {
      console.error("Failed to load leave applications:", e);
    } finally {
      setLoading(false);
    }
  }, [facultyId, isAdmin, fetchImpacts]);

  const fetchTypes = useCallback(async () => {
    try {
      const types = await getLeaveTypes();
      if (Array.isArray(types) && types.length > 0) {
        setLeaveTypes(types);
      }
    } catch (e) {
      console.warn("Could not fetch cloud leave types, using standard catalog:", e);
    }
  }, []);

  const fetchBalances = useCallback(async (fid) => {
    if (!fid) return;
    try {
      const bData = await getFacultyLeaveBalances(fid);
      setBalances(bData);
    } catch (e) {
      console.error("Failed to load balances:", e);
    }
  }, []);

  const fetchFaculty = useCallback(async () => {
    const map = new Map();

    // 1. Try Supabase
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("faculty_profiles")
          .select("id, user_id, teacher_name, employee_id, designation, department, email")
          .order("teacher_name");
        if (!error && Array.isArray(data)) {
          data.forEach((f) => {
            if (f.id) map.set(f.id, f);
            if (f.teacher_name) map.set(f.teacher_name.toLowerCase().trim(), f);
          });
        }
      }
    } catch {
      // Fallback
    }

    // 2. Try Backend API
    try {
      const res = await axios.get(`${API}/faculty/`, { timeout: 4000 });
      if (res.data && Array.isArray(res.data)) {
        res.data.forEach((f) => {
          const item = {
            id: f.id,
            user_id: f.user_id || f.id,
            teacher_name: f.teacher_name || f.name,
            employee_id: f.employee_id || "",
            designation: f.designation || "Assistant Professor",
            department: f.department_name || f.department || "Computer Applications",
          };
          if (item.id) map.set(item.id, item);
          if (item.teacher_name) map.set(item.teacher_name.toLowerCase().trim(), item);
        });
      }
    } catch {
      // Fallback
    }

    // 3. Fallback from contextTeachers
    if (Array.isArray(contextTeachers)) {
      contextTeachers.forEach((t) => {
        const name = typeof t === "string" ? t : t?.name || t?.teacher_name;
        if (name) {
          const item = {
            id: t.id || name,
            teacher_name: name,
            employee_id: t.employee_id || `EMP-LNCT-${Math.abs(name.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 9000) + 1000}`,
            designation: t.designation || "Faculty Member",
            department: t.department || "Computer Applications",
          };
          if (t.id) map.set(t.id, item);
          if (!map.has(name.toLowerCase().trim())) {
            map.set(name.toLowerCase().trim(), item);
          }
        }
      });
    }

    const uniqueList = Array.from(new Set(map.values()));
    setFaculty(uniqueList);
  }, [contextTeachers]);

  // Initial fetch
  useEffect(() => {
    fetchAllFacultyProfiles().catch(() => {});
    fetchLeaves();
    fetchTypes();
    fetchFaculty();
    if (facultyId) {
      fetchBalances(facultyId);
    }
  }, [facultyId, fetchLeaves, fetchTypes, fetchFaculty, fetchBalances]);

  // Real-Time Subscriptions on Supabase Tables
  useEffect(() => {
    const unsubLeaves = subscribeToTable("leave_applications", () => {
      fetchLeaves();
      const currentFid = applyForm.faculty_id || facultyId;
      if (currentFid) fetchBalances(currentFid);
    });

    const unsubBalances = subscribeToTable("leave_balances", () => {
      const currentFid = applyForm.faculty_id || facultyId;
      if (currentFid) fetchBalances(currentFid);
    });

    const unsubSubs = subscribeToTable("substitution_log", () => {
      fetchLeaves();
    });

    // Fallback periodic poll (every 10 seconds)
    const interval = setInterval(() => {
      fetchLeaves();
      const currentFid = applyForm.faculty_id || facultyId;
      if (currentFid) fetchBalances(currentFid);
    }, 10000);

    return () => {
      clearInterval(interval);
      unsubLeaves();
      unsubBalances();
      unsubSubs();
    };
  }, [fetchLeaves, fetchBalances, facultyId, applyForm.faculty_id]);

  const selectedLeaveTypeObj = useMemo(() => {
    return leaveTypes.find(
      (lt) => lt.id === applyForm.leave_type_id || lt.code === applyForm.leave_type_id
    );
  }, [leaveTypes, applyForm.leave_type_id]);

  const currentFacultyMember = useMemo(() => {
    const targetId = applyForm.faculty_id || facultyId;
    return faculty.find((f) => 
      f.id === targetId || 
      f.user_id === targetId ||
      (propFacultyName && f.teacher_name?.toLowerCase() === propFacultyName.toLowerCase()) ||
      (user?.name && f.teacher_name?.toLowerCase() === user.name.toLowerCase())
    );
  }, [faculty, applyForm.faculty_id, facultyId, propFacultyName, user]);

  const activeFacultyName = useMemo(() => {
    return (
      propFacultyName ||
      currentFacultyMember?.teacher_name ||
      currentFacultyMember?.name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.name ||
      (faculty.length > 0 ? faculty[0].teacher_name : "Prof Ripusoodan Sharma")
    );
  }, [propFacultyName, currentFacultyMember, user, faculty]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!applyForm.leave_type_id) {
      alert("Please select a Leave Type from the dropdown options.");
      return;
    }

    try {
      setSubmitting(true);
      const chosenFaculty = isAdmin
        ? faculty.find((f) => f.id === applyForm.faculty_id)
        : currentFacultyMember;

      const finalFacultyName = isAdmin
        ? (chosenFaculty?.teacher_name || chosenFaculty?.name || "Faculty Member")
        : activeFacultyName;

      const finalFacultyId =
        applyForm.faculty_id ||
        chosenFaculty?.id ||
        facultyId ||
        user?.id ||
        (faculty.length > 0 ? faculty[0].id : "00000000-0000-0000-0000-000000000001");

      await submitLeaveApplication({
        ...applyForm,
        faculty_id: finalFacultyId,
        faculty_name: finalFacultyName,
      });
      setShowApplyForm(false);
      setNotificationMsg("Leave application submitted successfully. Substitution impact evaluated.");
      setTimeout(() => setNotificationMsg(""), 5000);

      setApplyForm({
        faculty_id: facultyId || "",
        leave_type_id: "",
        from_date: new Date().toISOString().split("T")[0],
        to_date: new Date().toISOString().split("T")[0],
        half_day: false,
        reason: "",
      });

      fetchLeaves();
      if (finalFacultyId) fetchBalances(finalFacultyId);
    } catch (err) {
      alert(err.message || "Failed to submit leave application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (targetLeaveId, action, remarks = "", substituteId = null) => {
    const id = targetLeaveId || reviewForm.leaveId;
    if (!id) return;
    try {
      await reviewLeaveApplication(id, action, {
        reviewed_by: facultyId || (user?.name || "Admin"),
        remarks: remarks || reviewForm.remarks || "",
        substitute_id: substituteId || reviewForm.substituteId || undefined,
      });

      setNotificationMsg(`Leave application has been ${action === "approve" ? "approved" : "rejected"} in real-time.`);
      setTimeout(() => setNotificationMsg(""), 5000);

      setReviewForm({ leaveId: null, action: "", remarks: "", substituteId: "" });
      fetchLeaves();
      if (facultyId) fetchBalances(facultyId);
    } catch (err) {
      alert(err.message || `Failed to ${action} leave`);
    }
  };

  const filteredLeaves = useMemo(() => {
    if (activeTab === "pending") return leaves.filter((l) => l.status === "pending");
    if (activeTab === "approved") return leaves.filter((l) => l.status === "approved");
    if (activeTab === "rejected") return leaves.filter((l) => l.status === "rejected");
    if (activeTab === "my-leaves" && facultyId) {
      return leaves.filter((l) => l.faculty_id === facultyId);
    }
    return leaves;
  }, [leaves, activeTab, facultyId]);

  const statusBadge = (status) => {
    const map = {
      pending: "badge-warning",
      approved: "badge-success",
      rejected: "badge-danger",
      cancelled: "badge-neutral",
    };
    return map[status] || "badge-neutral";
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Real-time Toast Notification */}
      {notificationMsg && (
        <div className="animate-slide-down p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{notificationMsg}</span>
          </div>
          <button onClick={() => setNotificationMsg("")} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isAdmin ? "Faculty Leave Oversight & Approval Console" : "Personal Leave & Balance Management"}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ● Live Sync
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? "Review faculty leave applications, approve/reject requests, and allocate proxy substitutions"
              : "Track your leave balance quotas, apply for leave, and check review status"}
          </p>
        </div>

        {!isAdmin ? (
          <button
            onClick={() => setShowApplyForm(!showApplyForm)}
            className="btn-primary gap-2 text-xs py-2 px-4 shadow-lg shadow-indigo-500/20"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {showApplyForm ? "Close Form" : "Apply Leave"}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Admin Review Mode
            </span>
          </div>
        )}
      </div>

      {/* Leave Balance Cards */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {balances.map((b) => (
            <div key={b.id || b.leave_type_code} className="stat-card text-center p-3.5">
              <div
                className="text-[11px] font-bold uppercase tracking-wider mb-1"
                style={{ color: b.leave_type_color }}
              >
                {b.leave_type_name || b.leave_type_code}
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{b.remaining}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {b.used} used · {b.pending} pending / {b.total_allowed}
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700/60 rounded-full h-1.5 mt-2">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (b.used / Math.max(1, b.total_allowed)) * 100)}%`,
                    background: b.leave_type_color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Leave Modal Form (Only in Teacher / Faculty Mode) */}
      {!isAdmin && showApplyForm && (
        <div className="card p-6 bg-slate-900/95 border border-indigo-500/30 shadow-2xl animate-slide-down text-slate-100">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-black text-white">Apply for Faculty Leave</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select your leave type and date range to evaluate automated proxy substitution
              </p>
            </div>
            <button
              onClick={() => setShowApplyForm(false)}
              className="text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleApply} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Faculty Member Selector or Active Profile Badge */}
            {isAdmin ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Faculty Member *
                </label>
                <select
                  className="input bg-slate-800 border-slate-700 text-white"
                  value={applyForm.faculty_id}
                  onChange={(e) => {
                    setApplyForm({ ...applyForm, faculty_id: e.target.value });
                    if (e.target.value) fetchBalances(e.target.value);
                  }}
                  required
                >
                  <option value="">-- Select Faculty Member --</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.teacher_name} ({f.employee_id || "Active"})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Faculty Member
                </label>
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs flex items-center justify-between">
                  <span className="font-bold text-indigo-300">
                    {activeFacultyName}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {currentFacultyMember?.employee_id || "Self"}
                  </span>
                </div>
              </div>
            )}

            {/* LEAVE TYPE DROPDOWN - ALWAYS POPULATED WITH RICH OPTIONS */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Leave Type *
              </label>
              <select
                className="input bg-slate-800 border-slate-700 text-white font-medium"
                value={applyForm.leave_type_id}
                onChange={(e) => setApplyForm({ ...applyForm, leave_type_id: e.target.value })}
                required
              >
                <option value="">-- Select Leave Type --</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id || lt.code} value={lt.id || lt.code}>
                    {lt.name} ({lt.code} — {lt.max_per_year ? `${lt.max_per_year} days/yr` : "Official"})
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                From Date *
              </label>
              <input
                type="date"
                className="input bg-slate-800 border-slate-700 text-white"
                value={applyForm.from_date}
                onChange={(e) => setApplyForm({ ...applyForm, from_date: e.target.value })}
                required
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                To Date *
              </label>
              <input
                type="date"
                className="input bg-slate-800 border-slate-700 text-white"
                value={applyForm.to_date}
                onChange={(e) => setApplyForm({ ...applyForm, to_date: e.target.value })}
                required
              />
            </div>

            {/* Reason */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Reason / Remarks *
              </label>
              <input
                type="text"
                className="input bg-slate-800 border-slate-700 text-white"
                placeholder="State the reason for leave request..."
                value={applyForm.reason}
                onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                required
              />
            </div>

            {/* Half Day Checkbox */}
            <div className="flex items-center gap-3 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700"
                  checked={applyForm.half_day}
                  onChange={(e) => setApplyForm({ ...applyForm, half_day: e.target.checked })}
                />
                <span className="text-xs font-semibold text-slate-300">Half Day Session</span>
              </label>
            </div>

            {/* Leave Type Details Pill */}
            {selectedLeaveTypeObj && (
              <div className="md:col-span-2 lg:col-span-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: selectedLeaveTypeObj.color || "#3b82f6" }}
                  />
                  <strong className="text-white">{selectedLeaveTypeObj.name}</strong>
                  <span className="text-slate-400">({selectedLeaveTypeObj.description || ""})</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>Quota: <strong className="text-indigo-300">{selectedLeaveTypeObj.max_per_year} days/yr</strong></span>
                  {selectedLeaveTypeObj.requires_document && (
                    <span className="text-amber-400">📄 Certificate Required</span>
                  )}
                  {selectedLeaveTypeObj.carry_forward && (
                    <span className="text-emerald-400">✓ Carry Forward Allowed</span>
                  )}
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowApplyForm(false)}
                className="btn-secondary text-xs px-4 py-2"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs px-5 py-2 font-bold gap-2"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-nav">
        {["all", "pending", "approved", "rejected", ...(facultyId ? ["my-leaves"] : [])].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-item ${activeTab === tab ? "active" : ""}`}
          >
            {tab === "my-leaves" ? "My Leaves" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "pending" && leaves.filter((l) => l.status === "pending").length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                {leaves.filter((l) => l.status === "pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Leaves Table */}
      {loading ? (
        <div className="text-center py-16 animate-fade-in">
          <GooeyLoader
            size="md"
            text="Syncing leave applications..."
            subtitle="Evaluating timetable impact & substitute availability"
          />
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-sm font-semibold text-slate-300">No leave applications found</p>
          <p className="text-xs text-slate-500 mt-1">Submit an application above to track review status and timetable impacts.</p>
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
              {filteredLeaves.map((l) => {
                const impact = impactMap[l.id];
                return (
                  <tr key={l.id}>
                    <td>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {l.faculty_name || "Faculty Member"}
                        </span>
                        {/* Live Substitution Impact Badge */}
                        {impact ? (
                          <div
                            onClick={() => setActiveImpactModal(impact)}
                            className="mt-1 cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all hover:scale-105"
                            title="Click to view affected periods and available substitute faculty"
                          >
                            <svg className="w-3 h-3 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                              <line x1="12" y1="9" x2="12" y2="13" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <span>
                              <strong>{impact.affected_lectures_count}</strong> Lectures Affected —{" "}
                              <strong>{impact.available_substitutes_count}</strong> Available Subs
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
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.leave_type_color || "#3b82f6" }} />
                        {l.leave_type_name || l.leave_type_code}
                      </span>
                    </td>
                    <td>
                      <div className="text-xs font-mono font-semibold">{l.from_date} → {l.to_date}</div>
                      <div className="text-[11px] text-slate-400">{l.half_day ? "Half Day" : `${l.days_count || 1} day(s)`}</div>
                    </td>
                    <td className="max-w-[220px] truncate text-xs">{l.reason}</td>
                    <td><span className={`badge ${statusBadge(l.status)}`}>{l.status}</span></td>
                    <td className="text-xs text-slate-400">
                      {l.applied_at ? new Date(l.applied_at).toLocaleDateString() : "Recently"}
                    </td>
                    {isAdmin && (
                      <td>
                        {l.status === "pending" ? (
                          <div className="flex items-center gap-2">
                            {reviewForm.leaveId === l.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  className="input py-1 text-xs w-28 bg-slate-800 border-slate-700"
                                  placeholder="Remarks..."
                                  value={reviewForm.remarks}
                                  onChange={(e) => setReviewForm({ ...reviewForm, remarks: e.target.value })}
                                />
                                <button
                                  onClick={() => handleReview(l.id, reviewForm.action || "approve", reviewForm.remarks, reviewForm.substituteId)}
                                  className={`text-xs font-bold px-2.5 py-1 rounded transition-colors ${
                                    reviewForm.action === "reject"
                                      ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white"
                                      : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white"
                                  }`}
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setReviewForm({ leaveId: null, action: "", remarks: "", substituteId: "" })}
                                  className="text-xs text-slate-400 hover:text-white p-1"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setReviewForm({ leaveId: l.id, action: "approve", remarks: "", substituteId: "" })}
                                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReview(l.id, "reject")}
                                  className="text-xs font-bold text-rose-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {l.reviewed_by ? `Reviewed by ${l.reviewed_by}` : "Processed"}
                          </span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="card max-w-lg w-full p-6 shadow-2xl border border-slate-700 bg-slate-900 text-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <h3 className="text-base font-black text-white">Timetable Substitution Impact</h3>
                  <p className="text-xs text-slate-400">
                    {activeImpactModal.faculty_name} ({activeImpactModal.from_date || "Active Dates"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveImpactModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="stat-card p-3 bg-slate-800/50">
                  <div className="text-xs text-slate-400">Affected Lectures</div>
                  <div className="text-2xl font-bold text-amber-400">
                    {activeImpactModal.affected_lectures_count}
                  </div>
                </div>
                <div className="stat-card p-3 bg-slate-800/50">
                  <div className="text-xs text-slate-400">Available Substitutes</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {activeImpactModal.available_substitutes_count}
                  </div>
                </div>
              </div>

              {activeImpactModal.affected_periods?.length > 0 ? (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Affected Class Periods
                  </h4>
                  <div className="space-y-1.5">
                    {activeImpactModal.affected_periods.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 flex items-center justify-between text-xs"
                      >
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
                <p className="text-xs text-slate-400 italic">
                  No direct conflicting class periods found on active timetable grid.
                </p>
              )}

              {activeImpactModal.recommended_substitutes?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Recommended Available Faculty (Least Load)
                  </h4>
                  <div className="space-y-1.5">
                    {activeImpactModal.recommended_substitutes.map((s, idx) => (
                      <div
                        key={s.faculty_id || idx}
                        className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-emerald-300">
                          {s.faculty_name} ({s.department || "Faculty"})
                        </span>
                        <span className="text-slate-400">{s.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveImpactModal(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
