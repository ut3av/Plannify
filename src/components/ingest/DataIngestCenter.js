import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL as API } from "../../apiConfig";
import { useAcademic } from "../../context/AcademicContext";
import GooeyLoader from "../common/GooeyLoader";

export default function DataIngestCenter() {
  const { refreshAcademicState } = useAcademic() || {};

  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview | programs | faculty | subjects | sections | rooms | allocations | shifts
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch recent audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const res = await axios.get(`${API}/ingest/audit-logs`);
      if (res.data && Array.isArray(res.data)) {
        setAuditLogs(res.data);
      }
    } catch (e) {
      console.warn("Failed to fetch audit logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      analyzeFile(selected);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      analyzeFile(dropped);
    }
  };

  // Analyze file via API
  const analyzeFile = async (targetFile) => {
    try {
      setAnalyzing(true);
      setError(null);
      setPreview(null);
      setCommitResult(null);

      const formData = new FormData();
      formData.append("file", targetFile);

      const res = await axios.post(`${API}/ingest/analyze`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 45000,
      });

      setPreview(res.data);
      setActiveTab("overview");
    } catch (err) {
      console.error("Document analysis error:", err);
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : (detail?.message || "Failed to analyze the document. Ensure it is a valid PDF or Excel file.");
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // Quick sample analysis
  const analyzeSample = async (sampleKey) => {
    try {
      setAnalyzing(true);
      setError(null);
      setPreview(null);
      setCommitResult(null);

      const res = await axios.get(`${API}/ingest/sample/${sampleKey}`, { timeout: 45000 });
      setPreview(res.data);
      setActiveTab("overview");
    } catch (err) {
      console.error("Sample analysis error:", err);
      setError(err?.response?.data?.detail || "Could not load sample data.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Commit approved preview to database
  const handleCommit = async () => {
    if (!preview) return;
    try {
      setCommitting(true);
      setError(null);

      const res = await axios.post(`${API}/ingest/commit`, {
        preview_payload: preview,
        user_name: "Administrator",
      });

      setCommitResult(res.data);
      fetchAuditLogs();

      if (refreshAcademicState) {
        refreshAcademicState();
      }
    } catch (err) {
      console.error("Commit error:", err);
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : (detail?.message || "Database transactional commit failed.");
      setError(msg);
    } finally {
      setCommitting(false);
    }
  };

  const resetAll = () => {
    setPreview(null);
    setCommitResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const stats = preview?.summary_stats || {};
  const fileInfo = preview?.file_info || {};

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ── 1. Page Header & Live Status ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-purple-500/10 border border-amber-500/20 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-500">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Academic Data Ingestion & OCR Intelligence Center
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                12-Stage Institutional Document Pipeline • Multi-Program UG/PG Roster & Room Allocation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            ✓ 0-Conflict Guarantee Gate
          </span>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Supabase Authoritative
          </span>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            UG + PG Shared Resources
          </span>
        </div>
      </div>

      {/* ── 2. Error Display ── */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm flex items-start gap-3 animate-slide-down">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-xs hover:underline opacity-80">Dismiss</button>
        </div>
      )}

      {/* ── 3. File Upload & Sample Loader Zone ── */}
      {!preview && !analyzing && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Box */}
          <div
            className={`lg:col-span-2 border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
              isDragOver
                ? "border-amber-500 bg-amber-500/10 scale-[1.01]"
                : "border-slate-300 dark:border-slate-800 hover:border-amber-500/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.xlsx,.xls,.xlsm"
              className="hidden"
            />
            <div className="w-16 h-16 mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
              Upload Institutional Academic File
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md">
              Drag & drop your <strong>PDF Timetable</strong> or <strong>Subject Allocation Excel Workbook</strong> (.xlsx, .pdf).
            </p>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                PDF Tables
              </span>
              <span className="px-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Excel Sub-AllOC
              </span>
              <span className="px-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Teaching Load
              </span>
              <span className="px-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Room Shifts
              </span>
            </div>
          </div>

          {/* Quick Institutional Sample Loader */}
          <div className="p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                <span>⚡</span> Instant Institutional Samples
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Click any bundled institutional document to test extraction, normalization, and preview:
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => analyzeSample("bca_pdf")}
                  className="w-full text-left p-3 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors">
                      📄 BCA-I Semester PDF
                    </p>
                    <p className="text-[11px] text-slate-500">7 Sections (A–G), 8 Subjects, Mentors</p>
                  </div>
                  <span className="text-xs text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">Analyze →</span>
                </button>

                <button
                  onClick={() => analyzeSample("bca_excel")}
                  className="w-full text-left p-3 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-500 transition-colors">
                      📊 BCA-I Semester Excel
                    </p>
                    <p className="text-[11px] text-slate-500">Structured Spreadsheet Layout</p>
                  </div>
                  <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Analyze →</span>
                </button>

                <button
                  onClick={() => analyzeSample("subject_alloc_excel")}
                  className="w-full text-left p-3 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-500 transition-colors">
                      📑 Subject Allocation July-Dec 2026
                    </p>
                    <p className="text-[11px] text-slate-500">Multi-Sheet: BCA, MCA, Labs, Shifts</p>
                  </div>
                  <span className="text-xs text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">Analyze →</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 text-center">
              Deterministic parsing with OCR fallback
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Analysis Loading Indicator ── */}
      {analyzing && (
        <div className="p-16 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 backdrop-blur-xl flex flex-col items-center justify-center text-center animate-fade-in">
          <GooeyLoader
            size="lg"
            text="Running Document Ingestion Pipeline"
            subtitle="Parsing tables, normalizing faculty/subjects, and auditing duplicate entities..."
          />
        </div>
      )}

      {/* ── 5. Post-Commit Reconciliation Report ── */}
      {commitResult && (
        <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-slate-900 dark:text-white backdrop-blur-xl animate-scale-up">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xl font-bold">
              ✓
            </span>
            <div>
              <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
                Institutional Data Committed Successfully!
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Audit Log ID: <code className="font-mono text-emerald-600 dark:text-emerald-400">{commitResult.audit_log_id}</code>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-6">
            {Object.entries(commitResult.records_inserted || {}).map(([entity, count]) => (
              <div key={entity} className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-emerald-500/20 text-center">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{count}</p>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{entity}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={resetAll}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg transition-all"
            >
              Import Another Document
            </button>
            <a
              href="/timetable"
              className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-all"
            >
              Go to Timetable Workspace →
            </a>
          </div>
        </div>
      )}

      {/* ── 6. Interactive Import Preview & Admin Confirmation ── */}
      {preview && !commitResult && (
        <div className="space-y-6 animate-fade-in">
          {/* File Meta & Action Bar */}
          <div className="p-6 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  {fileInfo.file_type}
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {fileInfo.filename}
                </h2>
                {fileInfo.is_reimport && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-purple-500/20 text-purple-400">
                    Previously Imported
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                SHA-256 Hash: <span className="font-mono text-[11px]">{fileInfo.file_hash?.substring(0, 24)}...</span> • Size: {(fileInfo.file_size_bytes / 1024).toFixed(1)} KB
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={resetAll}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={committing}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {committing ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    Committing to Supabase...
                  </>
                ) : (
                  <>
                    <span>✓</span> Confirm & Commit Valid Records
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-2xl font-bold text-blue-500">{stats.total_sections || 0}</p>
              <p className="text-xs font-medium text-slate-500">Sections</p>
            </div>

            <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-2xl font-bold text-amber-500">{stats.total_faculty || 0}</p>
              <p className="text-xs font-medium text-slate-500">Faculty Members</p>
              <p className="text-[10px] text-emerald-500">+{stats.new_faculty || 0} New</p>
            </div>

            <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-2xl font-bold text-purple-500">{stats.total_subjects || 0}</p>
              <p className="text-xs font-medium text-slate-500">Subjects / Labs</p>
            </div>

            <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-2xl font-bold text-emerald-500">{stats.total_allocations || 0}</p>
              <p className="text-xs font-medium text-slate-500">Course Allocations</p>
            </div>

            <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-2xl font-bold text-cyan-500">{stats.total_rooms || 0}</p>
              <p className="text-xs font-medium text-slate-500">Rooms & Labs</p>
            </div>

            <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-2xl font-bold text-orange-500">{stats.duplicate_faculty || 0}</p>
              <p className="text-xs font-medium text-slate-500">Fuzzy Matches</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
            {[
              { id: "overview", label: "🎓 Programs & Hierarchy" },
              { id: "faculty", label: `👨‍🏫 Faculty (${stats.total_faculty || 0})` },
              { id: "subjects", label: `📚 Subjects (${stats.total_subjects || 0})` },
              { id: "sections", label: `🏛️ Sections (${stats.total_sections || 0})` },
              { id: "rooms", label: `🏢 Rooms & Labs (${stats.total_rooms || 0})` },
              { id: "allocations", label: `🔗 Allocations (${stats.total_allocations || 0})` },
              { id: "shifts", label: `🔄 Room Shifts (${preview.room_shifts?.length || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB 1: Programs & Hierarchy Tree ── */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(preview.programs_hierarchy || []).map((prog) => (
                  <div key={prog.code} className="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {prog.level} Program
                        </span>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">
                          {prog.name} ({prog.code})
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400">
                        {prog.semesters?.length || 0} Semester(s)
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(prog.semesters || []).map((sem) => (
                        <div key={sem.semester_number} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                            {sem.semester_name}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(sem.sections || []).map((sec) => (
                              <span key={sec.full_name} className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm">
                                {sec.full_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 2: Faculty Roster ── */}
          {activeTab === "faculty" && (
            <div className="p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 backdrop-blur-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Faculty Name</th>
                    <th className="pb-3 font-semibold">Designation</th>
                    <th className="pb-3 font-semibold">Department</th>
                    <th className="pb-3 font-semibold">Contact / Phone</th>
                    <th className="pb-3 font-semibold">Workload Limit</th>
                    <th className="pb-3 font-semibold">Database Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(preview.faculty_preview?.new || []).map((fac, idx) => (
                    <tr key={`new-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 font-bold text-slate-800 dark:text-slate-100">{fac.teacher_name}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{fac.designation}</td>
                      <td className="py-3 text-slate-500">{fac.department}</td>
                      <td className="py-3 text-slate-500 font-mono">{fac.phone || "—"}</td>
                      <td className="py-3 text-slate-500">{fac.max_weekly_hours || 18} Periods/Wk</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          + NEW
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(preview.faculty_preview?.existing || []).map((fac, idx) => (
                    <tr key={`exist-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 opacity-80">
                      <td className="py-3 font-bold text-slate-800 dark:text-slate-100">{fac.matched_name}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">Assistant Professor</td>
                      <td className="py-3 text-slate-500">Computer Applications</td>
                      <td className="py-3 text-slate-500 font-mono">—</td>
                      <td className="py-3 text-slate-500">18 Periods/Wk</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          Matched Existing
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TAB 3: Subjects Catalog ── */}
          {activeTab === "subjects" && (
            <div className="p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 backdrop-blur-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Subject Code</th>
                    <th className="pb-3 font-semibold">Course Name</th>
                    <th className="pb-3 font-semibold">Program</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Credits / Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(preview.subjects_preview?.new || []).map((sub, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{sub.code}</td>
                      <td className="py-3 font-medium text-slate-800 dark:text-slate-100">{sub.name}</td>
                      <td className="py-3 text-slate-500">{sub.program_code}</td>
                      <td className="py-3">
                        {sub.is_lab ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            Laboratory
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            Theory
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-500">{sub.credit_hours || 4.0} Credits (4 Slots)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TAB 4: Sections & Mentors ── */}
          {activeTab === "sections" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(preview.sections_preview || []).map((sec, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {sec.program_code} Sem {sec.semester_number}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{sec.section_name}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">{sec.full_name}</h4>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 text-xs space-y-1">
                    <p className="text-slate-500">
                      <strong className="text-slate-700 dark:text-slate-300">Mentor:</strong> {sec.mentor_name || "Assigned by HOD"}
                    </p>
                    {sec.mentor_phone && (
                      <p className="text-slate-500 font-mono text-[11px]">
                        <strong>Phone:</strong> {sec.mentor_phone}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TAB 5: Rooms & Labs ── */}
          {activeTab === "rooms" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(preview.rooms_preview?.new || []).map((r, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${r.room_type === "LAB" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
                      {r.room_type}
                    </span>
                    <span className="text-xs text-slate-400">{r.capacity || 60} Seats</span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{r.room_number}</h4>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {r.has_projector && <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">Projector</span>}
                    {r.has_smart_board && <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Smart LED</span>}
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{r.building_name || "Ramnath Guha Block"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TAB 6: Faculty-Subject Allocations ── */}
          {activeTab === "allocations" && (
            <div className="p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 backdrop-blur-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Section / Cohort</th>
                    <th className="pb-3 font-semibold">Course Code</th>
                    <th className="pb-3 font-semibold">Subject Name</th>
                    <th className="pb-3 font-semibold">Allocated Faculty</th>
                    <th className="pb-3 font-semibold">Weekly Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(preview.allocations_preview?.new || []).map((alloc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 font-medium text-slate-700 dark:text-slate-300">{alloc.section_full_name}</td>
                      <td className="py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{alloc.subject_code}</td>
                      <td className="py-3 text-slate-800 dark:text-slate-200">{alloc.subject_name}</td>
                      <td className="py-3 font-bold text-slate-900 dark:text-white">{alloc.faculty_name}</td>
                      <td className="py-3 text-slate-500">{alloc.weekly_load || 4} Slots/Wk</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TAB 7: Room Shifts ── */}
          {activeTab === "shifts" && (
            <div className="p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">
                Operational Classroom Shifts (LNCT MCA Building → Agriculture Building)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(preview.room_shifts || []).map((shift, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-100 mb-2">{shift.class}</p>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>{shift.from_room} ({shift.from_building})</span>
                      <span>→</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{shift.to_room} ({shift.to_building})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 7. Previous Ingest Audit Logs Drawer ── */}
      <div className="p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>🛡️</span> Ingestion Traceability & Audit Logs
          </h3>
          <button onClick={fetchAuditLogs} className="text-xs text-amber-500 hover:underline">
            Refresh Logs
          </button>
        </div>

        {loadingLogs ? (
          <p className="text-xs text-slate-500">Loading audit history...</p>
        ) : auditLogs.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No previous import logs recorded in this session.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-2">Imported File</th>
                  <th className="pb-2">Format</th>
                  <th className="pb-2">Operator</th>
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {auditLogs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{log.filename}</td>
                    <td className="py-2.5 uppercase font-mono text-[10px]">{log.file_type}</td>
                    <td className="py-2.5 text-slate-500">{log.imported_by_name}</td>
                    <td className="py-2.5 text-slate-500 text-[11px]">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
