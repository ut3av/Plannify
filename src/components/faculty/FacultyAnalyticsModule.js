import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import FacultyAnalyticsProfile from './FacultyAnalyticsProfile';
import AIAnalyticsAssistantModal from './AIAnalyticsAssistantModal';
import AnimatedCounter from '../common/AnimatedCounter';

import { API_BASE_URL as API } from "../../apiConfig";

export default function FacultyAnalyticsModule({ initialFacultyId, onBackToSystem }) {
  // 1. Time Period State
  const [rangeKey, setRangeKey] = useState("30d"); // 7d | 30d | 90d | year | custom
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // 2. Active Tab & Selections
  const [activeTab, setActiveTab] = useState(initialFacultyId ? "profile" : "dashboard"); // dashboard | directory | departments | ai | profile
  const [selectedFacultyId, setSelectedFacultyId] = useState(initialFacultyId || null);

  // 3. Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [directoryData, setDirectoryData] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  // 4. Directory Filters & Sorting
  const [search, setSearch] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [attMin, setAttMin] = useState("");
  const [sortBy, setSortBy] = useState("teacher_name");
  const [sortOrder, setSortOrder] = useState("asc");

  // 5. Threshold Configuration Modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({ low_threshold: 12, high_threshold: 18 });

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const params = { range_key: rangeKey };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await axios.get(`${API}/analytics/dashboard`, { params });
      setDashboardData(res.data);
    } catch (e) {
      console.error("Failed to load dashboard KPIs:", e);
    } finally {
      setLoading(false);
    }
  }, [rangeKey, startDate, endDate]);

  const fetchDirectory = useCallback(async () => {
    try {
      const params = {
        range_key: rangeKey,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (filterDesignation) params.designation = filterDesignation;
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;
      if (attMin) params.att_min = attMin;

      const res = await axios.get(`${API}/analytics/faculty`, { params });
      setDirectoryData(res.data || []);
    } catch (e) {
      console.error("Failed to load faculty directory analytics:", e);
    }
  }, [rangeKey, startDate, endDate, sortBy, sortOrder, filterDesignation, filterStatus, search, attMin]);

  const fetchInsights = useCallback(async () => {
    try {
      const params = { range_key: rangeKey };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await axios.get(`${API}/analytics/insights`, { params });
      setInsights(res.data || []);
    } catch (e) {
      console.error("Failed to load insights:", e);
    }
  }, [rangeKey, startDate, endDate]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/analytics/config`);
      if (res.data) setConfigForm(res.data);
    } catch (e) {
      console.error("Failed to load config:", e);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchInsights();
    fetchConfig();
  }, [fetchDashboard, fetchInsights, fetchConfig]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/analytics/config`, configForm);
      setShowConfigModal(false);
      fetchDashboard();
      fetchDirectory();
    } catch (e) {
      alert("Failed to update workload threshold configuration");
    }
  };

  const handleExport = () => {
    window.open(`${API}/analytics/export?range=${rangeKey}&format=csv`, '_blank');
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* ── HEADER & RANGE CONTROLS ── */}
      <div className="card p-6 bg-slate-900 border border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Faculty Workload & Operational Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              ERP 360°
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-dimensional tracking: attendance rates, lecture workloads, substitution burdens, and proxy hours.
          </p>
        </div>

        {/* Global Range & Action Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs">
            {[
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "90d", label: "90 Days" },
              { id: "year", label: "Academic Year" },
              { id: "custom", label: "Custom" },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setRangeKey(item.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  rangeKey === item.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {rangeKey === "custom" && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
          )}

          <button onClick={handleExport} className="btn-secondary text-xs py-2 px-3 gap-2 flex items-center">
            <svg className="w-3.5 h-3.5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Report
          </button>

          <button onClick={() => setShowConfigModal(true)} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-all text-xs flex items-center gap-1.5" title="Workload Threshold Settings">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Thresholds
          </button>
        </div>
      </div>

      {/* SELECTED PERIOD BADGE */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <span className="font-bold text-indigo-300 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {dashboardData?.time_period?.formatted || "Analytics Period Loading..."}
        </span>
        <span className="text-slate-400 text-[11px]">
          Derived deterministically from Supabase Attendance, Leave, & Substitution logs.
        </span>
      </div>

      {/* ── TOP KPI CARDS (DASHBOARD) ── */}
      {dashboardData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {Object.entries(dashboardData.kpis).map(([key, kpi], idx) => (
            <div
              key={key}
              className={`p-4 rounded-2xl bg-slate-900/90 border border-slate-800 stat-card-elevate animate-slide-up-fade stagger-${(idx % 8) + 1} group relative`}
            >
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">{kpi.title}</p>
              <h3 className="text-xl font-black text-white mt-1">
                <AnimatedCounter target={kpi.value} duration={1000} />
              </h3>

              {kpi.trend && (
                <p className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${
                  kpi.trend.direction === 'up' ? 'text-emerald-400' : (kpi.trend.direction === 'down' ? 'text-rose-400' : 'text-slate-400')
                }`}>
                  <span>{kpi.trend.direction === 'up' ? '↑' : (kpi.trend.direction === 'down' ? '↓' : '•')}</span>
                  <span>{kpi.trend.text}</span>
                </p>
              )}

              {/* Tooltip */}
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20 w-48 p-2 rounded-lg bg-slate-950 text-[10px] text-slate-300 border border-slate-700 shadow-xl pointer-events-none">
                {kpi.tooltip}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODULE SUB-NAVIGATION TABS ── */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "dashboard"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          Institutional Dashboard
        </button>

        <button
          onClick={() => setActiveTab("directory")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "directory"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          Faculty Directory Analytics ({directoryData.length})
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "ai"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
              : "text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20"
          }`}
        >
          AI Analytics Assistant
        </button>

        {selectedFacultyId && (
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "profile"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            Individual Faculty Profile
          </button>
        )}
      </div>

      {/* ── TAB 1: INSTITUTIONAL DASHBOARD & EARLY WARNING INSIGHTS ── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Rule-Based Early Warning Insights */}
          <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Deterministic Early Warning Operational Insights
              </h3>
              <span className="text-xs text-slate-400">{insights.length} operational signals detected</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((item) => (
                <div key={item.id} className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  item.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-200' :
                  (item.severity === 'info' ? 'bg-blue-100 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30 text-blue-900 dark:text-blue-200' : 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200')
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span>{item.title}</span>
                    <span className="uppercase text-[9px] px-2 py-0.5 rounded bg-black/30">{item.type}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{item.message}</p>
                  <p className="text-[11px] font-semibold text-slate-400 italic">Action Plan: {item.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: FACULTY DIRECTORY ANALYTICS TABLE ── */}
      {activeTab === "directory" && (
        <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white">Searchable Faculty Directory Analytics</h2>

            {/* Table Search & Filters */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search faculty name or ID..."
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              <select
                value={filterDesignation}
                onChange={(e) => setFilterDesignation(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="">All Designations</option>
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Lecturer">Lecturer</option>
              </select>

              <select
                value={attMin}
                onChange={(e) => setAttMin(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="">Any Attendance</option>
                <option value="90">≥ 90% Attendance</option>
                <option value="80">≥ 80% Attendance</option>
                <option value="75">≥ 75% Attendance</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="on-leave">On Leave</option>
                <option value="resigned">Resigned</option>
              </select>

              {loading && (
                <span className="text-[11px] text-amber-400 font-semibold animate-pulse">
                  Syncing...
                </span>
              )}
            </div>
          </div>

          {/* Analytics Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th onClick={() => handleSort("teacher_name")} className="p-3 cursor-pointer hover:text-white">Faculty Name {sortBy === 'teacher_name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => handleSort("employee_id")} className="p-3 cursor-pointer hover:text-white">ID</th>
                  <th onClick={() => handleSort("attendance_percentage")} className="p-3 cursor-pointer hover:text-white">Attendance % {sortBy === 'attendance_percentage' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => handleSort("present_days")} className="p-3 cursor-pointer hover:text-white">Present</th>
                  <th onClick={() => handleSort("late_days")} className="p-3 cursor-pointer hover:text-white">Late</th>
                  <th onClick={() => handleSort("leave_days")} className="p-3 cursor-pointer hover:text-white">Leaves</th>
                  <th onClick={() => handleSort("classes_conducted")} className="p-3 cursor-pointer hover:text-white">Classes</th>
                  <th onClick={() => handleSort("substitutions_provided")} className="p-3 cursor-pointer hover:text-white">Subs Prov</th>
                  <th onClick={() => handleSort("weekly_workload")} className="p-3 cursor-pointer hover:text-white">Weekly Load {sortBy === 'weekly_workload' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {directoryData.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-white">
                      <div>{f.teacher_name}</div>
                      <div className="text-[10px] text-slate-500">{f.designation}</div>
                    </td>
                    <td className="p-3 text-slate-400 font-mono">{f.employee_id}</td>
                    <td className="p-3 font-bold text-emerald-400">{f.attendance_percentage}%</td>
                    <td className="p-3 text-indigo-300 font-semibold">{f.present_days}</td>
                    <td className="p-3 text-amber-700 dark:text-amber-400">{f.late_days}</td>
                    <td className="p-3 text-purple-800 dark:text-purple-300">{f.leave_days}</td>
                    <td className="p-3">{f.classes_conducted}</td>
                    <td className="p-3">{f.substitutions_provided}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        f.workload_status === 'High' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {f.weekly_workload} p/wk ({f.workload_status})
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => { setSelectedFacultyId(f.id); setActiveTab("profile"); }}
                        className="px-2.5 py-1 rounded bg-amber-100 dark:bg-indigo-600/30 hover:bg-amber-600 dark:hover:bg-indigo-600 border border-amber-300 dark:border-indigo-500/40 text-amber-800 dark:text-indigo-200 hover:text-white text-[11px] font-bold transition-all"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ── TAB 4: AI ANALYTICS ASSISTANT ── */}
      {activeTab === "ai" && (
        <AIAnalyticsAssistantModal
          rangeKey={rangeKey}
          onClose={() => setActiveTab("dashboard")}
        />
      )}

      {/* ── TAB 5: INDIVIDUAL FACULTY PROFILE ANALYTICS ── */}
      {activeTab === "profile" && selectedFacultyId && (
        <FacultyAnalyticsProfile
          facultyId={selectedFacultyId}
          rangeKey={rangeKey}
          startDate={startDate}
          endDate={endDate}
          onBack={() => setActiveTab("directory")}
        />
      )}

      {/* ── WORKLOAD CONFIGURATION MODAL ── */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card p-6 bg-slate-900 border border-slate-700 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Institutional Workload Threshold Settings</h3>
            <p className="text-xs text-slate-400">
              Configure parameters for Low, Moderate, and High teaching workload classifications.
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Low Workload Upper Threshold (periods/week)</label>
                <input
                  type="number"
                  value={configForm.low_threshold}
                  onChange={(e) => setConfigForm({...configForm, low_threshold: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">High Workload Lower Threshold (periods/week)</label>
                <input
                  type="number"
                  value={configForm.high_threshold}
                  onChange={(e) => setConfigForm({...configForm, high_threshold: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowConfigModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
