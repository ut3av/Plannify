import React, { useState } from "react";

const TEMPLATE_PRESETS = [
  {
    name: "LNCT University (7 Periods + Lunch)",
    desc: "10:30 AM to 03:30 PM with 50-min lectures & lunch gap",
    slots: [
      "09:00 AM - 09:45 AM",
      "09:45 AM - 10:30 AM",
      "10:30 AM - 11:20 AM",
      "11:20 AM - 12:10 PM",
      "01:00 PM - 01:50 PM",
      "01:50 PM - 02:40 PM",
      "02:40 PM - 03:30 PM",
    ]
  },
  {
    name: "Full Day College (8 Periods)",
    desc: "09:00 AM to 04:30 PM with morning recess & lunch",
    slots: [
      "09:00 AM - 09:50 AM",
      "09:50 AM - 10:40 AM",
      "10:50 AM - 11:40 AM",
      "11:40 AM - 12:30 PM",
      "01:15 PM - 02:05 PM",
      "02:05 PM - 02:55 PM",
      "03:00 PM - 03:50 PM",
      "03:50 PM - 04:40 PM",
    ]
  },
  {
    name: "Morning Shift (6 Periods)",
    desc: "08:00 AM to 01:30 PM fast-paced morning sessions",
    slots: [
      "08:00 AM - 08:50 AM",
      "08:50 AM - 09:40 AM",
      "09:50 AM - 10:40 AM",
      "10:40 AM - 11:30 AM",
      "11:45 AM - 12:35 PM",
      "12:35 PM - 01:25 PM",
    ]
  },
  {
    name: "Engineering Lab Block (6 Slots)",
    desc: "60-min theory & 120-min continuous lab blocks",
    slots: [
      "09:00 AM - 10:00 AM",
      "10:00 AM - 11:00 AM",
      "11:15 AM - 12:15 PM",
      "01:00 PM - 02:00 PM",
      "02:00 PM - 03:00 PM",
      "03:00 PM - 04:00 PM",
    ]
  }
];

