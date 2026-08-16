import { SUBJECT_COLORS } from "./SubjectsSection";

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

function AssignmentCard({ item, subjects }) {
  const subject = subjects?.find(s => s.name === item.subject);
  const colorIndex = subject?.colorIndex ?? 0;
  const c = SUBJECT_COLORS[colorIndex] || SUBJECT_COLORS[0];
  return (
    <div className="assignment-card-print relative rounded-lg p-2.5 transition-all duration-200 hover:translate-y-[-1px] hover:shadow-lg cursor-default" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-start justify-between gap-1">
        <p className="font-semibold text-[13px] leading-tight" style={{ color: c.accent }}>
          {item.code ? <span className="mr-1 opacity-80 font-mono">[{item.code}]</span> : null}
          {item.subject}
        </p>
        <div className="flex gap-1 no-print">
          {item.is_proxy && <span className="px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/20">Proxy</span>}
          {item.is_lab && <span className="px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/20" style={{ color: c.accent }}>Lab</span>}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
        {item.is_proxy ? (
          <><span className="line-through opacity-50 mr-1">{item.original_teacher}</span><span className="text-orange-400 font-medium">{item.teacher}</span></>
        ) : (
          item.teacher
        )} 
        {item.section ? ` • Sec ${item.section}` : ""}
      </p>
      <p className="text-[11px] font-medium mt-0.5" style={{ color: c.text }}>
        📍 {item.room} {item.is_lab ? " (Lab Block)" : ""}
      </p>
    </div>
  );
}

export default function TimetableGrid({ result, subjects, loading, onExport, onSaveDb }) {
  if (!result) return <EmptyState loading={loading} />;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <section className="glass-card overflow-hidden animate-scale-in">
      {/* ── Print-Only Institutional Header ── */}
      <div className="print-only mb-4 border-b-2 border-slate-900 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">
              Plannify Institute of Engineering & Technology
            </h1>
            <p className="text-xs font-semibold uppercase text-slate-700 tracking-wider mt-0.5">
              Official Master Consolidated Timetable • Academic Year 2026-2027
            </p>
          </div>
          <div className="text-right text-xs text-slate-700">
            <p><strong>Generated:</strong> {currentDate}</p>
            <p><strong>Total Sessions:</strong> {result.assignments?.length || 0} classes</p>
            <p><strong>Solver Status:</strong> {result.solver_status || "FEASIBLE"}</p>
          </div>
        </div>
      </div>

      {/* ── Interactive Screen Header Bar ── */}
      <div className="flex flex-col gap-2 p-5 border-b border-slate-200 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Weekly Master Timetable</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Objective score: <span className="text-violet-300 font-semibold">{result.objective_score}</span> • Status: <span className="text-emerald-400 font-semibold">{result.solver_status}</span>
          </p>
          {result.ai_description && (
            <div className="mt-2 max-w-2xl rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs text-indigo-100">
              <p className="font-semibold uppercase tracking-wider text-indigo-200">AI Optimization Summary</p>
              <p className="mt-1 leading-relaxed">{result.ai_description}</p>
            </div>
          )}
          {result.ai_suggestions?.length > 0 && (
            <div className="mt-2 max-w-2xl rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
              <p className="font-semibold uppercase tracking-wider text-emerald-200">Constraint Suggestions</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 leading-relaxed">
                {result.ai_suggestions.map((suggestion, index) => (
                  <li key={`${suggestion}-${index}`}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{result.assignments?.length || 0} scheduled</span>
          </div>

          <button
            onClick={handlePrint}
            className="btn-secondary flex items-center gap-2 text-xs px-3.5 py-2 font-semibold shadow-sm hover:bg-slate-700/60 transition-colors"
            title="Print Clean A4 Landscape View"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Timetable
          </button>

          {onExport && (
            <button onClick={onExport} className="btn-outline flex items-center gap-2 text-xs px-3.5 py-2 font-semibold">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2-2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Excel
            </button>
          )}
        </div>
      </div>

      {/* ── Grid Table ── */}
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
                      <div className="flex flex-col gap-1.5">
                        {a.length === 0 && <span className="text-xs text-slate-400 opacity-60">—</span>}
                        {a.map((item, i) => <AssignmentCard key={`${item.subject}-${item.room}-${i}`} item={item} subjects={subjects} />)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Print-Only Institutional Footer with Signatures ── */}
      <div className="print-only mt-8 pt-6 border-t-2 border-slate-900">
        <div className="grid grid-cols-4 gap-6 text-center text-xs text-slate-900">
          <div>
            <div className="h-12 border-b border-slate-400 mb-2"></div>
            <p className="font-bold">Prepared By</p>
            <p className="text-[10px] text-slate-600">Timetable In-Charge</p>
          </div>
          <div>
            <div className="h-12 border-b border-slate-400 mb-2"></div>
            <p className="font-bold">Verified By</p>
            <p className="text-[10px] text-slate-600">Head of Department (HOD)</p>
          </div>
          <div>
            <div className="h-12 border-b border-slate-400 mb-2"></div>
            <p className="font-bold">Approved By</p>
            <p className="text-[10px] text-slate-600">Dean / Principal</p>
          </div>
          <div>
            <div className="h-12 border-2 border-dashed border-slate-400 mb-2 flex items-center justify-center text-[10px] text-slate-400">
              OFFICIAL STAMP
            </div>
            <p className="font-bold">Date & Institutional Seal</p>
            <p className="text-[10px] text-slate-600">Academic Affairs Cell</p>
          </div>
        </div>
      </div>
    </section>
  );
}
