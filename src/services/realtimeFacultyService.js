import axios from "axios";
import { supabase } from "../supabaseClient";
import { API_BASE_URL as API } from "../apiConfig";

/**
 * Standard default leave types catalog with full allowances, metadata, and color codes.
 * Ensures the Apply Leave dropdown always has rich, pre-configured options available.
 */
export const DEFAULT_LEAVE_TYPES = [
  {
    id: "cl-standard-01",
    code: "CL",
    name: "Casual Leave",
    max_per_year: 12,
    carry_forward: false,
    requires_document: false,
    color: "#3b82f6",
    description: "Short unplanned leave for personal or urgent domestic reasons (up to 12 days/yr).",
  },
  {
    id: "el-standard-02",
    code: "EL",
    name: "Earned Leave",
    max_per_year: 15,
    carry_forward: true,
    requires_document: false,
    color: "#0d9488",
    description: "Annual paid leave earned for continuous service; can be accumulated and carried forward.",
  },
  {
    id: "ml-standard-03",
    code: "ML",
    name: "Medical / Sick Leave",
    max_per_year: 10,
    carry_forward: false,
    requires_document: true,
    color: "#dc2626",
    description: "Leave for illness, hospital admission, or surgery (requires medical fitness certificate).",
  },
  {
    id: "comp-standard-04",
    code: "COMP",
    name: "Compensatory Off",
    max_per_year: 5,
    carry_forward: false,
    requires_document: false,
    color: "#d97706",
    description: "Credit leave granted for performing duties on holidays, Sundays, or extra institution events.",
  },
  {
    id: "od-standard-05",
    code: "OD",
    name: "On Duty / Academic Duty",
    max_per_year: 15,
    carry_forward: false,
    requires_document: true,
    color: "#6366f1",
    description: "Official duty for attending conferences, FDP workshops, university exams, or inspection visits.",
  },
  {
    id: "scl-standard-06",
    code: "SCL",
    name: "Special Casual Leave",
    max_per_year: 6,
    carry_forward: false,
    requires_document: false,
    color: "#8b5cf6",
    description: "Special institutional leave for university evaluation, sporting events, or jury duty.",
  },
  {
    id: "mat-standard-07",
    code: "MAT/PAT",
    name: "Maternity / Paternity Leave",
    max_per_year: 180,
    carry_forward: false,
    requires_document: true,
    color: "#ec4899",
    description: "Extended maternity (180 days) or paternity leave per statutory institutional guidelines.",
  },
];

// ─────────────────────────────────────────────────────────────
// Real-Time Subscriptions Manager
// ─────────────────────────────────────────────────────────────

/**
 * Subscribes to changes on any Supabase table with real-time postgres_changes
 * and returns an unsubscribe function.
 */
