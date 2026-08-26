import React, { useState, useMemo, useEffect } from "react";
import { useAcademic } from "../context/AcademicContext";

export default function RoomsSection({ rooms = [], onChange, result, timeSlots = [] }) {
  const { deleteRoom, deleteMultipleRooms } = useAcademic() || {};
  const [input, setInput] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // "all" | "classroom" | "lab" | "hall" | "congested"
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState("Room ");
  const [batchStart, setBatchStart] = useState(101);
  const [batchCount, setBatchCount] = useState(6);
  const [selectedRoomNames, setSelectedRoomNames] = useState(new Set());
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  const getRoomName = (r) => typeof r === "string" ? r.trim() : ((r?.room_number || r?.name || "") + "").trim();

  // Deduplicate incoming rooms to ensure clean state and avoid ghost duplicates
  const uniqueRooms = useMemo(() => {
    const seen = new Set();
    const list = [];
    (rooms || []).forEach(r => {
      const name = getRoomName(r);
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push(r);
      }
    });
    return list;
  }, [rooms]);

  // Clean up selected items that no longer exist
  useEffect(() => {
    setSelectedRoomNames(prev => {
      const validNames = new Set(uniqueRooms.map(r => getRoomName(r)));
      const next = new Set();
      prev.forEach(name => {
        if (validNames.has(name)) next.add(name);
      });
      return next;
    });
  }, [uniqueRooms]);

  // Auto-dismiss banners
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (warningMessage) {
      const timer = setTimeout(() => setWarningMessage(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [warningMessage]);

  // Realtime check for Quick Add input duplicate
  const trimmedInput = input.trim();
  const isInputDuplicate = useMemo(() => {
    if (!trimmedInput) return false;
    return uniqueRooms.some(r => getRoomName(r).toLowerCase() === trimmedInput.toLowerCase());
  }, [trimmedInput, uniqueRooms]);

  const addRoom = () => {
    const name = input.trim();
    if (!name) return;

    if (isInputDuplicate) {
      setWarningMessage(`A classroom or laboratory named "${name}" already exists. Please specify a unique venue name.`);
      return;
    }

    setWarningMessage("");
    setSuccessMessage(`Venue "${name}" added successfully.`);
    if (onChange) {
      onChange([...uniqueRooms, name]);
    }
    setInput("");
  };

  const removeRoom = async (room) => {
    const rName = getRoomName(room);
    if (!rName) return;

    if (window.confirm(`Are you sure you want to permanently remove "${rName}" from the space matrix?`)) {
      setSelectedRoomNames(prev => {
        const next = new Set(prev);
        next.delete(rName);
        return next;
      });

      if (deleteRoom) {
        await deleteRoom(room);
      } else if (onChange) {
        onChange(uniqueRooms.filter(r => getRoomName(r).toLowerCase() !== rName.toLowerCase()));
      }
      setSuccessMessage(`Venue "${rName}" removed.`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRoom();
    }
  };

  // Selection Handlers
  const toggleSelectRoom = (e, room) => {
    e && e.stopPropagation();
    const rName = getRoomName(room);
    if (!rName) return;

    setSelectedRoomNames(prev => {
      const next = new Set(prev);
      if (next.has(rName)) {
        next.delete(rName);
      } else {
        next.add(rName);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allFiltered = new Set(filteredRooms.map(r => getRoomName(r)).filter(Boolean));
    setSelectedRoomNames(allFiltered);
  };

  const deselectAll = () => {
    setSelectedRoomNames(new Set());
  };

  const handleBatchDelete = async () => {
    if (selectedRoomNames.size === 0) return;
    const selectedList = uniqueRooms.filter(r => selectedRoomNames.has(getRoomName(r)));
    if (selectedList.length === 0) {
      setSelectedRoomNames(new Set());
      return;
    }

    const confirmMsg = selectedList.length === 1
      ? `Are you sure you want to permanently remove "${getRoomName(selectedList[0])}"?`
      : `Are you sure you want to permanently remove these ${selectedList.length} classrooms/laboratories?`;

    if (!window.confirm(confirmMsg)) return;

    const count = selectedList.length;
    setSelectedRoomNames(new Set());

    if (deleteMultipleRooms) {
      await deleteMultipleRooms(selectedList);
    } else if (onChange) {
      const toDeleteSet = new Set(selectedList.map(r => getRoomName(r).toLowerCase()));
      onChange(uniqueRooms.filter(r => !toDeleteSet.has(getRoomName(r).toLowerCase())));
    }

    setSuccessMessage(`Successfully deleted ${count} venue(s).`);
  };

  // Batch Add Preview & Calculations
  const batchPreviewData = useMemo(() => {
    const list = [];
    let duplicates = 0;
    for (let i = 0; i < batchCount; i++) {
      const roomName = `${batchPrefix}${batchStart + i}`.trim();
      const exists = uniqueRooms.some(r => getRoomName(r).toLowerCase() === roomName.toLowerCase());
      if (exists) duplicates++;
      list.push({ name: roomName, exists });
    }
    return { list, duplicates, newCount: batchCount - duplicates };
  }, [batchPrefix, batchStart, batchCount, uniqueRooms]);

  // Batch Add Handler
  const handleBatchGenerate = (e) => {
    e.preventDefault();
    const newRooms = [...uniqueRooms];
    let addedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < batchCount; i++) {
      const roomName = `${batchPrefix}${batchStart + i}`.trim();
      if (!newRooms.some(r => getRoomName(r).toLowerCase() === roomName.toLowerCase())) {
        newRooms.push(roomName);
        addedCount++;
      } else {
        skippedCount++;
      }
    }

    if (addedCount === 0) {
      setWarningMessage(`All ${batchCount} venues in this range already exist. No duplicate venues were added.`);
      setShowBatchModal(false);
      return;
    }

    if (onChange) {
      onChange(newRooms);
    }

    if (skippedCount > 0) {
      setSuccessMessage(`Generated ${addedCount} new venue(s). ${skippedCount} duplicate venue(s) were skipped.`);
    } else {
      setSuccessMessage(`Generated ${addedCount} venues successfully.`);
    }
    setShowBatchModal(false);
  };

  const getType = (roomOrName) => {
    const name = getRoomName(roomOrName);
    const l = name.toLowerCase();
    const isLab = (typeof roomOrName === "object" && (roomOrName?.is_lab || roomOrName?.room_type === "LAB")) ||
      l.includes("lab") || l.includes("006") || l.includes("007") || l.includes("002") || l.includes("003");
    if (isLab) {
      return { label: "Laboratory", type: "lab", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10" };
    }
    if (l.includes("hall") || l.includes("aud") || l.includes("seminar")) {
      return { label: "Lecture Hall", type: "hall", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10" };
    }
    return { label: "Smart Classroom", type: "classroom", color: "text-sky-400", border: "border-sky-500/30", bg: "bg-sky-500/10" };
  };

  const assignments = result?.assignments || [];
  const daysCount = result?.days?.length || 5;
  const slotCount = (result?.time_slots || timeSlots || ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5"]).length;
  const totalWeeklySlots = Math.max(1, daysCount * slotCount);

  const getRoomUtilization = (roomOrName) => {
    const roomName = getRoomName(roomOrName);
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
    return uniqueRooms.filter(room => {
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
  }, [uniqueRooms, filterMode, assignments, totalWeeklySlots]);

  const isAllSelected = filteredRooms.length > 0 && filteredRooms.every(r => selectedRoomNames.has(getRoomName(r)));
  const isSomeSelected = selectedRoomNames.size > 0 && !isAllSelected;

  // Statistics
  const labCount = uniqueRooms.filter(r => getType(r).type === "lab").length;
  const classroomCount = uniqueRooms.filter(r => getType(r).type === "classroom").length;
  const hallCount = uniqueRooms.filter(r => getType(r).type === "hall").length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-20">
      {/* Toast / Notification Banners */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg shadow-emerald-500/5 animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-400 hover:text-emerald-200 p-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {warningMessage && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between shadow-lg shadow-amber-500/5 animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>{warningMessage}</span>
          </div>
          <button onClick={() => setWarningMessage("")} className="text-amber-400 hover:text-amber-200 p-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

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
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Classrooms, Labs & Space Matrix
                </h1>
                <span className="inline-flex items-center whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                  Real-Time Congestion
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage theory rooms, specialized computing/electronics labs, multi-venue batch deletion, and room occupancy load.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {selectedRoomNames.size > 0 && (
            <button
              onClick={handleBatchDelete}
              className="px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 border border-rose-500/40 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/20 animate-fade-in"
              title={`Delete ${selectedRoomNames.size} selected venue(s)`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              Delete Selected ({selectedRoomNames.size})
            </button>
          )}

          <button
            onClick={() => setShowBatchModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 shadow"
          >
            <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Batch Add Venues
          </button>

          <span className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs font-bold text-emerald-300">
            {uniqueRooms.length} Active Venues
          </span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Venues</p>
          <h3 className="text-2xl font-black text-white mt-1">{uniqueRooms.length}</h3>
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
      <div className="card p-5 bg-slate-900 border border-slate-800 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Quick Add Input with Real-time Duplicate Detection */}
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  className={`input-premium w-full bg-slate-800 text-white text-xs placeholder:text-slate-500 transition-colors ${
                    isInputDuplicate
                      ? "border-amber-500/70 focus:border-amber-500 ring-1 ring-amber-500/30"
                      : "border-slate-700 focus:border-indigo-500"
                  }`}
                  placeholder="e.g. Room 308/MCA or Lab Room No. 006..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                {isInputDuplicate && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <span>⚠️ Already Exists</span>
                  </span>
                )}
              </div>
              <button
                className={`px-5 py-2 rounded-xl text-xs font-bold gap-1.5 shrink-0 transition-all flex items-center ${
                  isInputDuplicate || !trimmedInput
                    ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                    : "btn-primary shadow-lg shadow-indigo-600/20"
                }`}
                onClick={addRoom}
                disabled={!trimmedInput || isInputDuplicate}
              >
                <span>+</span> Add Venue
              </button>
            </div>
            {isInputDuplicate && (
              <p className="text-[11px] text-amber-400 font-medium pl-1">
                A venue named &ldquo;{trimmedInput}&rdquo; is already in the matrix. Duplicate room names are not allowed.
              </p>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
            {[
              { id: "all", label: `All (${uniqueRooms.length})` },
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

        {/* Multi-Selection Control Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 font-semibold hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={el => {
                  if (el) el.indeterminate = isSomeSelected;
                }}
                onChange={() => {
                  if (isAllSelected) {
                    deselectAll();
                  } else {
                    selectAll();
                  }
                }}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500/50 cursor-pointer"
              />
              <span>{isAllSelected ? "Deselect All" : "Select All Filtered"}</span>
            </label>
            {selectedRoomNames.size > 0 && (
              <span className="text-slate-400 text-[11px]">
                ({selectedRoomNames.size} of {filteredRooms.length} selected)
              </span>
            )}
          </div>

          {selectedRoomNames.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={deselectAll}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors underline"
              >
                Clear Selection
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                Delete {selectedRoomNames.size} Selected
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Room Card Grid */}
      {filteredRooms.length === 0 ? (
        <div className="card p-12 text-center text-slate-500 border border-slate-800 bg-slate-900/50">
          <p className="text-sm font-semibold">No classrooms or laboratories match the selected filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room, idx) => {
            const rName = getRoomName(room);
            const type = getType(room);
            const util = getRoomUtilization(room);
            const isSelected = selectedRoomNames.has(rName);
            const cardKey = `room_card_${rName}_${idx}`;

            return (
              <div
                key={cardKey}
                onClick={(e) => toggleSelectRoom(e, room)}
                className={`card p-5 transition-all flex flex-col justify-between gap-4 cursor-pointer relative group ${
                  isSelected
                    ? "bg-slate-800/90 border-indigo-500/80 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10"
                    : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60"
                }`}
              >
                <div>
                  {/* Top Bar: Checkbox, Type Badge & Single Delete */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectRoom(e, room)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500/50 cursor-pointer"
                        title={`Select ${rName}`}
                      />
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 ${type.bg} ${type.border} ${type.color}`}>
                        <span>{type.label}</span>
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRoom(room);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-60 group-hover:opacity-100"
                      title={`Remove ${rName}`}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>

                  {/* Room Name */}
                  <h3 className="text-lg font-black text-white group-hover:text-indigo-300 transition-colors">
                    {rName}
                  </h3>

                  {/* Facilities Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5 text-[10px] font-semibold text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 flex items-center gap-1">
                      <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                      60 Seats
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60">
                      AV Projector
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60">
                      Climate Controlled
                    </span>
                    {type.type === "lab" && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Dual Monitor Stations
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

      {/* Floating Batch Actions Bar at Bottom */}
      {selectedRoomNames.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 animate-slide-up">
          <div className="flex items-center gap-4 px-6 py-3.5 rounded-2xl bg-slate-900/95 border border-indigo-500/40 backdrop-blur-md shadow-2xl shadow-black/80 ring-1 ring-indigo-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[11px]">
                {selectedRoomNames.size}
              </span>
              <span>{selectedRoomNames.size === 1 ? "Venue Selected" : "Venues Selected"}</span>
            </div>

            <div className="h-4 w-px bg-slate-700" />

            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Select All ({filteredRooms.length})
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                Delete Selected ({selectedRoomNames.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Add Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="card p-6 bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Batch Generate Venues
              </h3>
              <button onClick={() => setShowBatchModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
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
                    max={30}
                    min={1}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Number(e.target.value))}
                    className="input-premium w-full text-white"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300 text-[11px] space-y-2">
                <div className="flex justify-between items-center">
                  <span>Range Preview:</span>
                  <span className="font-bold text-indigo-300">
                    {batchPrefix}{batchStart} &rarr; {batchPrefix}{batchStart + batchCount - 1}
                  </span>
                </div>

                {batchPreviewData.duplicates > 0 && (
                  <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span>
                      {batchPreviewData.duplicates === batchCount
                        ? `All ${batchCount} venues in this range already exist.`
                        : `${batchPreviewData.duplicates} of ${batchCount} venues already exist and will be skipped.`}
                    </span>
                  </div>
                )}
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
                  disabled={batchPreviewData.newCount === 0}
                  className={`btn-primary px-5 py-2 text-xs font-bold shadow-lg ${
                    batchPreviewData.newCount === 0 ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Generate {batchPreviewData.newCount > 0 ? `${batchPreviewData.newCount} Venues` : "Venues"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
