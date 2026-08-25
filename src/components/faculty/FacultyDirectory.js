import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { provisioningAuthClient, supabase } from "../../supabaseClient";
import DispatchPreviewModal from "../common/DispatchPreviewModal";
import GooeyLoader from "../common/GooeyLoader";
import { parseFacultyExcelData, uploadFacultyAndSectionsToCloud } from "../../utils/excelImportUtils";
import { isTestOrMockFaculty, useAcademic } from "../../context/AcademicContext";

import { API_BASE_URL as API } from "../../apiConfig";

export default function FacultyDirectory({
  onSelectFaculty,
  teachers = [],
  subjects = [],
  sections = [],
  result,
  onAddFaculty,
  onBatchImport,
  onTeachersChange,
}) {
  const { handleBatchImportData: contextBatchImport, sections: contextSections, deleteFacultyProfile, deleteMultipleFacultyProfiles } = useAcademic() || {};
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingAccounts, setSyncingAccounts] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [createdAccountInfo, setCreatedAccountInfo] = useState(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid | table
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletedKeys, setDeletedKeys] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [dispatchTeacher, setDispatchTeacher] = useState(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    teacher_name: "",
    employee_id: "",
    department_id: "",
    designation: "Assistant Professor",
    qualification: "",
    employment_type: "full-time",
    joining_date: new Date().toISOString().split("T")[0],
    phone: "",
    email: "",
    createAuthAccount: true,
    accountPassword: "Plannify@2026",
  });

  // Monotonic sequence counter to prevent stale async responses from overwriting newer state
  const fetchSequenceRef = useRef(0);

  const fetchFaculty = useCallback(async (isSilent = false) => {
    const thisSequence = ++fetchSequenceRef.current;
    try {
      if (!isSilent) setLoading(true);

      // SINGLE SOURCE OF TRUTH: Supabase faculty_profiles only
      const { data: supaData, error: supaErr } = await supabase
        .from('faculty_profiles')
        .select('*, departments(name)')
        .order('teacher_name');

      // If a newer fetch was initiated while this one was in-flight, discard this result
      if (fetchSequenceRef.current !== thisSequence) return;

      if (supaErr) {
        console.error("Supabase faculty fetch error:", supaErr);
        // On error, do NOT overwrite state with stale/empty data — keep current state
        return;
      }

      const profiles = (Array.isArray(supaData) ? supaData : []).map((f) => ({
        ...f,
        department_name: f.departments?.name || f.department_name || f.department || "Computer Applications",
      }));

      // Always set faculty — including empty array when database has 0 records
      setFaculty(profiles);
    } catch (err) {
      console.error("Failed to fetch faculty:", err);
    } finally {
      if (fetchSequenceRef.current === thisSequence) {
        setLoading(false);
      }
    }
  }, []); // Stable: no deps — Supabase client is module-level singleton

  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('departments').select('*').order('name');
      if (!error && Array.isArray(data) && data.length > 0) {
        setDepartments(data);
        return;
      }
    } catch (err) {
      // Try backend
    }

    try {
      const res = await axios.get(`${API}/faculty/departments`, { timeout: 3500 });
      if (res.data && Array.isArray(res.data)) {
        setDepartments(res.data);
      }
    } catch (e) {
      console.warn("Failed to fetch departments:", e);
    }
  }, []);

  useEffect(() => {
    fetchFaculty(false);
    fetchDepartments();

    // ONE stable Supabase Realtime subscription — created on mount, removed on unmount
    let supaChannel = null;
    if (supabase) {
      supaChannel = supabase
        .channel('realtime_faculty_directory')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'faculty_profiles' },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const newProfile = {
                ...payload.new,
                department_name: payload.new.department_name || payload.new.department || "Computer Applications",
              };
              setFaculty(prev => {
                // Deduplicate: if a record with this ID already exists, update it; otherwise prepend
                const exists = prev.some(f => f.id === newProfile.id);
                if (exists) {
                  return prev.map(f => f.id === newProfile.id ? { ...f, ...newProfile } : f);
                }
                return [newProfile, ...prev];
              });
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              setFaculty(prev => prev.map(f => f.id === payload.new.id ? { ...f, ...payload.new } : f));
            } else if (payload.eventType === 'DELETE' && payload.old) {
              const oldId = payload.old.id;
              setFaculty(prev => prev.filter(f => f.id !== oldId));
              // Also clear from deletedKeys tracking
              setDeletedKeys(prev => {
                const next = new Set(prev);
                next.delete(oldId);
                return next;
              });
            }
            // NOTE: We do NOT call fetchFaculty(true) here — the local state mutation
            // above is sufficient and avoids race conditions / stale overwrites
          }
        )
        .subscribe();
    }

    return () => {
      if (supaChannel && supabase) {
        supabase.removeChannel(supaChannel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps: subscribe ONCE on mount, unsubscribe on unmount

  const getFacultyKey = (f) => {
    if (!f) return "";
    return f.id ? String(f.id) : (f.teacher_name || f.name || "").trim().toLowerCase();
  };

  const toggleSelectFaculty = (e, f) => {
    e && e.stopPropagation();
    const key = getFacultyKey(f);
    if (!key) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleDelete = async (e, f) => {
    e && e.stopPropagation();
    const facultyName = f.teacher_name || f.name;
    const facultyId = f.id;
    if (!window.confirm(`Are you sure you want to permanently remove ${facultyName} from the faculty directory?`)) {
      return;
    }

    try {
      const key = getFacultyKey(f);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });

      // Optimistic removal — save snapshot for rollback
      const previousFaculty = faculty;
      setDeletedKeys(prev => new Set([...prev, facultyId]));
      setFaculty(prev => prev.filter(item => item.id !== facultyId));

      try {
        if (deleteFacultyProfile) {
          await deleteFacultyProfile(facultyId, facultyName);
        } else {
          if (facultyId && !facultyId.toString().startsWith("ocr-")) {
            await axios.delete(`${API}/faculty/${facultyId}?hard_delete=true`);
          }
        }
        setSuccessMessage(`${facultyName} removed from faculty directory.`);
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (deleteErr) {
        // Rollback: restore previous state on failure
        console.error("Delete failed, rolling back:", deleteErr);
        setFaculty(previousFaculty);
        setDeletedKeys(prev => {
          const next = new Set(prev);
          next.delete(facultyId);
          return next;
        });
        setErrorMessage(`Failed to delete ${facultyName}. The server may have rejected the request.`);
      }
    } catch (err) {
      console.error("Failed to delete faculty:", err);
      setErrorMessage("An unexpected error occurred during deletion.");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const selectedList = filtered.filter(f => selectedIds.has(getFacultyKey(f)));
    if (selectedList.length === 0) {
      setSelectedIds(new Set());
      return;
    }

    const confirmMsg = selectedList.length === 1
      ? `Are you sure you want to permanently delete ${selectedList[0].teacher_name || selectedList[0].name}?`
      : `Are you sure you want to permanently delete these ${selectedList.length} faculty profiles from the system?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsBatchDeleting(true);
      setErrorMessage("");

      const deletedIds = new Set(selectedList.map(f => f.id).filter(Boolean));

      // Optimistic removal — save snapshot for rollback
      const previousFaculty = faculty;
      setDeletedKeys(prev => new Set([...prev, ...deletedIds]));
      setFaculty(prev => prev.filter(f => !deletedIds.has(f.id)));
      setSelectedIds(new Set());

      try {
        if (deleteMultipleFacultyProfiles) {
          await deleteMultipleFacultyProfiles(selectedList);
        } else {
          for (const f of selectedList) {
            if (deleteFacultyProfile) {
              await deleteFacultyProfile(f.id, f.teacher_name || f.name);
            } else if (f.id && !f.id.toString().startsWith("ocr-")) {
              await axios.delete(`${API}/faculty/${f.id}?hard_delete=true`).catch(() => null);
            }
          }
        }
        setSuccessMessage(`Successfully deleted ${selectedList.length} faculty member(s).`);
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (deleteErr) {
        // Rollback on failure
        console.error("Batch delete failed, rolling back:", deleteErr);
        setFaculty(previousFaculty);
        deletedIds.forEach(id => {
          setDeletedKeys(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        });
        setErrorMessage("Failed to complete batch deletion. Please try again.");
      }
    } catch (err) {
      console.error("Batch delete error:", err);
      setErrorMessage("Failed to complete batch deletion. Please try again.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleActivate = async (e, f) => {
    e && e.stopPropagation();
    const facultyName = f.teacher_name || f.name;
    try {
      if (f.id && !f.id.toString().startsWith("ocr-")) {
        await axios.put(`${API}/faculty/${f.id}`, { status: "active" }).catch(() => null);
      }
      setDeletedKeys(prev => {
        const next = new Set(prev);
        next.delete(f.id);
        next.delete(facultyName?.trim().toLowerCase());
        return next;
      });
      setFaculty(prev => prev.map(item => (item.id === f.id || item.teacher_name === facultyName) ? { ...item, status: "active" } : item));
    } catch (err) {
      console.error("Failed to activate faculty:", err);
    }
  };

  // Faculty list derived directly from Supabase state — NO merging from teachers prop or subjects
  const allFaculty = useMemo(() => {
    return faculty.filter(f => !deletedKeys.has(f.id) && !isTestOrMockFaculty(f.teacher_name));
  }, [faculty, deletedKeys]);

  const handleSyncAccounts = async () => {
    try {
      setSyncingAccounts(true);
      setErrorMessage("");
      setSuccessMessage("");
      await fetchFaculty(false);
      await fetchDepartments();
      setSuccessMessage(`Faculty Directory synchronized with Supabase (${faculty.length} records).`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (e) {
      console.error("Failed to sync accounts:", e);

      setErrorMessage("Failed to refresh faculty accounts from backend.");
    } finally {
      setSyncingAccounts(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdAccountInfo) return;
    const text = `Plannify Faculty Portal Credentials:\n━━━━━━━━━━━━━━━━━━━━━\nName: ${createdAccountInfo.name}\nEmail / Login ID: ${createdAccountInfo.email}\nInitial Password: ${createdAccountInfo.password}\nPortal Link: ${window.location.origin}\n━━━━━━━━━━━━━━━━━━━━━\nLog in with role 'Faculty Member' to view your timetable schedule & attendance.`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 3000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setCreatedAccountInfo(null);
    setIsSubmitting(true);

    const newTeacherName = form.teacher_name.trim();
    if (!newTeacherName) {
      setErrorMessage("Please provide a faculty name.");
      setIsSubmitting(false);
      return;
    }

    const deptObj = departments.find(d => d.id === form.department_id);
    const deptName = deptObj ? deptObj.name : (form.department_id || "Computer Applications");
    const empId = form.employee_id.trim() || `EMP-LNCT-${Math.floor(1000 + Math.random() * 9000)}`;
    const teacherEmail = form.email.trim() || `${newTeacherName.toLowerCase().replace(/[^a-z0-9]/g, '.') || 'faculty'}@lnctu.ac.in`;
    const teacherPhone = form.phone.trim() || "+91-9876543210";
    const initialPassword = form.accountPassword || "Plannify@2026";
    const generatedId = `fac_${Date.now()}`;

    // 1. Immediately create and register new teacher object in client state
    const newTeacherObj = {
      id: generatedId,
      name: newTeacherName,
      department: deptName,
      email: teacherEmail,
      phone: teacherPhone,
      employee_id: empId,
      designation: form.designation || "Assistant Professor",
      qualification: form.qualification.trim() || "M.Tech / Ph.D",
      employment_type: form.employment_type || "full-time",
      joining_date: form.joining_date || new Date().toISOString().split("T")[0],
      free_periods: 1,
      status: "active",
      has_account: !!form.createAuthAccount,
    };

    if (onAddFaculty) {
      onAddFaculty(newTeacherObj);
    } else if (onTeachersChange && Array.isArray(teachers)) {
      if (!teachers.some(t => (t.name || t)?.trim().toLowerCase() === newTeacherName.toLowerCase())) {
        onTeachersChange([...teachers, newTeacherObj]);
      }
    }

    // Add to local faculty list immediately
    setFaculty(prev => [
      ...prev.filter(f => f.teacher_name?.trim().toLowerCase() !== newTeacherName.toLowerCase()),
      {
        id: generatedId,
        teacher_name: newTeacherName,
        employee_id: empId,
        department_name: deptName,
        designation: newTeacherObj.designation,
        qualification: newTeacherObj.qualification,
        employment_type: newTeacherObj.employment_type,
        joining_date: newTeacherObj.joining_date,
        status: "active",
        email: teacherEmail,
        phone: teacherPhone,
        has_account: !!form.createAuthAccount,
      }
    ]);

    // 2. Auto-Provision Login Account in Supabase Auth if requested
    let authAccountCreated = false;
    if (form.createAuthAccount && teacherEmail) {
      try {
        const { error: signUpError } = await provisioningAuthClient.auth.signUp({
          email: teacherEmail,
          password: initialPassword,
          options: {
            data: {
              role: "teacher",
              name: newTeacherName,
              phone: teacherPhone,
              department: deptName,
              designation: form.designation || "Assistant Professor",
              employee_id: empId,
            }
          }
        });
        if (!signUpError) {
          authAccountCreated = true;
          setCreatedAccountInfo({
            name: newTeacherName,
            email: teacherEmail,
            password: initialPassword,
            employee_id: empId,
            department: deptName,
            designation: form.designation || "Assistant Professor",
          });
        }
      } catch (authErr) {
        console.warn("Supabase auth auto-provision notice:", authErr);
      }
    }

    setSuccessMessage(
      authAccountCreated
        ? `Faculty "${newTeacherName}" onboarded with active login account.`
        : `Faculty "${newTeacherName}" registered successfully & active across academic panels.`
    );
    setShowAddForm(false);
    setForm({
      teacher_name: "",
      employee_id: "",
      department_id: "",
      designation: "Assistant Professor",
      qualification: "",
      employment_type: "full-time",
      joining_date: new Date().toISOString().split("T")[0],
      phone: "",
      email: "",
      createAuthAccount: true,
      accountPassword: "Plannify@2026",
    });
    setIsSubmitting(false);

    // 3. Asynchronously sync to backend DB without blocking or crashing the UI
    try {
      const payload = {
        teacher_name: newTeacherName,
        employee_id: empId,
        department_id: form.department_id || null,
        department_name: deptName,
        designation: form.designation || "Assistant Professor",
        qualification: form.qualification.trim() || "M.Tech / Ph.D",
        employment_type: form.employment_type || "full-time",
        joining_date: form.joining_date || new Date().toISOString().split("T")[0],
        phone: teacherPhone,
        email: teacherEmail,
        status: "active",
      };

      const res = await axios.post(`${API}/faculty/sync-account`, payload, { timeout: 10000 });
      if (res?.data?.id) {
        setFaculty(prev => prev.map(item => item.id === generatedId ? { ...item, id: res.data.id } : item));
      }
    } catch (err) {
      console.warn("Backend /faculty sync notice:", err);
    }
  };

  const handleExcelFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportingExcel(true);
      setErrorMessage("");
      setSuccessMessage("");
      setImportProgress("Reading spreadsheet data & analyzing columns...");

      const arrayBuffer = await file.arrayBuffer();
      const allExistingSecs = (sections && sections.length > 0) ? sections : (contextSections || []);
      const parsed = parseFacultyExcelData(arrayBuffer, allExistingSecs, teachers);

      if (!parsed || parsed.facultyCount === 0) {
        alert("No valid faculty rows found in the uploaded spreadsheet. Please ensure columns include Faculty/Teacher Name.");
        setImportingExcel(false);
        return;
      }

      setImportProgress(`Uploading ${parsed.facultyCount} faculty profiles to directory & auto-generating ${parsed.sectionsCount} sections...`);

      // 1. Upload to Supabase and Backend API
      await uploadFacultyAndSectionsToCloud(parsed, (p) => {
        setImportProgress(`Uploading faculty profile (${p.current}/${p.total}): ${p.facultyName}`);
      });

      // 2. Register into AcademicContext (Teachers, Sections, Subjects)
      if (onBatchImport) {
        onBatchImport({
          teachers: parsed.parsedFaculty,
          sections: parsed.generatedSections,
          subjects: parsed.generatedSubjects
        });
      } else if (contextBatchImport) {
        contextBatchImport({
          teachers: parsed.parsedFaculty,
          sections: parsed.generatedSections,
          subjects: parsed.generatedSubjects
        });
      } else if (onAddFaculty) {
        parsed.parsedFaculty.forEach(f => onAddFaculty(f));
      }

      // 3. Refresh live faculty list
      await fetchFaculty(true);

      // 4. Set import summary
      setImportSummary({
        fileName: file.name,
        facultyCount: parsed.facultyCount,
        sections: parsed.generatedSections.map(s => s.name),
        subjects: parsed.generatedSubjects.map(s => s.name)
      });
      setSuccessMessage(`Successfully ingested "${file.name}": Uploaded ${parsed.facultyCount} faculty profiles and auto-generated ${parsed.sectionsCount} academic sections!`);

    } catch (err) {
      console.error("Excel import failed:", err);
      setErrorMessage(err.message || "Failed to process faculty spreadsheet.");
    } finally {
      setImportingExcel(false);
      setImportProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = useMemo(() => {
    return allFaculty.filter(f => {
      const matchSearch = !search || 
        f.teacher_name?.toLowerCase().includes(search.toLowerCase()) || 
        f.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
        f.email?.toLowerCase().includes(search.toLowerCase()) ||
        f.phone?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || f.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [allFaculty, search, filterStatus]);

  const isAllSelected = useMemo(() => {
    return filtered.length > 0 && filtered.every(f => selectedIds.has(getFacultyKey(f)));
  }, [filtered, selectedIds]);

  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const allKeys = new Set(filtered.map(f => getFacultyKey(f)));
      setSelectedIds(allKeys);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const statusColor = (status) => {
    switch (status) {
      case "active": return "badge-success";
      case "on-leave": return "badge-warning";
      case "resigned": return "badge-danger";
      case "retired": return "badge-neutral";
      default: return "badge-neutral";
    }
  };

  const getInitials = (name) => {
    return (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Faculty Directory</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-medium">
              Live Connected
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} active faculty profiles registered • Real-time database & auth account sync</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Excel / Spreadsheet Upload Button */}
          <label className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-2 shadow-sm cursor-pointer" title="Upload Excel spreadsheet to auto-import faculty & generate sections">
            <svg className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${importingExcel ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>{importingExcel ? "Processing Roster..." : "Upload Faculty Excel"}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelFileUpload}
              disabled={importingExcel}
              className="hidden"
            />
          </label>

          <button
            onClick={handleSyncAccounts}
            disabled={syncingAccounts || loading}
            title="Refresh and sync all registered accounts from backend & Supabase"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-all flex items-center gap-2 shadow-sm"
          >
            <svg className={`w-3.5 h-3.5 ${syncingAccounts ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            <span>{syncingAccounts ? "Syncing..." : "Sync Accounts"}</span>
          </button>

          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setErrorMessage("");
              setSuccessMessage("");
              setCreatedAccountInfo(null);
            }}
            className="btn-primary gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {showAddForm ? "Close Form" : "Add Faculty"}
          </button>
        </div>
      </div>

      {/* Progress notification during Excel ingestion */}
      {importingExcel && (
        <div className="animate-slide-down p-4 mb-6 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 shadow-xl flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-white">Ingesting Faculty Spreadsheet...</h4>
            <p className="text-[11px] text-indigo-300 mt-0.5">{importProgress}</p>
          </div>
        </div>
      )}

      {/* Ingestion Summary Card */}
      {importSummary && (
        <div className="animate-slide-down p-5 mb-6 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900/90 to-indigo-950/90 border border-emerald-500/40 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">✓</span>
                <h4 className="text-sm font-bold text-white">
                  Ingestion Complete: {importSummary.facultyCount} Faculty Profiles Uploaded
                </h4>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Data from <strong>{importSummary.fileName}</strong> was parsed and synced to Faculty Directory and Supabase.
              </p>
              {importSummary.sections && importSummary.sections.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[11px] font-semibold mr-1">Generated Sections:</span>
                  {importSummary.sections.map((sec, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold">
                      {sec}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setImportSummary(null)}
              className="btn-secondary text-xs py-1.5 px-3 self-start sm:self-center"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Created Account Credentials Card */}
      {createdAccountInfo && (
        <div className="animate-slide-down p-5 mb-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-indigo-950/80 border border-emerald-500/40 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Faculty Login Account Provisioned</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Faculty member <strong>{createdAccountInfo.name}</strong> can now access the Faculty Portal with the following credentials:
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-slate-300">
                    <span className="text-slate-500 font-sans text-[11px] mr-1.5">Email:</span>
                    <strong className="text-emerald-400">{createdAccountInfo.email}</strong>
                  </div>
                  <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-slate-300">
                    <span className="text-slate-500 font-sans text-[11px] mr-1.5">Password:</span>
                    <strong className="text-amber-300">{createdAccountInfo.password}</strong>
                  </div>
                  <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-slate-300">
                    <span className="text-slate-500 font-sans text-[11px] mr-1.5">Emp ID:</span>
                    <strong className="text-indigo-300">{createdAccountInfo.employee_id}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyCredentials}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <span>{copiedCredentials ? "Copied" : "Copy Login Details"}</span>
              </button>
              <button
                onClick={() => setCreatedAccountInfo(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                title="Dismiss"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert Banner */}
      {successMessage && (
        <div className="animate-slide-down flex items-center justify-between p-4 mb-6 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-600 dark:text-emerald-400 hover:opacity-80">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="animate-slide-down flex items-center justify-between p-4 mb-6 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-800 dark:text-red-300 text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage("")} className="text-red-600 dark:text-red-400 hover:opacity-80">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="card p-6 mb-6 animate-slide-down bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">New Faculty Member Registration</h3>
              <p className="text-xs text-slate-400 mt-0.5">Registering here immediately synchronizes with both the backend DB, Supabase Auth, and the active timetable solver.</p>
            </div>
            <button
              onClick={() => {
                setShowAddForm(false);
                setErrorMessage("");
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Dr. John Doe"
                value={form.teacher_name}
                onChange={e => setForm({ ...form, teacher_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Employee ID *</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="EMP-LNCT-1001"
                value={form.employee_id}
                onChange={e => setForm({ ...form, employee_id: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="faculty@lnctu.ac.in"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phone / Mobile</label>
              <input
                type="tel"
                className="input"
                placeholder="+91-9876543210"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Designation</label>
              <select
                className="input cursor-pointer"
                value={form.designation}
                onChange={e => setForm({ ...form, designation: e.target.value })}
              >
                {["Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Lab Instructor", "Visiting Faculty"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Employment Type</label>
              <select
                className="input cursor-pointer"
                value={form.employment_type}
                onChange={e => setForm({ ...form, employment_type: e.target.value })}
              >
                {["full-time", "part-time", "guest", "contractual"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Qualification</label>
              <input
                type="text"
                className="input"
                placeholder="Ph.D. / M.Tech in CS"
                value={form.qualification}
                onChange={e => setForm({ ...form, qualification: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Joining Date</label>
              <input
                type="date"
                className="input cursor-pointer"
                value={form.joining_date}
                onChange={e => setForm({ ...form, joining_date: e.target.value })}
              />
            </div>

            {/* Account Provisioning Section */}
            <div className="md:col-span-2 lg:col-span-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-200">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={form.createAuthAccount}
                  onChange={e => setForm({ ...form, createAuthAccount: e.target.checked })}
                />
                <span>Auto-Provision Login Account for Faculty (Enables instant Faculty Portal sign-in)</span>
              </label>

              {form.createAuthAccount && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400 font-sans">Initial Password:</span>
                  <input
                    type="text"
                    className="input py-1 px-2.5 text-xs font-mono w-40 bg-slate-900 border-slate-700 text-amber-300"
                    placeholder="Plannify@2026"
                    value={form.accountPassword}
                    onChange={e => setForm({ ...form, accountPassword: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="flex items-end gap-3 md:col-span-2 lg:col-span-3 pt-2">
              <button
                type="submit"
                className="btn-primary gap-2"
                disabled={!form.teacher_name || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Faculty...</span>
                  </>
                ) : (
                  <>
                    <span>Save & Provision Faculty Account</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setErrorMessage("");
                }}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters & Bulk Actions Toolbar */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" className="input pl-10" placeholder="Search by name, email, phone, or employee ID..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <select className="input w-auto cursor-pointer" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="on-leave">On Leave</option>
              <option value="resigned">Resigned</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Selection Toggle */}
            {filtered.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 shadow-sm ${
                  isAllSelected
                    ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                    : isSomeSelected
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                }`}
                title={isAllSelected ? "Deselect all faculty" : "Select all visible faculty"}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {isAllSelected ? <path d="M20 6L9 17l-5-5" /> : <rect x="3" y="3" width="18" height="18" rx="2" />}
                </svg>
                <span>{isAllSelected ? "Deselect All" : `Select All (${filtered.length})`}</span>
              </button>
            )}

            {/* Quick Batch Delete button if selected */}
            {selectedIds.size > 0 && (
              <button
                onClick={handleBatchDelete}
                disabled={isBatchDeleting}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-500 shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5"
                title={`Delete ${selectedIds.size} selected faculty member(s)`}
              >
                {isBatchDeleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                )}
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            )}

            <div className="flex border rounded-lg overflow-hidden" style={{ borderColor: "var(--border-default)" }}>
              <button onClick={() => setViewMode("grid")} className={`px-3 py-2 text-xs font-semibold ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`} title="Grid View">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
              <button onClick={() => setViewMode("table")} className={`px-3 py-2 text-xs font-semibold ${viewMode === "table" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`} title="Table View">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 animate-fade-in">
          <GooeyLoader
            size="md"
            text="Loading faculty directory..."
            subtitle="Fetching verified faculty profiles and academic assignments"
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <p className="text-sm font-medium">No faculty members found. Register new faculty profiles or import a roster to begin.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(f => {
            const key = getFacultyKey(f);
            const isSelected = selectedIds.has(key);
            return (
              <div
                key={key}
                className={`card p-5 cursor-pointer transition-all group relative flex flex-col justify-between ${
                  isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/20 shadow-lg shadow-indigo-500/10"
                    : "hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5"
                }`}
                onClick={() => onSelectFaculty && onSelectFaculty(f)}
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    {/* Multi-select Checkbox */}
                    <div
                      className="mt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectFaculty(e, f)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900/90 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                        title={isSelected ? "Deselect" : "Select for batch action"}
                      />
                    </div>

                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                      {getInitials(f.teacher_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{f.teacher_name}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`badge ${statusColor(f.status)}`}>{f.status}</span>
                          <button 
                            title="Remove Faculty Member" 
                            onClick={(e) => handleDelete(e, f)}
                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-indigo-400/90 font-semibold mt-0.5">{f.designation}</p>
                      
                      <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 text-slate-300">
                            {f.employee_id}
                          </span>
                        </div>

                        {f.email && (
                          <p className="truncate flex items-center gap-1.5 text-slate-400 hover:text-indigo-300 transition-colors">
                            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            <span className="truncate">{f.email}</span>
                          </p>
                        )}

                        {f.phone && (
                          <p className="flex items-center gap-1.5 text-slate-400">
                            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            <span>{f.phone}</span>
                          </p>
                        )}
                      </div>

                      {/* Assigned Courses & Subjects Badges */}
                      {(() => {
                        const teacherName = (f.teacher_name || f.name || "").toLowerCase().trim();
                        const assigned = (subjects || []).filter(s => (s.teacher || "").toLowerCase().trim() === teacherName);
                        if (assigned.length === 0) {
                          return (
                            <div className="mt-3 py-1.5 px-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-between">
                              <span>No subjects assigned</span>
                              <span className="text-[10px] text-indigo-400 font-semibold">Assign in Subjects →</span>
                            </div>
                          );
                        }
                        return (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Assigned Courses ({assigned.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {assigned.map((sub, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                                  title={`${sub.name} (${sub.required_slots || 4} weekly periods)`}
                                >
                                  <span>{sub.code || sub.name}</span>
                                  {sub.is_lab && (
                                    <span className="text-[9px] text-emerald-400 bg-emerald-500/20 px-1 rounded">Lab</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Bottom Quick-Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Verified Faculty
                    </span>
                    {(f.has_account || f.user_id || f.email) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Account Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      title="Dispatch Schedule via Email/WhatsApp"
                      onClick={() => setDispatchTeacher(f)}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      Dispatch
                    </button>
                    {f.status !== "active" && (
                      <button
                        title="Reinstate Faculty Member to Active"
                        onClick={(e) => handleActivate(e, f)}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                    title={isAllSelected ? "Deselect all faculty" : "Select all faculty"}
                  />
                </th>
                <th>Faculty Name</th>
                <th>Employee ID</th>
                <th>Designation</th>
                <th>Assigned Subjects</th>
                <th>Email Address</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const key = getFacultyKey(f);
                const isSelected = selectedIds.has(key);
                const teacherName = (f.teacher_name || f.name || "").toLowerCase().trim();
                const assigned = (subjects || []).filter(s => (s.teacher || "").toLowerCase().trim() === teacherName);
                return (
                  <tr
                    key={key}
                    className={`cursor-pointer transition-colors ${isSelected ? "bg-indigo-950/40 border-l-2 border-l-indigo-500" : "hover:bg-slate-800/40"}`}
                    onClick={() => onSelectFaculty && onSelectFaculty(f)}
                  >
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectFaculty(e, f)}
                        className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                        title={isSelected ? "Deselect" : "Select"}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(f.teacher_name)}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{f.teacher_name}</span>
                          {(f.has_account || f.user_id || f.email) && (
                            <span className="text-[10px] font-semibold text-emerald-400">Account Active</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td><span className="font-mono text-xs text-indigo-300">{f.employee_id}</span></td>
                    <td><span className="font-medium text-slate-300">{f.designation}</span></td>
                    <td>
                      {assigned.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assigned.map((sub, sIdx) => (
                            <span key={sIdx} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {sub.code || sub.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs italic">None</span>
                      )}
                    </td>
                    <td><span className="text-slate-400 font-mono text-xs">{f.email || "—"}</span></td>
                    <td><span className={`badge ${statusColor(f.status)}`}>{f.status}</span></td>
                    <td>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          title="Dispatch Schedule via Email/WhatsApp"
                          onClick={() => setDispatchTeacher(f)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-3 h-3 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          Dispatch
                        </button>
                        {f.status !== "active" && (
                          <button
                            title="Reinstate to Active"
                            onClick={(e) => handleActivate(e, f)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition-colors"
                          >
                            Activate
                          </button>
                        )}
                        <button 
                          title="Remove Faculty Member" 
                          onClick={(e) => handleDelete(e, f)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Batch Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up bg-slate-900/95 border border-indigo-500/50 shadow-2xl backdrop-blur-2xl px-5 py-3 rounded-2xl flex items-center gap-4 text-xs font-semibold text-white">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow">
              {selectedIds.size}
            </span>
            <span className="font-bold">
              {selectedIds.size} {selectedIds.size === 1 ? "faculty profile" : "faculty profiles"} selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {isAllSelected ? "Deselect All" : "Select All"}
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={isBatchDeleting}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
            >
              {isBatchDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  <span>Delete Selected ({selectedIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Dispatch Preview Modal */}
      {dispatchTeacher && (
        <DispatchPreviewModal
          teacher={dispatchTeacher}
          result={result}
          onClose={() => setDispatchTeacher(null)}
        />
      )}
    </div>
  );
}
