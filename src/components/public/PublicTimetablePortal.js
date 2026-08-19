import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import BrandLogo from '../common/BrandLogo';
import { supabase } from '../../supabaseClient';
import { DEMO_TIMETABLE_DATA, DEMO_RESULT, formatResult } from '../../data/demoTimetableData';

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const BRANCH_MAP = {
  "BCA": { name: "BCA (Bachelor of Computer Applications)", prefix: "BCA" },
  "MCA": { name: "MCA (Master of Computer Applications)", prefix: "MCA" },
  "AI-DA": { name: "AI & Data Analytics", prefix: "BAI" },
  "CSE": { name: "Computer Science & Engineering", prefix: "CSE" },
};

const DEFAULT_TIME_SLOTS = [
  "09:00 AM - 09:45 AM",
  "09:45 AM - 10:30 AM",
  "10:30 AM - 11:20 AM",
  "11:20 AM - 12:10 PM",
  "01:00 PM - 01:50 PM",
  "01:50 PM - 02:40 PM",
  "02:40 PM - 03:30 PM",
];

const parseCloudJson = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (Array.isArray(value) || typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const readCloudState = (data) => {
  if (!data) return null;
  return {
    teachers: parseCloudJson(data.teachers ?? data.room, []),
    sections: parseCloudJson(data.sections ?? data.email, []),
    subjects: parseCloudJson(data.subjects ?? data.day, []),
    rooms: parseCloudJson(data.rooms ?? data.subject, []),
    timeSlots: parseCloudJson(data.time_slots ?? data.timeSlots ?? data.teacher_name, DEFAULT_TIME_SLOTS),
    result: parseCloudJson(data.result, null),
  };
};

export default function PublicTimetablePortal() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const branchParam = searchParams.get("branch") || "BCA";
  const sectionParam = searchParams.get("section") || "";
  const dayParam = searchParams.get("day") || "all";
  const autoPrint = searchParams.get("print") === "true";

  const [timetableState, setTimetableState] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(branchParam);
  const [selectedSection, setSelectedSection] = useState(sectionParam);
  const [selectedDay, setSelectedDay] = useState(dayParam);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [showRealtimeToast, setShowRealtimeToast] = useState(false);
  const [realtimeMessage, setRealtimeMessage] = useState("");

  // Clock ticker for live period calculation
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial timetable state from Supabase / localStorage / Demo Data
  const loadInitialData = useCallback(async () => {
    let loadedFromCloud = false;

    // 1. Try Supabase cloud fetch first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('timetable_state')
          .select('*')
          .eq('id', 'draft')
          .single();

        if (data && !error) {
          const cloudState = readCloudState(data);
          if (cloudState && (cloudState.result || (cloudState.teachers && cloudState.teachers.length > 0))) {
            setTimetableState(cloudState);
            setIsLiveConnected(true);
            setLastSyncTime(new Date());
            loadedFromCloud = true;
          }
        }
      } catch (err) {
        console.warn("Public portal Supabase fetch note:", err);
      }
    }

    if (loadedFromCloud) return;

    // 2. Fallback to localStorage
    try {
      const stored = localStorage.getItem("planify_timetable_state");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.result || parsed.assignments || parsed.teachers)) {
          setTimetableState(parsed);
          setLastSyncTime(new Date());
          return;
        }
      }
    } catch (e) {
      console.warn("Local storage read note:", e);
    }

    // 3. Fallback to Demo Timetable
    setTimetableState({
      ...DEMO_TIMETABLE_DATA,
      result: formatResult(DEMO_RESULT),
    });
    setLastSyncTime(new Date());
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Supabase Real-Time Live Sync Subscription
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('public_live_timetable_stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'timetable_state', filter: 'id=eq.draft' },
        (payload) => {
          if (payload.new) {
            const cloudState = readCloudState(payload.new);
            if (cloudState) {
              setTimetableState(cloudState);
              setIsLiveConnected(true);
              setLastSyncTime(new Date());
              setRealtimeMessage("Schedule updated in real-time by administration!");
              setShowRealtimeToast(true);
              setTimeout(() => setShowRealtimeToast(false), 5000);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'substitution_log' },
        (payload) => {
          if (payload.new) {
            setRealtimeMessage(`Proxy Alert: ${payload.new.proxy_teacher_name || 'A proxy'} assigned for ${payload.new.original_teacher_name || 'faculty'}!`);
            setShowRealtimeToast(true);
            setTimeout(() => setShowRealtimeToast(false), 5000);
            // Re-fetch master state to refresh proxy indicators
            loadInitialData();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLiveConnected(true);
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, [loadInitialData]);

  // Sync state to URL params for 1-click sharing
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedBranch) params.set("branch", selectedBranch);
    if (selectedSection && selectedSection !== "ALL") params.set("section", selectedSection);
    if (selectedDay !== "all") params.set("day", selectedDay);
    setSearchParams(params, { replace: true });
  }, [selectedBranch, selectedSection, selectedDay, setSearchParams]);

  // Handle auto-print if triggered via QR code placard print
  useEffect(() => {
    if (autoPrint && timetableState) {
      const timeout = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [autoPrint, timetableState]);

  // Extract all sections, timeSlots, and raw assignments
  const { allSections, timeSlots, assignments } = useMemo(() => {
    if (!timetableState) {
      return { allSections: [], timeSlots: DEFAULT_TIME_SLOTS, assignments: [] };
    }

    const secs = timetableState.sections?.map(s => typeof s === 'string' ? s : (s?.name || s?.section_name)) || [
      "Section A (BCA-III)", "Section B (BCA-III)", "Section C (BCA-III)",
      "Section D (BCA-III)", "Section E (BCA-III)", "Section F (BCA-III)"
    ];

    const slots = (Array.isArray(timetableState.timeSlots) && timetableState.timeSlots.length > 0)
      ? timetableState.timeSlots
      : (timetableState.result?.time_slots || DEFAULT_TIME_SLOTS);

    let assignList = [];
    if (timetableState.result?.assignments) {
      assignList = timetableState.result.assignments;
    } else if (Array.isArray(timetableState.assignments)) {
      assignList = timetableState.assignments;
    }

    return {
      allSections: secs,
      timeSlots: slots,
      assignments: assignList,
    };
  }, [timetableState]);

  // Filter sections belonging to the active branch
  const branchSections = useMemo(() => {
    if (allSections.length === 0) return [];
    if (selectedBranch === "BCA") {
      const filtered = allSections.filter(s => String(s).toUpperCase().includes("BCA"));
      return filtered.length > 0 ? filtered : allSections;
    }
    if (selectedBranch === "MCA") {
      const filtered = allSections.filter(s => String(s).toUpperCase().includes("MCA"));
      return filtered.length > 0 ? filtered : allSections;
    }
    if (selectedBranch === "AI-DA") {
      const filtered = allSections.filter(s => String(s).toUpperCase().includes("AI") || String(s).toUpperCase().includes("DA"));
      return filtered.length > 0 ? filtered : allSections;
    }
    if (selectedBranch === "CSE") {
      const filtered = allSections.filter(s => String(s).toUpperCase().includes("CSE") || String(s).toUpperCase().includes("CS"));
      return filtered.length > 0 ? filtered : allSections;
    }
    return allSections;
  }, [allSections, selectedBranch]);

  // Set default selected section when branch changes
  useEffect(() => {
    if (branchSections.length > 0) {
      if (!selectedSection || !branchSections.includes(selectedSection)) {
        setSelectedSection(branchSections[0]);
      }
    }
  }, [branchSections, selectedSection]);

  // Current Live Period calculation
  const currentLiveSlot = useMemo(() => {
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const slot of timeSlots) {
      try {
        const [startStr, endStr] = slot.split("-").map(s => s.trim());
        const parseMinutes = (timeStr) => {
          const [time, modifier] = timeStr.split(" ");
          let [hours, mins] = time.split(":").map(Number);
          if (modifier === "PM" && hours < 12) hours += 12;
          if (modifier === "AM" && hours === 12) hours = 0;
          return hours * 60 + mins;
        };

        const startMin = parseMinutes(startStr);
        const endMin = parseMinutes(endStr);

        if (currentMinutes >= startMin && currentMinutes <= endMin) {
          return slot;
        }
      } catch {}
    }
    return null;
  }, [currentTime, timeSlots]);

  // Filter assignments for selected branch/section
  const filteredAssignments = useMemo(() => {
    if (!assignments || assignments.length === 0) return [];

    return assignments.filter((a) => {
      if (selectedSection && selectedSection !== "ALL") {
        return (a.section || "").toLowerCase() === String(selectedSection).toLowerCase();
      }
      if (branchSections.length > 0) {
        return branchSections.some(sec => String(sec).toLowerCase() === (a.section || "").toLowerCase());
      }
      return true;
    });
  }, [assignments, selectedSection, branchSections]);

  // Build clean 2D dictionary: grid[day][slot] = [items]
  const displayTimetable = useMemo(() => {
    const grid = {};
    DAYS.forEach(d => {
      grid[d] = {};
      timeSlots.forEach(s => {
        grid[d][s] = [];
      });
    });

    filteredAssignments.forEach(item => {
      const d = item.day;
      const s = item.slot;
      if (grid[d] && grid[d][s]) {
        const alreadyExists = grid[d][s].some(
          existing => existing.code === item.code && existing.section === item.section && existing.teacher === item.teacher
        );
        if (!alreadyExists) {
          grid[d][s].push(item);
        }
      }
    });

    return grid;
  }, [filteredAssignments, timeSlots]);

  const displayedDays = selectedDay === "all" ? DAYS : [selectedDay];
  const branchInfo = BRANCH_MAP[selectedBranch] || { name: `${selectedBranch} Department`, prefix: selectedBranch };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* ── Real-Time Notification Toast ── */}
      {showRealtimeToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down max-w-sm bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 no-print">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div className="text-xs">
            <p className="font-bold">Live Schedule Synchronized</p>
            <p className="opacity-90">{realtimeMessage}</p>
          </div>
          <button
            onClick={() => setShowRealtimeToast(false)}
            className="ml-auto text-white/80 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Top Bar / Header ── */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm no-print px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  LNCT Student Timetable Portal
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1 border ${
                    isLiveConnected
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30"
                      : "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30"
                  }`}
                  title={lastSyncTime ? `Last synced at ${lastSyncTime.toLocaleTimeString()}` : "Connecting..."}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isLiveConnected ? "bg-emerald-600 dark:bg-emerald-400 animate-pulse" : "bg-amber-500"}`} />
                  {isLiveConnected ? "Real-Time Live Sync" : "Syncing..."}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {branchInfo.name} • Session 2026–2027
                {lastSyncTime && (
                  <span className="hidden sm:inline ml-2 opacity-75 font-mono text-[10px]">
                    (Updated {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              title="Print Clean A4 Landscape View"
            >
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Schedule
            </button>
          </div>
        </div>
      </header>

      {/* ── Branch & Section Navigation Filter Bar ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 no-print shadow-sm">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Branch Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 shrink-0">
                Branch:
              </span>
              {Object.keys(BRANCH_MAP).map((bKey) => (
                <button
                  key={bKey}
                  onClick={() => setSelectedBranch(bKey)}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                    selectedBranch === bKey
                      ? "bg-emerald-700 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {bKey}
                </button>
              ))}
            </div>

            {/* Day Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Day:
              </span>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="input-premium text-xs py-1 px-2.5 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-white"
              >
                <option value="all">Full Week (Mon - Fri)</option>
                {DAYS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section Tabs for Current Branch */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 shrink-0 mr-1">
              Sections:
            </span>
            <button
              onClick={() => setSelectedSection("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedSection === "ALL"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              All Sections
            </button>
            {branchSections.map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedSection === sec
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Timetable Workspace Container ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* ── Institutional Print Header (Shown only during Print) ── */}
        <div className="print-only mb-6 border-b-2 border-slate-900 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                LNCT University Bhopal (M.P.)
              </h1>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                School of Engineering & Technology • Department of Computer Applications
              </p>
              <h2 className="text-sm font-black text-indigo-900 uppercase mt-1">
                Academic Schedule: {selectedSection === "ALL" ? `${selectedBranch} (All Sections)` : selectedSection}
              </h2>
            </div>
            <div className="text-right text-xs text-slate-800">
              <p><strong>Session:</strong> 2026-2027</p>
              <p><strong>Status:</strong> Approved Master Schedule</p>
              <p><strong>Date:</strong> {new Date().toLocaleDateString("en-IN")}</p>
            </div>
          </div>
        </div>

        {/* ── Active View Title Banner ── */}
        <div className="glass-card p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm no-print">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{selectedSection === "ALL" ? `${selectedBranch} (All Branch Sections)` : selectedSection}</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {filteredAssignments.length} Weekly Teaching & Practical Sessions Configured
            </p>
          </div>

          {currentLiveSlot && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-ping" />
              <span>Current Ongoing Slot: {currentLiveSlot}</span>
            </div>
          )}
        </div>

        {/* ── Master Grid Table ── */}
        <div className="overflow-x-auto rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm print-container">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 text-[11px] font-black uppercase tracking-wider">
                <th className="py-3 px-3.5 border-r border-slate-300 dark:border-slate-700 w-20 text-center">
                  Day
                </th>
                {timeSlots.map((slot, idx) => {
                  const isCurrent = slot === currentLiveSlot;
                  return (
                    <th
                      key={idx}
                      className={`py-3 px-3 border-r border-slate-300 dark:border-slate-700 text-center font-extrabold ${
                        isCurrent
                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500 ring-inset"
                          : ""
                      }`}
                    >
                      <div className="text-slate-900 dark:text-slate-100">{slot.split("-")[0]}</div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                        to {slot.split("-")[1]}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {displayedDays.map((day) => (
                <tr key={day} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Day Label Cell */}
                  <td className="py-4 px-3 border-r border-slate-300 dark:border-slate-800 text-center font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-900/50">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-xs">
                      {day}
                    </span>
                  </td>

                  {/* Slot Cells */}
                  {timeSlots.map((slot, slotIdx) => {
                    const cellItems = displayTimetable[day]?.[slot] || [];
                    const isCurrent = slot === currentLiveSlot;

                    return (
                      <td
                        key={slotIdx}
                        className={`p-2 border-r border-slate-200 dark:border-slate-800 align-top min-w-[130px] ${
                          isCurrent ? "bg-emerald-50/40 dark:bg-emerald-500/5" : ""
                        }`}
                      >
                        {cellItems.length === 0 ? (
                          <div className="h-full min-h-[64px] flex items-center justify-center text-slate-400 dark:text-slate-600 text-[11px] font-medium italic">
                            —
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {cellItems.map((item, itemIdx) => {
                              const isLab = !!item.is_lab || !!item.isLab;
                              const isProxy = !!item.is_proxy || !!item.isProxy;
                              return (
                                <div
                                  key={itemIdx}
                                  className={`p-2.5 rounded-xl border transition-all text-xs space-y-1 ${
                                    isProxy
                                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-100"
                                      : isLab
                                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100"
                                      : "bg-indigo-50/70 dark:bg-slate-800/90 border-indigo-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                                  }`}
                                >
                                  {/* Subject Code & Type */}
                                  <div className="flex items-center justify-between gap-1 font-black">
                                    <span className="tracking-tight text-indigo-950 dark:text-indigo-300 text-[11px]">
                                      {item.code ? `[${item.code}]` : item.subject}
                                    </span>
                                    <div className="flex gap-1 items-center">
                                      {isProxy && (
                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-200 border border-amber-400/50">
                                          Proxy
                                        </span>
                                      )}
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                          isLab
                                            ? "bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-200"
                                            : "bg-indigo-200 dark:bg-indigo-900/60 text-indigo-950 dark:text-indigo-200"
                                        }`}
                                      >
                                        {isLab ? "Lab" : "Lecture"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Full Subject Title */}
                                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight">
                                    {item.subject}
                                  </p>

                                  {/* Teacher & Venue Tags */}
                                  <div className="pt-1 border-t border-slate-200/80 dark:border-slate-700/60 text-[10px] space-y-0.5">
                                    <div className="flex items-center gap-1 font-bold">
                                      {isProxy ? (
                                        <div className="text-amber-800 dark:text-amber-300 truncate">
                                          <span className="line-through opacity-60 mr-1 text-[9px]">{item.original_teacher || item.originalTeacher}</span>
                                          <span>↳ {item.teacher} (Proxy)</span>
                                        </div>
                                      ) : (
                                        <div className="text-emerald-800 dark:text-emerald-400 truncate flex items-center gap-1">
                                          <span>👤</span>
                                          <span className="truncate">{item.teacher}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-medium">
                                      <span className="flex items-center gap-1">
                                        <span>📍</span>
                                        <span>{item.room || "Assigned Room"}</span>
                                      </span>
                                      {selectedSection === "ALL" && item.section && (
                                        <span className="font-mono text-[9px] px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                          {item.section.split(" ")[0]}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Institutional Print Footer Signatures ── */}
        <div className="print-only mt-12 pt-8 border-t border-slate-400 text-slate-800 text-xs font-semibold">
          <div className="grid grid-cols-3 gap-8 text-center pt-6">
            <div>
              <div className="border-t border-slate-800 pt-2 font-bold">
                Time Table In-Charge
              </div>
              <p className="text-[10px] text-slate-600">Department of Computer Applications</p>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-2 font-bold">
                Head of Department (HOD)
              </div>
              <p className="text-[10px] text-slate-600">School of Engineering & Technology</p>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-2 font-bold">
                Dean Academics
              </div>
              <p className="text-[10px] text-slate-600">LNCT University, Bhopal (M.P.)</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
