import axios from "axios";
import { supabase } from "../supabaseClient";
import { API_BASE_URL as API } from "../apiConfig";

/**
 * Standard default leave types catalog with full allowances, metadata, UUIDs, and color codes.
 * Ensures the Apply Leave dropdown always has rich, pre-configured options available.
 */
export const DEFAULT_LEAVE_TYPES = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    code: "CL",
    name: "Casual Leave",
    max_per_year: 12,
    carry_forward: false,
    requires_document: false,
    color: "#3b82f6",
    description: "Short unplanned leave for personal or urgent domestic reasons (up to 12 days/yr).",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    code: "EL",
    name: "Earned Leave",
    max_per_year: 15,
    carry_forward: true,
    requires_document: false,
    color: "#0d9488",
    description: "Annual paid leave earned for continuous service; can be accumulated and carried forward.",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    code: "ML",
    name: "Medical / Sick Leave",
    max_per_year: 10,
    carry_forward: false,
    requires_document: true,
    color: "#dc2626",
    description: "Leave for illness, hospital admission, or surgery (requires medical fitness certificate).",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    code: "COMP",
    name: "Compensatory Off",
    max_per_year: 5,
    carry_forward: false,
    requires_document: false,
    color: "#d97706",
    description: "Credit leave granted for performing duties on holidays, Sundays, or extra institution events.",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    code: "OD",
    name: "On Duty / Academic Duty",
    max_per_year: 15,
    carry_forward: false,
    requires_document: true,
    color: "#6366f1",
    description: "Official duty for attending conferences, FDP workshops, university exams, or inspection visits.",
  },
  {
    id: "00000000-0000-0000-0000-000000000006",
    code: "SCL",
    name: "Special Casual Leave",
    max_per_year: 6,
    carry_forward: false,
    requires_document: false,
    color: "#8b5cf6",
    description: "Special institutional leave for university evaluation, sporting events, or jury duty.",
  },
  {
    id: "00000000-0000-0000-0000-000000000007",
    code: "MAT/PAT",
    name: "Maternity / Paternity Leave",
    max_per_year: 180,
    carry_forward: false,
    requires_document: true,
    color: "#ec4899",
    description: "Extended maternity (180 days) or paternity leave per statutory institutional guidelines.",
  },
];

// Helper to generate UUID v4
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─────────────────────────────────────────────────────────────
// Local Storage Cache Helpers
// ─────────────────────────────────────────────────────────────

const LEAVES_STORAGE_KEY = "planify_leaves_cache";
const ATTENDANCE_STORAGE_KEY = "planify_attendance_cache";
const SUBSTITUTION_STORAGE_KEY = "planify_substitution_cache";

function getStoredLeaves() {
  try {
    const raw = localStorage.getItem(LEAVES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLeaves(leaves) {
  try {
    localStorage.setItem(LEAVES_STORAGE_KEY, JSON.stringify(leaves));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("planify_leave_updated"));
    }
  } catch (e) {
    console.warn("Could not save to localStorage:", e);
  }
}

function getStoredAttendance() {
  try {
    const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredAttendance(records) {
  try {
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("planify_attendance_updated"));
    }
  } catch (e) {
    console.warn("Could not save attendance to localStorage:", e);
  }
}

export function clearAllFacultyCaches() {
  try {
    localStorage.removeItem(LEAVES_STORAGE_KEY);
    localStorage.removeItem(ATTENDANCE_STORAGE_KEY);
    localStorage.removeItem(SUBSTITUTION_STORAGE_KEY);
    localStorage.removeItem("planify_timetable_state");
    localStorage.removeItem("planify_faculty_cache");
    cachedFacultyProfiles = [];
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("planify_leave_updated"));
      window.dispatchEvent(new CustomEvent("planify_attendance_updated"));
      window.dispatchEvent(new CustomEvent("planify_substitution_updated"));
    }
  } catch (e) {
    console.warn("Could not clear faculty caches:", e);
  }
}

