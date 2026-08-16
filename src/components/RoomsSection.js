import { useState } from "react";

export default function RoomsSection({ rooms, onChange, result, timeSlots }) {
  const [input, setInput] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // all | low | optimal | high

  const addRoom = () => {
    const name = input.trim();
    if (name && !rooms.includes(name)) {
      onChange([...rooms, name]);
      setInput("");
    }
  };

  const removeRoom = (index) => {
    onChange(rooms.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); addRoom(); }
  };

  const getType = (name) => {
    const l = name.toLowerCase();
    if (l.includes("lab")) return { label: "Laboratory", color: "text-emerald-400" };
    if (l.includes("hall")) return { label: "Lecture Hall", color: "text-amber-400" };
    return { label: "Classroom", color: "text-sky-400" };
  };

  const assignments = result?.assignments || [];
  const daysCount = result?.days?.length || 5;
  const slotCount = (result?.time_slots || timeSlots || ["9-10", "10-11", "11-12", "12-1", "2-3"]).length;
  const totalWeeklySlots = Math.max(1, daysCount * slotCount);

  const getRoomUtilization = (roomName) => {
    if (!assignments || assignments.length === 0) return null;
    const occupied = assignments.filter(
      a => (a.room || "").trim().toLowerCase() === (roomName || "").trim().toLowerCase()
    ).length;
    const percentage = Math.round((occupied / totalWeeklySlots) * 100);

    if (percentage < 40) {
      return {
        percentage,
        occupied,
        level: "low",
        label: "Low",
        pillClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        barColor: "#10b981",
        description: "High availability"
      };
    } else if (percentage <= 75) {
      return {
        percentage,
        occupied,
        level: "optimal",
        label: "Optimal",
        pillClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        barColor: "#6366f1",
        description: "Balanced utilization"
      };
    } else {
      return {
        percentage,
        occupied,
        level: "high",
        label: "High Congestion",
        pillClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
        barColor: "#f59e0b",
        description: "Heavily utilized"
      };
    }
  };

  const filteredRooms = rooms.filter(room => {
    if (filterMode === "all") return true;
    const util = getRoomUtilization(room);
    if (!util) return true;
    return util.level === filterMode;
  });

  return (
    <div className="glass-card p-6 animate-scale-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" />
              </svg>
            </div>
            Classrooms & Room Congestion Heatmap
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage academic rooms and monitor real-time weekly schedule load & space congestion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {assignments.length > 0 && (
            <div className="flex border rounded-lg overflow-hidden text-xs" style={{ borderColor: "var(--border-default)" }}>
              {["all", "low", "optimal", "high"].map(mode => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-3 py-1.5 font-semibold capitalize transition-colors ${filterMode === mode ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  {mode === "high" ? "Congested" : mode}
                </button>
              ))}
            </div>
          )}
          <span className="text-sm font-semibold text-slate-500 bg-white dark:bg-white/[0.04] rounded-lg px-3 py-1.5 border border-slate-200 dark:border-white/[0.06]">
            {rooms.length} rooms
          </span>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <input 
          className="input-premium flex-1" 
          placeholder="e.g. Room 101, Lab 2, Main Aud..." 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={handleKeyDown} 
        />
        <button className="btn-gradient px-5" onClick={addRoom} disabled={!input.trim()}>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Room
          </span>
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm">No classrooms or laboratories added yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => {
            const originalIndex = rooms.indexOf(room);
            const type = getType(room);
            const util = getRoomUtilization(room);

            return (
              <div 
                key={room} 
                className="group flex flex-col justify-between rounded-xl bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] p-4 hover:bg-white/[0.05] hover:border-slate-300 dark:border-white/[0.1] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] flex items-center justify-center flex-shrink-0">
                      <svg className={`w-5 h-5 ${type.color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{room}</p>
                      <p className="text-[11px] text-slate-500">{type.label}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => removeRoom(originalIndex)} 
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100" 
                    title="Remove room"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>

                {/* Utilization Pill & Heatmap Metric */}
                {util ? (
                  <div className="mt-2 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[11px] text-slate-400">Weekly Load</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${util.pillClass}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: util.barColor }} />
                        {util.label} • {util.percentage}%
                      </span>
                    </div>

                    {/* Heatmap Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, util.percentage)}%`, backgroundColor: util.barColor }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>{util.occupied} of {totalWeeklySlots} periods</span>
                      <span>{util.description}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/[0.06] text-[11px] text-slate-500 flex items-center gap-1">
                    <span>Generate timetable to view live congestion</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
