import React, { useState } from 'react';

import { API_BASE_URL as API } from "../../apiConfig";

export default function ReportsCenter() {
  const [rangeKey, setRangeKey] = useState("30d");
  const [formatType, setFormatType] = useState("excel");

  const reportsList = [
    { id: "faculty_summary", name: "Faculty Master Operational Report", desc: "Comprehensive summary of attendance %, present days, late count, leave utilization, and workload classification.", category: "Faculty" },
    { id: "attendance_report", name: "Institutional Attendance Log", desc: "Detailed punch-in, punch-out, and late minutes log across faculty members.", category: "Attendance" },
    { id: "leave_report", name: "Leave Utilization & Balances Report", desc: "CL, EL, ML, COMP, and OD usage, pending applications, and remaining balances.", category: "Leave" },
    { id: "substitution_report", name: "Substitution & Proxy Operational Report", desc: "Proxy classes provided, received, completed, and declined with date patterns.", category: "Substitutions" },
    { id: "workload_report", name: "Faculty Teaching Workload Distribution", desc: "Weekly teaching load, threshold breaches, free periods, and peak day load.", category: "Workload" },
    { id: "timetable_report", name: "Master Institutional Timetable Schedule", desc: "Grid of all section assignments, subject allocations, and classroom usage.", category: "Timetable" },
  ];

  const handleDownload = (rType) => {
    const targetType = rType || "faculty_summary";
    window.open(`${API}/analytics/export?report_type=${targetType}&range_key=${rangeKey}&format_type=${formatType}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Header */}
      <div className="card p-6 bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Centralized Reports Hub</h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate and export university-grade Excel (.xlsx) and CSV reports for administrative compliance and auditing.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <select
            value={rangeKey}
            onChange={(e) => setRangeKey(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days (Default)</option>
            <option value="90d">Last 90 Days</option>
            <option value="year">Current Academic Year</option>
          </select>

          <select
            value={formatType}
            onChange={(e) => setFormatType(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold"
          >
            <option value="excel">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportsList.map((rep) => (
          <div key={rep.id} className="card p-5 bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {rep.category}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Format: XLSX / CSV</span>
              </div>
              <h3 className="font-bold text-white text-base mt-2">{rep.name}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{rep.desc}</p>
            </div>

            <button
              onClick={() => handleDownload(rep.id)}
              className="btn-primary w-full text-xs py-2.5 font-bold gap-2 justify-center shadow-lg shadow-indigo-500/10"
            >
              📥 Download {formatType.toUpperCase()} Report
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
