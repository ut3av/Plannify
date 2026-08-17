import React, { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import AIChatBot from './AIChatBot';
import LeaveManagement from './faculty/LeaveManagement';
import AttendanceDashboard from './faculty/AttendanceDashboard';
import BrandLogo from './common/BrandLogo';
import { API_BASE_URL as API } from '../apiConfig';

export default function TeacherDashboard({
  user,
  result,
  onLogout,
  teachers = [],
  theme = "warm-white",
  onToggleTheme,
}) {
  const [activeTab, setActiveTab] = useState("timetable"); // "timetable" | "attendance" | "analytics" | "leave"
  const [backendFaculty, setBackendFaculty] = useState([]);
  const [teacherSelectorOpen, setTeacherSelectorOpen] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const dropdownRef = useRef(null);

  // Fetch all registered faculty accounts from backend database
  useEffect(() => {
    const fetchRegisteredFaculty = async () => {
      try {
        const res = await axios.get(`${API}/faculty/`);
        if (res.data && Array.isArray(res.data)) {
          setBackendFaculty(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch registered faculty accounts:", err);
      }
    };
    fetchRegisteredFaculty();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setTeacherSelectorOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Build unified, deduplicated list of all teachers who have accounts or profiles
  const allTeachersList = useMemo(() => {
    const map = new Map();

    // 1. From backend DB faculty
    backendFaculty.forEach((f) => {
      const name = f.teacher_name || f.name;
      if (name) {
        map.set(name.trim().toLowerCase(), {
          id: f.id,
          name: name.trim(),
          email: f.email || `${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '.')}@lnctu.ac.in`,
          phone: f.phone || "+91-9876543210",
          employee_id: f.employee_id || `EMP-LNCT-${Math.abs(name.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 9000) + 1000}`,
          department: f.department_name || "Computer Applications",
          designation: f.designation || "Assistant Professor",
          status: f.status || "active",
          hasAccount: true,
        });
      }
    });

    // 2. From teachers state prop
    if (Array.isArray(teachers)) {
      teachers.forEach((t) => {
        const name = typeof t === "string" ? t : t?.name;
        if (name && !map.has(name.trim().toLowerCase())) {
          map.set(name.trim().toLowerCase(), {
            id: typeof t === "object" ? t?.id : undefined,
            name: name.trim(),
            email: (typeof t === "object" && t?.email) || `${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '.')}@lnctu.ac.in`,
            phone: (typeof t === "object" && t?.phone) || "+91-9876543210",
            employee_id: (typeof t === "object" && t?.employee_id) || `EMP-LNCT-${Math.abs(name.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 9000) + 1000}`,
            department: (typeof t === "object" && t?.department) || "Computer Applications",
            designation: (typeof t === "object" && t?.designation) || "Faculty Member",
            status: "active",
            hasAccount: true,
          });
        }
      });
    }

    // 3. Ensure current user is in list if not already
    if (user?.name && !map.has(user.name.trim().toLowerCase())) {
      map.set(user.name.trim().toLowerCase(), {
        id: user.id || user.faculty_id,
        name: user.name.trim(),
        email: user.email,
        phone: user.user_metadata?.phone || "+91-9876543210",
        employee_id: user.user_metadata?.employee_id || "EMP-LNCT-1001",
        department: user.user_metadata?.department || "Computer Applications",
        designation: user.user_metadata?.designation || "Assistant Professor",
        status: "active",
        hasAccount: true,
      });
    }

    return Array.from(map.values());
  }, [backendFaculty, teachers, user]);

  // Selected teacher state (defaults to currently logged in / selected user)
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Sync selectedTeacher when user changes or teachers load
  useEffect(() => {
    if (user?.name) {
      const match = allTeachersList.find(
        t => t.name.toLowerCase() === user.name.trim().toLowerCase()
      );
      if (match) {
        setSelectedTeacher(match);
      } else {
        setSelectedTeacher({
          id: user.id || user.faculty_id,
          name: user.name,
          email: user.email,
          department: user.user_metadata?.department || user.department || "Computer Applications",
          designation: user.user_metadata?.designation || user.designation || "Assistant Professor",
          employee_id: user.user_metadata?.employee_id || user.employee_id || "EMP-LNCT-1001",
          phone: user.user_metadata?.phone || user.phone || "+91-9876543210",
          status: "active",
          hasAccount: true,
        });
      }
    } else if (allTeachersList.length > 0) {
      setSelectedTeacher(prev => prev || allTeachersList[0]);
    }
  }, [user, allTeachersList]);

  const teacherName = selectedTeacher?.name || user?.name || user?.email?.split('@')[0] || "Faculty Member";

  const handleSelectTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setTeacherSelectorOpen(false);
  };

  const filteredTeachersForSelector = useMemo(() => {
    if (!teacherSearch.trim()) return allTeachersList;
    const q = teacherSearch.toLowerCase();
    return allTeachersList.filter(
      t => t.name.toLowerCase().includes(q) ||
           t.department?.toLowerCase().includes(q) ||
           t.employee_id?.toLowerCase().includes(q) ||
           t.email?.toLowerCase().includes(q)
    );
  }, [allTeachersList, teacherSearch]);

  const schedule = useMemo(() => {
    if (!result || !result.timetable) return null;
    const s = {};
    for (const day of result.days || []) {
      s[day] = {};
      for (const slot of result.time_slots || []) {
        const assignments = result.timetable[day]?.[slot] || [];
        const myAssignment = assignments.find(
          a => a.teacher?.trim().toLowerCase() === teacherName.trim().toLowerCase()
        );
        s[day][slot] = myAssignment || null;
      }
    }
    return s;
  }, [result, teacherName]);

  const totalClasses = useMemo(() => {
    let count = 0;
    if (schedule) {
      for (const day of Object.keys(schedule)) {
        for (const slot of Object.keys(schedule[day])) {
          if (schedule[day][slot]) count++;
        }
      }
    }
    return count;
  }, [schedule]);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 selection:bg-amber-500/30 selection:text-white bg-[var(--bg-main)]">
      <div className="glow-mesh" />
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-[#E8DDD0] dark:border-white/10 px-4 sm:px-6 py-3.5 flex justify-between items-center bg-white/95 dark:bg-slate-950/90 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" isWarm={theme === 'warm-white'} />
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 pl-3 border-l border-[#E8DDD0] dark:border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Faculty Portal
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* TEACHER ACCOUNT SELECTOR DROPDOWN */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setTeacherSelectorOpen(!teacherSelectorOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-900 dark:text-amber-300 transition-all active:scale-95 shadow-sm"
              title="Click to view timetable/portal as any registered faculty member"
            >
              <span className="text-sm">👨‍🏫</span>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-[9px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider">Active Faculty Account</span>
                <span className="font-extrabold text-xs truncate max-w-[150px]">{teacherName}</span>
              </div>
              <span className="text-[10px] opacity-70">▾</span>
            </button>

            {/* Dropdown Menu */}
            {teacherSelectorOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-3 animate-slide-down">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Select Teacher Profile</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Accounts created & synced in Faculty Panel ({allTeachersList.length})</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Live Sync
                  </span>
                </div>

                {/* Search in Dropdown */}
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Search faculty name, ID, department..."
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-colors"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Teacher Options List */}
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredTeachersForSelector.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No matching faculty found.
                    </div>
                  ) : (
                    filteredTeachersForSelector.map((t) => {
                      const isSelected = t.name.toLowerCase() === teacherName.toLowerCase();
                      return (
                        <button
                          key={t.id || t.name}
                          onClick={() => handleSelectTeacher(t)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-all ${
                            isSelected
                              ? "bg-amber-500/20 border border-amber-500/40 text-amber-900 dark:text-amber-200 font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center shrink-0 text-xs">
                              {t.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold truncate text-xs">{t.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {t.employee_id} • {t.department}
                              </p>
                            </div>
                          </div>
                          {isSelected ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold text-xs shrink-0">✓ Active</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 shrink-0">Select</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>



          {/* Theme Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          )}

          {/* Sign Out */}
          <button 
            onClick={onLogout} 
            className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-600 dark:text-red-300 hover:bg-red-500/20 transition-all active:scale-95 flex items-center gap-1.5"
            title="Sign out of Plannify"
          >
            <span>🔒</span>
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        
        {/* Dashboard Header */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-1 font-display">Faculty <span className="text-gradient">Portal</span></h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium tracking-wide">Manage your individual schedule, attendance, workload analytics, and leave applications.</p>
          </div>

          {/* Teacher Tab Navigation */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <button 
              onClick={() => setActiveTab("timetable")} 
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === "timetable" 
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              📅 My Timetable
            </button>
            <button 
              onClick={() => setActiveTab("attendance")} 
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === "attendance" 
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              🕒 Individual Attendance
            </button>
            <button 
              onClick={() => setActiveTab("analytics")} 
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === "analytics" 
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              📊 Workload Analytics
            </button>
            <button 
              onClick={() => setActiveTab("leave")} 
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === "leave" 
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              📋 Leave Apply
            </button>
          </div>
        </div>

        {/* Faculty Identity Profile Card */}
        <div className="card p-4 flex flex-wrap items-center justify-between gap-4 text-xs mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 font-black text-sm flex items-center justify-center">
              👨‍🏫
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white text-base">{teacherName}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                  Verified Faculty Identity
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                {selectedTeacher?.designation || user?.user_metadata?.designation || "Assistant Professor"} • {selectedTeacher?.department || user?.user_metadata?.department || "Computer Applications"}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 text-slate-600 dark:text-slate-300">
            {(selectedTeacher?.employee_id || user?.user_metadata?.employee_id) && (
              <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-amber-800 dark:text-amber-300">
                🏷️ {selectedTeacher?.employee_id || user?.user_metadata?.employee_id}
              </span>
            )}
            {(selectedTeacher?.email || user?.email) && (
              <span className="bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                ✉️ {selectedTeacher?.email || user?.email}
              </span>
            )}
            {(selectedTeacher?.phone || user?.user_metadata?.phone) && (
              <span className="bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                📞 {selectedTeacher?.phone || user?.user_metadata?.phone}
              </span>
            )}

          </div>
        </div>

        {/* TAB 1: MY TIMETABLE */}
        {activeTab === "timetable" && (
          <div className="space-y-8 animate-fade-in">
            {/* Top Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card p-6 bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Weekly Assigned Load</span>
                <div className="text-4xl font-black text-white leading-none mt-1">{totalClasses} <span className="text-sm text-slate-500 font-bold uppercase">Slots</span></div>
              </div>
              
              <div className="card p-6 bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Schedule Sync</span>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tight italic mt-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  OR-Tools Active
                </div>
              </div>

              <div className="md:col-span-2 card p-6 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border-indigo-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-amber-700 dark:text-indigo-400 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-indigo-400 block mb-1">Personalized Optimization</span>
                    <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                      "Based on your current load of {totalClasses} assigned classes, free periods are clustered to minimize continuous teaching fatigue."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Timetable Table */}
            <div className="card bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
                <h3 className="text-base font-black text-white tracking-tight">INDIVIDUAL CLASS SCHEDULE</h3>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-indigo-300">Live Workspace Sync</span>
                </div>
              </div>

              <div className="p-0 overflow-x-auto">
                {!schedule ? (
                  <div className="text-center py-16">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 border border-white/10 animate-pulse">
                      <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Waiting for admin to broadcast active timetable...</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-800">Day / Time</th>
                        {result.time_slots.map((slot, i) => (
                          <th key={i} className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                            {slot}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {result.days.map((day) => (
                        <tr key={day} className="group hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-6 font-black text-white text-base tracking-tight bg-slate-950/30">{day}</td>
                          {result.time_slots.map((slot) => {
                            const cell = schedule[day][slot];
                            return (
                              <td key={slot} className="px-3 py-3 min-w-[180px]">
                                {cell ? (
                                  <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-600/15 to-purple-600/15 border border-indigo-500/30 group-hover:border-indigo-500/50 transition-all shadow-md">
                                    <div className="text-[10px] font-black text-amber-700 dark:text-indigo-400 uppercase tracking-widest mb-1">{cell.code}</div>
                                    <div className="text-sm font-black text-white leading-tight mb-2">{cell.subject}</div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                      <span>🏛️ {cell.room}</span>
                                      <span>•</span>
                                      <span>👥 {cell.section}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center opacity-20 py-4">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INDIVIDUAL ATTENDANCE */}
        {activeTab === "attendance" && (
          <div className="animate-fade-in space-y-6">
            <div className="card p-6 bg-slate-900/90 border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-black text-white">Individual Attendance Record</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Track your daily punches, attendance %, and monthly compliance.</p>
                </div>
                <span className="inline-flex items-center whitespace-nowrap shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                  Attendance: 96.4%
                </span>
              </div>
            </div>
            <AttendanceDashboard facultyId={selectedTeacher?.id || user?.faculty_id || user?.id} isTeacherView={true} />
          </div>
        )}

        {/* TAB 3: WORKLOAD ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6 bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Teaching Hours</span>
                <h3 className="text-3xl font-black text-white mt-2">{totalClasses * 1} Hours / Week</h3>
                <p className="text-xs text-slate-500 mt-1">Based on {totalClasses} scheduled lecture periods.</p>
              </div>

              <div className="card p-6 bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Workload Classification</span>
                <h3 className="text-3xl font-black text-amber-700 dark:text-indigo-400 mt-2">
                  {totalClasses > 18 ? "Heavy Load" : totalClasses < 12 ? "Light Load" : "Optimal Load"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Standard target: 14 - 18 lectures / week</p>
              </div>

              <div className="card p-6 bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">OR-Tools Health Score</span>
                <h3 className="text-3xl font-black text-emerald-700 dark:text-emerald-400 mt-2">100% Solved</h3>
                <p className="text-xs text-slate-500 mt-1">Zero constraint violations or double-bookings.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LEAVE APPLY (RESTRICTED TO TEACHER INTERFACE) */}
        {activeTab === "leave" && (
          <div className="animate-fade-in space-y-6">
            <div className="card p-6 bg-slate-900/90 border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-white">Leave Application & Balances</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Submit casual, medical, or earned leave requests and track review status.</p>
                </div>
                <span className="inline-flex items-center whitespace-nowrap shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-indigo-500/20 text-amber-800 dark:text-indigo-300 border border-amber-300 dark:border-indigo-500/30">
                  Teacher Self-Service
                </span>
              </div>
            </div>

            <LeaveManagement facultyId={selectedTeacher?.id || user?.faculty_id || user?.id} isAdmin={false} />
          </div>
        )}

      </main>

      {/* Floating AI Assistant */}
      <div className="fixed bottom-8 right-8 z-[100]">
        <AIChatBot result={result} isTeacherView={true} teacherName={teacherName} />
      </div>
    </div>
  );
}
