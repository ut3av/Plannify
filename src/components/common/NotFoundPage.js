import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useAcademic } from '../../context/AcademicContext';

export default function NotFoundPage() {
  const navigate = useNavigate();
  
  let theme = 'light';
  let toggleTheme = () => {};
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const academic = useAcademic();
    if (academic) {
      theme = academic.theme || 'light';
      toggleTheme = academic.toggleTheme || (() => {});
    }
  } catch {
    // Fallback if rendered standalone
  }

  const isDark = theme === 'dark';

  const QUICK_LINKS = [
    {
      to: "/dashboard",
      title: "Institutional Dashboard",
      desc: "Live signals, metrics & operations overview",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      color: "amber",
      badge: "Core"
    },
    {
      to: "/timetable",
      title: "Timetable Workspace",
      desc: "OR-Tools solver engine & weekly schedule matrix",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      color: "indigo",
      badge: "AI Solver"
    },
    {
      to: "/faculty",
      title: "Faculty Directory",
      desc: "Teacher profiles, workloads & credentials",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      color: "emerald",
      badge: "Directory"
    },
    {
      to: "/academic/rooms",
      title: "Classrooms & Labs",
      desc: "Smart theory venues, laboratories & capacity matrix",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <path d="M9 22v-4h6v4" />
        </svg>
      ),
      color: "teal",
      badge: "Venues"
    },
    {
      to: "/leave",
      title: "Leave & Proxy Management",
      desc: "1-Click substitution match & faculty leave feed",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      color: "rose",
      badge: "Real-Time"
    },
    {
      to: "/reports",
      title: "Reports & Compliance",
      desc: "NAAC/NBA print-ready PDFs & Excel spreadsheets",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      color: "purple",
      badge: "Export"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden selection:bg-purple-500 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[750px] h-[500px] bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-amber-500/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 right-10 w-[500px] h-[500px] bg-purple-600/5 dark:bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* TOP FULL-WIDTH NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <BrandLogo size="md" isWarm={false} />
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => navigate("/dashboard")}
              className="btn-primary text-xs py-2 px-3.5 font-bold flex items-center gap-1.5 shadow-md shadow-purple-500/15 hover:scale-105 active:scale-95 transition-transform"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN FULL-PAGE 404 CONTENT HERO */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex flex-col justify-center items-center text-center relative z-10">
        
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-bold tracking-wide mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>HTTP 404 · Unresolved Academic Route</span>
        </div>

        {/* Big Giant 404 Headline */}
        <h1 className="text-8xl sm:text-9xl font-black font-brand tracking-tighter leading-none bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 dark:from-purple-400 dark:via-indigo-300 dark:to-pink-400 bg-clip-text text-transparent select-none drop-shadow-sm">
          404
        </h1>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-4 font-display">
          Academic Route Not Found
        </h2>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-2 leading-relaxed font-normal">
          The view or operational module you are navigating to does not exist in the routing table, was moved, or requires specific portal authorization.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mt-6">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <span>← Go Back Previous</span>
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/25 hover:scale-105 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Return to Dashboard</span>
          </button>
        </div>

        {/* DIRECTORY EXPLORATION MATRIX */}
        <div className="w-full mt-12 pt-8 border-t border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Quick Navigation Matrix
            </span>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
              Select an active academic hub
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-left">
            {QUICK_LINKS.map((link, idx) => (
              <Link
                key={idx}
                to={link.to}
                className="group p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-purple-500/40 hover:shadow-lg dark:hover:shadow-purple-500/5 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                    {link.icon}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {link.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {link.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </main>

      {/* FULL-WIDTH FOOTER */}
      <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white font-brand">Plannify<span className="text-purple-600 dark:text-purple-400">.exe</span></span>
            <span>· Academic Operations Platform 2026</span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Dashboard</Link>
            <Link to="/timetable" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Timetable</Link>
            <Link to="/faculty" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Faculty</Link>
            <Link to="/reports" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Reports</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
