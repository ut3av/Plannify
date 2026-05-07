import React, { useMemo } from 'react';

export default function AnalyticsDashboard({ result, teachers, subjects }) {
  const stats = useMemo(() => {
    if (!result || !result.assignments) return null;
    
    const assignments = result.assignments;
    const teacherClasses = {};
    const roomClasses = {};
    const proxyCount = assignments.filter(a => a.is_proxy).length;
    
    assignments.forEach(a => {
      teacherClasses[a.teacher] = (teacherClasses[a.teacher] || 0) + 1;
      roomClasses[a.room] = (roomClasses[a.room] || 0) + 1;
    });

    const teacherData = Object.entries(teacherClasses).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count);
    const roomData = Object.entries(roomClasses).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count);

    return { teacherData, roomData, proxyCount, totalClasses: assignments.length };
  }, [result]);

  if (!stats) {
    return (
      <div className="glass-card flex min-h-[420px] items-center justify-center p-8 text-center animate-fade-in">
        <div>
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
               <path d="M18 20V10M12 20V4M6 20v-6"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Analytics Available</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Generate a timetable to see analytics and performance data.</p>
        </div>
      </div>
    );
  }

  const maxTeacherClasses = Math.max(...stats.teacherData.map(t => t.count), 1);
  const maxRoomClasses = Math.max(...stats.roomData.map(r => r.count), 1);

  return (
    <div className="space-y-6 animate-scale-in">
       {/* Top Metrics */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-5 border border-violet-500/20 bg-violet-500/5">
             <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Objective Score</p>
             <h3 className="text-3xl font-black text-violet-500 dark:text-violet-400">{result.objective_score}</h3>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Lower score means a more optimized schedule</p>
          </div>
          <div className="glass-card p-5 border border-emerald-500/20 bg-emerald-500/5">
             <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Total Classes</p>
             <h3 className="text-3xl font-black text-emerald-500 dark:text-emerald-400">{stats.totalClasses}</h3>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Total periods scheduled for the week</p>
          </div>
          <div className="glass-card p-5 border border-blue-500/20 bg-blue-500/5">
             <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Active Teachers</p>
             <h3 className="text-3xl font-black text-blue-500 dark:text-blue-400">{stats.teacherData.length}</h3>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Teachers currently scheduled</p>
          </div>
          <div className="glass-card p-5 border border-orange-500/20 bg-orange-500/5">
             <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Proxies Assigned</p>
             <h3 className="text-3xl font-black text-orange-500 dark:text-orange-400">{stats.proxyCount}</h3>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Substitute classes handled automatically</p>
          </div>
       </div>

       {/* Charts Section */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                 <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
               </div>
               Teacher Workload Distribution
             </h3>
             <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {stats.teacherData.map((t, i) => (
                   <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                         <span className="font-medium text-slate-700 dark:text-slate-300">{t.name}</span>
                         <span className="text-indigo-500 dark:text-indigo-300 text-xs font-semibold">{t.count} classes</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                         <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(t.count / maxTeacherClasses) * 100}%` }}></div>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          <div className="glass-card p-6">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
                 <svg className="w-4 h-4 text-pink-500 dark:text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><line x1="8" y1="6" x2="8" y2="6" /><line x1="16" y1="6" x2="16" y2="6" /></svg>
               </div>
               Room Utilization
             </h3>
             <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {stats.roomData.map((r, i) => (
                   <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                         <span className="font-medium text-slate-700 dark:text-slate-300">{r.name}</span>
                         <span className="text-pink-500 dark:text-pink-300 text-xs font-semibold">{r.count} slots used</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                         <div className="bg-pink-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(r.count / maxRoomClasses) * 100}%` }}></div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
}
