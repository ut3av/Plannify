import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../common/BrandLogo';
import AnimatedCounter from '../common/AnimatedCounter';
import RadialProgressDial from '../common/RadialProgressDial';

export default function LandingPage({ onExploreDemo }) {
  const navigate = useNavigate();
  const [activeRoleTab, setActiveRoleTab] = useState('registrar');
  const [openFaq, setOpenFaq] = useState(0);

  const handleLaunchApp = () => {
    navigate('/login');
  };

  const handleDemoClick = () => {
    if (onExploreDemo) {
      onExploreDemo();
    } else {
      navigate('/login');
    }
  };

  const ROLE_SOLUTIONS = {
    registrar: {
      tag: "For Registrars & Schedulers",
      title: "Build a Full Semester Timetable in Seconds, Not Weeks",
      desc: "Stop cross-referencing spreadsheet tabs and hunting for room overlaps at midnight. Let Google OR-Tools AI handle complex constraint satisfaction.",
      highlights: [
        "1-Click automatic constraint solving for all sections and labs simultaneously",
        "Deterministic clash detection: zero room overlaps and zero faculty double-bookings",
        "Configurable constraints: consecutive lecture limits, lab block continuity, and free day rules",
        "Multi-format export: print-ready departmental schedules, CSV, and audit logs"
      ],
      kpi1: { label: "Solve Time", val: "3.2", suffix: "s" },
      kpi2: { label: "Clash Rate", val: "0", suffix: "%" },
      kpi3: { label: "Time Saved", val: "95", suffix: "%" },
      previewTitle: "Registrar Constraint Engine",
      previewBadge: "OR-Tools Active"
    },
    dean: {
      tag: "For Deans & Academic Directors",
      title: "Complete Institutional Oversight & Workload Equity",
      desc: "Maintain governance across departments with real-time faculty load balancing, attendance health analytics, and compliance audit readiness.",
      highlights: [
        "Live Institutional Operations Command Center with real-time health dials",
        "Faculty workload distribution tracking to prevent burnout and contractual overages",
        "Department-level attendance analytics and absentee rate trend graphs",
        "NAAC / NBA / Outcome-Based Education audit-ready timetable and faculty evidence"
      ],
      kpi1: { label: "Faculty Load", val: "100", suffix: "% Balanced" },
      kpi2: { label: "Audit Readiness", val: "100", suffix: "% Ready" },
      kpi3: { label: "Overload Alerts", val: "0", suffix: " Active" },
      previewTitle: "Executive Operations Console",
      previewBadge: "Live 360° Analytics"
    },
    hod: {
      tag: "For Department Heads (HODs)",
      title: "Manage Daily Disruptions & Substitutions with Zero Scramble",
      desc: "When faculty members fall ill or take emergency leave, instantly find qualified, free substitute teachers in two clicks without group texts.",
      highlights: [
        "Real-time leave application feed with 1-click approval or rejection",
        "Automated proxy recommendation engine based on subject qualification and free periods",
        "Instant substitution impact logs showing affected lecture periods and room assignments",
        "Live push alerts to faculty notification drawers for upcoming proxy duties"
      ],
      kpi1: { label: "Proxy Resolution", val: "2", suffix: " Mins" },
      kpi2: { label: "Coverage Rate", val: "100", suffix: "%" },
      kpi3: { label: "Scramble Time", val: "0", suffix: " Lost" },
      previewTitle: "Real-Time Substitution Center",
      previewBadge: "Smart Proxy Match"
    },
    faculty: {
      tag: "For Teachers & Professors",
      title: "A Dedicated Self-Service Portal for Your Schedule & Leaves",
      desc: "Access your personalized weekly lecture calendar, monitor leave balances, apply for leaves, and track individual attendance from any device.",
      highlights: [
        "Personalized 'My Timetable' grid with clustered free periods to minimize fatigue",
        "Live quota balance tracking for Casual, Sick, and Academic leaves",
        "Seamless leave application with instant automated substitution evaluation",
        "Mobile-friendly individual attendance marker with verified institutional identity"
      ],
      kpi1: { label: "Leave Balance", val: "12", suffix: " Days" },
      kpi2: { label: "Sync Speed", val: "Real", suffix: "-Time" },
      kpi3: { label: "Schedule Clashes", val: "0", suffix: "" },
      previewTitle: "Faculty Self-Service Hub",
      previewBadge: "Verified Identity"
    }
  };

  const FAQS = [
    {
      q: "How does Plannify eliminate 100% of timetable clashes?",
      a: "Plannify is powered by Google OR-Tools constraint satisfaction algorithms. Instead of relying on manual slot filling or simple heuristics, Plannify models rooms, teachers, sections, and subjects as mathematical constraints, ensuring zero faculty double-bookings, zero classroom overflows, and zero section overlaps before a schedule is published."
    },
    {
      q: "Can Plannify handle multiple programs with different time slots and lab blocks?",
      a: "Yes. Plannify supports multi-slot period definitions, allowing theory classes (e.g. 45–60 mins) and continuous lab sessions (2–3 consecutive slots) to be scheduled concurrently while guaranteeing room equipment and lab assistant availability."
    },
    {
      q: "How does the Real-Time Faculty Substitution and Leave workflow work?",
      a: "When a professor applies for leave, Plannify instantly evaluates their scheduled lectures during that window, queries available teachers in the same department with matching qualifications, and allows the Dean or HOD to assign substitutes in one click. All changes synchronize in real-time across Supabase and notify affected stakeholders."
    },
    {
      q: "Is Plannify lightweight and fast on low-bandwidth college networks?",
      a: "Yes. Unlike legacy ERPs (like OpenEduCat or SAP) that carry hundreds of megabytes of bloated relational tables, Plannify is built with a high-performance React + FastAPI + Supabase stack. It loads in milliseconds and runs hardware-accelerated 60 FPS animations with less than 2 KB overhead."
    },
    {
      q: "Can we export schedules for physical university notice boards and audits?",
      a: "Absolutely. Plannify provides one-click print-ready PDF exports with university seal, department names, Dean signature blocks, as well as CSV/Excel data sheets for administrative records and NAAC/NBA compliance."
    },
    {
      q: "Can our university test Plannify before connecting our live database?",
      a: "Yes. Plannify includes a 1-Click Interactive Demo preloaded with complete academic datasets (teachers, sections, subjects, classrooms, leave records) so you can evaluate the entire solver and faculty portal instantly."
    }
  ];

  const currentRole = ROLE_SOLUTIONS[activeRoleTab];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* ── TOP ANNOUNCEMENT BANNER ── */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-sm">
        <span className="bg-white/20 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full">New</span>
        <span>Plannify Academic OS v3.70 is live with Google OR-Tools AI Constraint Engine</span>
        <button onClick={handleLaunchApp} className="underline hover:opacity-80 ml-1 font-extrabold flex items-center gap-1">
          Explore Portal →
        </button>
      </div>

      {/* ── STICKY NAVIGATION BAR ── */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <BrandLogo size="md" isWarm={false} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xl tracking-tight text-white">
                  Plannify<span className="text-indigo-500">.exe</span>
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Academic OS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">Intelligent University Scheduling Platform</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-indigo-400 transition-colors">Features</a>
            <a href="#solutions" className="hover:text-indigo-400 transition-colors">Solutions</a>
            <a href="#metrics" className="hover:text-indigo-400 transition-colors">Live Impact</a>
            <a href="#comparison" className="hover:text-indigo-400 transition-colors">Why Plannify</a>
            <a href="#faq" className="hover:text-indigo-400 transition-colors">FAQ</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDemoClick}
              className="btn-secondary text-xs py-2 px-3.5 font-bold flex items-center gap-1.5 hover:border-indigo-500/40"
            >
              <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>1-Click Demo</span>
            </button>
            <button
              onClick={handleLaunchApp}
              className="btn-primary text-xs py-2.5 px-4 font-bold shadow-lg shadow-indigo-900/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
            >
              <span>Sign In / Launch</span>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-16 pb-24 overflow-hidden border-b border-slate-800/60">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-indigo-600/15 via-violet-600/10 to-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="max-w-4xl mx-auto text-center space-y-6">
            
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-indigo-400 text-xs font-bold tracking-wide shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-live-dot" />
              <span>Academic Operating System for Higher Education</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] font-display">
              Build <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600">100% Conflict-Free</span> University Timetables in Seconds.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
              Eliminate spreadsheet chaos and faculty scheduling friction. Plannify combines Google OR-Tools AI with real-time faculty leave workflows, automated substitute matching, and attendance analytics on one unified platform.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={handleLaunchApp}
                className="w-full sm:w-auto btn-primary text-sm py-3.5 px-8 font-black shadow-xl shadow-indigo-900/40 flex items-center justify-center gap-2.5 hover:scale-105 active:scale-95 transition-all"
              >
                <span>Launch Academic Workspace</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>

              <button
                onClick={handleDemoClick}
                className="w-full sm:w-auto btn-secondary text-sm py-3.5 px-7 font-bold flex items-center justify-center gap-2 hover:bg-slate-800/80 hover:border-indigo-500/40 transition-all"
              >
                <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Explore Interactive Demo</span>
              </button>
            </div>

            {/* Micro Trust Proofs */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Zero Double-Bookings Guaranteed
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Google OR-Tools AI Solver
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Supabase Real-Time Cloud Sync
              </span>
            </div>

          </div>

          {/* ── INTERACTIVE PRODUCT PREVIEW CARD (CREATRIX/OPENEDUCAT STYLE) ── */}
          <div className="mt-14 max-w-5xl mx-auto rounded-3xl bg-slate-900/90 border border-slate-800 p-3 sm:p-5 shadow-2xl relative stat-card-elevate">
            
            {/* Window Top Bar */}
            <div className="flex items-center justify-between pb-3 px-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-[11px] text-slate-400">plannify://academic-operations/command-center</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-live-dot" />
                <span className="text-[11px] font-bold text-emerald-400">Constraint Engine: 100% Conflict-Free</span>
              </div>
            </div>

            {/* Inner Dashboard Preview Body */}
            <div className="p-4 sm:p-6 space-y-6">
              
              {/* Top KPI Header with Radial Dials */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-[#151D2A] border border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Live Optimization</span>
                  <h3 className="text-xl font-black text-white">Full University Schedule</h3>
                  <p className="text-xs text-slate-400">LNCT Group of Institutions · Fall Semester 2026</p>
                  <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <span>✓ 12 Faculty Balanced</span>
                    <span>•</span>
                    <span>✓ 3 Sections Assigned</span>
                  </div>
                </div>

                <div className="flex items-center justify-around md:col-span-2 gap-4">
                  <RadialProgressDial
                    value={100}
                    size={86}
                    strokeWidth={7}
                    color="#F59E0B"
                    sublabel="SCORE"
                    label="Schedule Efficiency"
                  />
                  <div className="w-px h-14 bg-slate-800" />
                  <RadialProgressDial
                    value={94}
                    size={86}
                    strokeWidth={7}
                    color="#10B981"
                    sublabel="RATE"
                    label="Faculty Attendance"
                  />
                  <div className="w-px h-14 bg-slate-800 hidden sm:block" />
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Solve Time</p>
                    <p className="text-2xl font-black text-white">
                      <AnimatedCounter target={3.2} decimals={1} suffix="s" />
                    </p>
                    <p className="text-[10px] text-emerald-400">OR-Tools Engine</p>
                  </div>
                </div>
              </div>

              {/* Sample Timetable Grid Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                  <span>Classroom & Faculty Timetable Grid</span>
                  <span className="text-amber-400">0 Overlaps Detected</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 stat-card-elevate">
                    <span className="text-[10px] font-bold text-amber-400 block">MCA-A · Slot 1 (9:00 - 9:45 AM)</span>
                    <p className="font-bold text-white mt-1">Data Structures & Algo</p>
                    <p className="text-[11px] text-slate-400">Prof Ripusoodan S. · Room 101</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 stat-card-elevate">
                    <span className="text-[10px] font-bold text-purple-400 block">MCA-A · Slot 2 (9:45 - 10:30 AM)</span>
                    <p className="font-bold text-white mt-1">Database Management</p>
                    <p className="text-[11px] text-slate-400">Dr Satish Manwani · Lab 2</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 stat-card-elevate">
                    <span className="text-[10px] font-bold text-emerald-400 block">MCA-B · Slot 1 (9:00 - 9:45 AM)</span>
                    <p className="font-bold text-white mt-1">Operating Systems</p>
                    <p className="text-[11px] text-slate-400">Prof Vivek Sharma · Room 102</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 stat-card-elevate">
                    <span className="text-[10px] font-bold text-teal-400 block">MCA-B · Slot 2 (9:45 - 10:30 AM)</span>
                    <p className="font-bold text-white mt-1">Software Engineering</p>
                    <p className="text-[11px] text-slate-400">Prof Amit Shrivastava · Room 103</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── LIVE IMPACT & NUMBERS SECTION (OPENEDUCAT STYLE) ── */}
      <section id="metrics" className="py-20 bg-[#0E1522] border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Enterprise Performance</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1 font-display">
              Quantifiable Impact on University Operations
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Transforming academic administration from spreadsheet guesswork into deterministic mathematical precision.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Metric 1 */}
            <div className="card p-6 bg-slate-900/90 border-slate-800 stat-card-elevate text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h3 className="text-4xl font-black text-white font-display">
                <AnimatedCounter target={3.2} decimals={1} suffix="s" />
              </h3>
              <p className="text-xs font-bold text-slate-200 mt-1">Average Solve Speed</p>
              <p className="text-[11px] text-slate-400 mt-1">Full multi-section schedule calculated in under 4 seconds.</p>
            </div>

            {/* Metric 2 */}
            <div className="card p-6 bg-slate-900/90 border-slate-800 stat-card-elevate text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h3 className="text-4xl font-black text-emerald-400 font-display">
                <AnimatedCounter target={0} suffix=" Clashes" />
              </h3>
              <p className="text-xs font-bold text-slate-200 mt-1">Conflict-Free Guarantee</p>
              <p className="text-[11px] text-slate-400 mt-1">Zero teacher double-bookings or classroom capacity overflows.</p>
            </div>

            {/* Metric 3 */}
            <div className="card p-6 bg-slate-900/90 border-slate-800 stat-card-elevate text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3 className="text-4xl font-black text-indigo-400 font-display">
                <AnimatedCounter target={100} suffix="%" />
              </h3>
              <p className="text-xs font-bold text-slate-200 mt-1">Workload Equilibrium</p>
              <p className="text-[11px] text-slate-400 mt-1">Fair lecture distributions honoring contractual teaching limits.</p>
            </div>

            {/* Metric 4 */}
            <div className="card p-6 bg-slate-900/90 border-slate-800 stat-card-elevate text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </div>
              <h3 className="text-4xl font-black text-purple-400 font-display">
                <AnimatedCounter target={40} prefix="+" suffix=" Hrs/Mo" />
              </h3>
              <p className="text-xs font-bold text-slate-200 mt-1">Administrative Time Saved</p>
              <p className="text-[11px] text-slate-400 mt-1">Replaces endless manual reschedule phone calls and paper notes.</p>
            </div>

          </div>

        </div>
      </section>

      {/* ── CORE 4-PILLAR PRODUCT MODULES ── */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Modular Platform</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-1 font-display">
            The 4 Pillars of Plannify Academic OS
          </h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Everything your university needs to orchestrate classes, faculty, rooms, leaves, and attendance seamlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Pillar 1 */}
          <div className="card p-8 bg-slate-900/90 border-slate-800 stat-card-elevate relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <h3 className="text-2xl font-black text-white font-display">AI Timetable Constraint Engine</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Powered by Google OR-Tools. Models hard and soft constraints across faculty availability, classroom capacities, multi-period lab blocks, and student batch combinations in real time.
              </p>
              <ul className="space-y-2 text-xs text-slate-400 pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> 100% Conflict-Free Parallel Sections
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Continuous Multi-Slot Lab Allocations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Clustered Free Period Optimization
                </li>
              </ul>
            </div>
            <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between text-xs">
              <span className="text-amber-400 font-bold">Google OR-Tools Engine</span>
              <span className="text-slate-500 font-mono">solver.solve()</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="card p-8 bg-slate-900/90 border-slate-800 stat-card-elevate relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </div>
              <h3 className="text-2xl font-black text-white font-display">Real-Time Leave & Substitute Match</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                When a professor applies for leave, Plannify calculates affected periods, cross-references eligible substitutes in the same department, and provides 1-click proxy assignment.
              </p>
              <ul className="space-y-2 text-xs text-slate-400 pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Real-Time Leave Approval & Rejection Drawer
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Automatic Proxy Teacher Qualification Matching
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Dynamic Balance Tracking (Casual, Sick, Academic)
                </li>
              </ul>
            </div>
            <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between text-xs">
              <span className="text-purple-400 font-bold">Instant Proxy Assignment</span>
              <span className="text-slate-500 font-mono">realtime_leaves</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="card p-8 bg-slate-900/90 border-slate-800 stat-card-elevate relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h3 className="text-2xl font-black text-white font-display">Institutional Attendance & Analytics</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect timetabled lectures directly to faculty attendance rosters. Get 360° analytics on attendance percentages, absentee rates, and room occupancy rates.
              </p>
              <ul className="space-y-2 text-xs text-slate-400 pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Live Department Attendance Percentage Gauges
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Faculty Fatigue & Overload Early Warning Alerts
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> NAAC & NBA Audit-Ready Record Generation
                </li>
              </ul>
            </div>
            <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold">Deterministic Audit Trails</span>
              <span className="text-slate-500 font-mono">analytics_360</span>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="card p-8 bg-slate-900/90 border-slate-800 stat-card-elevate relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polygon points="2 17 12 22 22 17"/><polygon points="2 12 12 17 22 12"/></svg>
              </div>
              <h3 className="text-2xl font-black text-white font-display">Multi-Role Portal Perspectives</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tailored experiences for every academic stakeholder. Registrars get master grids, Deans get executive oversight, and Faculty get personalized timetable hubs.
              </p>
              <ul className="space-y-2 text-xs text-slate-400 pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Dedicated Teacher Portal with Verified Profile Switcher
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Classroom & Lab Master Occupancy Views
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> One-Click Departmental PDF & Excel Schedule Printing
                </li>
              </ul>
            </div>
            <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between text-xs">
              <span className="text-indigo-400 font-bold">Role-Based Access Control</span>
              <span className="text-slate-500 font-mono">multi_role</span>
            </div>
          </div>

        </div>
      </section>

      {/* ── INTERACTIVE ROLE SOLUTIONS SWITCHER (OPENEDUCAT / CREATRIX STYLE) ── */}
      <section id="solutions" className="py-24 bg-[#0E1522] border-y border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Tailored Experience</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1 font-display">
              Designed for Every University Stakeholder
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Select your role below to see how Plannify eliminates daily friction in your workflow.
            </p>

            {/* Role Switcher Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-8 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl mx-auto">
              {Object.keys(ROLE_SOLUTIONS).map((key) => {
                const isActive = activeRoleTab === key;
                const labels = {
                  registrar: "Registrar / Scheduler",
                  dean: "Dean / VC",
                  hod: "HOD / Department",
                  faculty: "Faculty Member"
                };
                return (
                  <button
                    key={key}
                    onClick={() => setActiveRoleTab(key)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {labels[key]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Role Content Card */}
          <div className="max-w-5xl mx-auto card p-8 bg-slate-900/95 border-slate-800 stat-card-elevate">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-7 space-y-4">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {currentRole.tag}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white font-display">
                  {currentRole.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentRole.desc}
                </p>

                <div className="space-y-2.5 pt-2">
                  {currentRole.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4 p-6 rounded-2xl bg-black/40 border border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold text-white">{currentRole.previewTitle}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {currentRole.previewBadge}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center py-2">
                  <div className="p-2.5 rounded-xl bg-slate-800/80">
                    <p className="text-[10px] text-slate-400">{currentRole.kpi1.label}</p>
                    <p className="text-sm font-black text-white mt-1">{currentRole.kpi1.val}{currentRole.kpi1.suffix}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80">
                    <p className="text-[10px] text-slate-400">{currentRole.kpi2.label}</p>
                    <p className="text-sm font-black text-amber-400 mt-1">{currentRole.kpi2.val}{currentRole.kpi2.suffix}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80">
                    <p className="text-[10px] text-slate-400">{currentRole.kpi3.label}</p>
                    <p className="text-sm font-black text-emerald-400 mt-1">{currentRole.kpi3.val}{currentRole.kpi3.suffix}</p>
                  </div>
                </div>

                <button
                  onClick={handleLaunchApp}
                  className="w-full btn-primary text-xs py-2.5 font-bold flex items-center justify-center gap-2 mt-2"
                >
                  <span>Experience this Perspective</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── COMPARISON MATRIX: PLANNIFY VS OTHERS ── */}
      <section id="comparison" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">The Market Benchmark</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-1 font-display">
            Why Universities Choose Plannify
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Compare Plannify against manual spreadsheet scheduling and bloated legacy ERP solutions.
          </p>
        </div>

        <div className="card overflow-hidden bg-slate-900/90 border-slate-800 max-w-5xl mx-auto shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                  <th className="py-4 px-6 font-bold uppercase tracking-wider text-[11px]">Feature Capability</th>
                  <th className="py-4 px-6 font-black text-amber-400 uppercase tracking-wider text-[11px] bg-amber-500/10 border-x border-amber-500/20">
                    Plannify Academic OS
                  </th>
                  <th className="py-4 px-6 font-semibold text-slate-400 uppercase tracking-wider text-[11px]">Legacy ERP (OpenEduCat/SAP)</th>
                  <th className="py-4 px-6 font-semibold text-slate-400 uppercase tracking-wider text-[11px]">Manual Excel / Sheets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                <tr>
                  <td className="py-4 px-6 font-bold text-white">Full Schedule Generation Speed</td>
                  <td className="py-4 px-6 font-black text-amber-400 bg-amber-500/5 border-x border-amber-500/20">⚡ &lt; 3.5 Seconds (AI Engine)</td>
                  <td className="py-4 px-6 text-slate-400">10–15 Minutes (Wizard Steps)</td>
                  <td className="py-4 px-6 text-rose-400">2–3 Weeks of Manual Cross-referencing</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-bold text-white">Automated Conflict Checking</td>
                  <td className="py-4 px-6 font-black text-emerald-400 bg-amber-500/5 border-x border-amber-500/20">✓ 100% Mathematical Constraint Solved</td>
                  <td className="py-4 px-6 text-slate-300">✓ Basic Constraint Alerts</td>
                  <td className="py-4 px-6 text-rose-400">✗ High Human Error &amp; Clashes</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-bold text-white">Live Faculty Leave &amp; Substitute Match</td>
                  <td className="py-4 px-6 font-black text-emerald-400 bg-amber-500/5 border-x border-amber-500/20">✓ Real-time Notification &amp; 1-Click Proxy</td>
                  <td className="py-4 px-6 text-slate-400">⚠️ Complex Multi-Step Workflow</td>
                  <td className="py-4 px-6 text-rose-400">✗ Frantic WhatsApp Group Calls</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-bold text-white">UI &amp; Interaction Speed</td>
                  <td className="py-4 px-6 font-black text-amber-400 bg-amber-500/5 border-x border-amber-500/20">⚡ 60 FPS GPU Micro-Animations (&lt; 2KB)</td>
                  <td className="py-4 px-6 text-slate-400">🐌 Sluggish Odoo/Java Page Refreshes</td>
                  <td className="py-4 px-6 text-slate-400">Desktop Dependent</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-bold text-white">Cloud Sync &amp; Multi-Device Access</td>
                  <td className="py-4 px-6 font-black text-emerald-400 bg-amber-500/5 border-x border-amber-500/20">✓ Supabase Real-Time Live Sync</td>
                  <td className="py-4 px-6 text-slate-300">✓ Server-Based</td>
                  <td className="py-4 px-6 text-rose-400">✗ Stale Local Copies</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </section>

      {/* ── FREQUENTLY ASKED QUESTIONS (ACCORDION) ── */}
      <section id="faq" className="py-24 bg-[#0E1522] border-t border-slate-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-14">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Got Questions?</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1 font-display">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Everything you need to know about implementing Plannify Academic OS at your university.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-white text-sm hover:text-amber-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className={`text-lg text-amber-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                      ↓
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3 animate-slide-down">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── BOTTOM HIGH-CONVERTING CTA BANNER ── */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="rounded-3xl p-8 sm:p-14 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-slate-950 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl rounded-full pointer-events-none" />

            <div className="max-w-2xl mx-auto space-y-5">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-slate-950 text-amber-400 uppercase tracking-wider">
                Instant University Deployment
              </span>
              
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-display text-slate-950">
                Ready to Modernize Your Academic Scheduling?
              </h2>

              <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                Join forward-thinking universities running on Plannify. Experience 100% conflict-free scheduling and real-time faculty management today.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleLaunchApp}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-950 text-white hover:bg-slate-900 font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
                >
                  <span>Launch Live Portal</span>
                  <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>

                <button
                  onClick={handleDemoClick}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white/20 hover:bg-white/30 text-slate-950 font-black text-sm border border-slate-950/20 flex items-center justify-center gap-2 transition-all"
                >
                  <span>1-Click Live Demo</span>
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ── RICH INSTITUTIONAL FOOTER ── */}
      <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" isWarm={false} />
            <div>
              <p className="font-bold text-white">Plannify Academic OS</p>
              <p className="text-[11px] text-slate-500">LNCT Group of Institutions · Universal University Timetable Architecture</p>
            </div>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <button onClick={handleLaunchApp} className="text-amber-400 hover:underline">
              Portal Sign In
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left pt-6 mt-6 border-t border-slate-900 text-[11px] text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Plannify.exe. All rights reserved. Open for institutional customizations.</p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Systems Normal · Supabase Real-Time Active</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
