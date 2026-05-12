import { useState } from "react";

const PRESETS = ["08:00 AM - 09:00 AM", "09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM", "12:00 PM - 01:00 PM", "01:00 PM - 02:00 PM", "02:00 PM - 03:00 PM", "03:00 PM - 04:00 PM", "04:00 PM - 05:00 PM"];

export default function TimeSlotsSection({ timeSlots, onChange }) {
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState("10:30");
  const [duration, setDuration] = useState(50);
  const [lectures, setLectures] = useState(5);
  const [lunchBreak, setLunchBreak] = useState(true);
  const [lunchAfter, setLunchAfter] = useState(2);
  const [lunchDuration, setLunchDuration] = useState(50);

  const addSlot = () => {
    const s = input.trim();
    if (s && !timeSlots.includes(s)) {
      onChange([...timeSlots, s]);
      setInput("");
    }
  };

  const generateAutoSlots = () => {
    const [hours, mins] = startTime.split(":").map(Number);
    let currentMins = hours * 60 + mins;
    const newSlots = [];
    
    for (let i = 0; i < lectures; i++) {
      if (lunchBreak && i === lunchAfter) {
        currentMins += lunchDuration; // Skip lunch time
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

  const removeSlot = (index) => onChange(timeSlots.filter((_, i) => i !== index));

  const togglePreset = (slot) => {
    if (timeSlots.includes(slot)) {
      onChange(timeSlots.filter((s) => s !== slot));
    } else {
      onChange([...timeSlots, slot]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); addSlot(); }
  };

  return (
    <div className="glass-card p-6 animate-scale-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            Time Slots
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-10">Select from presets or add custom time slots for each day.</p>
        </div>
        <span className="text-sm font-semibold text-slate-500 bg-white dark:bg-white/[0.04] rounded-lg px-3 py-1.5 border border-slate-200 dark:border-white/[0.06]">{timeSlots.length} slots/day</span>
      </div>

      {/* Auto Generate */}
      <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Auto-Generate Schedule</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] items-end">
          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Start Time</label>
            <input type="time" className="input-premium w-full" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Duration (mins)</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setDuration(Math.max(1, duration - 5))} className="w-8 h-[42px] rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white">-</button>
              <span className="w-10 text-center font-black text-white">{duration}</span>
              <button onClick={() => setDuration(duration + 5)} className="w-8 h-[42px] rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white">+</button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Lectures / Day</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setLectures(Math.max(1, lectures - 1))} className="w-8 h-[42px] rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white">-</button>
              <span className="w-10 text-center font-black text-white">{lectures}</span>
              <button onClick={() => setLectures(lectures + 1)} className="w-8 h-[42px] rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white">+</button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] items-end mt-3">
          <div className="flex items-center h-[42px]">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-amber-500 focus:ring-amber-500/30 cursor-pointer"
                checked={lunchBreak}
                onChange={(e) => setLunchBreak(e.target.checked)}
              />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:text-slate-300">Add Lunch Break</span>
            </label>
          </div>
          {lunchBreak ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Lunch After</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setLunchAfter(Math.max(1, lunchAfter - 1))} className="w-8 h-[42px] rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white">-</button>
                  <span className="w-10 text-center font-black text-white">{lunchAfter}</span>
                  <button onClick={() => setLunchAfter(lunchAfter + 1)} className="w-8 h-[42px] rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white">+</button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Lunch Duration</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setLunchDuration(Math.max(1, lunchDuration - 5))} className="w-8 h-[42px] rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white">-</button>
                  <span className="w-10 text-center font-black text-white">{lunchDuration}</span>
                  <button onClick={() => setLunchDuration(lunchDuration + 5)} className="w-8 h-[42px] rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white">+</button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div /><div />
            </>
          )}
          <button className="btn-outline h-[42px] px-4 whitespace-nowrap text-xs" onClick={generateAutoSlots}>
            <svg className="w-3.5 h-3.5 mr-1.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
            Generate Slots
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Quick select</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((slot) => {
            const active = timeSlots.includes(slot);
            return (
              <button key={slot} onClick={() => togglePreset(slot)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                  active
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-200 shadow-sm shadow-amber-500/10"
                    : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-white/[0.04] hover:border-slate-300 dark:border-white/[0.1]"
                }`}
              >{slot}</button>
            );
          })}
        </div>
      </div>

      {/* Custom input */}
      <div className="flex gap-2 mb-6">
        <input className="input-premium flex-1" placeholder="Custom slot e.g. 05:00 PM - 06:00 PM..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} />
        <button className="btn-gradient px-5" onClick={addSlot} disabled={!input.trim()}>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add
          </span>
        </button>
      </div>

      {/* Active slots */}
      {timeSlots.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Active slots (in order)</p>
          <div className="flex flex-wrap gap-2">
            {timeSlots.map((slot, index) => (
              <div key={`${slot}-${index}`} className="group flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-sm font-medium text-amber-200">
                <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                {slot}
                <button onClick={() => removeSlot(index)} className="ml-1 p-0.5 rounded text-amber-400/50 hover:text-red-400 transition-colors">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