export function seedDemoFacultyData() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const demoTeachers = [
      { id: "EMP-LNCT-001", teacher_name: "Prof Ripusoodan Sharma", department: "Computer Applications", designation: "Professor", status: "present", in_time: "08:52 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-002", teacher_name: "Prof Anshu Gangwar", department: "Computer Applications", designation: "Professor", status: "present", in_time: "08:55 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-003", teacher_name: "Dr Satish Manwani", department: "Computer Applications", designation: "Associate Professor", status: "present", in_time: "08:58 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-004", teacher_name: "Prof Pragya Shastri", department: "Computer Applications", designation: "Assistant Professor", status: "present", in_time: "09:02 AM", punch_status: "Late (+2m)" },
      { id: "EMP-LNCT-005", teacher_name: "Prof Mohit Kubade", department: "Computer Applications", designation: "Assistant Professor", status: "present", in_time: "08:48 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-006", teacher_name: "Dr Sonal Sharma", department: "Computer Applications", designation: "Professor", status: "on_leave", in_time: null, punch_status: "Approved CL" },
      { id: "EMP-LNCT-007", teacher_name: "Mr. Aniket Satpute", department: "AI & DA", designation: "Assistant Professor", status: "present", in_time: "08:50 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-008", teacher_name: "Prof Jagruti Durugkar", department: "AI & DA", designation: "Assistant Professor", status: "present", in_time: "08:54 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-009", teacher_name: "Mr Kaiwalya Zankar", department: "Computer Science", designation: "Lecturer", status: "present", in_time: "08:56 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-010", teacher_name: "Ms. Swarupa Waghmare", department: "Information Tech", designation: "Lecturer", status: "present", in_time: "08:51 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-011", teacher_name: "Prof Dipanshu Jha", department: "Computer Applications", designation: "Assistant Professor", status: "present", in_time: "08:57 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-012", teacher_name: "Dr Alka Gulati", department: "Computer Science", designation: "Associate Professor", status: "present", in_time: "08:49 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-013", teacher_name: "Prof Neha Swanakar", department: "Information Tech", designation: "Assistant Professor", status: "present", in_time: "09:00 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-014", teacher_name: "Dr Swagatika Lenka", department: "Computer Applications", designation: "Associate Professor", status: "present", in_time: "08:53 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-015", teacher_name: "Mr Jitendra Maind", department: "AI & DA", designation: "Assistant Professor", status: "present", in_time: "08:59 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-016", teacher_name: "Prof Pramod Kumar Saket", department: "Computer Applications", designation: "Assistant Professor", status: "present", in_time: "08:45 AM", punch_status: "On Time" },
      { id: "EMP-LNCT-017", teacher_name: "Prof Atul Verma", department: "Computer Applications", designation: "Assistant Professor", status: "present", in_time: "08:50 AM", punch_status: "On Time" },
    ];

    const attendanceRecords = demoTeachers.map(t => ({
      id: `att-${t.id}-${today}`,
      faculty_id: t.id,
      teacher_name: t.teacher_name,
      department: t.department,
      date: today,
      status: t.status,
      in_time: t.in_time,
      punch_status: t.punch_status
    }));

    saveStoredAttendance(attendanceRecords);

    const demoLeaves = [{
      id: "leave-demo-001",
      faculty_id: "EMP-LNCT-006",
      teacher_name: "Dr Sonal Sharma",
      leave_type: "CL",
      from_date: today,
      to_date: today,
      days_count: 1,
      reason: "Academic Conference & Research Symposium presentation",
      status: "approved",
      substitute_id: "EMP-LNCT-001",
      substitute_name: "Prof Ripusoodan Sharma",
      applied_at: new Date().toISOString()
    }];
    saveStoredLeaves(demoLeaves);
  } catch (e) {
    console.warn("Could not seed demo faculty caches:", e);
  }
}

/**
 * Unified Faculty Pipeline: Syncs teachers configured in the Timetable Workspace
 * directly into the Institutional Faculty Profiles directory and leave ledgers.
 */
export async function syncFacultyFromTimetable(teachersList = []) {
  if (!Array.isArray(teachersList) || teachersList.length === 0) return [];
  try {
    const profiles = teachersList.map((t, idx) => {
      const name = typeof t === "string" ? t : (t.name || t.teacher_name || `Faculty ${idx + 1}`);
      const designation = (typeof t === "object" && t.designation)
        ? t.designation
        : (name.startsWith("Dr") ? "Associate Professor" : (name.startsWith("Prof") ? "Professor" : "Assistant Professor"));
      const dept = (typeof t === "object" && t.department) ? t.department : "Computer Applications";
      const empId = (typeof t === "object" && t.employee_id) ? t.employee_id : `EMP-LNCT-${String(idx + 1).padStart(3, "0")}`;

      return {
        id: empId,
        teacher_name: name,
        employee_id: empId,
        department: dept,
        designation: designation,
        email: (typeof t === "object" && t.email) ? t.email : `${name.toLowerCase().replace(/[^a-z]/g, '')}@lnctu.ac.in`,
        phone: (typeof t === "object" && t.phone) ? t.phone : "+91-9893700000",
        free_periods: (typeof t === "object" && t.free_periods !== undefined) ? t.free_periods : 1,
        max_weekly_hours: (typeof t === "object" && t.max_weekly_hours) ? t.max_weekly_hours : 18,
        status: "active",
        ugc_compliant: true,
      };
    });

    localStorage.setItem("planify_faculty_cache", JSON.stringify(profiles));
    cachedFacultyProfiles = profiles;

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("planify_faculty_updated", { detail: profiles }));
    }

    // Try backend bulk sync asynchronously
    axios.post(`${API}/faculty/bulk-sync`, { faculty: profiles }).catch(() => null);

    return profiles;
  } catch (e) {
    console.warn("Unified faculty sync notice:", e);
    return [];
  }
}