export default function TimeSlotsSection({ timeSlots = [], onChange }) {
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(50);
  const [lectures, setLectures] = useState(6);
  const [lunchBreak, setLunchBreak] = useState(true);
  const [lunchAfter, setLunchAfter] = useState(3);
  const [lunchDuration, setLunchDuration] = useState(50);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");

  const addSlot = () => {
    const s = input.trim();
    if (s && !timeSlots.includes(s)) {
      onChange([...timeSlots, s]);
      setInput("");
    }
  };

  const removeSlot = (index) => {
    onChange(timeSlots.filter((_, i) => i !== index));
  };

  const clearAllSlots = () => {
    if (window.confirm("Are you sure you want to clear all time slots?")) {
      onChange([]);
    }
  };

  const applyTemplate = (templateSlots) => {
    onChange([...templateSlots]);
  };

  const generateAutoSlots = () => {
    const [hours, mins] = startTime.split(":").map(Number);
    let currentMins = hours * 60 + mins;
    const newSlots = [];

    for (let i = 0; i < lectures; i++) {
      if (lunchBreak && i === lunchAfter) {
        currentMins += lunchDuration; // Skip lunch interval
      }
      const startH = Math.floor(currentMins / 60);
      const startM = currentMins % 60;
      const startAmPm = startH >= 12 ? "PM" : "AM";
      const startH12 = startH % 12 || 12;
      const startStr = `${String(startH12).padStart(2, "0")}:${String(startM).padStart(2, "0")} ${startAmPm}`;

      currentMins += duration;

      const endH = Math.floor(currentMins / 60);
      const endM = currentMins % 60;
      const endAmPm = endH >= 12 ? "PM" : "AM";
      const endH12 = endH % 12 || 12;
      const endStr = `${String(endH12).padStart(2, "0")}:${String(endM).padStart(2, "0")} ${endAmPm}`;

      newSlots.push(`${startStr} - ${endStr}`);
    }
    onChange(newSlots);
  };

  // Drag and Drop reordering handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newSlots = [...timeSlots];
    const draggedItem = newSlots[draggedIndex];
    newSlots.splice(draggedIndex, 1);
    newSlots.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    onChange(newSlots);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Bulk Shift Times by Offset (e.g. +15m or -15m)
  const shiftAllSlots = (offsetMins) => {
    const updated = timeSlots.map((slot) => {
      try {
        const [startPart, endPart] = slot.split("-").map(p => p.trim());
        const parseTime = (str) => {
          const [time, period] = str.split(" ");
          let [h, m] = time.split(":").map(Number);
          if (period === "PM" && h < 12) h += 12;
          if (period === "AM" && h === 12) h = 0;
          return h * 60 + m;
        };
        const formatTime = (totalMins) => {
          totalMins = (totalMins + 1440) % 1440;
          const h = Math.floor(totalMins / 60);
          const m = totalMins % 60;
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 || 12;
          return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
        };
        const newStart = formatTime(parseTime(startPart) + offsetMins);
        const newEnd = formatTime(parseTime(endPart) + offsetMins);
        return `${newStart} - ${newEnd}`;
      } catch {
        return slot;
      }
    });
    onChange(updated);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSlot();
    }
  };

  const handleStartEdit = (index, slot) => {
    setEditingIndex(index);
    setEditValue(slot);
  };

  const handleSaveEdit = (index) => {
    if (editValue.trim()) {
      const newSlots = [...timeSlots];
      newSlots[index] = editValue.trim();
      onChange(newSlots);
    }
    setEditingIndex(null);
  };

  const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Header Banner */}
      <div className="card p-6 bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Time Slots & Bell Schedule
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                  DRAG & DROP
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure academic periods, lecture lengths, recess intervals, and institutional time matrices.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => shiftAllSlots(-15)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition-all flex items-center gap-1"
            title="Shift all slots 15 minutes earlier"
          >
            ⏪ -15 min
          </button>
          <button
            onClick={() => shiftAllSlots(15)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition-all flex items-center gap-1"
            title="Shift all slots 15 minutes later"
          >
            ⏩ +15 min
          </button>
          {timeSlots.length > 0 && (
            <button
              onClick={clearAllSlots}
              className="px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-500/10 hover:bg-rose-200 dark:hover:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 text-xs font-bold text-rose-700 dark:text-rose-400 transition-all flex items-center gap-1"
            >
              🗑️ Clear
            </button>
          )}
          <span className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs font-bold text-amber-800 dark:text-amber-300">
            📊 {timeSlots.length} Active Periods/Day
          </span>
        </div>
      </div>

      {/* ── VISUAL TIMELINE STRIP ── */}
      {timeSlots.length > 0 && (
        <div className="card p-5 bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>📅</span> Daily Progression Timeline (Drag to re-order periods)
            </h3>
            <span className="text-[11px] text-slate-500">Hold & drag cards to adjust bell sequence</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5">
            {timeSlots.map((slot, index) => {
              const pNum = romanNumerals[index] || `#${index + 1}`;
              const isEditing = editingIndex === index;

              return (
                <div
                  key={`${slot}-${index}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative p-3 rounded-2xl border transition-all cursor-grab active:cursor-grabbing select-none group ${
                    draggedIndex === index
                      ? "opacity-40 scale-95 border-amber-500 bg-amber-500/20"
                      : "bg-slate-800/80 border-slate-700/70 hover:border-amber-500/50 hover:bg-slate-800 shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="px-2 py-0.5 rounded-md font-black bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] border border-amber-300 dark:border-amber-500/30">
                      Period {pNum}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(index, slot)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                        title="Edit slot"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => removeSlot(index)}
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                        title="Delete slot"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-1.5 mt-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="input-premium text-xs py-1 px-2 w-full text-white"
                        autoFocus
                      />
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => handleSaveEdit(index)}
                          className="px-2 py-0.5 rounded bg-emerald-600 text-[10px] font-bold text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="px-2 py-0.5 rounded bg-slate-700 text-[10px] text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-xs text-white leading-tight mt-1">{slot}</p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        <span>Lecture Window</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TWO-COLUMN AUTOMATION & QUICK TEMPLATES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Generator & Manual Input (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Smart Auto-Generate Form */}
          <div className="card p-6 bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>⚡</span> Automatic Schedule Generator
            </h3>
            <p className="text-xs text-slate-400">
              Calculate an entire day's slots automatically based on first bell time and lecture durations.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">First Bell Time</label>
                <input
                  type="time"
                  className="input-premium w-full bg-slate-800 border-slate-700 text-white font-mono"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Lecture Duration</label>
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1">
                  <button
                    onClick={() => setDuration(Math.max(15, duration - 5))}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-white flex items-center justify-center text-sm"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-black text-white text-xs">{duration} min</span>
                  <button
                    onClick={() => setDuration(duration + 5)}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-white flex items-center justify-center text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Lectures per Day</label>
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1">
                  <button
                    onClick={() => setLectures(Math.max(1, lectures - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-white flex items-center justify-center text-sm"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-black text-white text-xs">{lectures}</span>
                  <button
                    onClick={() => setLectures(lectures + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-white flex items-center justify-center text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Lunch Options */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500/30"
                  checked={lunchBreak}
                  onChange={(e) => setLunchBreak(e.target.checked)}
                />
                <span className="text-xs font-bold text-slate-200">Include Lunch / Recess Interval</span>
              </label>

              {lunchBreak && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-700/40">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Place Lunch After Period</label>
                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1">
                      <button
                        onClick={() => setLunchAfter(Math.max(1, lunchAfter - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-bold text-white text-xs">Period #{lunchAfter}</span>
                      <button
                        onClick={() => setLunchAfter(lunchAfter + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Lunch Break Length</label>
                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1">
                      <button
                        onClick={() => setLunchDuration(Math.max(10, lunchDuration - 5))}
                        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-bold text-white text-xs">{lunchDuration} min</span>
                      <button
                        onClick={() => setLunchDuration(lunchDuration + 5)}
                        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={generateAutoSlots}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 transition-all"
            >
              <span>⚡</span> Generate Complete Bell Schedule
            </button>
          </div>

          {/* Custom Slot Manual Adder */}
          <div className="card p-5 bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Add Individual Custom Slot</h3>
            <div className="flex gap-2">
              <input
                className="input-premium flex-1 bg-slate-800 border-slate-700 text-white text-xs placeholder:text-slate-500"
                placeholder="e.g. 03:30 PM - 04:30 PM (Extra Tutorial)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                className="btn-primary px-5 text-xs font-bold gap-1.5"
                onClick={addSlot}
                disabled={!input.trim()}
              >
                <span>+</span> Add Slot
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Pre-configured Academic Templates (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card p-6 bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>🏛️</span> Institutional Bell Templates
            </h3>
            <p className="text-xs text-slate-400">
              Select 1-click university timetable schedules optimized for AI solver constraints.
            </p>

            <div className="space-y-3">
              {TEMPLATE_PRESETS.map((tmpl, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60 hover:border-indigo-500/40 hover:bg-slate-800 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-white group-hover:text-indigo-300 transition-colors">
                        {tmpl.name}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                        {tmpl.slots.length} periods
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{tmpl.desc}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/40">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {tmpl.slots[0]?.split("-")[0]} → {tmpl.slots[tmpl.slots.length - 1]?.split("-")[1]}
                    </span>
                    <button
                      onClick={() => applyTemplate(tmpl.slots)}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-indigo-600/30 hover:bg-amber-600 dark:hover:bg-indigo-600 text-amber-800 dark:text-indigo-300 hover:text-white border border-amber-300 dark:border-indigo-500/40 transition-all flex items-center gap-1"
                    >
                      Apply Template ➔
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