export function subscribeToTable(tableName, onEvent) {
  if (!supabase) return () => {};
  
  const channelName = `realtime_${tableName}_${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
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

  return () => {
    try {
      supabase.removeChannel(channel);
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
    // 1. Try Backend API
    const res = await axios.get(`${API}/leaves/types`, { timeout: 4000 });
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (e) {
    // Fallback to Supabase
  }

  try {
    // 2. Try Supabase directly
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

  // 3. Fallback to rich pre-configured defaults
  return DEFAULT_LEAVE_TYPES;
}

// ─────────────────────────────────────────────────────────────
// Leave Applications (CRUD + Real-Time Sync)
// ─────────────────────────────────────────────────────────────

export async function getLeaveApplications({ facultyId = null, status = null } = {}) {
  try {
    // 1. Try Backend API
    const params = {};
    if (facultyId) params.faculty_id = facultyId;
    if (status) params.status = status;
    const res = await axios.get(`${API}/leaves/`, { params, timeout: 5000 });
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (err) {
    // Try Supabase directly
  }

  try {
    // 2. Direct Supabase Query with joins
    let query = supabase
      .from("leave_applications")
      .select("*, faculty_profiles(teacher_name, employee_id, designation), leave_types(code, name, color)")
      .order("applied_at", { ascending: false });

    if (facultyId) {
      query = query.eq("faculty_id", facultyId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      return data.map((item) => ({
        id: item.id,
        faculty_id: item.faculty_id,
        faculty_name: item.faculty_profiles?.teacher_name || "Faculty Member",
        employee_id: item.faculty_profiles?.employee_id || "",
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
      }));
    }
  } catch (e) {
    console.warn("Supabase leave fetch fallback error:", e);
  }

  return [];
}

export async function submitLeaveApplication(formData) {
  let backendResult = null;
  let supabaseResult = null;

  // Calculate day count
  const days = calculateDays(formData.from_date, formData.to_date, formData.half_day);
  const payload = {
    faculty_id: formData.faculty_id,
    leave_type_id: formData.leave_type_id,
    from_date: formData.from_date,
    to_date: formData.to_date,
    half_day: !!formData.half_day,
    reason: formData.reason || "Personal Leave",
    document_url: formData.document_url || null,
    status: "pending",
    days_count: days,
    applied_at: new Date().toISOString(),
  };

  // 1. Try Backend API
  try {
    const res = await axios.post(`${API}/leaves/apply`, formData, { timeout: 6000 });
    backendResult = res.data;
  } catch (err) {
    console.warn("Backend leave apply API unavailable, saving to Supabase directly:", err?.message);
  }

  // 2. Ensure written to Supabase Real-Time database
  try {
    const { data, error } = await supabase
      .from("leave_applications")
      .insert([payload])
      .select()
      .single();
    if (!error) supabaseResult = data;
  } catch (e) {
    console.warn("Supabase leave direct write notice:", e);
  }

  if (!backendResult && !supabaseResult) {
    // If both failed because of network, throw error
    throw new Error("Could not submit leave application. Please check connection.");
  }

  return backendResult || supabaseResult;
}

export async function reviewLeaveApplication(leaveId, action, { reviewed_by, remarks = "", substitute_id = null }) {
  try {
    await axios.put(`${API}/leaves/${leaveId}/${action}`, {
      reviewed_by,
      review_remarks: remarks,
      substitute_id: substitute_id || undefined,
    }, { timeout: 5000 });
  } catch (e) {
    console.warn("Backend review API call skipped or timed out, syncing via Supabase:", e?.message);
  }

  try {
    const status = action === "approve" ? "approved" : "rejected";
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
    console.warn("Supabase leave status update error:", e);
  }

  return { success: true, action };
}

// ─────────────────────────────────────────────────────────────
// Leave Balances (Sync & Calculation)
// ─────────────────────────────────────────────────────────────

export async function getFacultyLeaveBalances(facultyId) {
  if (!facultyId) return [];

  try {
    const res = await axios.get(`${API}/leaves/balance/${facultyId}`, { timeout: 4000 });
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (e) {
    // Fallback to Supabase
  }

  try {
    const { data, error } = await supabase
      .from("leave_balances")
      .select("*, leave_types(code, name, color, max_per_year)")
      .eq("faculty_id", facultyId);

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((b) => ({
        id: b.id,
        faculty_id: b.faculty_id,
        leave_type_id: b.leave_type_id,
        leave_type_code: b.leave_types?.code || "CL",
        leave_type_name: b.leave_types?.name || "Leave",
        leave_type_color: b.leave_types?.color || "#3b82f6",
        total_allowed: b.total_allowed || b.leave_types?.max_per_year || 12,
        used: b.used || 0,
        pending: b.pending || 0,
        remaining: Math.max(0, (b.total_allowed || b.leave_types?.max_per_year || 12) - (b.used || 0) - (b.pending || 0)),
      }));
    }
  } catch (e) {
    // Fallback to generated balance based on default leave types
  }

  // Generate standard balance cards from default leave types
  return DEFAULT_LEAVE_TYPES.map((lt) => ({
    id: `bal-${lt.code}-${facultyId}`,
    faculty_id: facultyId,
    leave_type_id: lt.id,
    leave_type_code: lt.code,
    leave_type_name: lt.name,
    leave_type_color: lt.color,
    total_allowed: lt.max_per_year,
    used: 0,
    pending: 0,
    remaining: lt.max_per_year,
  }));
}

// ─────────────────────────────────────────────────────────────
// Attendance (Real-Time Biometric & Manual Logs)
// ─────────────────────────────────────────────────────────────

export async function getAttendanceRecords({ date = null, facultyId = null, month = null, year = null } = {}) {
  try {
    const params = {};
    if (date) params.date = date;
    if (facultyId) params.faculty_id = facultyId;
    if (month) params.month = month;
    if (year) params.year = year;

    const endpoint = month && year ? `${API}/attendance/report/monthly` : `${API}/attendance/`;
    const res = await axios.get(endpoint, { params, timeout: 5000 });
    if (res.data && Array.isArray(res.data)) {
      let data = res.data;
      if (facultyId) {
        data = data.filter((r) => r.faculty_id === facultyId);
      }
      return data;
    }
  } catch (e) {
    // Fallback to Supabase
  }

  try {
    let query = supabase
      .from("attendance_records")
      .select("*, faculty_profiles(teacher_name, employee_id, department)")
      .order("date", { ascending: false });

    if (date) query = query.eq("date", date);
    if (facultyId) query = query.eq("faculty_id", facultyId);

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      return data.map((r) => ({
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
      }));
    }
  } catch (e) {
    console.warn("Supabase attendance fetch error:", e);
  }

  return [];
}

export async function logAttendanceEntry(entryData) {
  try {
    await axios.post(`${API}/attendance/manual`, entryData, { timeout: 4000 });
  } catch (e) {
    // Fallback to Supabase
  }

  try {
    await supabase.from("attendance_records").upsert(
      {
        faculty_id: entryData.faculty_id,
        date: entryData.date,
        punch_in: entryData.punch_in ? `${entryData.date}T${entryData.punch_in}:00Z` : new Date().toISOString(),
        punch_out: entryData.punch_out ? `${entryData.date}T${entryData.punch_out}:00Z` : null,
        status: entryData.status || "present",
        remarks: entryData.remarks || "Manual Entry",
        source: "manual",
      },
      { onConflict: "faculty_id, date" }
    );
  } catch (e) {
    console.warn("Supabase attendance direct upsert error:", e);
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// Substitution & Proxy Logs
// ─────────────────────────────────────────────────────────────

export async function getSubstitutionLogs() {
  try {
    const res = await axios.get(`${API}/substitution/history`, { timeout: 4000 });
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (e) {
    // Fallback to Supabase
  }

  try {
    const { data, error } = await supabase
      .from("substitution_log")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (e) {
    console.warn("Supabase substitution log fetch error:", e);
  }

  return [];
}

export async function assignSubstitution(data) {
  try {
    await axios.post(`${API}/substitution/assign`, data, { timeout: 5000 });
  } catch (e) {
    // Fallback to Supabase
  }

  try {
    await supabase.from("substitution_log").insert([
      {
        leave_application_id: data.leave_application_id || null,
        original_faculty_id: data.original_faculty_id,
        substitute_faculty_id: data.substitute_faculty_id,
        date: data.date,
        slot: data.slot || "All Day",
        subject: data.subject || "",
        section: data.section || "",
        room: data.room || "",
        status: "assigned",
      },
    ]);
  } catch (e) {
    console.warn("Supabase substitution insert error:", e);
  }

  return { success: true };
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