/**
 * Calculates real-time UGC Workload compliance (14-18 hours/week standard).
 */
export function getFacultyWorkloadAnalytics(teachersList = [], subjectsList = []) {
  const workloadMap = {};
  teachersList.forEach((t) => {
    const name = typeof t === "string" ? t : t.name;
    workloadMap[name] = {
      name,
      department: (typeof t === "object" && t.department) ? t.department : "General",
      max_weekly_hours: (typeof t === "object" && t.max_weekly_hours) ? t.max_weekly_hours : 18,
      assigned_slots: 0,
      ugc_compliant: true,
      load_percentage: 0,
    };
  });

  subjectsList.forEach((s) => {
    const teacher = s.teacher;
    const required = Number(s.required_slots) || 3;
    if (workloadMap[teacher]) {
      workloadMap[teacher].assigned_slots += required;
    }
  });

  Object.values(workloadMap).forEach((w) => {
    w.load_percentage = Math.min(100, Math.round((w.assigned_slots / w.max_weekly_hours) * 100));
    w.ugc_compliant = w.assigned_slots <= w.max_weekly_hours;
  });

  return Object.values(workloadMap);
}

// ─────────────────────────────────────────────────────────────
// Real-Time Subscriptions Manager
// ─────────────────────────────────────────────────────────────

/**
 * Subscribes to changes on any Supabase table with real-time postgres_changes
 * and also listens to local window custom events for instant cross-component updates.
 */
export function subscribeToTable(tableName, onEvent) {
  let channel = null;

  if (supabase) {
    const channelName = `realtime_${tableName}_${Math.random().toString(36).substring(2, 9)}`;
    channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tableName },
        (payload) => {
          if (typeof onEvent === "function") {
            onEvent(payload);
          }
        }
      )
      .subscribe();
  }

  // Local cross-tab & component event listeners
  const handleLocalEvent = () => {
    if (typeof onEvent === "function") {
      onEvent({ eventType: "LOCAL_UPDATE" });
    }
  };

  const eventName = tableName.includes("leave")
    ? "planify_leave_updated"
    : tableName.includes("attendance")
    ? "planify_attendance_updated"
    : "planify_table_updated";

  if (typeof window !== "undefined") {
    window.addEventListener(eventName, handleLocalEvent);
  }

  return () => {
    try {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener(eventName, handleLocalEvent);
      }
    } catch {
      // Graceful cleanup
    }
  };
}

// ─────────────────────────────────────────────────────────────
// Leave Types API & Supabase Sync
// ─────────────────────────────────────────────────────────────

