import React, { useState, useMemo } from "react";

export default function RoomsSection({ rooms = [], onChange, result, timeSlots = [] }) {
  const [input, setInput] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // "all" | "classroom" | "lab" | "hall" | "congested"
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState("Room ");
  const [batchStart, setBatchStart] = useState(101);
  const [batchCount, setBatchCount] = useState(6);

  const addRoom = () => {
    const name = input.trim();
    if (name && !rooms.includes(name)) {
      onChange([...rooms, name]);
      setInput("");
    }
  };

  const removeRoom = (index) => {
    if (window.confirm("Are you sure you want to remove this classroom/lab?")) {
      onChange(rooms.filter((_, i) => i !== index));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRoom();
    }
  };

  // Batch Add Handler
  const handleBatchGenerate = (e) => {
    e.preventDefault();
    const newRooms = [...rooms];
    for (let i = 0; i < batchCount; i++) {
      const roomName = `${batchPrefix}${batchStart + i}`;
      if (!newRooms.includes(roomName)) {
        newRooms.push(roomName);
      }
    }
    onChange(newRooms);
    setShowBatchModal(false);
  };

  const getType = (name) => {
    const l = name.toLowerCase();
    if (l.includes("lab") || l.includes("006") || l.includes("007") || l.includes("002") || l.includes("003")) {
      return { label: "Laboratory", type: "lab", icon: "🔬", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10" };
    }
    if (l.includes("hall") || l.includes("aud") || l.includes("seminar")) {
      return { label: "Lecture Hall / Aud", type: "hall", icon: "🎭", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10" };
    }
    return { label: "Smart Classroom", type: "classroom", icon: "🏛️", color: "text-sky-400", border: "border-sky-500/30", bg: "bg-sky-500/10" };
  };

  const assignments = result?.assignments || [];
  const daysCount = result?.days?.length || 5;
  const slotCount = (result?.time_slots || timeSlots || ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5"]).length;
  const totalWeeklySlots = Math.max(1, daysCount * slotCount);

  const getRoomUtilization = (roomName) => {
    if (!assignments || assignments.length === 0) return { percentage: 0, occupied: 0, level: "low", label: "Available", pillClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", barColor: "#10b981" };
    const occupied = assignments.filter(
      a => (a.room || "").trim().toLowerCase() === (roomName || "").trim().toLowerCase()
    ).length;
    const percentage = Math.round((occupied / totalWeeklySlots) * 100);

    if (percentage < 35) {
      return {
        percentage,
        occupied,
        level: "low",
        label: "High Availability",
        pillClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        barColor: "#10b981"
      };
    } else if (percentage <= 75) {
      return {
        percentage,
        occupied,
        level: "optimal",
        label: "Balanced Load",
        pillClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
        barColor: "#818cf8"
      };
    } else {
      return {
        percentage,
        occupied,
        level: "congested",
        label: "High Congestion",
        pillClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        barColor: "#f59e0b"
      };
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      if (filterMode === "all") return true;
      const typeInfo = getType(room);
      if (filterMode === "classroom" && typeInfo.type === "classroom") return true;
      if (filterMode === "lab" && typeInfo.type === "lab") return true;
      if (filterMode === "hall" && typeInfo.type === "hall") return true;
      if (filterMode === "congested") {
        const util = getRoomUtilization(room);
        return util.level === "congested";
      }
      return false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, filterMode, assignments, totalWeeklySlots]);

  // Statistics
  const labCount = rooms.filter(r => getType(r).type === "lab").length;
  const classroomCount = rooms.filter(r => getType(r).type === "classroom").length;
  const hallCount = rooms.filter(r => getType(r).type === "hall").length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Header Banner */}
      <div className="card p-6 bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <path d="M9 22v-4h6v4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Classrooms, Labs & Space Matrix
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  REAL-TIME CONGESTION
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage theory rooms, specialized computing/electronics labs, seating capacities, and room occupancy load.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowBatchModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 shadow"
          >
            <span>⚡</span> Batch Add Rooms
          </button>
          <span className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs font-bold text-emerald-300">
            🏛️ {rooms.length} Active Venues
          </span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Venues</p>
          <h3 className="text-2xl font-black text-white mt-1">{rooms.length}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Available for scheduling</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-400">Smart Classrooms</p>
          <h3 className="text-2xl font-black text-sky-400 mt-1">{classroomCount}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Theory & Tutorial spaces</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Laboratories</p>
          <h3 className="text-2xl font-black text-emerald-400 mt-1">{labCount}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Continuous 2-period lab slots</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Auditoriums / Halls</p>
          <h3 className="text-2xl font-black text-amber-400 mt-1">{hallCount}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Combined section events</p>
        </div>
      </div>

      {/* Quick Add Bar & Filter Chips */}
      <div className="card p-5 bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Quick Add Input */}
        <div className="flex-1 flex gap-2">
          <input
            className="input-premium flex-1 bg-slate-800 border-slate-700 text-white text-xs placeholder:text-slate-500"
            placeholder="e.g. Room 308/MCA or Lab Room No. 006..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="btn-primary px-5 text-xs font-bold gap-1.5 shrink-0"
            onClick={addRoom}
            disabled={!input.trim()}
          >
            <span>+</span> Add Venue
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: `All (${rooms.length})` },
            { id: "classroom", label: `Classrooms (${classroomCount})` },
            { id: "lab", label: `Labs (${labCount})` },
            { id: "hall", label: `Lecture Halls (${hallCount})` },
            { id: "congested", label: `Congested` }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterMode === f.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room Card Grid */}
      {filteredRooms.length === 0 ? (
        <div className="card p-12 text-center text-slate-500 border border-slate-800 bg-slate-900/50">
          <p className="text-sm font-semibold">No classrooms or laboratories match the selected filter.</p>
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
                className="card p-5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition-all flex flex-col justify-between gap-4 group"
              >
                <div>
                  {/* Top Bar: Type Badge & Delete */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 ${type.bg} ${type.border} ${type.color}`}>
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                    <button
                      onClick={() => removeRoom(originalIndex)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-60 group-hover:opacity-100"
                      title="Remove venue"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Room Name */}
                  <h3 className="text-lg font-black text-white group-hover:text-indigo-300 transition-colors">
                    {room}
                  </h3>

                  {/* Facilities Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5 text-[10px] font-semibold text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60">
                      👥 60 Seats
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60">
                      📽️ Projector
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60">
                      ❄️ AC
                    </span>
                    {type.type === "lab" && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        ⚡ Dual Screen
                      </span>
                    )}
                  </div>
                </div>

                {/* Utilization Progress Bar */}
                <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[11px] font-semibold">Weekly Occupancy:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${util.pillClass}`}>
                      {util.percentage}% ({util.occupied} classes)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, util.percentage)}%`, backgroundColor: util.barColor }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Batch Add Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="card p-6 bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>⚡</span> Batch Generate Venues
              </h3>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleBatchGenerate} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Prefix / Name Format</label>
                <input
                  type="text"
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value)}
                  className="input-premium w-full text-white"
                  placeholder="e.g. Room  or Lab "
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Start Number</label>
                  <input
                    type="number"
                    value={batchStart}
                    onChange={(e) => setBatchStart(Number(e.target.value))}
                    className="input-premium w-full text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase tracking-wider block mb-1">How Many</label>
                  <input
                    type="number"
                    max={20}
                    min={1}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Number(e.target.value))}
                    className="input-premium w-full text-white"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300 text-[11px]">
                Preview: <strong className="text-indigo-300">{batchPrefix}{batchStart}</strong> to <strong className="text-indigo-300">{batchPrefix}{batchStart + batchCount - 1}</strong> ({batchCount} venues)
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-5 py-2 text-xs font-bold shadow-lg"
                >
                  Generate {batchCount} Venues
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
