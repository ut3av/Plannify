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
    <div className="min-h-screen text-slate-100 bg-slate-900 relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 glass-card border-b border-white/10 px-6 py-4 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Teacher Portal</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <svg className="w-3 h-3 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {teacherName}
              </p>
              {user?.email && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {user.email}
                </p>
              )}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight">n8n Connected</span>
              </div>
            </div>
          </div>
        </div>
        <button onClick={onLogout} className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          Sign Out
        </button>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <div className="text-slate-400 text-sm font-medium mb-1">Total Weekly Classes</div>
            <div className="text-4xl font-bold text-white">{totalClasses}</div>
          </div>
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <div className="text-slate-400 text-sm font-medium mb-1">Workload Status</div>
            <div className="text-xl font-bold text-emerald-400 mt-2">Optimal</div>
          </div>
          <div className="glass-card p-6 rounded-2xl border border-violet-500/30 bg-violet-500/5">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <div>
                <div className="text-violet-300 text-sm font-bold mb-1">AI Insights</div>
                <p className="text-xs text-violet-200/70 leading-relaxed">
                  "Professor {teacherName.split(' ')[0]} has a balanced workload. Wednesday is the busiest day. Consider requesting a free slot on Thursday morning."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Timetable View */}
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-xl font-bold">My Schedule</h2>
            {result && result.solver_status && (
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                Live Sync Active
              </span>
            )}
          </div>
          
          <div className="p-6 overflow-x-auto">
            {!schedule ? (
              <div className="text-center py-12 text-slate-500">
                <p>No timetable data available. Please wait for the Admin to generate the schedule.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-white/5 text-slate-400">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-xl">Day / Time</th>
                    {result.time_slots.map((slot, i) => (
                      <th key={i} className={`px-6 py-4 ${i === result.time_slots.length - 1 ? 'rounded-tr-xl' : ''}`}>
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.days.map((day) => (
                    <tr key={day} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-bold">{day}</td>
                      {result.time_slots.map((slot) => {
                        const cell = schedule[day][slot];
                        return (
                          <td key={slot} className="px-6 py-4">
                            {cell ? (
                              <div className="bg-violet-500/20 border border-violet-500/30 rounded-lg p-3 text-center">
                                <div className="font-bold text-violet-200">{cell.code || cell.subject}</div>
                                <div className="text-xs text-violet-300/70 mt-1">{cell.room} | {cell.section}</div>
                              </div>
                            ) : (
                              <div className="text-center text-slate-600">-</div>
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

      {/* Reusing AI Chatbot */}
      <AIChatBot result={result} isTeacherView={true} teacherName={teacherName} />
    </div>
  );
}