export async function getLeaveTypes() {
  try {
    const res = await axios.get(`${API}/leaves/types`, { timeout: 3000 });
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (e) {
    // Fallback to Supabase
  }

  try {
    const { data, error } = await supabase
      .from("leave_types")
      .select("*")
      .order("code");
    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (e) {
    // Fallback to constants
  }

  return DEFAULT_LEAVE_TYPES;
}

// ─────────────────────────────────────────────────────────────
// Faculty Profiles Resolver & Cache
// ─────────────────────────────────────────────────────────────

let cachedFacultyProfiles = [];

export async function fetchAllFacultyProfiles() {
  const map = new Map();

  // 1. Try Supabase faculty_profiles
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("faculty_profiles")
        .select("id, user_id, teacher_name, employee_id, designation, department, email")
        .order("teacher_name");
      if (!error && Array.isArray(data)) {
        data.forEach((f) => {
          if (f.id) map.set(f.id, f);
          if (f.user_id) map.set(f.user_id, f);
          if (f.teacher_name) map.set(f.teacher_name.toLowerCase().trim(), f);
        });
      }
    }
  } catch {
    // Ignore fallback
  }

  // 2. Try Backend API
  try {
    const res = await axios.get(`${API}/faculty`, { timeout: 3000 });
    if (res.data && Array.isArray(res.data)) {
      res.data.forEach((f) => {
        const item = {
          id: f.id,
          user_id: f.user_id || f.id,
          teacher_name: f.teacher_name || f.name,
          employee_id: f.employee_id || "",
          designation: f.designation || "Faculty Member",
          department: f.department_name || f.department || "Computer Applications",
          email: f.email,
        };
        if (item.id) map.set(item.id, item);
        if (item.user_id) map.set(item.user_id, item);
        if (item.teacher_name) map.set(item.teacher_name.toLowerCase().trim(), item);
      });
    }
  } catch {
    // Ignore fallback
  }

  // 3. Try Academic timetable draft state in localStorage
  try {
    const stateRaw = localStorage.getItem("planify_timetable_state");
    if (stateRaw) {
      const parsed = JSON.parse(stateRaw);
      if (Array.isArray(parsed?.teachers)) {
        parsed.teachers.forEach((t) => {
          const name = typeof t === "string" ? t : t?.name || t?.teacher_name;
          if (name) {
            const item = {
              id: t.id || name,
              teacher_name: name,
              employee_id: t.employee_id || "EMP-LNCT-1001",
              department: t.department || "Computer Applications",
              designation: t.designation || "Faculty Member",
            };
            if (t.id) map.set(t.id, item);
            map.set(name.toLowerCase().trim(), item);
          }
        });
      }
    }
  } catch {
    // Ignore fallback
  }

  cachedFacultyProfiles = Array.from(new Set(map.values()));
  return cachedFacultyProfiles;
}

export function getCachedFacultyProfiles() {
  return cachedFacultyProfiles;
}

// ─────────────────────────────────────────────────────────────
// Leave Applications (CRUD + Real-Time Multi-Layer Sync)
// ─────────────────────────────────────────────────────────────

export async function getLeaveApplications({ facultyId = null, status = null } = {}) {
  let list = [];
  const map = new Map();

  // Load / ensure faculty profiles cache
  let facultyList = cachedFacultyProfiles;
  if (!facultyList || facultyList.length === 0) {
    try {
      facultyList = await fetchAllFacultyProfiles();
    } catch {
      facultyList = [];
    }
  }

  const resolveFacultyName = (item) => {
    // 1. If item already has a non-generic name, keep it
    if (
      item.faculty_name &&
      item.faculty_name !== "Faculty Member" &&
      item.faculty_name !== "Faculty" &&
      item.faculty_name.trim()
    ) {
      return item.faculty_name.trim();
    }

    // 2. Check joined relation from Supabase
    if (
      item.faculty_profiles?.teacher_name &&
      item.faculty_profiles.teacher_name !== "Faculty Member"
    ) {
      return item.faculty_profiles.teacher_name.trim();
    }

    // 3. Match against facultyList by faculty_id or user_id or email
    if (item.faculty_id && facultyList.length > 0) {
      const match = facultyList.find(
        (f) => f.id === item.faculty_id || f.user_id === item.faculty_id || (item.email && f.email === item.email)
      );
      if (match?.teacher_name) return match.teacher_name;
      if (match?.name) return match.name;
    }

    // 4. Return item.faculty_name or generic label
    return item.faculty_name || "Faculty Member";
  };

  // 1. Fetch from Local Storage cache first
  const localList = getStoredLeaves();
  let localNeedsSave = false;
  localList.forEach((item) => {
    const resolvedName = resolveFacultyName(item);
    if (item.faculty_name !== resolvedName) {
      item.faculty_name = resolvedName;
      localNeedsSave = true;
    }
    map.set(item.id, {
      ...item,
      days_count: calculateDays(item.from_date, item.to_date, item.half_day),
    });
  });

  // Retrofit local storage if names were generic
  if (localNeedsSave) {
    saveStoredLeaves(Array.from(map.values()));
  }

  // 2. Try Backend API
  try {
    const params = {};
    if (facultyId) params.faculty_id = facultyId;
    if (status) params.status = status;
    const res = await axios.get(`${API}/leaves/`, { params, timeout: 4000 });
    if (res.data && Array.isArray(res.data)) {
      res.data.forEach((item) => {
        const resolvedName = resolveFacultyName(item);
        map.set(item.id, {
          ...item,
          faculty_name: resolvedName,
          days_count: calculateDays(item.from_date, item.to_date, item.half_day),
        });
      });
    }
  } catch (err) {
    // Fallback
  }

  // 3. Try Supabase directly
  try {
    let query = supabase
      .from("leave_applications")
      .select("*, faculty_profiles(teacher_name, employee_id, designation), leave_types(code, name, color)")
      .order("applied_at", { ascending: false });

    if (facultyId) query = query.eq("faculty_id", facultyId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      data.forEach((item) => {
        const resolvedName = resolveFacultyName(item);
        map.set(item.id, {
          id: item.id,
          faculty_id: item.faculty_id,
          faculty_name: resolvedName,
          employee_id: item.faculty_profiles?.employee_id || item.employee_id || "",
          leave_type_id: item.leave_type_id,
          leave_type_code: item.leave_types?.code || item.leave_type || "CL",
          leave_type_name: item.leave_types?.name || item.leave_type || "Casual Leave",
          leave_type_color: item.leave_types?.color || "#3b82f6",
          from_date: item.from_date,
          to_date: item.to_date,
          half_day: item.half_day,
          reason: item.reason,
          status: item.status || "pending",
          applied_at: item.applied_at || item.created_at,
          reviewed_by: item.reviewed_by,
          review_remarks: item.review_remarks,
          substitute_id: item.substitute_id,
          days_count: calculateDays(item.from_date, item.to_date, item.half_day),
        });
      });
    }
  } catch (e) {
    // Fallback
  }

  list = Array.from(map.values());

  // Filter if needed
  if (facultyId) {
    list = list.filter((l) => l.faculty_id === facultyId || !l.faculty_id);
  }
  if (status) {
    list = list.filter((l) => l.status === status);
  }

  // Sort descending by date
  list.sort((a, b) => new Date(b.applied_at || b.from_date) - new Date(a.applied_at || a.from_date));

  return list;
}

