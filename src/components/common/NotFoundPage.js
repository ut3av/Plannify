import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#1a0f0a] to-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 relative overflow-hidden animate-fade-in">
      {/* Ambient background glow effects */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-600/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-xl w-full text-center space-y-8">
        {/* Brand Header */}
        <div className="flex items-center justify-center">
          <BrandLogo size="lg" isWarm={false} />
        </div>

        {/* 404 Visual Canvas */}
        <div className="card p-8 sm:p-10 bg-slate-900/90 border border-slate-800 backdrop-blur-2xl shadow-2xl rounded-3xl relative">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-inner">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          </div>

          <h1 className="text-7xl sm:text-8xl font-black font-display tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">
            404
          </h1>

          <h2 className="text-xl sm:text-2xl font-bold text-white mt-3">
            Academic Route Not Found
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            The page or operational view you are looking for does not exist, has been reorganized, or was relocated.
          </p>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 text-left">
            <Link
              to="/dashboard"
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block group-hover:text-amber-300 transition-colors">Institutional Dashboard</span>
                <span className="text-[10px] text-slate-400 truncate block">Overview & Live Signals</span>
              </div>
            </Link>

            <Link
              to="/timetable"
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/40 transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block group-hover:text-indigo-300 transition-colors">Timetable Workspace</span>
                <span className="text-[10px] text-slate-400 truncate block">Solver & Matrix Grid</span>
              </div>
            </Link>

            <Link
              to="/faculty"
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block group-hover:text-emerald-300 transition-colors">Faculty Directory</span>
                <span className="text-[10px] text-slate-400 truncate block">Profiles & Provisioning</span>
              </div>
            </Link>

            <Link
              to="/reports"
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/40 transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block group-hover:text-purple-300 transition-colors">Reports Center</span>
                <span className="text-[10px] text-slate-400 truncate block">Excel & Compliance Export</span>
              </div>
            </Link>
          </div>

          {/* Primary Back Button */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary text-xs py-2.5 px-4 font-bold flex items-center gap-2"
            >
              ← Go Back Previous
            </button>

            <button
              onClick={() => navigate("/dashboard")}
              className="btn-primary text-xs py-2.5 px-5 font-bold flex items-center gap-2 shadow-lg shadow-amber-900/30"
            >
              Return Home
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-slate-500">
          Plannify.exe Enterprise Academic Platform • 2026
        </p>
      </div>
    </div>
  );
}
