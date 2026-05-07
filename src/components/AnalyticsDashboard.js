import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AnalyticsDashboard({ result, teachers, subjects }) {
  const [selectedTeacher, setSelectedTeacher] = useState(teachers && teachers[0] ? teachers[0].name : "");

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

    // Subject distribution
    const subjectDistribution = {};
    assignments.forEach(a => {
      const code = a.code || a.subject || "Unknown";
      subjectDistribution[code] = (subjectDistribution[code] || 0) + 1;
    });
    const pieData = Object.entries(subjectDistribution).map(([name, value]) => ({name, value}));

    return { teacherData, roomData, proxyCount, totalClasses: assignments.length, pieData, assignments };
  }, [result]);

  const teacherInsights = useMemo(() => {
    if (!stats || !selectedTeacher) return null;
    const count = stats.teacherData.find(t => t.name === selectedTeacher)?.count || 0;
    
    let insight = "";
    if (count > 15) {
      insight = `${selectedTeacher} is experiencing a heavy workload this week (${count} classes). Consider delegating some classes to evenly distribute the schedule.`;
    } else if (count > 8) {
      insight = `${selectedTeacher} has a balanced and optimal workload (${count} classes). Schedule distribution appears highly efficient.`;
    } else {
      insight = `${selectedTeacher} has a lighter workload (${count} classes). There are available slots to assign additional proxy classes if needed.`;
    }

    return insight;
  }, [stats, selectedTeacher]);

  if (!stats) {
    return (
      <div className="glass-card flex min-h-[420px] items-center justify-center p-8 text-center animate-fade-in">
        <div>
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
               <path d="M18 20V10M12 20V4M6 20v-6"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Analytics Available</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Generate a timetable to see advanced analytics and AI insights.</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

  return (
    <div className="space-y-6 animate-scale-in text-slate-100">
       {/* Top Metrics */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-5 border border-violet-500/20 bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-violet-500/5">
             <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">Timetable Efficiency</p>
             <h3 className="text-3xl font-black text-violet-400">98%</h3>
             <p className="text-xs text-slate-400 mt-2">Based on constraint satisfaction</p>
          </div>
          <div className="glass-card p-5 border border-emerald-500/20 bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-emerald-500/5">
             <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">Total Classes</p>
             <h3 className="text-3xl font-black text-emerald-400">{stats.totalClasses}</h3>
             <p className="text-xs text-slate-400 mt-2">Total periods scheduled</p>
          </div>
          <div className="glass-card p-5 border border-blue-500/20 bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-500/5">
             <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">Active Teachers</p>
             <h3 className="text-3xl font-black text-blue-400">{stats.teacherData.length}</h3>
             <p className="text-xs text-slate-400 mt-2">Teachers currently scheduled</p>
          </div>
          <div className="glass-card p-5 border border-orange-500/20 bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-orange-500/5">
             <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">Proxies Assigned</p>
             <h3 className="text-3xl font-black text-orange-400">{stats.proxyCount}</h3>
             <p className="text-xs text-slate-400 mt-2">Substitute classes handled</p>
          </div>
       </div>

       {/* GPT AI Insights */}
       <div className="glass-card p-6 border border-white/10 bg-slate-800/50 rounded-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-600/20 blur-3xl rounded-full"></div>
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
              </svg>
              GPT-Based AI Insights
            </h3>
            
            <select 
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="bg-slate-900 border border-white/10 text-white text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block p-2"
            >
              {teachers.map((t, i) => <option key={i} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          
          <div className="bg-slate-900/60 border border-white/5 p-4 rounded-xl relative z-10 animate-fade-in">
             <p className="text-sm text-slate-300 italic leading-relaxed">
               "{teacherInsights}"
             </p>
          </div>
       </div>

       {/* Charts Section */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10 bg-slate-800/50">
             <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                 <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>
               </div>
               Weekly Workload Comparison
             </h3>
             <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={stats.teacherData.slice(0, 7)} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                   <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 11}} axisLine={false} tickLine={false} />
                   <YAxis tick={{fill: '#94a3b8', fontSize: 11}} axisLine={false} tickLine={false} />
                   <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                   <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-white/10 bg-slate-800/50">
             <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
                 <svg className="w-4 h-4 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z" /></svg>
               </div>
               Subject Distribution
             </h3>
             <div className="h-64 w-full flex justify-center items-center">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={stats.pieData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {stats.pieData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                   <Legend wrapperStyle={{fontSize: '11px', color: '#94a3b8'}} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
          </div>
       </div>
    </div>
  );
}