export async function submitLeaveApplication(formData) {
  const days = calculateDays(formData.from_date, formData.to_date, formData.half_day);
  const appId = generateUUID();

  // Find matching leave type metadata
  const leaveTypeObj = DEFAULT_LEAVE_TYPES.find(
    (lt) => lt.id === formData.leave_type_id || lt.code === formData.leave_type_id
  ) || DEFAULT_LEAVE_TYPES[0];

  const mappedTypeId = leaveTypeObj?.id || formData.leave_type_id || "00000000-0000-0000-0000-000000000001";
  
  // Resolve faculty name & ID properly
  let facultyName = formData.faculty_name || formData.teacher_name;
  if (!facultyName || facultyName === "Faculty Member") {
    if (cachedFacultyProfiles && cachedFacultyProfiles.length > 0) {
      const match = cachedFacultyProfiles.find(
        (f) => f.id === formData.faculty_id || f.user_id === formData.faculty_id
      );
      facultyName = match?.teacher_name || match?.name || "Faculty Member";
    } else {
      facultyName = "Faculty Member";
    }
  }

  let facultyId = formData.faculty_id;
  if (!facultyId || facultyId === "00000000-0000-0000-0000-000000000001") {
    const match = (cachedFacultyProfiles || []).find(
      (f) => f.teacher_name?.toLowerCase() === facultyName.toLowerCase()
    );
    facultyId = match?.id || "00000000-0000-0000-0000-000000000001";
  }

  // Build normalized local and client record
  const newLeaveRecord = {
    id: appId,
    faculty_id: facultyId,
    faculty_name: facultyName,
    leave_type_id: mappedTypeId,
    leave_type_code: leaveTypeObj.code,
    leave_type_name: leaveTypeObj.name,
    leave_type_color: leaveTypeObj.color,
    from_date: formData.from_date,
    to_date: formData.to_date,
    half_day: !!formData.half_day,
    reason: formData.reason || "Personal Leave",
    document_url: formData.document_url || null,
    status: "pending",
    days_count: days,
    applied_at: new Date().toISOString(),
  };

  // 1. Immediately write to local storage cache so user gets instant optimistic UI update
  const currentLeaves = getStoredLeaves();
  saveStoredLeaves([newLeaveRecord, ...currentLeaves]);

  // 2. Try Backend API in background
  try {
    await axios.post(
      `${API}/leaves/apply`,
      {
        faculty_id: facultyId,
        faculty_name: facultyName,
        leave_type_id: mappedTypeId,
        from_date: formData.from_date,
        to_date: formData.to_date,
        half_day: !!formData.half_day,
        reason: formData.reason,
        document_url: formData.document_url || null,
      },
      { timeout: 4000 }
    );
  } catch (err) {
    console.warn("Backend leave API notice (using client real-time sync):", err?.message);
  }

  // 3. Try Supabase direct insert (omitting extra non-table fields like days_count)
  try {
    await supabase.from("leave_applications").insert([
      {
        id: appId,
        faculty_id: facultyId,
        leave_type_id: mappedTypeId,
        from_date: formData.from_date,
        to_date: formData.to_date,
        half_day: !!formData.half_day,
        reason: formData.reason || "Personal Leave",
        document_url: formData.document_url || null,
        status: "pending",
        applied_at: new Date().toISOString(),
      },
    ]);
  } catch (e) {
    console.warn("Supabase leave table write notice:", e);
  }

  return newLeaveRecord;
}

