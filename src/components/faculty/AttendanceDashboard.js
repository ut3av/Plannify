import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import GooeyLoader from "../common/GooeyLoader";

import { API_BASE_URL as API } from "../../apiConfig";

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
  const [manualForm, setManualForm] = useState({ faculty_id: facultyId || "", date: viewDate, punch_in: "", punch_out: "", status: "present", remarks: "" });
  const fileRef = useRef();

  const fetchFaculty = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/faculty/`);
      setFaculty(res.data || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchDailyRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = { date: viewDate };
      if (facultyId) params.faculty_id = facultyId;
      const res = await axios.get(`${API}/attendance/`, { params });
      let data = res.data || [];
      if (facultyId && Array.isArray(data)) {
        data = data.filter(r => r.faculty_id === facultyId);
      }
      setRecords(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [viewDate, facultyId]);

  const fetchMonthlyRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/attendance/report/monthly`, { params: { month: selectedMonth, year: selectedYear } });
      let data = res.data || [];
      if (facultyId && Array.isArray(data)) {
        data = data.filter(r => r.faculty_id === facultyId);
      }
      setRecords(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedMonth, selectedYear, facultyId]);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  useEffect(() => {
    if (viewMode === "daily") fetchDailyRecords();
    else fetchMonthlyRecords();
  }, [viewMode, fetchDailyRecords, fetchMonthlyRecords]);

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
    } catch (e) {
      alert(e.response?.data?.detail || "Import failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleManualEntry = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/attendance/manual`, manualForm);
      setShowManualForm(false);
      setManualForm({ faculty_id: "", date: viewDate, punch_in: "", punch_out: "", status: "present", remarks: "" });
      fetchDailyRecords();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to add record");
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
    present: records.filter(r => r.status === "present" || r.status === "late" || r.status === "on-duty").length,
    absent: records.filter(r => r.status === "absent").length,
    late: records.filter(r => r.status === "late").length,
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isTeacherView ? "Personal Attendance Ledger" : "Attendance Dashboard"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isTeacherView
              ? "View your biometric check-ins, punch logs, and compliance records"
              : "Track faculty attendance from biometric hardware punch machines and live influx simulations"}
          </p>
        </div>
        {!isTeacherView && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSimulateInflux}
              disabled={simulating}
              className="btn-gradient gap-2 text-xs py-2 px-3.5 font-bold shadow-md hover:shadow-indigo-500/25 transition-all flex items-center"
              title="Simulate realistic morning biometric check-ins (Hackathon Live Demo)"
            >
              {simulating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Simulating Influx...
                </>
              ) : (
                <>
                  <span>⚡</span>
                  Simulate Morning Influx (Live Demo)
                </>
              )}
            </button>
            <button onClick={() => setShowManualForm(!showManualForm)} className="btn-secondary gap-2 text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Manual Entry
            </button>
            <label className="btn-primary gap-2 cursor-pointer text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import CSV
              <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {/* Simulation Banner */}
      {simulationToast && (
        <div className="card p-4 mb-6 animate-slide-down border-l-4 border-l-amber-500 bg-amber-500/10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚡</span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">Live Biometric Simulation Active</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {simulationToast.message} (<strong>{simulationToast.present}</strong> Present, <strong>{simulationToast.late}</strong> Late, <strong>{simulationToast.absent}</strong> Absent)
                </p>
              </div>
            </div>
            <button onClick={() => setSimulationToast(null)} className="text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Import Result Banner */}
      {importResult && (
        <div className="card p-4 mb-6 animate-slide-down border-l-4 border-l-green-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">Import Complete</p>
              <p className="text-xs text-slate-500 mt-1">
                {importResult.imported} imported · {importResult.matched} matched · {importResult.duplicates} updated · {importResult.unmatched} unmatched
              </p>
              {importResult.unmatched_ids?.length > 0 && (
                <p className="text-xs text-amber-600 mt-1">Unmatched IDs: {importResult.unmatched_ids.join(", ")}</p>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Form */}
      {showManualForm && (
        <div className="card p-6 mb-6 animate-slide-down">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Manual Attendance Entry</h3>
          <form onSubmit={handleManualEntry} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Faculty *</label>
              <select className="input" value={manualForm.faculty_id} onChange={e => setManualForm({ ...manualForm, faculty_id: e.target.value })} required>
                <option value="">Select</option>
                {faculty.filter(f => f.status === "active").map(f => <option key={f.id} value={f.id}>{f.teacher_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date *</label>
              <input type="date" className="input" value={manualForm.date} onChange={e => setManualForm({ ...manualForm, date: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <select className="input" value={manualForm.status} onChange={e => setManualForm({ ...manualForm, status: e.target.value })}>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half-day">Half Day</option>
                <option value="on-duty">On Duty</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Punch In</label>
              <input type="time" className="input" value={manualForm.punch_in} onChange={e => setManualForm({ ...manualForm, punch_in: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Punch Out</label>
              <input type="time" className="input" value={manualForm.punch_out} onChange={e => setManualForm({ ...manualForm, punch_out: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary flex-1 text-sm">Save</button>
              <button type="button" onClick={() => setShowManualForm(false)} className="btn-secondary text-sm">×</button>
            </div>
          </form>
        </div>
      )}

      {/* View Controls */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex border rounded-lg overflow-hidden" style={{ borderColor: "var(--border-default)" }}>
            <button onClick={() => setViewMode("daily")} className={`px-4 py-2 text-xs font-semibold ${viewMode === "daily" ? "bg-blue-600 text-white" : "text-slate-500"}`}>Daily</button>
            <button onClick={() => setViewMode("monthly")} className={`px-4 py-2 text-xs font-semibold ${viewMode === "monthly" ? "bg-blue-600 text-white" : "text-slate-500"}`}>Monthly Report</button>
          </div>
          {viewMode === "daily" ? (
            <input type="date" className="input w-auto" value={viewDate} onChange={e => setViewDate(e.target.value)} />
          ) : (
            <div className="flex items-center gap-2">
              <select className="input w-auto" value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)}>
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
              <input type="number" className="input w-24" value={selectedYear} onChange={e => setSelectedYear(+e.target.value)} min="2020" max="2030" />
            </div>
          )}
          {viewMode === "daily" && (
            <div className="flex items-center gap-4 ml-auto">
              {[
                { label: "Present", count: dailySummary.present, color: "#16a34a" },
                { label: "Absent", count: dailySummary.absent, color: "#dc2626" },
                { label: "Late", count: dailySummary.late, color: "#d97706" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs font-semibold text-slate-500">{s.label}: <span className="text-slate-900 dark:text-white">{s.count}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="text-center py-16 animate-fade-in">
          <GooeyLoader
            size="md"
            text="Loading attendance records..."
            subtitle="Processing biometric ledger & punch events"
          />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          <p className="text-sm font-medium">No attendance records for this {viewMode === "daily" ? "date" : "period"}</p>
          <p className="text-xs text-slate-400 mt-1">Import a CSV from your punch machine or add manual entries</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Faculty</th>
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
                  <td><span className="font-semibold">{r.faculty_name || r.teacher_name || "—"}</span></td>
                  <td><span className="font-mono text-xs">{r.employee_id || "—"}</span></td>
                  {viewMode === "daily" ? (
                    <>
                      <td>{r.punch_in ? new Date(r.punch_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td>{r.punch_out ? new Date(r.punch_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td>{r.late_minutes > 0 ? <span className="text-amber-600 font-semibold">{r.late_minutes}</span> : "—"}</td>
                      <td>
                        {STATUS_COLORS[r.status] ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: STATUS_COLORS[r.status].bg, color: STATUS_COLORS[r.status].text }}>
                            {STATUS_COLORS[r.status].label}
                          </span>
                        ) : r.status}
                      </td>
                      <td className="text-xs text-slate-400 capitalize">{r.source}</td>
                    </>
                  ) : (
                    <>
                      <td>{r.department_name || "—"}</td>
                      <td><span className="text-green-600 font-semibold">{r.present}</span></td>
                      <td><span className="text-red-500 font-semibold">{r.absent}</span></td>
                      <td><span className="text-amber-600 font-semibold">{r.late}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                            <div className="h-2 rounded-full" style={{ width: `${r.attendance_percentage}%`, background: r.attendance_percentage >= 75 ? "#16a34a" : r.attendance_percentage >= 50 ? "#d97706" : "#dc2626" }} />
                          </div>
                          <span className="text-xs font-semibold">{r.attendance_percentage}%</span>
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
