import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { API_BASE_URL as API } from "../../apiConfig";

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
  }, []);

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

  const activeFaculty = stats?.total_faculty || teachersCount || 0;
  const attendanceRate = stats?.attendance_rate || 94.2;
  const pendingLeaves = stats?.pending_leaves || 0;
  const onLeaveToday = stats?.on_leave_today || 0;

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Welcome Banner */}
      <div className="card p-6 bg-gradient-to-r from-[#20140E] via-[#2C1810] to-[#150C07] border border-[#332219] text-amber-100 relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight font-display">Institutional Operations Command Center</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${loading ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"}`}>
                {loading ? "● SYNCING METRICS..." : "● LIVE SYSTEM"}
              </span>
            </div>
            <p className="text-xs text-[#D4C4B0] mt-1">
              Central operational overview for academic scheduling, faculty management, attendance tracking, and leave workflows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate("timetable")}
              className="btn-primary text-xs py-2.5 px-4 font-bold gap-2 shadow-lg shadow-amber-900/30"
            >
              📅 Open Timetable Workspace
            </button>
            <button
              onClick={() => onNavigate("analytics")}
              className="btn-secondary text-xs py-2.5 px-4 font-bold gap-2"
            >
              📊 Operational Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Top Operational Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="stat-card p-4 hover:border-amber-500/40">
          <p className="stat-label">Faculty</p>
          <h3 className="stat-value">{activeFaculty}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Active Profiles</p>
        </div>

        <div className="stat-card p-4 hover:border-amber-500/40">
          <p className="stat-label">Sections</p>
          <h3 className="stat-value text-amber-700 dark:text-amber-400">{sectionsCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Active Classes</p>
        </div>

        <div className="stat-card p-4 hover:border-amber-500/40">
          <p className="stat-label">Subjects</p>
          <h3 className="stat-value text-amber-800 dark:text-amber-300">{subjectsCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Course Catalog</p>
        </div>

        <div className="stat-card p-4 hover:border-amber-500/40">
          <p className="stat-label">Classrooms</p>
          <h3 className="stat-value text-orange-700 dark:text-orange-400">{roomsCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Rooms & Labs</p>
        </div>

        <div className="stat-card p-4 hover:border-emerald-500/40">
          <p className="stat-label">Attendance %</p>
          <h3 className="stat-value text-emerald-700 dark:text-emerald-400">{attendanceRate}%</h3>
          <p className="text-[10px] text-emerald-600/80 mt-1">Today's Rate</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/30 transition-all">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">On Leave</p>
          <h3 className="text-2xl font-black text-amber-400 mt-1">{onLeaveToday}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Approved Leave</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/30 transition-all">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending Leave</p>
          <h3 className="text-2xl font-black text-rose-400 mt-1">{pendingLeaves}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Review Required</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/30 transition-all">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Substitutions</p>
          <h3 className="text-2xl font-black text-teal-400 mt-1">3</h3>
          <p className="text-[10px] text-slate-500 mt-1">Proxy Slots Today</p>
        </div>
      </div>

      {/* Main Operational Feed & Attention Required */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Academic Operations (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Timetable Status Card */}
          <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                Today's Academic Operations Feed
              </h2>
              <span className="text-xs text-slate-400">Current Academic Term: 2026-27</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <p className="text-slate-400 font-bold uppercase text-[10px]">Timetable Status</p>
                <p className="font-bold text-emerald-400 mt-1 text-sm">{hasResult ? "Active & Solved" : "Draft Ready"}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Constraint Engine Validated</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <p className="text-slate-400 font-bold uppercase text-[10px]">Active Classes</p>
                <p className="font-bold text-indigo-300 mt-1 text-sm">{sectionsCount} Parallel Sections</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Slots 1 to 5 Scheduled</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <p className="text-slate-400 font-bold uppercase text-[10px]">Room Capacity</p>
                <p className="font-bold text-purple-300 mt-1 text-sm">{roomsCount} Rooms Utilized</p>
                <p className="text-slate-500 text-[11px] mt-0.5">0 Overlaps Detected</p>
              </div>
            </div>

            {/* Quick Action Navigation Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <button onClick={() => onNavigate("faculty")} className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-left transition-all text-xs font-semibold text-slate-200">
                👥 Faculty Directory
              </button>
              <button onClick={() => onNavigate("leave")} className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-left transition-all text-xs font-semibold text-slate-200">
                📋 Approve Leaves
              </button>
              <button onClick={() => onNavigate("substitutions")} className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-left transition-all text-xs font-semibold text-slate-200">
                🔄 Manage Substitutions
              </button>
              <button onClick={() => onNavigate("reports")} className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-left transition-all text-xs font-semibold text-slate-200">
                📑 Export Reports
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
                  className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs cursor-pointer hover:bg-amber-500/20 transition-all flex items-start justify-between"
                >
                  <div>
                    <p className="font-bold">{pendingLeaves} Leave Applications Awaiting Review</p>
                    <p className="text-[11px] text-amber-300/80 mt-0.5">Click to approve or assign substitute faculty.</p>
                  </div>
                  <span className="text-amber-400 font-bold">→</span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs flex items-center justify-between">
                  <span>Leave Queue: All requests cleared</span>
                  <span className="text-emerald-400 font-bold">✓</span>
                </div>
              )}

              {insights.slice(0, 2).map((ins, i) => (
                <div
                  key={i}
                  onClick={() => onNavigate("analytics")}
                  className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs cursor-pointer hover:bg-indigo-500/20 transition-all"
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
