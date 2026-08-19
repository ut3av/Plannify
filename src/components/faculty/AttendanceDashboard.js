import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import GooeyLoader from "../common/GooeyLoader";
import { API_BASE_URL as API } from "../../apiConfig";
import {
  getAttendanceRecords,
  logAttendanceEntry,
  subscribeToTable,
} from "../../services/realtimeFacultyService";

const STATUS_COLORS = {
  present: { bg: "#dcfce7", text: "#16a34a", label: "Present" },
  absent: { bg: "#fee2e2", text: "#dc2626", label: "Absent" },
  late: { bg: "#fef3c7", text: "#d97706", label: "Late" },
  "half-day": { bg: "#dbeafe", text: "#2563eb", label: "Half Day" },
  "on-duty": { bg: "#f3e8ff", text: "#7c3aed", label: "On Duty" },
  weekend: { bg: "#f1f5f9", text: "#94a3b8", label: "Weekend" },
  holiday: { bg: "#f1f5f9", text: "#94a3b8", label: "Holiday" },
};

export default function AttendanceDashboard({ facultyId, isTeacherView = false }) {
  const [records, setRecords] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date().toISOString().split("T")[0]);
  const [viewMode, setViewMode] = useState("daily"); // daily | monthly
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [importResult, setImportResult] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    faculty_id: facultyId || "",
    date: viewDate,
    punch_in: "09:00",
    punch_out: "17:00",
    status: "present",
    remarks: "",
  });
  const fileRef = useRef();

  // Keep manualForm.faculty_id in sync
  useEffect(() => {
    if (facultyId) {
      setManualForm((prev) => ({ ...prev, faculty_id: facultyId }));
    }
  }, [facultyId]);

  const fetchFaculty = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/faculty`, { timeout: 4000 });
      setFaculty(res.data || []);
    } catch (e) {
      // Graceful fallback
    }
  }, []);

  const fetchDailyRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAttendanceRecords({
        date: viewDate,
        facultyId: isTeacherView && facultyId ? facultyId : null,
      });
      setRecords(data);
    } catch (e) {
      console.error("Failed to load daily attendance:", e);
    } finally {
      setLoading(false);
    }
  }, [viewDate, facultyId, isTeacherView]);

  const fetchMonthlyRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAttendanceRecords({
        month: selectedMonth,
        year: selectedYear,
        facultyId: isTeacherView && facultyId ? facultyId : null,
      });
      setRecords(data);
    } catch (e) {
      console.error("Failed to load monthly attendance:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, facultyId, isTeacherView]);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  useEffect(() => {
    if (viewMode === "daily") fetchDailyRecords();
    else fetchMonthlyRecords();
  }, [viewMode, fetchDailyRecords, fetchMonthlyRecords]);

  // Real-Time Supabase Subscription
  useEffect(() => {
    const unsubAttendance = subscribeToTable("attendance_records", () => {
      if (viewMode === "daily") fetchDailyRecords();
      else fetchMonthlyRecords();
    });

    const unsubFaculty = subscribeToTable("faculty_profiles", () => {
      fetchFaculty();
    });

    // 10s fallback interval
    const interval = setInterval(() => {
      if (viewMode === "daily") fetchDailyRecords();
      else fetchMonthlyRecords();
    }, 10000);

    return () => {
      clearInterval(interval);
      unsubAttendance();
      unsubFaculty();
    };
  }, [viewMode, fetchDailyRecords, fetchMonthlyRecords, fetchFaculty]);

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/attendance/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(res.data);
      fetchDailyRecords();
    } catch (err) {
      alert(err.response?.data?.detail || "Import failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleManualEntry = async (e) => {
    e.preventDefault();
    if (!manualForm.faculty_id) {
      alert("Please select a faculty member");
      return;
    }
    try {
      await logAttendanceEntry(manualForm);
      setShowManualForm(false);
      setManualForm({
        faculty_id: facultyId || "",
        date: viewDate,
        punch_in: "09:00",
        punch_out: "17:00",
        status: "present",
        remarks: "",
      });
      fetchDailyRecords();
    } catch (err) {
      alert(err.message || "Failed to add record");
    }
  };

  const [simulating, setSimulating] = useState(false);
  const [simulationToast, setSimulationToast] = useState(null);

  const handleSimulateInflux = async () => {
    try {
      setSimulating(true);
      const res = await axios.post(`${API}/attendance/simulate-influx`, { count: 30, date: viewDate });
      setSimulationToast(res.data);
      if (viewMode === "daily") {
        fetchDailyRecords();
      } else {
        fetchMonthlyRecords();
      }
    } catch (e) {
      alert(e.response?.data?.detail || "Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  // Daily attendance summary
  const dailySummary = {
    total: records.length,
    present: records.filter((r) => r.status === "present" || r.status === "late" || r.status === "on-duty").length,
    absent: records.filter((r) => r.status === "absent").length,
    late: records.filter((r) => r.status === "late").length,
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isTeacherView ? "Personal Attendance Ledger" : "Attendance Dashboard"}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ● Live Biometric Sync
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isTeacherView
              ? "Live biometric punch records, working hours, and monthly attendance compliance"
              : "Track live faculty biometric check-ins, punch clocks, and attendance summaries"}
          </p>
        </div>

        {!isTeacherView && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSimulateInflux}
              disabled={simulating}
              className="btn-gradient gap-2 text-xs py-2 px-3.5 font-bold shadow-md hover:shadow-indigo-500/25 transition-all flex items-center"
              title="Simulate realistic morning biometric check-ins"
            >
              {simulating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Simulating Influx...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Simulate Morning Influx
                </>
              )}
            </button>
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className="btn-secondary gap-2 text-xs py-2 px-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Manual Punch
            </button>
            <label className="btn-primary gap-2 cursor-pointer text-xs py-2 px-3">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import CSV
              <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {/* Simulation Banner */}
      {simulationToast && (
        <div className="card p-4 animate-slide-down border-l-4 border-l-amber-500 bg-amber-500/10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">Live Biometric Simulation Active</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {simulationToast.message} (<strong>{simulationToast.present}</strong> Present, <strong>{simulationToast.late}</strong> Late, <strong>{simulationToast.absent}</strong> Absent)
                </p>
              </div>
            </div>
            <button onClick={() => setSimulationToast(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Import Result Banner */}
      {importResult && (
        <div className="card p-4 animate-slide-down border-l-4 border-l-green-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">Import Complete</p>
              <p className="text-xs text-slate-500 mt-1">
                {importResult.imported} imported · {importResult.matched} matched · {importResult.duplicates} updated · {importResult.unmatched} unmatched
              </p>
            </div>
            <button onClick={() => setImportResult(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Form */}
      {showManualForm && (
        <div className="card p-6 animate-slide-down bg-slate-900/95 border border-slate-700 text-slate-100">
          <h3 className="text-base font-black text-white mb-4">Manual Attendance Punch Entry</h3>
          <form onSubmit={handleManualEntry} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Faculty *</label>
              <select
                className="input bg-slate-800 border-slate-700 text-white"
                value={manualForm.faculty_id}
                onChange={(e) => setManualForm({ ...manualForm, faculty_id: e.target.value })}
                required
              >
                <option value="">-- Select Faculty --</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.teacher_name} ({f.employee_id || "Active"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Date *</label>
              <input
                type="date"
                className="input bg-slate-800 border-slate-700 text-white"
                value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Status</label>
              <select
                className="input bg-slate-800 border-slate-700 text-white"
                value={manualForm.status}
                onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half-day">Half Day</option>
                <option value="on-duty">On Duty</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Punch In</label>
              <input
                type="time"
                className="input bg-slate-800 border-slate-700 text-white"
                value={manualForm.punch_in}
                onChange={(e) => setManualForm({ ...manualForm, punch_in: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Punch Out</label>
              <input
                type="time"
                className="input bg-slate-800 border-slate-700 text-white"
                value={manualForm.punch_out}
                onChange={(e) => setManualForm({ ...manualForm, punch_out: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary flex-1 text-xs py-2.5 font-bold">Save Punch</button>
              <button type="button" onClick={() => setShowManualForm(false)} className="btn-secondary text-xs py-2.5">✕</button>
            </div>
          </form>
        </div>
      )}

      {/* View Controls & KPI summary */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex border rounded-xl overflow-hidden" style={{ borderColor: "var(--border-default)" }}>
              <button
                onClick={() => setViewMode("daily")}
                className={`px-3.5 py-1.5 text-xs font-bold transition-all ${
                  viewMode === "daily" ? "bg-amber-600 dark:bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Daily Log
              </button>
              <button
                onClick={() => setViewMode("monthly")}
                className={`px-3.5 py-1.5 text-xs font-bold transition-all ${
                  viewMode === "monthly" ? "bg-amber-600 dark:bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Monthly Summary
              </button>
            </div>

            {viewMode === "daily" ? (
              <input
                type="date"
                className="input w-auto text-xs py-1.5"
                value={viewDate}
                onChange={(e) => setViewDate(e.target.value)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <select
                  className="input w-auto text-xs py-1.5"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(+e.target.value)}
                >
                  {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  className="input w-20 text-xs py-1.5"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(+e.target.value)}
                  min="2020"
                  max="2030"
                />
              </div>
            )}
          </div>

          {viewMode === "daily" && (
            <div className="flex items-center gap-4">
              {[
                { label: "Present", count: dailySummary.present, color: "#16a34a" },
                { label: "Absent", count: dailySummary.absent, color: "#dc2626" },
                { label: "Late", count: dailySummary.late, color: "#d97706" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs font-semibold text-slate-500">
                    {s.label}: <strong className="text-slate-900 dark:text-white">{s.count}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attendance Data Table */}
      {loading ? (
        <div className="text-center py-16 animate-fade-in">
          <GooeyLoader
            size="md"
            text="Syncing attendance ledger..."
            subtitle="Processing biometric hardware punches"
          />
        </div>
      ) : records.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm font-semibold text-slate-300">
            No attendance records found for this {viewMode === "daily" ? "date" : "month"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Import a CSV from your biometric punch clock or add a manual punch above.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Faculty Member</th>
                <th>Employee ID</th>
                {viewMode === "daily" ? (
                  <>
                    <th>Punch In</th>
                    <th>Punch Out</th>
                    <th>Late (min)</th>
                    <th>Status</th>
                    <th>Source</th>
                  </>
                ) : (
                  <>
                    <th>Department</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Late</th>
                    <th>Attendance %</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id || i}>
                  <td>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {r.faculty_name || r.teacher_name || "Faculty Member"}
                    </span>
                  </td>
                  <td><span className="font-mono text-xs text-slate-400">{r.employee_id || "—"}</span></td>
                  {viewMode === "daily" ? (
                    <>
                      <td>
                        <span className="font-mono text-xs">
                          {r.punch_in ? new Date(r.punch_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-xs">
                          {r.punch_out ? new Date(r.punch_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </span>
                      </td>
                      <td>
                        {r.late_minutes > 0 ? (
                          <span className="text-amber-500 font-bold text-xs">+{r.late_minutes} min</span>
                        ) : (
                          <span className="text-emerald-500 text-xs">On Time</span>
                        )}
                      </td>
                      <td>
                        {STATUS_COLORS[r.status] ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: STATUS_COLORS[r.status].bg, color: STATUS_COLORS[r.status].text }}
                          >
                            {STATUS_COLORS[r.status].label}
                          </span>
                        ) : (
                          r.status
                        )}
                      </td>
                      <td className="text-xs text-slate-400 capitalize">{r.source || "biometric"}</td>
                    </>
                  ) : (
                    <>
                      <td>{r.department_name || r.department || "Computer Applications"}</td>
                      <td><span className="text-emerald-500 font-bold">{r.present}</span></td>
                      <td><span className="text-rose-500 font-bold">{r.absent}</span></td>
                      <td><span className="text-amber-500 font-bold">{r.late}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${r.attendance_percentage || 0}%`,
                                background: (r.attendance_percentage || 0) >= 75 ? "#16a34a" : (r.attendance_percentage || 0) >= 50 ? "#d97706" : "#dc2626",
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold">{r.attendance_percentage || 0}%</span>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
