import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const API = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function FacultyAnalyticsProfile({ facultyId, rangeKey, startDate, endDate, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchProfile();
  }, [facultyId, rangeKey, startDate, endDate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { range_key: rangeKey };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await axios.get(`${API}/analytics/faculty/${facultyId}`, { params });
      setProfile(res.data);
    } catch (e) {
      console.error("Failed to load faculty analytics profile:", e);
      setError(e.response?.data?.detail || "Failed to load faculty analytics profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-12 text-center text-slate-400 animate-pulse">
        <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-indigo-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
        </div>
        <p className="text-sm font-medium">Loading faculty operational analytics...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="card p-8 text-center border-red-500/30 bg-red-500/5">
        <p className="text-red-400 font-semibold">{error || "Faculty record not found"}</p>
        <button onClick={onBack} className="btn-secondary mt-4">Go Back</button>
      </div>
    );
  }

  const { faculty, attendance, leave, teaching, substitution, workload, operational_health, timeline, time_period } = profile;

  const initials = faculty.teacher_name ? faculty.teacher_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "FC";

  const getWorkloadBadge = (classification) => {
    if (classification === "Low") return "bg-sky-500/20 text-sky-300 border-sky-500/30";
    if (classification === "High") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  };

  const COLORS = ['#3b82f6', '#0d9488', '#dc2626', '#d97706', '#6366f1'];

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Top Header Card */}
      <div className="card p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/80 border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <button onClick={onBack} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>

            <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-xl font-black text-indigo-300 shadow-xl shadow-indigo-500/20">
              {faculty.photo_url ? (
                <img src={faculty.photo_url} alt={faculty.teacher_name} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                initials
              )}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-white">{faculty.teacher_name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${faculty.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                  {faculty.status ? faculty.status.toUpperCase() : 'ACTIVE'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-4">
                <span>ID: <strong className="text-slate-200">{faculty.employee_id}</strong></span>
                <span>Dept: <strong className="text-slate-200">{faculty.department_name}</strong></span>
                <span>Role: <strong className="text-indigo-300">{faculty.designation}</strong></span>
                <span>Type: <strong className="text-slate-200">{faculty.employment_type}</strong></span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300 inline-block">
              📅 {time_period.formatted}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Joining Date: {faculty.joining_date || 'N/A'}</p>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-700/60 overflow-x-auto">
          {["overview", "attendance", "leave", "teaching", "substitutions", "workload", "timeline"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* NON-PUNITIVE DISCLAIMER BANNER */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <div>
          <strong className="font-semibold text-blue-200">Institutional Governance & Non-Punitive Policy:</strong> Operational analytics provide administrative visibility for scheduling, substitution planning, and workload distribution. Approved casual leaves, compensatory off, and medical leaves are legitimate operational events and are explicitly separated from teaching quality evaluation.
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW & OPERATIONAL HEALTH ── */}
      {(activeTab === "overview" || activeTab === "all") && (
        <div className="space-y-6">
          {/* Operational Health Snapshot */}
          <div className="card p-6 bg-slate-900/90 border border-slate-800">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Faculty Operational Health Snapshot
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <p className="text-[11px] uppercase font-bold text-slate-400">Attendance Rate</p>
                <h4 className="text-xl font-black text-emerald-400 mt-1">{operational_health.attendance_consistency}</h4>
                <p className="text-[11px] text-slate-400 mt-1">{attendance.present_days} of {attendance.present_days + attendance.absent_days + attendance.half_days} days</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <p className="text-[11px] uppercase font-bold text-slate-400">Punctuality</p>
                <h4 className="text-xl font-black text-indigo-400 mt-1">{operational_health.punctuality_rate}</h4>
                <p className="text-[11px] text-slate-400 mt-1">{attendance.late_days} late arrival(s)</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <p className="text-[11px] uppercase font-bold text-slate-400">Workload Load</p>
                <h4 className={`text-xl font-black mt-1 ${workload.classification === 'High' ? 'text-amber-400' : 'text-sky-400'}`}>{workload.classification}</h4>
                <p className="text-[11px] text-slate-400 mt-1">{workload.weekly_periods} periods / wk</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <p className="text-[11px] uppercase font-bold text-slate-400">Leave Usage</p>
                <h4 className="text-xl font-black text-purple-400 mt-1">{operational_health.leave_usage}</h4>
                <p className="text-[11px] text-slate-400 mt-1">{leave.approved} approved leaves</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <p className="text-[11px] uppercase font-bold text-slate-400">Substitutions</p>
                <h4 className="text-xl font-black text-amber-400 mt-1">{substitution.provided} Prov / {substitution.received} Rec</h4>
                <p className="text-[11px] text-slate-400 mt-1">Operational support</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <p className="text-[11px] uppercase font-bold text-slate-400">Schedule Stability</p>
                <h4 className="text-xl font-black text-teal-400 mt-1">{operational_health.schedule_stability}</h4>
                <p className="text-[11px] text-slate-400 mt-1">Timetable integrity</p>
              </div>
            </div>
          </div>

          {/* Quick Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Attendance Quick Chart */}
            <div className="card p-6 bg-slate-900/90 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-4">Daily Attendance Activity</h3>
              <div className="h-48">
                {attendance.timeline && attendance.timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendance.timeline.slice(0, 14)}>
                      <XAxis dataKey="date" tick={{fill: '#94a3b8', fontSize: 10}} />
                      <YAxis tick={{fill: '#94a3b8', fontSize: 10}} />
                      <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff'}} />
                      <Bar dataKey="late_minutes" fill="#8b5cf6" radius={[4,4,0,0]} name="Late Minutes" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                    Insufficient attendance data
                  </div>
                )}
              </div>
            </div>

            {/* Leave Breakdown Chart */}
            <div className="card p-6 bg-slate-900/90 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-4">Leave Balances & Utilization</h3>
              <div className="space-y-3">
                {leave.breakdown && leave.breakdown.map((lb, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{lb.name} ({lb.code})</span>
                      <span className="text-slate-400">{lb.used} used / {lb.allowed} allowed</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (lb.used / max(1, lb.allowed)) * 100)}%`, backgroundColor: lb.color || '#3b82f6' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ATTENDANCE ANALYTICS ── */}
      {activeTab === "attendance" && (
        <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white">Attendance & Punctuality Analytics</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Attendance %</p>
              <h4 className="text-2xl font-black text-emerald-400 mt-1">{attendance.attendance_percentage}%</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Present Days</p>
              <h4 className="text-2xl font-black text-indigo-400 mt-1">{attendance.present_days}</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Late Days</p>
              <h4 className="text-2xl font-black text-amber-400 mt-1">{attendance.late_days}</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Absent Days</p>
              <h4 className="text-2xl font-black text-rose-400 mt-1">{attendance.absent_days}</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">On-Duty Days</p>
              <h4 className="text-2xl font-black text-sky-400 mt-1">{attendance.on_duty_days}</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Avg Punch In</p>
              <h4 className="text-base font-bold text-slate-200 mt-2">{attendance.avg_punch_in}</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Avg Late Mins</p>
              <h4 className="text-base font-bold text-amber-300 mt-2">{attendance.avg_late_minutes} min</h4>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <h4 className="text-sm font-bold text-slate-300 mb-3">Daily Attendance Logs</h4>
            {attendance.timeline && attendance.timeline.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800 text-slate-400 font-bold uppercase">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Punch In</th>
                      <th className="p-2.5">Punch Out</th>
                      <th className="p-2.5">Late Minutes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {attendance.timeline.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-medium">{row.date}</td>
                        <td className="p-2.5 font-bold uppercase text-indigo-400">{row.status}</td>
                        <td className="p-2.5">{row.punch_in !== 'N/A' ? row.punch_in : 'Insufficient attendance data'}</td>
                        <td className="p-2.5">{row.punch_out !== 'N/A' ? row.punch_out : 'Insufficient attendance data'}</td>
                        <td className="p-2.5 font-semibold text-amber-400">{row.late_minutes} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 italic text-xs">Insufficient attendance data available for selected period.</p>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: LEAVE ANALYTICS ── */}
      {activeTab === "leave" && (
        <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white">Leave Analytics & Balances</h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Total Applications</p>
              <h4 className="text-2xl font-black text-white mt-1">{leave.total_applications}</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Approved Leaves</p>
              <h4 className="text-2xl font-black text-emerald-400 mt-1">{leave.approved}</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Pending Review</p>
              <h4 className="text-2xl font-black text-amber-400 mt-1">{leave.pending}</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Rejected</p>
              <h4 className="text-2xl font-black text-rose-400 mt-1">{leave.rejected}</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Utilization %</p>
              <h4 className="text-2xl font-black text-purple-400 mt-1">{leave.utilization_percentage}%</h4>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <h4 className="text-sm font-bold text-slate-300 mb-3">Academic Year Leave Balances</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-400 font-bold uppercase">
                  <tr>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Leave Type</th>
                    <th className="p-2.5">Allowed</th>
                    <th className="p-2.5">Used</th>
                    <th className="p-2.5">Pending</th>
                    <th className="p-2.5">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {leave.breakdown && leave.breakdown.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-indigo-400">{row.code}</td>
                      <td className="p-2.5 font-semibold">{row.name}</td>
                      <td className="p-2.5">{row.allowed}</td>
                      <td className="p-2.5 text-amber-400 font-semibold">{row.used}</td>
                      <td className="p-2.5 text-purple-400">{row.pending}</td>
                      <td className="p-2.5 text-emerald-400 font-bold">{row.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: TEACHING & TIMETABLE ANALYTICS ── */}
      {activeTab === "teaching" && (
        <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white">Teaching & Timetable Analytics</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Scheduled Workload</p>
              <h4 className="text-2xl font-black text-indigo-400 mt-1">{teaching.scheduled_workload} periods</h4>
              <p className="text-[11px] text-slate-400 mt-1">Official timetable</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Classes Completed</p>
              <h4 className="text-2xl font-black text-emerald-400 mt-1">{teaching.classes_completed} periods</h4>
              <p className="text-[11px] text-slate-400 mt-1">Actual attendance verified</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Free Periods</p>
              <h4 className="text-2xl font-black text-sky-400 mt-1">{teaching.free_periods}</h4>
              <p className="text-[11px] text-slate-400 mt-1">Available buffer</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Proxy Classes Handled</p>
              <h4 className="text-2xl font-black text-amber-400 mt-1">{teaching.proxy_classes}</h4>
              <p className="text-[11px] text-slate-400 mt-1">Substitution support</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: SUBSTITUTION ANALYTICS ── */}
      {activeTab === "substitutions" && (
        <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white">Substitution Operational Analytics</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Substitutions Provided</p>
              <h4 className="text-2xl font-black text-emerald-400 mt-1">{substitution.provided}</h4>
              <p className="text-[11px] text-slate-400 mt-1">Classes covered for colleagues</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Substitutions Received</p>
              <h4 className="text-2xl font-black text-indigo-400 mt-1">{substitution.received}</h4>
              <p className="text-[11px] text-slate-400 mt-1">Classes handed to proxy</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Completed Proxy Slots</p>
              <h4 className="text-2xl font-black text-sky-400 mt-1">{substitution.completed}</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Declined Assignments</p>
              <h4 className="text-2xl font-black text-rose-400 mt-1">{substitution.declined}</h4>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: WORKLOAD ANALYTICS ── */}
      {activeTab === "workload" && (
        <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white">Teaching Workload Analytics</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-xs uppercase font-bold text-slate-400">Weekly Teaching Load</p>
              <h4 className="text-3xl font-black text-indigo-400 mt-2">{workload.weekly_periods} <span className="text-sm font-normal text-slate-400">periods/wk</span></h4>
              <div className="mt-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getWorkloadBadge(workload.classification)}`}>
                  Workload Status: {workload.classification}
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-xs uppercase font-bold text-slate-400">Institutional Thresholds</p>
              <div className="mt-3 space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Low Load Threshold:</span>
                  <strong className="text-sky-300">&lt; {workload.low_threshold} periods/wk</strong>
                </div>
                <div className="flex justify-between">
                  <span>High Load Threshold:</span>
                  <strong className="text-amber-300">&gt; {workload.high_threshold} periods/wk</strong>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-xs uppercase font-bold text-slate-400">Schedule Distribution</p>
              <div className="mt-3 space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Max Consecutive Periods:</span>
                  <strong className="text-slate-200">{workload.consecutive_periods_max}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Peak Workload Day:</span>
                  <strong className="text-indigo-300">{workload.peak_day}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 7: TIMELINE ── */}
      {activeTab === "timeline" && (
        <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white">Chronological Operational Activity Timeline</h3>
          {timeline && timeline.length > 0 ? (
            <div className="relative border-l-2 border-slate-700 ml-4 pl-6 space-y-6">
              {timeline.map((item, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-slate-900" />
                  <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">{item.date}</p>
                  <h4 className="text-sm font-bold text-slate-200 mt-0.5">{item.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{item.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm italic">No recent timeline activity logged for this period.</p>
          )}
        </div>
      )}
    </div>
  );
}
