"""
Supabase database layer for the Faculty Management System.
Handles all DB operations for faculty, leaves, attendance, substitutions, departments.
"""
import os
from datetime import date, datetime, timezone
from typing import Dict, List, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
backend_env = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env, override=True)

# Use service role key for backend operations (bypasses RLS)
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("REACT_APP_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("REACT_APP_SUPABASE_ANON_KEY", "")


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Supabase URL and Key must be configured in backend/.env")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# ── Departments ─────────────────────────────────────────────

def list_departments() -> List[dict]:
    sb = get_supabase()
    res = sb.table("departments").select("*").order("name").execute()
    departments = res.data or []
    # Enrich with faculty count and HOD name
    for dept in departments:
        count_res = sb.table("faculty_profiles").select("id", count="exact").eq("department_id", dept["id"]).execute()
        dept["faculty_count"] = count_res.count or 0
        if dept.get("hod_faculty_id"):
            hod = sb.table("faculty_profiles").select("teacher_name").eq("id", dept["hod_faculty_id"]).single().execute()
            dept["hod_name"] = hod.data.get("teacher_name") if hod.data else None
        else:
            dept["hod_name"] = None
    return departments


def create_department(data: dict) -> dict:
    sb = get_supabase()
    res = sb.table("departments").insert(data).execute()
    return res.data[0] if res.data else {}


def update_department(dept_id: str, data: dict) -> dict:
    sb = get_supabase()
    res = sb.table("departments").update(data).eq("id", dept_id).execute()
    return res.data[0] if res.data else {}


def delete_department(dept_id: str):
    sb = get_supabase()
    sb.table("departments").delete().eq("id", dept_id).execute()


# ── Faculty Profiles ────────────────────────────────────────

def list_faculty(department_id: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None) -> List[dict]:
    sb = get_supabase()
    query = sb.table("faculty_profiles").select("*")
    if department_id:
        query = query.eq("department_id", department_id)
    if status:
        query = query.eq("status", status)
    if search:
        query = query.or_(f"teacher_name.ilike.%{search}%,employee_id.ilike.%{search}%")
    res = query.order("teacher_name").execute()
    faculty_list = res.data or []
    # Enrich with department name
    dept_cache: Dict[str, str] = {}
    for f in faculty_list:
        did = f.get("department_id")
        if did and did not in dept_cache:
            d = sb.table("departments").select("name").eq("id", did).single().execute()
            dept_cache[did] = d.data.get("name", "") if d.data else ""
        f["department_name"] = dept_cache.get(did, "")
    return faculty_list


def get_faculty(faculty_id: str) -> Optional[dict]:
    sb = get_supabase()
    res = sb.table("faculty_profiles").select("*").eq("id", faculty_id).single().execute()
    if not res.data:
        return None
    f = res.data
    # Department name
    if f.get("department_id"):
        d = sb.table("departments").select("name").eq("id", f["department_id"]).single().execute()
        f["department_name"] = d.data.get("name", "") if d.data else ""
    else:
        f["department_name"] = ""
    return f


def create_faculty(data: dict) -> dict:
    sb = get_supabase()
    res = sb.table("faculty_profiles").insert(data).execute()
    return res.data[0] if res.data else {}


def update_faculty(faculty_id: str, data: dict) -> dict:
    sb = get_supabase()
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = sb.table("faculty_profiles").update(data).eq("id", faculty_id).execute()
    return res.data[0] if res.data else {}


def deactivate_faculty(faculty_id: str) -> dict:
    return update_faculty(faculty_id, {"status": "resigned"})


# ── Leave Types ─────────────────────────────────────────────

def list_leave_types() -> List[dict]:
    sb = get_supabase()
    res = sb.table("leave_types").select("*").order("code").execute()
    return res.data or []


def create_leave_type(data: dict) -> dict:
    sb = get_supabase()
    res = sb.table("leave_types").insert(data).execute()
    return res.data[0] if res.data else {}


# ── Leave Balances ──────────────────────────────────────────

def get_leave_balances(faculty_id: str, academic_year: str = "2026-27") -> List[dict]:
    sb = get_supabase()
    res = sb.table("leave_balances").select("*").eq("faculty_id", faculty_id).eq("academic_year", academic_year).execute()
    balances = res.data or []
    # Enrich with leave type info
    types_cache: Dict[str, dict] = {}
    for b in balances:
        lt_id = b.get("leave_type_id")
        if lt_id and lt_id not in types_cache:
            lt = sb.table("leave_types").select("code,name,color").eq("id", lt_id).single().execute()
            types_cache[lt_id] = lt.data if lt.data else {}
        lt_info = types_cache.get(lt_id, {})
        b["leave_type_code"] = lt_info.get("code", "")
        b["leave_type_name"] = lt_info.get("name", "")
        b["leave_type_color"] = lt_info.get("color", "#3b82f6")
        b["remaining"] = b.get("total_allowed", 0) - b.get("used", 0) - b.get("pending", 0)
    return balances


def initialize_leave_balances(faculty_id: str, academic_year: str = "2026-27"):
    """Create default leave balances for a new faculty member."""
    sb = get_supabase()
    types = list_leave_types()
    for lt in types:
        existing = sb.table("leave_balances").select("id").eq("faculty_id", faculty_id).eq("leave_type_id", lt["id"]).eq("academic_year", academic_year).execute()
        if not existing.data:
            sb.table("leave_balances").insert({
                "faculty_id": faculty_id,
                "leave_type_id": lt["id"],
                "academic_year": academic_year,
                "total_allowed": lt["max_per_year"],
                "used": 0,
                "pending": 0
            }).execute()


# ── Leave Applications ──────────────────────────────────────

def apply_leave(data: dict) -> dict:
    sb = get_supabase()
    res = sb.table("leave_applications").insert(data).execute()
    if res.data:
        app = res.data[0]
        # Increment pending count in balance
        _update_leave_balance_pending(app["faculty_id"], app["leave_type_id"], 1, data.get("half_day", False), data.get("from_date"), data.get("to_date"))
        return app
    return {}


def list_leave_applications(
    faculty_id: Optional[str] = None,
    status: Optional[str] = None,
    department_id: Optional[str] = None,
) -> List[dict]:
    sb = get_supabase()
    query = sb.table("leave_applications").select("*")
    if faculty_id:
        query = query.eq("faculty_id", faculty_id)
    if status:
        query = query.eq("status", status)
    res = query.order("applied_at", desc=True).execute()
    applications = res.data or []

    # Enrich
    faculty_cache: Dict[str, dict] = {}
    lt_cache: Dict[str, dict] = {}
    for app in applications:
        # Faculty name
        fid = app.get("faculty_id")
        if fid and fid not in faculty_cache:
            f = sb.table("faculty_profiles").select("teacher_name,department_id").eq("id", fid).single().execute()
            faculty_cache[fid] = f.data if f.data else {}
        f_info = faculty_cache.get(fid, {})
        app["faculty_name"] = f_info.get("teacher_name", "")

        # Filter by department if requested
        if department_id and f_info.get("department_id") != department_id:
            continue

        # Leave type info
        lt_id = app.get("leave_type_id")
        if lt_id and lt_id not in lt_cache:
            lt = sb.table("leave_types").select("code,name,color").eq("id", lt_id).single().execute()
            lt_cache[lt_id] = lt.data if lt.data else {}
        lt_info = lt_cache.get(lt_id, {})
        app["leave_type_code"] = lt_info.get("code", "")
        app["leave_type_name"] = lt_info.get("name", "")
        app["leave_type_color"] = lt_info.get("color", "#3b82f6")

        # Reviewer name
        if app.get("reviewed_by"):
            if app["reviewed_by"] not in faculty_cache:
                r = sb.table("faculty_profiles").select("teacher_name").eq("id", app["reviewed_by"]).single().execute()
                faculty_cache[app["reviewed_by"]] = r.data if r.data else {}
            app["reviewer_name"] = faculty_cache.get(app["reviewed_by"], {}).get("teacher_name", "")

        # Substitute name
        if app.get("substitute_id"):
            if app["substitute_id"] not in faculty_cache:
                s = sb.table("faculty_profiles").select("teacher_name").eq("id", app["substitute_id"]).single().execute()
                faculty_cache[app["substitute_id"]] = s.data if s.data else {}
            app["substitute_name"] = faculty_cache.get(app["substitute_id"], {}).get("teacher_name", "")

        # Days count
        try:
            d1 = date.fromisoformat(str(app["from_date"]))
            d2 = date.fromisoformat(str(app["to_date"]))
            days = (d2 - d1).days + 1
            app["days_count"] = 0.5 if app.get("half_day") else days
        except Exception:
            app["days_count"] = 1

    # If filtering by department, filter the list
    if department_id:
        applications = [a for a in applications if faculty_cache.get(a.get("faculty_id"), {}).get("department_id") == department_id]

    return applications


def approve_leave(leave_id: str, reviewed_by: str, remarks: Optional[str] = None, substitute_id: Optional[str] = None) -> dict:
    sb = get_supabase()
    # Get the leave application
    app_res = sb.table("leave_applications").select("*").eq("id", leave_id).single().execute()
    if not app_res.data:
        return {}
    app = app_res.data

    update_data = {
        "status": "approved",
        "reviewed_by": reviewed_by,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "review_remarks": remarks,
    }
    if substitute_id:
        update_data["substitute_id"] = substitute_id

    res = sb.table("leave_applications").update(update_data).eq("id", leave_id).execute()

    # Move pending to used in balance
    _move_pending_to_used(app["faculty_id"], app["leave_type_id"], app.get("half_day", False), app.get("from_date"), app.get("to_date"))

    return res.data[0] if res.data else {}


def reject_leave(leave_id: str, reviewed_by: str, remarks: Optional[str] = None) -> dict:
    sb = get_supabase()
    # Get the leave application
    app_res = sb.table("leave_applications").select("*").eq("id", leave_id).single().execute()
    if not app_res.data:
        return {}
    app = app_res.data

    update_data = {
        "status": "rejected",
        "reviewed_by": reviewed_by,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "review_remarks": remarks,
    }
    res = sb.table("leave_applications").update(update_data).eq("id", leave_id).execute()

    # Remove pending count
    _update_leave_balance_pending(app["faculty_id"], app["leave_type_id"], -1, app.get("half_day", False), app.get("from_date"), app.get("to_date"))

    return res.data[0] if res.data else {}


def get_leave_calendar(month: int, year: int) -> List[dict]:
    """Get all leaves for a given month for calendar display."""
    sb = get_supabase()
    start = f"{year}-{month:02d}-01"
    if month == 12:
        end = f"{year + 1}-01-01"
    else:
        end = f"{year}-{month + 1:02d}-01"

    res = sb.table("leave_applications").select("*").gte("from_date", start).lt("to_date", end).in_("status", ["pending", "approved"]).execute()
    return res.data or []


# ── Attendance ──────────────────────────────────────────────

def import_attendance_csv(records: List[dict]) -> dict:
    """Import attendance records from parsed CSV data."""
    sb = get_supabase()
    matched = 0
    unmatched = 0
    duplicates = 0
    imported = 0
    errors = []
    unmatched_ids = []

    for record in records:
        emp_id = record.get("employee_id", "").strip()
        if not emp_id:
            errors.append(f"Missing employee ID in row")
            continue

        # Find faculty by employee_id
        fac = sb.table("faculty_profiles").select("id").eq("employee_id", emp_id).single().execute()
        if not fac.data:
            unmatched += 1
            if emp_id not in unmatched_ids:
                unmatched_ids.append(emp_id)
            continue

        matched += 1
        faculty_id = fac.data["id"]
        rec_date = record.get("date")

        # Check for duplicate
        existing = sb.table("attendance_records").select("id").eq("faculty_id", faculty_id).eq("date", rec_date).execute()
        if existing.data:
            duplicates += 1
            # Upsert: update existing record
            sb.table("attendance_records").update({
                "punch_in": record.get("punch_in"),
                "punch_out": record.get("punch_out"),
                "source": "csv_import",
                "status": record.get("status", "present"),
                "late_minutes": record.get("late_minutes", 0),
            }).eq("id", existing.data[0]["id"]).execute()
            imported += 1
            continue

        try:
            sb.table("attendance_records").insert({
                "faculty_id": faculty_id,
                "date": rec_date,
                "punch_in": record.get("punch_in"),
                "punch_out": record.get("punch_out"),
                "source": "csv_import",
                "status": record.get("status", "present"),
                "late_minutes": record.get("late_minutes", 0),
            }).execute()
            imported += 1
        except Exception as e:
            errors.append(f"Error for {emp_id} on {rec_date}: {str(e)}")

    return {
        "total_rows": len(records),
        "matched": matched,
        "unmatched": unmatched,
        "duplicates": duplicates,
        "imported": imported,
        "errors": errors,
        "unmatched_ids": unmatched_ids,
    }


def get_attendance(
    date_str: Optional[str] = None,
    faculty_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
) -> List[dict]:
    sb = get_supabase()
    query = sb.table("attendance_records").select("*")
    if faculty_id:
        query = query.eq("faculty_id", faculty_id)
    if date_str:
        query = query.eq("date", date_str)
    if month and year:
        start = f"{year}-{month:02d}-01"
        if month == 12:
            end = f"{year + 1}-01-01"
        else:
            end = f"{year}-{month + 1:02d}-01"
        query = query.gte("date", start).lt("date", end)
    res = query.order("date", desc=True).execute()
    records = res.data or []

    # Enrich with faculty name
    fac_cache: Dict[str, dict] = {}
    for r in records:
        fid = r.get("faculty_id")
        if fid and fid not in fac_cache:
            f = sb.table("faculty_profiles").select("teacher_name,employee_id").eq("id", fid).single().execute()
            fac_cache[fid] = f.data if f.data else {}
        info = fac_cache.get(fid, {})
        r["faculty_name"] = info.get("teacher_name", "")
        r["employee_id"] = info.get("employee_id", "")
    return records


def manual_attendance(data: dict) -> dict:
    sb = get_supabase()
    data["source"] = "manual"
    # Upsert
    existing = sb.table("attendance_records").select("id").eq("faculty_id", data["faculty_id"]).eq("date", data["date"]).execute()
    if existing.data:
        res = sb.table("attendance_records").update(data).eq("id", existing.data[0]["id"]).execute()
    else:
        res = sb.table("attendance_records").insert(data).execute()
    return res.data[0] if res.data else {}


def get_attendance_summary(faculty_id: str, month: int, year: int) -> dict:
    records = get_attendance(faculty_id=faculty_id, month=month, year=year)
    summary = {
        "total_working_days": len(records),
        "present": sum(1 for r in records if r.get("status") == "present"),
        "absent": sum(1 for r in records if r.get("status") == "absent"),
        "late": sum(1 for r in records if r.get("status") == "late"),
        "half_day": sum(1 for r in records if r.get("status") == "half-day"),
        "on_duty": sum(1 for r in records if r.get("status") == "on-duty"),
    }
    total = summary["total_working_days"]
    if total > 0:
        present_count = summary["present"] + summary["late"] + summary["on_duty"] + (summary["half_day"] * 0.5)
        summary["attendance_percentage"] = round((present_count / total) * 100, 1)
    else:
        summary["attendance_percentage"] = 0.0
    return summary


# ── Substitution ────────────────────────────────────────────

def create_substitution(data: dict) -> dict:
    sb = get_supabase()
    res = sb.table("substitution_log").insert(data).execute()
    return res.data[0] if res.data else {}


def list_substitutions(date_str: Optional[str] = None, faculty_id: Optional[str] = None) -> List[dict]:
    sb = get_supabase()
    query = sb.table("substitution_log").select("*")
    if date_str:
        query = query.eq("date", date_str)
    if faculty_id:
        query = query.or_(f"original_faculty_id.eq.{faculty_id},substitute_faculty_id.eq.{faculty_id}")
    res = query.order("created_at", desc=True).execute()
    subs = res.data or []

    # Enrich with names
    fac_cache: Dict[str, str] = {}
    for s in subs:
        for key in ["original_faculty_id", "substitute_faculty_id"]:
            fid = s.get(key)
            if fid and fid not in fac_cache:
                f = sb.table("faculty_profiles").select("teacher_name").eq("id", fid).single().execute()
                fac_cache[fid] = f.data.get("teacher_name", "") if f.data else ""
        s["original_faculty_name"] = fac_cache.get(s.get("original_faculty_id"), "")
        s["substitute_faculty_name"] = fac_cache.get(s.get("substitute_faculty_id"), "")
    return subs


def get_substitution_count(faculty_id: str, month: int, year: int) -> int:
    sb = get_supabase()
    start = f"{year}-{month:02d}-01"
    if month == 12:
        end = f"{year + 1}-01-01"
    else:
        end = f"{year}-{month + 1:02d}-01"
    res = sb.table("substitution_log").select("id", count="exact").eq("substitute_faculty_id", faculty_id).gte("date", start).lt("date", end).execute()
    return res.count or 0


# ── Dashboard Stats ─────────────────────────────────────────

def get_dashboard_stats() -> dict:
    sb = get_supabase()
    today = date.today().isoformat()

    # Total faculty
    fac_res = sb.table("faculty_profiles").select("id", count="exact").eq("status", "active").execute()
    total_faculty = fac_res.count or 0

    # Department count
    dept_res = sb.table("departments").select("id", count="exact").execute()
    total_departments = dept_res.count or 0

    # Today's attendance
    att_res = sb.table("attendance_records").select("status").eq("date", today).execute()
    attendance_today = att_res.data or []
    present_today = sum(1 for a in attendance_today if a.get("status") in ("present", "late", "on-duty"))
    absent_today = sum(1 for a in attendance_today if a.get("status") == "absent")

    # Pending leaves
    pending_res = sb.table("leave_applications").select("id", count="exact").eq("status", "pending").execute()
    pending_leaves = pending_res.count or 0

    # On leave today
    on_leave_res = sb.table("leave_applications").select("id", count="exact").eq("status", "approved").lte("from_date", today).gte("to_date", today).execute()
    on_leave_today = on_leave_res.count or 0

    return {
        "total_faculty": total_faculty,
        "total_departments": total_departments,
        "present_today": present_today,
        "absent_today": absent_today,
        "pending_leaves": pending_leaves,
        "on_leave_today": on_leave_today,
        "attendance_rate": round((present_today / max(1, total_faculty)) * 100, 1),
    }


# ── Helpers ─────────────────────────────────────────────────

def _calculate_days(from_date, to_date, half_day: bool) -> float:
    try:
        d1 = date.fromisoformat(str(from_date))
        d2 = date.fromisoformat(str(to_date))
        days = (d2 - d1).days + 1
        return 0.5 if half_day else days
    except Exception:
        return 1


def _update_leave_balance_pending(faculty_id: str, leave_type_id: str, direction: int, half_day: bool, from_date, to_date):
    sb = get_supabase()
    days = _calculate_days(from_date, to_date, half_day)
    delta = int(days * direction) if not half_day else direction

    bal = sb.table("leave_balances").select("id,pending").eq("faculty_id", faculty_id).eq("leave_type_id", leave_type_id).eq("academic_year", "2026-27").single().execute()
    if bal.data:
        new_pending = max(0, (bal.data.get("pending", 0) + delta))
        sb.table("leave_balances").update({"pending": new_pending}).eq("id", bal.data["id"]).execute()


def _move_pending_to_used(faculty_id: str, leave_type_id: str, half_day: bool, from_date, to_date):
    sb = get_supabase()
    days = _calculate_days(from_date, to_date, half_day)
    delta = int(days) if not half_day else 1

    bal = sb.table("leave_balances").select("id,pending,used").eq("faculty_id", faculty_id).eq("leave_type_id", leave_type_id).eq("academic_year", "2026-27").single().execute()
    if bal.data:
        new_pending = max(0, (bal.data.get("pending", 0) - delta))
        new_used = (bal.data.get("used", 0) + delta)
        sb.table("leave_balances").update({"pending": new_pending, "used": new_used}).eq("id", bal.data["id"]).execute()