export async function reviewLeaveApplication(leaveId, action, { reviewed_by, remarks = "", substitute_id = null }) {
  const status = action === "approve" ? "approved" : "rejected";

  // 1. Update local cache immediately
  const leaves = getStoredLeaves();
  const updated = leaves.map((l) => {
    if (l.id === leaveId) {
      return {
        ...l,
        status,
        reviewed_by: reviewed_by || "Admin",
        reviewed_at: new Date().toISOString(),
        review_remarks: remarks,
        substitute_id: substitute_id || null,
      };
    }
    return l;
  });
  saveStoredLeaves(updated);

  // 2. Try Backend API
  try {
    await axios.put(
      `${API}/leaves/${leaveId}/${action}`,
      {
        reviewed_by,
        review_remarks: remarks,
        substitute_id: substitute_id || undefined,
      },
      { timeout: 4000 }
    );
  } catch (e) {
    console.warn("Backend review API skipped, state saved locally & synced:", e?.message);
  }

  // 3. Try Supabase direct update
  try {
    await supabase
      .from("leave_applications")
      .update({
        status,
        reviewed_by: reviewed_by || null,
        reviewed_at: new Date().toISOString(),
        review_remarks: remarks || "",
        substitute_id: substitute_id || null,
      })
      .eq("id", leaveId);
  } catch (e) {
    console.warn("Supabase review status update notice:", e);
  }

  return { success: true, action };
}

// ─────────────────────────────────────────────────────────────
// Leave Balances (Dynamic Calculation from Real-Time Records)
// ─────────────────────────────────────────────────────────────

