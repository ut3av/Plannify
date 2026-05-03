function BookIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function SchedulerForm({ form, loading, onChange, onGenerate }) {
  const updateField = (field, value) => {
    onChange({ ...form, [field]: value });
  };

  return (
    <section className="glass-card p-5">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-violet-400 mb-1">
          <BookIcon />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Schedule Inputs</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 ml-7">
          Comma-separated lists. One subject per line.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Teachers
          </span>
          <textarea
            className="glass-input mt-1.5 min-h-[72px] resize-y"
            value={form.teachers}
            onChange={(event) => updateField("teachers", event.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Subjects
          </span>
          <span className="mt-0.5 block text-[11px] text-slate-500">
            Format: Subject | Teacher | Required slots
          </span>
          <textarea
            className="glass-input mt-1.5 min-h-[120px] resize-y font-mono text-xs"
            value={form.subjects}
            onChange={(event) => updateField("subjects", event.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Classrooms
          </span>
          <textarea
            className="glass-input mt-1.5 min-h-[60px] resize-y"
            value={form.rooms}
            onChange={(event) => updateField("rooms", event.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Time Slots
          </span>
          <input
            className="glass-input mt-1.5"
            value={form.timeSlots}
            onChange={(event) => updateField("timeSlots", event.target.value)}
          />
        </label>
      </div>

      <button
        className="btn-gradient w-full mt-5 flex items-center justify-center gap-2"
        type="button"
        disabled={loading}
        onClick={onGenerate}
      >
        {loading ? (
          <>
            <LoadingSpinner />
            <span>Solving...</span>
          </>
        ) : (
          "Generate Timetable"
        )}
      </button>
    </section>
  );
}
