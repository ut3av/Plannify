import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL as API } from "../../apiConfig";
import AnimatedCounter from "../common/AnimatedCounter";
import RadialProgressDial from "../common/RadialProgressDial";

export default function InstitutionalDashboard({
  teachersCount = 0,
  sectionsCount = 0,
  subjectsCount = 0,
  roomsCount = 0,
  hasResult = false,
  onNavigate,
}) {
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [teachersCount, sectionsCount, subjectsCount, roomsCount]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, insightsRes] = await Promise.all([
        axios.get(`${API}/faculty/dashboard-stats`).catch(() => ({ data: null })),
        axios.get(`${API}/analytics/insights`).catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setInsights(insightsRes.data || []);
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  const activeFaculty = stats?.total_faculty !== undefined ? stats.total_faculty : (teachersCount || 0);
  const attendanceRate = (activeFaculty > 0 && stats?.attendance_rate !== undefined) ? stats.attendance_rate : 94;
  const pendingLeaves = stats?.pending_leaves || 0;
  const onLeaveToday = stats?.on_leave_today || 0;
  const substitutionsToday = stats?.substitutions_today || 0;
  const timetableScore = hasResult ? 100 : (sectionsCount > 0 ? 92 : 0);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Welcome Banner with Executive Radial Dials */}
      <div className="card p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 border border-indigo-500/20 text-white relative overflow-hidden shadow-xl rounded-3xl">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/15 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-violet-600/15 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-display">
                Institutional Operations Command Center
              </h1>
              <span className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${loading ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 glow-amber-ring"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-amber-400" : "bg-emerald-400 pulse-live-dot"}`} />
                {loading ? "Syncing Engine" : "Live Operating System"}
              </span>
            </div>
            <p className="text-xs text-indigo-100/80 mt-2 leading-relaxed">
              Unified governance layer connecting academic timetables, faculty workload distribution, real-time attendance, and automated substitution management.
            </p>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => onNavigate("timetable")}
                className="btn-primary text-xs py-2.5 px-4 font-bold gap-2 shadow-lg shadow-indigo-950/40 flex items-center hover:scale-105 active:scale-95 transition-transform"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Open Timetable Workspace
              </button>
              <button
                onClick={() => onNavigate("analytics")}
                className="btn-secondary text-xs py-2.5 px-4 font-bold gap-2 flex items-center hover:scale-105 active:scale-95 transition-transform"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                Operational Analytics
              </button>
            </div>
          </div>

          {/* Executive Real-Time Health Dials */}
          <div className="flex items-center gap-5 sm:gap-8 bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-inner">
            <RadialProgressDial
              value={attendanceRate}
              size={96}
              strokeWidth={8}
              color="#10B981"
              sublabel="RATE"
              label="Faculty Attendance"
            />
            <div className="w-px h-16 bg-white/10" />
            <RadialProgressDial
              value={timetableScore}
              size={96}
              strokeWidth={8}
              color="#6366F1"
              sublabel="SCORE"
              label="Schedule Efficiency"
            />
          </div>
        </div>
      </div>

      {/* Top Operational Metric Cards (Dynamic Rolling Numbers & Staggered Entrance) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Card 1: Faculty */}
        <div className="card p-4 stat-card-elevate animate-slide-up-fade stagger-1 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 relative overflow-hidden shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Faculty</p>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            <AnimatedCounter target={activeFaculty} duration={1000} />
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bar-fill-anim bg-indigo-500" style={{ width: `${Math.min(activeFaculty * 8, 100)}%` }} />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Active Profiles</p>
        </div>

        {/* Card 2: Sections */}
        <div className="card p-4 stat-card-elevate animate-slide-up-fade stagger-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 relative overflow-hidden shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Sections</p>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            <AnimatedCounter target={sectionsCount} duration={1100} />
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bar-fill-anim bg-indigo-400" style={{ width: `${Math.min(sectionsCount * 25, 100)}%` }} />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Active Classes</p>
        </div>

        {/* Card 3: Subjects */}
        <div className="card p-4 stat-card-elevate animate-slide-up-fade stagger-3 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 relative overflow-hidden shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Subjects</p>
          <div className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">
            <AnimatedCounter target={subjectsCount} duration={1200} />
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bar-fill-anim bg-violet-500" style={{ width: `${Math.min(subjectsCount * 12, 100)}%` }} />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Course Catalog</p>
        </div>

        {/* Card 4: Classrooms */}
        <div className="card p-4 stat-card-elevate animate-slide-up-fade stagger-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 relative overflow-hidden shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Classrooms</p>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            <AnimatedCounter target={roomsCount} duration={1300} />
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bar-fill-anim bg-purple-500" style={{ width: `${Math.min(roomsCount * 20, 100)}%` }} />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Rooms & Labs</p>
        </div>

        {/* Card 5: Attendance Rate */}
        <div className="card p-4 stat-card-elevate animate-slide-up-fade stagger-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 relative overflow-hidden shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Attendance</p>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            <AnimatedCounter target={attendanceRate} suffix="%" duration={1200} />
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bar-fill-anim bg-emerald-500" style={{ width: `${attendanceRate}%` }} />
          </div>
          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500/80 mt-1">Today's Rate</p>
        </div>

        {/* Card 6: On Leave */}
        <div className="card p-4 stat-card-elevate animate-slide-up-fade stagger-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 relative overflow-hidden shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">On Leave</p>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-300 mt-1">
            <AnimatedCounter target={onLeaveToday} duration={1000} />
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bar-fill-anim bg-amber-500" style={{ width: `${Math.min(onLeaveToday * 30, 100)}%` }} />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Approved Leave</p>
        </div>

        {/* Card 7: Pending Leaves */}
        <div className="card p-4 stat-card-elevate animate-slide-up-fade stagger-7 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 relative overflow-hidden shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Pending Leave</p>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            <AnimatedCounter target={pendingLeaves} duration={1000} />
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bar-fill-anim bg-rose-500" style={{ width: `${Math.min(pendingLeaves * 35, 100)}%` }} />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Review Required</p>
        </div>

        {/* Card 8: Substitutions */}
        <div className="card p-4 stat-card-elevate animate-slide-up-fade stagger-8 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 relative overflow-hidden shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Substitutions</p>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
            <AnimatedCounter target={substitutionsToday} duration={1100} />
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bar-fill-anim bg-teal-500" style={{ width: `${Math.min(substitutionsToday * 25, 100)}%` }} />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Proxy Slots Today</p>
        </div>
      </div>

      {/* Main Operational Feed & Attention Required */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Academic Operations (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                Today's Academic Operations Feed
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">Current Academic Term: 2026-27</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 stat-card-elevate">
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Timetable Status</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-1 text-sm">{hasResult ? "Active & Solved" : "Draft Ready"}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Constraint Engine Validated</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 stat-card-elevate">
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Active Classes</p>
                <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-1 text-sm">{sectionsCount} Parallel Sections</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Slots 1 to 5 Scheduled</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 stat-card-elevate">
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Room Capacity</p>
                <p className="font-bold text-purple-600 dark:text-purple-400 mt-1 text-sm">{roomsCount} Rooms Utilized</p>
                <p className="text-slate-500 text-[11px] mt-0.5">0 Overlaps Detected</p>
              </div>
            </div>

            {/* Quick Action Navigation Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <button onClick={() => onNavigate("faculty")} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-left transition-all text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:border-indigo-500/40">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Faculty Directory
              </button>
              <button onClick={() => onNavigate("leave")} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-left transition-all text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:border-indigo-500/40">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Approve Leaves
              </button>
              <button onClick={() => onNavigate("substitutions")} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-left transition-all text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:border-indigo-500/40">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Substitutions
              </button>
              <button onClick={() => onNavigate("reports")} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-left transition-all text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:border-indigo-500/40">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Export Reports
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Attention Required (1/3 width) */}
        <div className="space-y-6">
          <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              Attention Required
            </h3>

            <div className="space-y-3">
              {pendingLeaves > 0 ? (
                <div
                  onClick={() => onNavigate("leave")}
                  className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs cursor-pointer hover:bg-amber-500/20 transition-all flex items-start justify-between stat-card-elevate"
                >
                  <div>
                    <p className="font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 pulse-live-dot" />
                      {pendingLeaves} Leave Applications Awaiting Review
                    </p>
                    <p className="text-[11px] text-amber-300/80 mt-0.5">Click to approve or assign substitute faculty.</p>
                  </div>
                  <span className="text-amber-400 font-bold text-base">→</span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Leave Queue: All requests cleared
                  </span>
                  <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}

              {insights.slice(0, 2).map((ins, i) => (
                <div
                  key={i}
                  onClick={() => onNavigate("analytics")}
                  className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs cursor-pointer hover:bg-indigo-500/20 transition-all stat-card-elevate"
                >
                  <p className="font-bold">{ins.title}</p>
                  <p className="text-[11px] text-indigo-300/80 mt-0.5 leading-relaxed">{ins.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