export async function getFacultyLeaveBalances(facultyId) {
  if (!facultyId) return [];

  // Fetch all leaves for this faculty
  const allLeaves = await getLeaveApplications({ facultyId });

  // Calculate used and pending days per leave type
  const typeMap = {};
  DEFAULT_LEAVE_TYPES.forEach((lt) => {
    typeMap[lt.id] = { used: 0, pending: 0 };
    typeMap[lt.code] = { used: 0, pending: 0 };
  });

  allLeaves.forEach((l) => {
    const days = l.days_count || calculateDays(l.from_date, l.to_date, l.half_day);
    const key = l.leave_type_id || l.leave_type_code;
    if (typeMap[key]) {
      if (l.status === "approved") {
        typeMap[key].used += days;
      } else if (l.status === "pending") {
        typeMap[key].pending += days;
      }
    }
  });

  return DEFAULT_LEAVE_TYPES.map((lt) => {
    const stats = typeMap[lt.id] || typeMap[lt.code] || { used: 0, pending: 0 };
    const remaining = Math.max(0, lt.max_per_year - stats.used - stats.pending);
    return {
      id: `bal-${lt.code}-${facultyId}`,
      faculty_id: facultyId,
      leave_type_id: lt.id,
      leave_type_code: lt.code,
      leave_type_name: lt.name,
      leave_type_color: lt.color,
      total_allowed: lt.max_per_year,
      used: stats.used,
      pending: stats.pending,
      remaining,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Attendance (Real-Time Biometric & Manual Logs)
// ─────────────────────────────────────────────────────────────

export async function getAttendanceRecords({ date = null, facultyId = null, month = null, year = null } = {}) {
  const map = new Map();

  // 1. From local cache
  const localList = getStoredAttendance();
  localList.forEach((r) => map.set(r.id || `${r.faculty_id}-${r.date}`, r));

  // 2. Try Backend API
  try {
    const params = {};
    if (date) params.date = date;
    if (facultyId) params.faculty_id = facultyId;
    if (month) params.month = month;
    if (year) params.year = year;

    const endpoint = month && year ? `${API}/attendance/report/monthly` : `${API}/attendance`;
    const res = await axios.get(endpoint, { params, timeout: 4000 });
    if (res.data && Array.isArray(res.data)) {
      res.data.forEach((r) => map.set(r.id || `${r.faculty_id}-${r.date}`, r));
    }
  } catch (e) {
    // Fallback
  }

  // 3. Try Supabase
  try {
    let query = supabase
      .from("attendance_records")
      .select("*, faculty_profiles(teacher_name, employee_id, department)")
      .order("date", { ascending: false });

    if (date) query = query.eq("date", date);
    if (facultyId) query = query.eq("faculty_id", facultyId);

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      data.forEach((r) => {
        map.set(r.id || `${r.faculty_id}-${r.date}`, {
          id: r.id,
          faculty_id: r.faculty_id,
          faculty_name: r.faculty_profiles?.teacher_name || "Faculty Member",
          employee_id: r.faculty_profiles?.employee_id || "",
          department: r.faculty_profiles?.department || "Computer Applications",
          date: r.date,
          punch_in: r.punch_in,
          punch_out: r.punch_out,
          status: r.status || "present",
          late_minutes: r.late_minutes || 0,
          remarks: r.remarks || "",
          source: r.source || "biometric",
        });
      });
    }
  } catch (e) {
    // Fallback
  }

  let list = Array.from(map.values());
  if (date) list = list.filter((r) => r.date === date);
  if (facultyId) list = list.filter((r) => r.faculty_id === facultyId);

  return list;
}

export async function logAttendanceEntry(entryData) {
  const entryId = generateUUID();
  const record = {
    id: entryId,
    faculty_id: entryData.faculty_id,
    date: entryData.date,
    punch_in: entryData.punch_in ? `${entryData.date}T${entryData.punch_in}:00Z` : new Date().toISOString(),
    punch_out: entryData.punch_out ? `${entryData.date}T${entryData.punch_out}:00Z` : null,
    status: entryData.status || "present",
    remarks: entryData.remarks || "Manual Punch Entry",
    source: "manual",
  };

  // 1. Save to local storage
  const current = getStoredAttendance();
  saveStoredAttendance([record, ...current]);

  // 2. Try Backend API
  try {
    await axios.post(`${API}/attendance/manual`, entryData, { timeout: 3000 });
  } catch (e) {
    console.warn("Backend attendance API notice:", e?.message);
  }

  // 3. Try Supabase
  try {
    await supabase.from("attendance_records").upsert(
      {
        faculty_id: entryData.faculty_id,
        date: entryData.date,
        punch_in: record.punch_in,
        punch_out: record.punch_out,
        status: entryData.status || "present",
        remarks: entryData.remarks || "Manual Entry",
        source: "manual",
      },
      { onConflict: "faculty_id, date" }
    );
  } catch (e) {
    console.warn("Supabase attendance write notice:", e);
  }

  return record;
}

// ─────────────────────────────────────────────────────────────
// Substitution & Proxy Logs
// ─────────────────────────────────────────────────────────────

function getStoredSubstitutions() {
  try {
    const raw = localStorage.getItem(SUBSTITUTION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredSubstitutions(records) {
  try {
    localStorage.setItem(SUBSTITUTION_STORAGE_KEY, JSON.stringify(records));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("planify_substitution_updated"));
    }
  } catch (e) {
    console.warn("Could not save substitutions to localStorage:", e);
  }
}

export async function getSubstitutionLogs() {
  const map = new Map();

  const normalizeSub = (s) => {
    if (!s) return null;
    const origName = s.original_faculty_name || s.original_teacher_name || s.original_faculty || s.originalTeacher || s.teacher || "Faculty Member";
    const subName = s.substitute_faculty_name || s.proxy_teacher_name || s.proxy_teacher || s.proxyTeacher || s.substitute_name || "Substitute Teacher";
    const rawDate = s.date || s.created_at?.split("T")[0] || new Date().toISOString().split("T")[0];
    const dayName = s.day || (rawDate ? new Date(rawDate).toLocaleDateString("en-US", { weekday: "short" }) : "Mon");

    return {
      id: s.id || `sub_${origName}_${rawDate}_${s.slot || 'All'}`,
      leave_application_id: s.leave_application_id || null,
      original_faculty_id: s.original_faculty_id || s.faculty_id,
      original_faculty_name: origName,
      substitute_faculty_id: s.substitute_faculty_id || s.proxy_id,
      substitute_faculty_name: subName,
      date: rawDate,
      day: dayName,
      slot: s.slot || "09:00 AM - 09:45 AM",
      subject: s.subject || "Subject Lecture",
      section: s.section || "Section A",
      room: s.room || "Room 308/MCA",
      reason: s.reason || "Faculty Leave Substitution",
      status: s.status || "Confirmed",
      created_at: s.created_at || new Date().toISOString(),
    };
  };

  // 1. From local storage
  const localList = getStoredSubstitutions();
  localList.forEach((s) => {
    const norm = normalizeSub(s);
    if (norm) map.set(norm.id, norm);
  });

  // 2. Try Backend API
  try {
    const res = await axios.get(`${API}/substitution/history`, { timeout: 3000 });
    if (res.data && Array.isArray(res.data)) {
      res.data.forEach((s) => {
        const norm = normalizeSub(s);
        if (norm) map.set(norm.id, norm);
      });
    }
  } catch (e) {
    // Fallback to Supabase
  }

  // 3. Try Supabase
  try {
    const { data, error } = await supabase
      .from("substitution_log")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      data.forEach((s) => {
        const norm = normalizeSub(s);
        if (norm) map.set(norm.id, norm);
      });
    }
  } catch (e) {
    console.warn("Supabase substitution log fetch notice:", e);
  }

  return Array.from(map.values());
}

export function seedDemoSubstitutions() {
  const today = new Date().toISOString().split("T")[0];
  const demoSubs = [
    {
      id: "sub-demo-001",
      original_faculty_name: "Prof. Rajesh Sharma",
      substitute_faculty_name: "Dr. Arvind Kumar",
      date: today,
      day: "Mon",
      slot: "09:00 AM - 09:45 AM",
      subject: "CS301 Data Structures & Algorithms",
      section: "MCA-I (A)",
      room: "Room 308/MCA",
      reason: "University Academic Committee Meeting",
      status: "Confirmed",
      created_at: new Date().toISOString(),
    },
    {
      id: "sub-demo-002",
      original_faculty_name: "Prof. Mohit Kubade",
      substitute_faculty_name: "Dr. Meenakshi Pathak",
      date: today,
      day: "Tue",
      slot: "11:20 AM - 12:10 PM",
      subject: "CS402 Database Management Systems",
      section: "BCA-II (B)",
      room: "Lab Room No. 006",
      reason: "Faculty Medical Leave",
      status: "Confirmed",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "sub-demo-003",
      original_faculty_name: "Dr. Arvind Kumar",
      substitute_faculty_name: "Prof. Rajesh Sharma",
      date: today,
      day: "Wed",
      slot: "01:50 PM - 02:40 PM",
      subject: "CS503 Operating Systems & Architecture",
      section: "MCA-II",
      room: "Room 305/LNCT",
      reason: "AICTE Workshop Attendance",
      status: "Completed",
      created_at: new Date(Date.now() - 172800000).toISOString(),
    }
  ];

  saveStoredSubstitutions(demoSubs);
  return demoSubs;
}

export async function assignSubstitution(data) {
  const subId = generateUUID();
  const rawDate = data.date || new Date().toISOString().split("T")[0];
  const dayName = data.day || new Date(rawDate).toLocaleDateString("en-US", { weekday: "short" });

  const subRecord = {
    id: subId,
    leave_application_id: data.leave_application_id || null,
    original_faculty_id: data.original_faculty_id,
    original_faculty_name: data.original_faculty_name || data.original_teacher_name || "Faculty Member",
    substitute_faculty_id: data.substitute_faculty_id,
    substitute_faculty_name: data.substitute_faculty_name || data.proxy_teacher_name || "Substitute Teacher",
    date: rawDate,
    day: dayName,
    slot: data.slot || "All Day",
    subject: data.subject || "",
    section: data.section || "",
    room: data.room || "",
    reason: data.reason || "Faculty Leave Substitution",
    status: "Confirmed",
    created_at: new Date().toISOString(),
  };

  // 1. Save to local storage
  const current = getStoredSubstitutions();
  saveStoredSubstitutions([subRecord, ...current.filter(c => c.id !== subId)]);

  // 2. Try Backend API
  try {
    await axios.post(`${API}/substitution/assign`, data, { timeout: 3000 });
  } catch (e) {
    // Fallback to Supabase
  }

  // 3. Try Supabase
  try {
    await supabase.from("substitution_log").insert([{
      original_teacher_name: subRecord.original_faculty_name,
      proxy_teacher_name: subRecord.substitute_faculty_name,
      day: subRecord.day,
      slot: subRecord.slot,
      reason: subRecord.reason,
      status: subRecord.status,
    }]);
  } catch (e) {
    console.warn("Supabase substitution insert notice:", e);
  }

  return subRecord;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function calculateDays(fromDate, toDate, halfDay = false) {
  if (halfDay) return 0.5;
  if (!fromDate || !toDate) return 1;
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return isNaN(diffDays) ? 1 : Math.max(1, diffDays);
}
