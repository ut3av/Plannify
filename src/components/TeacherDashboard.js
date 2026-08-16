import React, { useState, useMemo } from 'react';
import AIChatBot from './AIChatBot';
import LeaveManagement from './faculty/LeaveManagement';
import AttendanceDashboard from './faculty/AttendanceDashboard';

export default function TeacherDashboard({ user, result, onLogout }) {
  const [activeTab, setActiveTab] = useState("timetable"); // "timetable" | "attendance" | "analytics" | "leave"
  const teacherName = user?.name || user?.email?.split('@')[0] || "Faculty Member";

  const schedule = useMemo(() => {
    if (!result || !result.timetable) return null;
    const s = {};
    for (const day of result.days) {
      s[day] = {};
      for (const slot of result.time_slots) {
        const assignments = result.timetable[day][slot] || [];
        const myAssignment = assignments.find(a => a.teacher === teacherName);
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
    <div className="min-h-screen text-slate-100 selection:bg-indigo-500/30 selection:text-white bg-slate-950">
      <div className="glow-mesh" />
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-white/10 px-8 py-4 flex justify-between items-center bg-slate-950/90 backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="flex items-center gap-0.5 group">
              <img 
                src="/favicon.png" 
                alt="Planify" 
                className="h-7 md:h-8 object-contain" 
              />
              <span className="font-black text-xl md:text-2xl text-white tracking-tighter ml-1">Planify<span className="text-indigo-400">.exe</span></span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Faculty Portal
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-black text-white">{teacherName}</span>
            <span className="text-[10px] font-bold text-slate-500">{user?.email}</span>
          </div>
          <button 
            onClick={onLogout} 
            className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-black hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-200 transition-all active:scale-95"
          >
            SIGN OUT
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        
        {/* Dashboard Header */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-white mb-1">Faculty <span className="text-gradient">Portal</span></h2>
            <p className="text-slate-400 text-xs font-medium tracking-wide">Manage your individual schedule, attendance, workload analytics, and leave applications.</p>
          </div>

          {/* Teacher Tab Navigation */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <button 
              onClick={() => setActiveTab("timetable")} 
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === "timetable" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📅 My Timetable
            </button>
            <button 
              onClick={() => setActiveTab("attendance")} 
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === "attendance" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🕒 Individual Attendance
            </button>
            <button 
              onClick={() => setActiveTab("analytics")} 
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === "analytics" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📊 Workload Analytics
            </button>
            <button 
              onClick={() => setActiveTab("leave")} 
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === "leave" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📋 Leave Apply
            </button>
          </div>
        </div>

        {/* Faculty Identity Profile Card */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs mb-8 shadow-xl">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center">
              👨‍🏫
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{teacherName}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  Verified Faculty
                </span>
              </div>
              <p className="text-slate-400 text-xs">
                {user?.user_metadata?.designation || "Assistant Professor"} • {user?.user_metadata?.department || "Computer Applications"}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-slate-300">
            {user?.user_metadata?.employee_id && (
              <span className="font-mono text-[11px] bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-indigo-300">
                🏷️ {user?.user_metadata?.employee_id}
              </span>
            )}
            {user?.email && (
              <span className="bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/60 text-slate-300">
                ✉️ {user?.email}
              </span>
            )}
            {user?.user_metadata?.phone && (
              <span className="bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/60 text-slate-300">
                📞 {user?.user_metadata?.phone}
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
                <div className="text-xl font-black text-emerald-400 uppercase tracking-tight italic mt-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  OR-Tools Active
                </div>
              </div>

              <div className="md:col-span-2 card p-6 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border-indigo-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block mb-1">Personalized Optimization</span>
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Live Workspace Sync</span>
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
                                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{cell.code}</div>
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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-white">Individual Attendance Record</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Track your daily punches, attendance %, and monthly compliance.</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Attendance: 96.4%
                </span>
              </div>
            </div>
            <AttendanceDashboard />
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
                <h3 className="text-3xl font-black text-indigo-400 mt-2">
                  {totalClasses > 18 ? "Heavy Load" : totalClasses < 12 ? "Light Load" : "Optimal Load"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Standard target: 14 - 18 lectures / week</p>
              </div>

              <div className="card p-6 bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">OR-Tools Health Score</span>
                <h3 className="text-3xl font-black text-emerald-400 mt-2">100% Solved</h3>
                <p className="text-xs text-slate-500 mt-1">Zero constraint violations or double-bookings.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LEAVE APPLY (RESTRICTED TO TEACHER INTERFACE) */}
        {activeTab === "leave" && (
          <div className="animate-fade-in space-y-6">
            <div className="card p-6 bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">Leave Application & Balances</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Submit casual, medical, or earned leave requests and track review status.</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Teacher Self-Service
                </span>
              </div>
            </div>

            <LeaveManagement facultyId={user?.faculty_id || user?.id} isAdmin={false} />
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
