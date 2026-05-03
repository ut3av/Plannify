const TEACHER_COLORS = [
  { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)", text: "#6958adff", accent: "#a78bfa" },
  { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.3)", text: "#fda4af", accent: "#fb7185" },
  { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#fcd34d", accent: "#fbbf24" },
  { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "#6ee7b7", accent: "#34d399" },
  { bg: "rgba(14,165,233,0.12)", border: "rgba(14,165,233,0.3)", text: "#7dd3fc", accent: "#38bdf8" },
  { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)", text: "#d8b4fe", accent: "#c084fc" },
  { bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.3)", text: "#f9a8d4", accent: "#f472b6" },
  { bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.3)", text: "#67e8f9", accent: "#22d3ee" },
  { bg: "rgba(234,88,12,0.12)", border: "rgba(234,88,12,0.3)", text: "#fdba74", accent: "#fb923c" },
  { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", text: "#86efac", accent: "#4ade80" },
];

function hashName(name) {
  if (!name) return 0;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h) % TEACHER_COLORS.length;
}

function ShimmerGrid() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-slate-200 dark:border-white/[0.06]">
        <div className="shimmer h-6 w-48 mb-2" />
        <div className="shimmer h-4 w-32" />
      </div>
      <div className="p-4 grid gap-2" style={{ gridTemplateColumns: "80px repeat(5,1fr)" }}>
        {Array.from({ length: 36 }).map((_, i) => (
          <div key={i} className="shimmer h-20 rounded" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ loading }) {
  if (loading) return <ShimmerGrid />;
  return (
    <div className="glass-card flex min-h-[420px] items-center justify-center p-8 text-center">
      <div className="animate-fade-in">
        <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-violet-400 animate-pulse-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">No timetable generated</h2>
        <p className="mt-2 max-w-sm mx-auto text-sm leading-6 text-slate-500">
          Configure your teachers, subjects, rooms, and time slots, then click <span className="text-violet-400 font-medium">Generate Timetable</span>.
        </p>
      </div>
    </div>
  );
}

function AssignmentCard({ item }) {
  const c = TEACHER_COLORS[hashName(item.teacher)];
  return (
    <div className="relative rounded-lg p-2.5 transition-all duration-200 hover:translate-y-[-1px] hover:shadow-lg cursor-default" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-start justify-between gap-1">
        <p className="font-semibold text-[13px] leading-tight" style={{ color: c.accent }}>
          {item.code ? <span className="mr-1 opacity-80">{item.code}</span> : null}
          {item.subject}
        </p>
        <div className="flex gap-1">
          {item.is_proxy && <span className="px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/20">Proxy</span>}
          {item.is_lab && <span className="px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/20" style={{ color: c.accent }}>Lab</span>}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        {item.is_proxy ? (
          <><span className="line-through opacity-50 mr-1">{item.original_teacher}</span><span className="text-orange-400 font-medium">{item.teacher}</span></>
        ) : (
          item.teacher
        )} 
        {item.section ? ` (${item.section})` : ""}
      </p>
      <p className="text-[11px] font-medium" style={{ color: c.text }}>{item.room}</p>
    </div>
  );
}

export default function TimetableGrid({ result, loading, onExport, onSaveDb }) {
  if (!result) return <EmptyState loading={loading} />;

  return (
    <section className="glass-card overflow-hidden animate-scale-in">
      <div className="flex flex-col gap-2 p-5 border-b border-slate-200 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Weekly Timetable</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Objective score: <span className="text-violet-300 font-semibold">{result.objective_score}</span>
          </p>
          {result.ai_description && (
            <div className="mt-2 text-xs text-indigo-200 bg-indigo-500/10 p-2 rounded border border-indigo-500/20 max-w-2xl flex items-start gap-2">
              <span>✨</span>
              <p className="leading-relaxed">{result.ai_description}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{result.assignments?.length || 0} scheduled</span>
          </div>
          {onSaveDb && (
            <button onClick={onSaveDb} className="btn-outline flex items-center gap-2 text-xs px-4 py-2 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              Save to DB
            </button>
          )}
          {onExport && (
            <button onClick={onExport} className="btn-outline flex items-center gap-2 text-xs px-4 py-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2-2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Excel
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="w-20 p-3 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-r border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">Day</th>
              {result.time_slots.map((slot) => (
                <th key={slot} className="min-w-[140px] p-3 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-r border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">{slot}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.days.map((day) => (
              <tr key={day}>
                <th className="p-3 text-sm font-bold text-slate-600 dark:text-slate-300 border-b border-r border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">{day}</th>
                {result.time_slots.map((slot) => {
                  const a = result.timetable?.[day]?.[slot] || [];
                  return (
                    <td key={`${day}-${slot}`} className="h-28 align-top border-b border-r border-slate-200 dark:border-white/[0.06] p-2 hover:bg-slate-50 dark:bg-white/[0.02] transition-colors">
                      {a.length === 0
                        ? <span className="text-xs text-slate-700">—</span>
                        : <div className="flex flex-col gap-1.5">{a.map((item, i) => <AssignmentCard key={`${item.subject}-${item.room}-${i}`} item={item} />)}</div>
                      }
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
