import React, { useMemo } from 'react';
import AIChatBot from './AIChatBot';

export default function TeacherDashboard({ user, result, onLogout }) {
  const teacherName = user?.name || "Mohit Kumade";

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
    <div className="min-h-screen text-slate-100 selection:bg-indigo-500/30 selection:text-white">
      <div className="glow-mesh" />
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-white/10 px-8 py-4 flex justify-between items-center bg-slate-950/80 backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="flex items-center gap-0.5 group">
              <img 
                src="https://see.fontimg.com/api/rf5/DYgy0/OTc3MzU3MmZhOGI2NGE4ODg0OTFhNjIyZTU1MDc1Y2Yub3Rm/UGxhbmlmeQ/qurovademo-regular.png?r=fs&h=81&w=1250&fg=FFFFFF&bg=transparent&tb=1&s=65" 
                alt="Planify" 
                className="h-7 md:h-8 object-contain" 
              />
              <span className="text-exe-glossy text-xl md:text-2xl mt-1 tracking-tighter">.exe</span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Teacher Session
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
            className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-black hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
          >
            SIGN OUT
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12 relative z-10">
        
        {/* Dashboard Header */}
        <div className="mb-12">
          <h2 className="text-4xl font-black text-white mb-2">Academic <span className="text-gradient">Dashboard</span></h2>
          <p className="text-slate-400 font-medium tracking-wide">Optimize your schedule and manage your classes with AI-driven insights.</p>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="neon-card p-8 bg-slate-900/40">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 block mb-2">Weekly Load</span>
            <div className="text-5xl font-black text-white leading-none">{totalClasses} <span className="text-lg text-slate-600 font-bold uppercase">Slots</span></div>
          </div>
          
          <div className="neon-card p-8 bg-slate-900/40">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 block mb-2">Status</span>
            <div className="text-2xl font-black text-emerald-400 uppercase tracking-tight italic mt-2 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Optimized
            </div>
          </div>

          <div className="md:col-span-2 neon-card p-8 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border-indigo-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400 block mb-1">AI Recommendation</span>
                <p className="text-sm font-medium text-slate-300 leading-relaxed italic">
                  "Based on your current load of {totalClasses} classes, the OR-Tools solver has prioritized your free periods on Monday. Your Friday schedule is clustered to minimize gaps."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Timetable */}
        <div className="neon-card bg-slate-900/40 border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <h3 className="text-xl font-black text-white tracking-tight">CLASS SCHEDULE</h3>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Live Solver Sync</span>
            </div>
          </div>

          <div className="p-0 overflow-x-auto">
            {!schedule ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10 animate-pulse">
                  <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Waiting for admin to broadcast schedule...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">Day / Time</th>
                    {result.time_slots.map((slot, i) => (
                      <th key={i} className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 border-b border-white/5">
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {result.days.map((day) => (
                    <tr key={day} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-8 font-black text-white text-lg tracking-tight bg-white/[0.01]">{day}</td>
                      {result.time_slots.map((slot) => {
                        const cell = schedule[day][slot];
                        return (
                          <td key={slot} className="px-4 py-4 min-w-[200px]">
                            {cell ? (
                              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 group-hover:border-indigo-500/40 transition-all shadow-lg">
                                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{cell.code}</div>
                                <div className="text-base font-black text-white leading-tight mb-2">{cell.subject}</div>
                                <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                                  <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-slate-600" /> {cell.room}</span>
                                  <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-slate-600" /> {cell.section}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center opacity-10">
                                <span className="w-2 h-2 rounded-full bg-slate-500" />
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
      </main>

      {/* Floating AI Assistant */}
      <div className="fixed bottom-8 right-8 z-[100]">
        <AIChatBot result={result} isTeacherView={true} teacherName={teacherName} />
      </div>
    </div>
  );
}
