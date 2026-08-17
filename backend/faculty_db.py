"""
Database layer for the Faculty Management System.
Supports Supabase (cloud PostgreSQL) with seamless SQLite fallback for local development/offline resilience.
Standardizes all date/datetime representations across both database layers.
"""
import os
import uuid
import logging
from datetime import date, datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv

logger = logging.getLogger("ai-timetablex.faculty_db")

backend_env = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env, override=True)
load_dotenv(override=False)

try:
    from .db import get_connection
except ImportError:
    from db import get_connection

_SUPABASE_CLIENT = None
_SUPABASE_AVAILABLE = None


def get_supabase():
    """Returns initialized Supabase client or None if unavailable/unconfigured."""
    global _SUPABASE_CLIENT, _SUPABASE_AVAILABLE
    if _SUPABASE_AVAILABLE is False:
        return None

    if _SUPABASE_CLIENT is not None:
        return _SUPABASE_CLIENT

    raw_url = os.getenv("SUPABASE_URL") or os.getenv("REACT_APP_SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("REACT_APP_SUPABASE_ANON_KEY", "")
    if not raw_url or not key or "your-project" in raw_url:
        _SUPABASE_AVAILABLE = False
        return None

    try:
        from supabase import create_client
        url = raw_url.split("/rest/v1")[0].rstrip("/")
        _SUPABASE_CLIENT = create_client(url, key)
        _SUPABASE_AVAILABLE = True
        return _SUPABASE_CLIENT
    except Exception as e:
        logger.warning(f"Supabase client initialization failed, falling back to SQLite: {e}")
        _SUPABASE_AVAILABLE = False
        return None


# ── Date & Dict Normalization Helpers ───────────────────────

def _norm_date(val: Any) -> Optional[str]:
    if not val:
        return None
    if isinstance(val, (datetime, date)):
        return val.strftime("%Y-%m-%d")
    s = str(val).strip()
    return s.split("T")[0] if s else None


def _norm_datetime(val: Any) -> Optional[str]:
    if not val:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    s = str(val).strip()
    return s if s else None


def _row_to_dict(row: Any) -> dict:
    if row is None:
        return {}
    if isinstance(row, dict):
        return dict(row)
    return {k: row[k] for k in row.keys()}


# ── Departments ─────────────────────────────────────────────

def list_departments() -> List[dict]:
    sb = get_supabase()
    if sb:
        try:
            res = sb.table("departments").select("*").order("name").execute()
            departments = res.data or []
            for dept in departments:
                count_res = sb.table("faculty_profiles").select("id", count="exact").eq("department_id", dept["id"]).execute()
                dept["faculty_count"] = count_res.count or 0
                if dept.get("hod_faculty_id"):
                    hod = sb.table("faculty_profiles").select("teacher_name").eq("id", dept["hod_faculty_id"]).single().execute()
                    dept["hod_name"] = hod.data.get("teacher_name") if hod.data else None
                else:
                    dept["hod_name"] = None
                dept["created_at"] = _norm_datetime(dept.get("created_at"))
            return departments
        except Exception as e:
            logger.warning(f"Supabase list_departments failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM departments ORDER BY name")
    rows = cursor.fetchall()
    departments = []
    for r in rows:
        d = _row_to_dict(r)
        d["created_at"] = _norm_datetime(d.get("created_at"))
        # Count faculty
        cursor.execute("SELECT count(*) FROM faculty_profiles WHERE department_id = ?", (d["id"],))
        d["faculty_count"] = cursor.fetchone()[0]
        # HOD name
        if d.get("hod_faculty_id"):
            cursor.execute("SELECT teacher_name FROM faculty_profiles WHERE id = ?", (d["hod_faculty_id"],))
            hod_row = cursor.fetchone()
            d["hod_name"] = hod_row["teacher_name"] if hod_row else None
        else:
            d["hod_name"] = None
        departments.append(d)
    conn.close()
    return departments


def create_department(data: dict) -> dict:
    sb = get_supabase()
    if sb:
        try:
            res = sb.table("departments").insert(data).execute()
            d = res.data[0] if res.data else {}
            d["created_at"] = _norm_datetime(d.get("created_at"))
            return d
        except Exception as e:
            logger.warning(f"Supabase create_department failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    dept_id = data.get("id") or str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        "INSERT INTO departments (id, name, hod_faculty_id, created_at) VALUES (?, ?, ?, ?)",
        (dept_id, data.get("name"), data.get("hod_faculty_id"), now_iso)
    )
    conn.commit()
    conn.close()
    return {"id": dept_id, "name": data.get("name"), "hod_faculty_id": data.get("hod_faculty_id"), "created_at": now_iso}


def update_department(dept_id: str, data: dict) -> dict:
    sb = get_supabase()
    if sb:
        try:
            res = sb.table("departments").update(data).eq("id", dept_id).execute()
            d = res.data[0] if res.data else {}
            d["created_at"] = _norm_datetime(d.get("created_at"))
            return d
        except Exception as e:
            logger.warning(f"Supabase update_department failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    fields = []
    values = []
    for k, v in data.items():
        if k != "id":
            fields.append(f"{k} = ?")
            values.append(v)
    if fields:
        values.append(dept_id)
        cursor.execute(f"UPDATE departments SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
    cursor.execute("SELECT * FROM departments WHERE id = ?", (dept_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_dict(row)


def delete_department(dept_id: str):
    sb = get_supabase()
    if sb:
        try:
            sb.table("departments").delete().eq("id", dept_id).execute()
            return
        except Exception as e:
            logger.warning(f"Supabase delete_department failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM departments WHERE id = ?", (dept_id,))
    conn.commit()
    conn.close()


# ── Faculty Profiles ────────────────────────────────────────

def list_faculty(department_id: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None) -> List[dict]:
    sb = get_supabase()
    if sb:
        try:
            query = sb.table("faculty_profiles").select("*")
            if department_id:
                query = query.eq("department_id", department_id)
            if status:
                query = query.eq("status", status)
            if search:
                query = query.or_(f"teacher_name.ilike.%{search}%,employee_id.ilike.%{search}%")
            res = query.order("teacher_name").execute()
            faculty_list = res.data or []
            dept_cache: Dict[str, str] = {}
            for f in faculty_list:
                did = f.get("department_id")
                if did and did not in dept_cache:
                    d = sb.table("departments").select("name").eq("id", did).single().execute()
                    dept_cache[did] = d.data.get("name", "") if d.data else ""
                f["department_name"] = dept_cache.get(did, "")
                f["joining_date"] = _norm_date(f.get("joining_date"))
                f["created_at"] = _norm_datetime(f.get("created_at"))
                f["updated_at"] = _norm_datetime(f.get("updated_at"))
            return faculty_list
        except Exception as e:
            logger.warning(f"Supabase list_faculty failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    sql = "SELECT f.*, d.name as department_name FROM faculty_profiles f LEFT JOIN departments d ON f.department_id = d.id WHERE 1=1"
    params = []
    if department_id:
        sql += " AND f.department_id = ?"
        params.append(department_id)
    if status:
        sql += " AND f.status = ?"
        params.append(status)
    if search:
        sql += " AND (f.teacher_name LIKE ? OR f.employee_id LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    sql += " ORDER BY f.teacher_name"

    cursor.execute(sql, params)
    rows = cursor.fetchall()
    faculty_list = []
    for r in rows:
        f = _row_to_dict(r)
        f["joining_date"] = _norm_date(f.get("joining_date"))
        f["created_at"] = _norm_datetime(f.get("created_at"))
        f["updated_at"] = _norm_datetime(f.get("updated_at"))
        faculty_list.append(f)
    conn.close()
    return faculty_list


def get_faculty(faculty_id: str) -> Optional[dict]:
    sb = get_supabase()
    if sb:
        try:
            res = sb.table("faculty_profiles").select("*").eq("id", faculty_id).single().execute()
            if not res.data:
                return None
            f = res.data
            if f.get("department_id"):
                d = sb.table("departments").select("name").eq("id", f["department_id"]).single().execute()
                f["department_name"] = d.data.get("name", "") if d.data else ""
            else:
                f["department_name"] = ""
            f["joining_date"] = _norm_date(f.get("joining_date"))
            f["created_at"] = _norm_datetime(f.get("created_at"))
            f["updated_at"] = _norm_datetime(f.get("updated_at"))
            return f
        except Exception as e:
            logger.warning(f"Supabase get_faculty failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT f.*, d.name as department_name FROM faculty_profiles f LEFT JOIN departments d ON f.department_id = d.id WHERE f.id = ?",
        (faculty_id,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    f = _row_to_dict(row)
    f["joining_date"] = _norm_date(f.get("joining_date"))
    f["created_at"] = _norm_datetime(f.get("created_at"))
    f["updated_at"] = _norm_datetime(f.get("updated_at"))
    return f


def _sanitize_faculty_payload(data: dict) -> dict:
    """Cleans and standardizes faculty data for database operations."""
    clean = {}
    for k, v in data.items():
        if isinstance(v, (datetime, date)):
            clean[k] = v.isoformat() if isinstance(v, datetime) else v.strftime("%Y-%m-%d")
        elif isinstance(v, str):
            trimmed = v.strip()
            clean[k] = trimmed if trimmed else None
        else:
            clean[k] = v

    # Ensure joining_date is formatted as YYYY-MM-DD
    if not clean.get("joining_date"):
        clean["joining_date"] = date.today().strftime("%Y-%m-%d")
    else:
        clean["joining_date"] = _norm_date(clean["joining_date"])

    # Ensure department_id is valid UUID or None if invalid
    dept_id = clean.get("department_id")
    if dept_id:
        try:
            uuid.UUID(str(dept_id))
        except (ValueError, TypeError):
            clean["department_id"] = None

    return clean


def create_faculty(data: dict) -> dict:
    clean_data = _sanitize_faculty_payload(data)
    sb = get_supabase()
    if sb:
        try:
            # Filter to allowed Supabase columns
            allowed_cols = {
                "id", "user_id", "teacher_name", "employee_id", "department_id", "designation",
                "qualification", "employment_type", "joining_date", "phone", "emergency_contact",
                "address", "photo_url", "status", "email"
            }
            sb_payload = {k: v for k, v in clean_data.items() if k in allowed_cols and v is not None}
            
            try:
                res = sb.table("faculty_profiles").insert(sb_payload).execute()
            except Exception as insert_err:
                # If error is due to missing email column in Supabase schema, retry without email
                if "email" in sb_payload and "email" in str(insert_err):
                    sb_payload_no_email = {k: v for k, v in sb_payload.items() if k != "email"}
                    res = sb.table("faculty_profiles").insert(sb_payload_no_email).execute()
                else:
                    raise insert_err

            f = res.data[0] if res.data else {}
            f["joining_date"] = _norm_date(f.get("joining_date"))
            f["created_at"] = _norm_datetime(f.get("created_at"))
            f["updated_at"] = _norm_datetime(f.get("updated_at"))
            return f
        except Exception as e:
            # If duplicate employee_id, fetch existing
            try:
                emp_id = clean_data.get("employee_id")
                if emp_id:
                    existing = sb.table("faculty_profiles").select("*").eq("employee_id", emp_id).single().execute()
                    if existing.data:
                        f = existing.data
                        f["joining_date"] = _norm_date(f.get("joining_date"))
                        f["created_at"] = _norm_datetime(f.get("created_at"))
                        f["updated_at"] = _norm_datetime(f.get("updated_at"))
                        return f
            except Exception:
                pass
            logger.warning(f"Supabase create_faculty failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    emp_id = clean_data.get("employee_id")
    if emp_id:
        cursor.execute("SELECT id FROM faculty_profiles WHERE employee_id = ?", (emp_id,))
        existing_row = cursor.fetchone()
        if existing_row:
            conn.close()
            return get_faculty(existing_row["id"]) or {}

    fid = clean_data.get("id") or str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    joining_date = clean_data.get("joining_date") or date.today().isoformat()

    cursor.execute("""
        INSERT INTO faculty_profiles (
            id, user_id, teacher_name, employee_id, department_id, designation,
            qualification, employment_type, joining_date, phone, emergency_contact,
            address, photo_url, status, email, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        fid, clean_data.get("user_id"), clean_data.get("teacher_name"), emp_id,
        clean_data.get("department_id"), clean_data.get("designation", "Lecturer"),
        clean_data.get("qualification"), clean_data.get("employment_type", "full-time"),
        joining_date, clean_data.get("phone"), clean_data.get("emergency_contact"),
        clean_data.get("address"), clean_data.get("photo_url"), clean_data.get("status", "active"),
        clean_data.get("email"),
        now_iso, now_iso
    ))
    conn.commit()
    conn.close()
    return get_faculty(fid) or {}


def update_faculty(faculty_id: str, data: dict) -> dict:
    clean_data = _sanitize_faculty_payload(data)
    sb = get_supabase()
    if sb:
        try:
            clean_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            allowed_cols = {
                "user_id", "teacher_name", "employee_id", "department_id", "designation",
                "qualification", "employment_type", "joining_date", "phone", "emergency_contact",
                "address", "photo_url", "status", "email", "updated_at"
            }
            sb_payload = {k: v for k, v in clean_data.items() if k in allowed_cols}
            res = sb.table("faculty_profiles").update(sb_payload).eq("id", faculty_id).execute()
            f = res.data[0] if res.data else {}
            f["joining_date"] = _norm_date(f.get("joining_date"))
            f["created_at"] = _norm_datetime(f.get("created_at"))
            f["updated_at"] = _norm_datetime(f.get("updated_at"))
            return f
        except Exception as e:
            logger.warning(f"Supabase update_faculty failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    clean_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    fields = []
    values = []
    for k, v in clean_data.items():
        if k != "id":
            fields.append(f"{k} = ?")
            values.append(v)
    if fields:
        values.append(faculty_id)
        cursor.execute(f"UPDATE faculty_profiles SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
    conn.close()
    return get_faculty(faculty_id) or {}


def deactivate_faculty(faculty_id: str) -> dict:
    return update_faculty(faculty_id, {"status": "resigned"})


def delete_faculty(faculty_id: str) -> dict:
    sb = get_supabase()
    if sb:
        try:
            sb.table("leave_balances").delete().eq("faculty_id", faculty_id).execute()
            sb.table("attendance_records").delete().eq("faculty_id", faculty_id).execute()
            sb.table("substitution_log").delete().eq("original_teacher_id", faculty_id).execute()
            res = sb.table("faculty_profiles").delete().eq("id", faculty_id).execute()
            return {"deleted": True, "id": faculty_id}
        except Exception as e:
            logger.warning(f"Supabase delete_faculty failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM leave_balances WHERE faculty_id = ?", (faculty_id,))
        cursor.execute("DELETE FROM attendance_records WHERE faculty_id = ?", (faculty_id,))
        cursor.execute("DELETE FROM faculty_profiles WHERE id = ?", (faculty_id,))
        conn.commit()
    finally:
        conn.close()
    return {"deleted": True, "id": faculty_id}


def clear_all_faculty() -> dict:
    """Purges all faculty profiles and associated records to reset workspace."""
    sb = get_supabase()
    if sb:
        try:
            sb.table("leave_balances").delete().neq("faculty_id", "00000000-0000-0000-0000-000000000000").execute()
            sb.table("attendance_records").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            sb.table("substitution_log").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            sb.table("leave_applications").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            sb.table("faculty_profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        except Exception as e:
            logger.warning(f"Supabase clear_all_faculty error: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM leave_balances")
        cursor.execute("DELETE FROM attendance_records")
        cursor.execute("DELETE FROM substitution_log")
        cursor.execute("DELETE FROM leave_applications")
        cursor.execute("DELETE FROM faculty_profiles")
        conn.commit()
    finally:
        conn.close()
    return {"deleted": True, "message": "All faculty records cleared successfully"}



# ── Leave Types ─────────────────────────────────────────────

def list_leave_types() -> List[dict]:
    sb = get_supabase()
    if sb:
        try:
            res = sb.table("leave_types").select("*").order("code").execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Supabase list_leave_types failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leave_types ORDER BY code")
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def create_leave_type(data: dict) -> dict:
    sb = get_supabase()
    if sb:
        try:
            res = sb.table("leave_types").insert(data).execute()
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.warning(f"Supabase create_leave_type failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    lt_id = data.get("id") or str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO leave_types (id, code, name, max_per_year, carry_forward, requires_document, color)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        lt_id, data.get("code"), data.get("name"), data.get("max_per_year", 12),
        1 if data.get("carry_forward") else 0, 1 if data.get("requires_document") else 0,
        data.get("color", "#3b82f6")
    ))
    conn.commit()
    conn.close()
    return {"id": lt_id, **data}


# ── Leave Balances ──────────────────────────────────────────

def get_leave_balances(faculty_id: str, academic_year: str = "2026-27") -> List[dict]:
    sb = get_supabase()
    if sb:
        try:
            res = sb.table("leave_balances").select("*").eq("faculty_id", faculty_id).eq("academic_year", academic_year).execute()
            balances = res.data or []
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
        except Exception as e:
            logger.warning(f"Supabase get_leave_balances failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT b.*, t.code as leave_type_code, t.name as leave_type_name, t.color as leave_type_color
        FROM leave_balances b
        JOIN leave_types t ON b.leave_type_id = t.id
        WHERE b.faculty_id = ? AND b.academic_year = ?
    """, (faculty_id, academic_year))
    rows = cursor.fetchall()
    balances = []
    for r in rows:
        b = _row_to_dict(r)
        b["remaining"] = b.get("total_allowed", 0) - b.get("used", 0) - b.get("pending", 0)
        balances.append(b)
    conn.close()
    return balances


def initialize_leave_balances(faculty_id: str, academic_year: str = "2026-27"):
    """Create default leave balances for a new faculty member."""
    types = list_leave_types()
    sb = get_supabase()
    if sb:
        try:
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
            return
        except Exception as e:
            logger.warning(f"Supabase initialize_leave_balances failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    for lt in types:
        cursor.execute(
            "SELECT id FROM leave_balances WHERE faculty_id = ? AND leave_type_id = ? AND academic_year = ?",
            (faculty_id, lt["id"], academic_year)
        )
        if not cursor.fetchone():
            bal_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO leave_balances (id, faculty_id, leave_type_id, academic_year, total_allowed, used, pending)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (bal_id, faculty_id, lt["id"], academic_year, lt["max_per_year"], 0, 0))
    conn.commit()
    conn.close()


# ── Leave Applications ──────────────────────────────────────

def apply_leave(data: dict) -> dict:
    from_date = _norm_date(data.get("from_date"))
    to_date = _norm_date(data.get("to_date"))
    half_day = bool(data.get("half_day", False))
    payload = dict(data)
    payload["from_date"] = from_date
    payload["to_date"] = to_date
    payload["half_day"] = half_day

    sb = get_supabase()
    if sb:
        try:
            res = sb.table("leave_applications").insert(payload).execute()
            if res.data:
                app = res.data[0]
                _update_leave_balance_pending(app["faculty_id"], app["leave_type_id"], 1, half_day, from_date, to_date)
                app["from_date"] = _norm_date(app.get("from_date"))
                app["to_date"] = _norm_date(app.get("to_date"))
                app["applied_at"] = _norm_datetime(app.get("applied_at"))
                return app
        except Exception as e:
            logger.warning(f"Supabase apply_leave failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    app_id = payload.get("id") or str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO leave_applications (
            id, faculty_id, leave_type_id, from_date, to_date, half_day, reason, document_url, status, applied_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        app_id, payload["faculty_id"], payload["leave_type_id"], from_date, to_date,
        1 if half_day else 0, payload.get("reason", ""), payload.get("document_url"), "pending", now_iso
    ))
    conn.commit()
    conn.close()

    _update_leave_balance_pending(payload["faculty_id"], payload["leave_type_id"], 1, half_day, from_date, to_date)
    return {
        "id": app_id,
        "faculty_id": payload["faculty_id"],
        "leave_type_id": payload["leave_type_id"],
        "from_date": from_date,
        "to_date": to_date,
        "half_day": half_day,
        "reason": payload.get("reason", ""),
        "status": "pending",
        "applied_at": now_iso
    }


def list_leave_applications(
    faculty_id: Optional[str] = None,
    status: Optional[str] = None,
    department_id: Optional[str] = None,
) -> List[dict]:
    sb = get_supabase()
    if sb:
        try:
            query = sb.table("leave_applications").select("*")
            if faculty_id:
                query = query.eq("faculty_id", faculty_id)
            if status:
                query = query.eq("status", status)
            res = query.order("applied_at", desc=True).execute()
            applications = res.data or []

            faculty_cache: Dict[str, dict] = {}
            lt_cache: Dict[str, dict] = {}
            filtered = []
            for app in applications:
                fid = app.get("faculty_id")
                if fid and fid not in faculty_cache:
                    f = sb.table("faculty_profiles").select("teacher_name,department_id").eq("id", fid).single().execute()
                    faculty_cache[fid] = f.data if f.data else {}
                f_info = faculty_cache.get(fid, {})
                app["faculty_name"] = f_info.get("teacher_name", "")

                if department_id and f_info.get("department_id") != department_id:
                    continue

                lt_id = app.get("leave_type_id")
                if lt_id and lt_id not in lt_cache:
                    lt = sb.table("leave_types").select("code,name,color").eq("id", lt_id).single().execute()
                    lt_cache[lt_id] = lt.data if lt.data else {}
                lt_info = lt_cache.get(lt_id, {})
                app["leave_type_code"] = lt_info.get("code", "")
                app["leave_type_name"] = lt_info.get("name", "")
                app["leave_type_color"] = lt_info.get("color", "#3b82f6")

                if app.get("reviewed_by"):
                    if app["reviewed_by"] not in faculty_cache:
                        r = sb.table("faculty_profiles").select("teacher_name").eq("id", app["reviewed_by"]).single().execute()
                        faculty_cache[app["reviewed_by"]] = r.data if r.data else {}
                    app["reviewer_name"] = faculty_cache.get(app["reviewed_by"], {}).get("teacher_name", "")

                if app.get("substitute_id"):
                    if app["substitute_id"] not in faculty_cache:
                        s = sb.table("faculty_profiles").select("teacher_name").eq("id", app["substitute_id"]).single().execute()
                        faculty_cache[app["substitute_id"]] = s.data if s.data else {}
                    app["substitute_name"] = faculty_cache.get(app["substitute_id"], {}).get("teacher_name", "")

                app["from_date"] = _norm_date(app.get("from_date"))
                app["to_date"] = _norm_date(app.get("to_date"))
                app["applied_at"] = _norm_datetime(app.get("applied_at"))
                app["reviewed_at"] = _norm_datetime(app.get("reviewed_at"))
                app["days_count"] = _calculate_days(app["from_date"], app["to_date"], bool(app.get("half_day")))
                filtered.append(app)
            return filtered
        except Exception as e:
            logger.warning(f"Supabase list_leave_applications failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    sql = """
        SELECT a.*, f.teacher_name as faculty_name, f.department_id,
               t.code as leave_type_code, t.name as leave_type_name, t.color as leave_type_color,
               rf.teacher_name as reviewer_name, sf.teacher_name as substitute_name
        FROM leave_applications a
        LEFT JOIN faculty_profiles f ON a.faculty_id = f.id
        LEFT JOIN leave_types t ON a.leave_type_id = t.id
        LEFT JOIN faculty_profiles rf ON a.reviewed_by = rf.id
        LEFT JOIN faculty_profiles sf ON a.substitute_id = sf.id
        WHERE 1=1
    """
    params = []
    if faculty_id:
        sql += " AND a.faculty_id = ?"
        params.append(faculty_id)
    if status:
        sql += " AND a.status = ?"
        params.append(status)
    if department_id:
        sql += " AND f.department_id = ?"
        params.append(department_id)
    sql += " ORDER BY a.applied_at DESC"

    cursor.execute(sql, params)
    rows = cursor.fetchall()
    applications = []
    for r in rows:
        app = _row_to_dict(r)
        app["from_date"] = _norm_date(app.get("from_date"))
        app["to_date"] = _norm_date(app.get("to_date"))
        app["applied_at"] = _norm_datetime(app.get("applied_at"))
        app["reviewed_at"] = _norm_datetime(app.get("reviewed_at"))
        app["half_day"] = bool(app.get("half_day"))
        app["days_count"] = _calculate_days(app["from_date"], app["to_date"], app["half_day"])
        applications.append(app)
    conn.close()
    return applications


def _is_uuid(val: Any) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except Exception:
        return False


def approve_leave(leave_id: str, reviewed_by: str, remarks: Optional[str] = None, substitute_id: Optional[str] = None) -> dict:
    sb = get_supabase()
    if sb:
        try:
            app_res = sb.table("leave_applications").select("*").eq("id", leave_id).single().execute()
            if app_res.data:
                app = app_res.data
                update_data = {
                    "status": "approved",
                    "reviewed_at": datetime.now(timezone.utc).isoformat(),
                    "review_remarks": remarks,
                }
                if _is_uuid(reviewed_by):
                    update_data["reviewed_by"] = reviewed_by
                if _is_uuid(substitute_id):
                    update_data["substitute_id"] = substitute_id
                res = sb.table("leave_applications").update(update_data).eq("id", leave_id).execute()
                _move_pending_to_used(app["faculty_id"], app["leave_type_id"], app.get("half_day", False), app.get("from_date"), app.get("to_date"))
                result = res.data[0] if res.data else {}
                result["from_date"] = _norm_date(result.get("from_date"))
                result["to_date"] = _norm_date(result.get("to_date"))
                result["applied_at"] = _norm_datetime(result.get("applied_at"))
                result["reviewed_at"] = _norm_datetime(result.get("reviewed_at"))
                return result
        except Exception as e:
            logger.warning(f"Supabase approve_leave failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leave_applications WHERE id = ?", (leave_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {}
    app = _row_to_dict(row)
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        UPDATE leave_applications
        SET status = 'approved', reviewed_by = ?, reviewed_at = ?, review_remarks = ?, substitute_id = ?
        WHERE id = ?
    """, (reviewed_by, now_iso, remarks, substitute_id or app.get("substitute_id"), leave_id))
    conn.commit()
    conn.close()

    _move_pending_to_used(app["faculty_id"], app["leave_type_id"], bool(app.get("half_day")), app.get("from_date"), app.get("to_date"))
    app.update({
        "status": "approved",
        "reviewed_by": reviewed_by,
        "reviewed_at": now_iso,
        "review_remarks": remarks,
        "substitute_id": substitute_id or app.get("substitute_id"),
        "from_date": _norm_date(app.get("from_date")),
        "to_date": _norm_date(app.get("to_date")),
        "applied_at": _norm_datetime(app.get("applied_at")),
    })
    return app


def reject_leave(leave_id: str, reviewed_by: str, remarks: Optional[str] = None) -> dict:
    sb = get_supabase()
    if sb:
        try:
            app_res = sb.table("leave_applications").select("*").eq("id", leave_id).single().execute()
            if app_res.data:
                app = app_res.data
                update_data = {
                    "status": "rejected",
                    "reviewed_at": datetime.now(timezone.utc).isoformat(),
                    "review_remarks": remarks,
                }
                if _is_uuid(reviewed_by):
                    update_data["reviewed_by"] = reviewed_by
                res = sb.table("leave_applications").update(update_data).eq("id", leave_id).execute()
                _update_leave_balance_pending(app["faculty_id"], app["leave_type_id"], -1, app.get("half_day", False), app.get("from_date"), app.get("to_date"))
                result = res.data[0] if res.data else {}
                result["from_date"] = _norm_date(result.get("from_date"))
                result["to_date"] = _norm_date(result.get("to_date"))
                result["applied_at"] = _norm_datetime(result.get("applied_at"))
                result["reviewed_at"] = _norm_datetime(result.get("reviewed_at"))
                return result
        except Exception as e:
            logger.warning(f"Supabase reject_leave failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leave_applications WHERE id = ?", (leave_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {}
    app = _row_to_dict(row)
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        UPDATE leave_applications
        SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, review_remarks = ?
        WHERE id = ?
    """, (reviewed_by, now_iso, remarks, leave_id))
    conn.commit()
    conn.close()

    _update_leave_balance_pending(app["faculty_id"], app["leave_type_id"], -1, bool(app.get("half_day")), app.get("from_date"), app.get("to_date"))
    app.update({
        "status": "rejected",
        "reviewed_by": reviewed_by,
        "reviewed_at": now_iso,
        "review_remarks": remarks,
        "from_date": _norm_date(app.get("from_date")),
        "to_date": _norm_date(app.get("to_date")),
        "applied_at": _norm_datetime(app.get("applied_at")),
    })
    return app


def get_leave_calendar(month: int, year: int) -> List[dict]:
    start = f"{year}-{month:02d}-01"
    end = f"{year + 1}-01-01" if month == 12 else f"{year}-{month + 1:02d}-01"

    sb = get_supabase()
    if sb:
        try:
            res = sb.table("leave_applications").select("*").gte("from_date", start).lt("to_date", end).in_("status", ["pending", "approved"]).execute()
            leaves = res.data or []
            for l in leaves:
                l["from_date"] = _norm_date(l.get("from_date"))
                l["to_date"] = _norm_date(l.get("to_date"))
                l["applied_at"] = _norm_datetime(l.get("applied_at"))
                l["reviewed_at"] = _norm_datetime(l.get("reviewed_at"))
            return leaves
        except Exception as e:
            logger.warning(f"Supabase get_leave_calendar failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM leave_applications
        WHERE from_date >= ? AND to_date < ? AND status IN ('pending', 'approved')
    """, (start, end))
    rows = cursor.fetchall()
    leaves = []
    for r in rows:
        l = _row_to_dict(r)
        l["from_date"] = _norm_date(l.get("from_date"))
        l["to_date"] = _norm_date(l.get("to_date"))
        l["applied_at"] = _norm_datetime(l.get("applied_at"))
        l["reviewed_at"] = _norm_datetime(l.get("reviewed_at"))
        leaves.append(l)
    conn.close()
    return leaves


# ── Attendance ──────────────────────────────────────────────

def import_attendance_csv(records: List[dict]) -> dict:
    matched = 0
    unmatched = 0
    duplicates = 0
    imported = 0
    errors = []
    unmatched_ids = []

    sb = get_supabase()

    for record in records:
        emp_id = record.get("employee_id", "").strip()
        if not emp_id:
            errors.append("Missing employee ID in row")
            continue

        fac = None
        if sb:
            try:
                fac_res = sb.table("faculty_profiles").select("id").eq("employee_id", emp_id).single().execute()
                fac = fac_res.data
            except Exception:
                fac = None

        if not fac:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM faculty_profiles WHERE employee_id = ?", (emp_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                fac = {"id": row["id"]}

        if not fac:
            unmatched += 1
            if emp_id not in unmatched_ids:
                unmatched_ids.append(emp_id)
            continue

        matched += 1
        faculty_id = fac["id"]
        rec_date = _norm_date(record.get("date"))

        payload = {
            "faculty_id": faculty_id,
            "date": rec_date,
            "punch_in": _norm_datetime(record.get("punch_in")),
            "punch_out": _norm_datetime(record.get("punch_out")),
            "source": "csv_import",
            "status": record.get("status", "present"),
            "late_minutes": record.get("late_minutes", 0),
        }

        # Try save
        saved = False
        if sb:
            try:
                existing = sb.table("attendance_records").select("id").eq("faculty_id", faculty_id).eq("date", rec_date).execute()
                if existing.data:
                    duplicates += 1
                    sb.table("attendance_records").update(payload).eq("id", existing.data[0]["id"]).execute()
                else:
                    sb.table("attendance_records").insert(payload).execute()
                imported += 1
                saved = True
            except Exception as e:
                logger.warning(f"Supabase attendance insert failed: {e}. Falling to SQLite.")

        if not saved:
            try:
                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM attendance_records WHERE faculty_id = ? AND date = ?", (faculty_id, rec_date))
                existing = cursor.fetchone()
                if existing:
                    duplicates += 1
                    cursor.execute("""
                        UPDATE attendance_records
                        SET punch_in = ?, punch_out = ?, source = ?, status = ?, late_minutes = ?
                        WHERE id = ?
                    """, (payload["punch_in"], payload["punch_out"], payload["source"], payload["status"], payload["late_minutes"], existing["id"]))
                else:
                    att_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO attendance_records (id, faculty_id, date, punch_in, punch_out, source, status, late_minutes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (att_id, faculty_id, rec_date, payload["punch_in"], payload["punch_out"], payload["source"], payload["status"], payload["late_minutes"]))
                conn.commit()
                conn.close()
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
    if sb:
        try:
            query = sb.table("attendance_records").select("*")
            if faculty_id:
                query = query.eq("faculty_id", faculty_id)
            if date_str:
                query = query.eq("date", _norm_date(date_str))
            if month and year:
                start = f"{year}-{month:02d}-01"
                end = f"{year + 1}-01-01" if month == 12 else f"{year}-{month + 1:02d}-01"
                query = query.gte("date", start).lt("date", end)
            res = query.order("date", desc=True).execute()
            records = res.data or []

            fac_cache: Dict[str, dict] = {}
            for r in records:
                fid = r.get("faculty_id")
                if fid and fid not in fac_cache:
                    f = sb.table("faculty_profiles").select("teacher_name,employee_id").eq("id", fid).single().execute()
                    fac_cache[fid] = f.data if f.data else {}
                info = fac_cache.get(fid, {})
                r["faculty_name"] = info.get("teacher_name", "")
                r["employee_id"] = info.get("employee_id", "")
                r["date"] = _norm_date(r.get("date"))
                r["punch_in"] = _norm_datetime(r.get("punch_in"))
                r["punch_out"] = _norm_datetime(r.get("punch_out"))
            return records
        except Exception as e:
            logger.warning(f"Supabase get_attendance failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    sql = """
        SELECT a.*, f.teacher_name as faculty_name, f.employee_id
        FROM attendance_records a
        LEFT JOIN faculty_profiles f ON a.faculty_id = f.id
        WHERE 1=1
    """
    params = []
    if faculty_id:
        sql += " AND a.faculty_id = ?"
        params.append(faculty_id)
    if date_str:
        sql += " AND a.date = ?"
        params.append(_norm_date(date_str))
    if month and year:
        start = f"{year}-{month:02d}-01"
        end = f"{year + 1}-01-01" if month == 12 else f"{year}-{month + 1:02d}-01"
        sql += " AND a.date >= ? AND a.date < ?"
        params.extend([start, end])
    sql += " ORDER BY a.date DESC"

    cursor.execute(sql, params)
    rows = cursor.fetchall()
    records = []
    for r in rows:
        rec = _row_to_dict(r)
        rec["date"] = _norm_date(rec.get("date"))
        rec["punch_in"] = _norm_datetime(rec.get("punch_in"))
        rec["punch_out"] = _norm_datetime(rec.get("punch_out"))
        records.append(rec)
    conn.close()
    return records


def manual_attendance(data: dict) -> dict:
    rec_date = _norm_date(data.get("date"))
    payload = dict(data)
    payload["date"] = rec_date
    payload["source"] = "manual"
    payload["punch_in"] = _norm_datetime(data.get("punch_in"))
    payload["punch_out"] = _norm_datetime(data.get("punch_out"))

    sb = get_supabase()
    if sb:
        try:
            existing = sb.table("attendance_records").select("id").eq("faculty_id", data["faculty_id"]).eq("date", rec_date).execute()
            if existing.data:
                res = sb.table("attendance_records").update(payload).eq("id", existing.data[0]["id"]).execute()
            else:
                res = sb.table("attendance_records").insert(payload).execute()
            d = res.data[0] if res.data else {}
            d["date"] = _norm_date(d.get("date"))
            d["punch_in"] = _norm_datetime(d.get("punch_in"))
            d["punch_out"] = _norm_datetime(d.get("punch_out"))
            return d
        except Exception as e:
            logger.warning(f"Supabase manual_attendance failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM attendance_records WHERE faculty_id = ? AND date = ?", (data["faculty_id"], rec_date))
    existing = cursor.fetchone()
    if existing:
        cursor.execute("""
            UPDATE attendance_records
            SET punch_in = ?, punch_out = ?, source = 'manual', status = ?, late_minutes = ?, remarks = ?
            WHERE id = ?
        """, (payload.get("punch_in"), payload.get("punch_out"), payload.get("status", "present"), payload.get("late_minutes", 0), payload.get("remarks"), existing["id"]))
        att_id = existing["id"]
    else:
        att_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO attendance_records (id, faculty_id, date, punch_in, punch_out, source, status, late_minutes, remarks)
            VALUES (?, ?, ?, ?, ?, 'manual', ?, ?, ?)
        """, (att_id, data["faculty_id"], rec_date, payload.get("punch_in"), payload.get("punch_out"), payload.get("status", "present"), payload.get("late_minutes", 0), payload.get("remarks")))
    conn.commit()
    conn.close()

    payload["id"] = att_id
    return payload


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
    rec_date = _norm_date(data.get("date"))
    payload = dict(data)
    payload["date"] = rec_date

    sb = get_supabase()
    if sb:
        try:
            res = sb.table("substitution_log").insert(payload).execute()
            d = res.data[0] if res.data else {}
            d["date"] = _norm_date(d.get("date"))
            d["created_at"] = _norm_datetime(d.get("created_at"))
            return d
        except Exception as e:
            logger.warning(f"Supabase create_substitution failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    sub_id = payload.get("id") or str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO substitution_log (
            id, leave_application_id, original_faculty_id, substitute_faculty_id, date, slot, subject, section, room, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        sub_id, payload.get("leave_application_id"), payload["original_faculty_id"], payload["substitute_faculty_id"],
        rec_date, payload.get("slot", "1"), payload.get("subject"), payload.get("section"), payload.get("room"),
        payload.get("status", "assigned"), now_iso
    ))
    conn.commit()
    conn.close()

    payload["id"] = sub_id
    payload["created_at"] = now_iso
    return payload


def list_substitutions(date_str: Optional[str] = None, faculty_id: Optional[str] = None) -> List[dict]:
    sb = get_supabase()
    if sb:
        try:
            query = sb.table("substitution_log").select("*")
            if date_str:
                query = query.eq("date", _norm_date(date_str))
            if faculty_id:
                query = query.or_(f"original_faculty_id.eq.{faculty_id},substitute_faculty_id.eq.{faculty_id}")
            res = query.order("created_at", desc=True).execute()
            subs = res.data or []

            fac_cache: Dict[str, str] = {}
            for s in subs:
                for key in ["original_faculty_id", "substitute_faculty_id"]:
                    fid = s.get(key)
                    if fid and fid not in fac_cache:
                        f = sb.table("faculty_profiles").select("teacher_name").eq("id", fid).single().execute()
                        fac_cache[fid] = f.data.get("teacher_name", "") if f.data else ""
                s["original_faculty_name"] = fac_cache.get(s.get("original_faculty_id"), "")
                s["substitute_faculty_name"] = fac_cache.get(s.get("substitute_faculty_id"), "")
                s["date"] = _norm_date(s.get("date"))
                s["created_at"] = _norm_datetime(s.get("created_at"))
            return subs
        except Exception as e:
            logger.warning(f"Supabase list_substitutions failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    sql = """
        SELECT s.*, of.teacher_name as original_faculty_name, sf.teacher_name as substitute_faculty_name
        FROM substitution_log s
        LEFT JOIN faculty_profiles of ON s.original_faculty_id = of.id
        LEFT JOIN faculty_profiles sf ON s.substitute_faculty_id = sf.id
        WHERE 1=1
    """
    params = []
    if date_str:
        sql += " AND s.date = ?"
        params.append(_norm_date(date_str))
    if faculty_id:
        sql += " AND (s.original_faculty_id = ? OR s.substitute_faculty_id = ?)"
        params.extend([faculty_id, faculty_id])
    sql += " ORDER BY s.created_at DESC"

    cursor.execute(sql, params)
    rows = cursor.fetchall()
    subs = []
    for r in rows:
        s = _row_to_dict(r)
        s["date"] = _norm_date(s.get("date"))
        s["created_at"] = _norm_datetime(s.get("created_at"))
        subs.append(s)
    conn.close()
    return subs


def get_substitution_count(faculty_id: str, month: int, year: int) -> int:
    start = f"{year}-{month:02d}-01"
    end = f"{year + 1}-01-01" if month == 12 else f"{year}-{month + 1:02d}-01"

    sb = get_supabase()
    if sb:
        try:
            res = sb.table("substitution_log").select("id", count="exact").eq("substitute_faculty_id", faculty_id).gte("date", start).lt("date", end).execute()
            return res.count or 0
        except Exception as e:
            logger.warning(f"Supabase get_substitution_count failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT count(*) FROM substitution_log
        WHERE substitute_faculty_id = ? AND date >= ? AND date < ?
    """, (faculty_id, start, end))
    count = cursor.fetchone()[0]
    conn.close()
    return count


# ── Dashboard Stats ─────────────────────────────────────────

def get_dashboard_stats() -> dict:
    today = date.today().isoformat()
    sb = get_supabase()
    if sb:
        try:
            fac_res = sb.table("faculty_profiles").select("id", count="exact").eq("status", "active").execute()
            total_faculty = fac_res.count or 0

            dept_res = sb.table("departments").select("id", count="exact").execute()
            total_departments = dept_res.count or 0

            att_res = sb.table("attendance_records").select("status").eq("date", today).execute()
            attendance_today = att_res.data or []
            present_today = sum(1 for a in attendance_today if a.get("status") in ("present", "late", "on-duty"))
            absent_today = sum(1 for a in attendance_today if a.get("status") == "absent")

            pending_res = sb.table("leave_applications").select("id", count="exact").eq("status", "pending").execute()
            pending_leaves = pending_res.count or 0

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
        except Exception as e:
            logger.warning(f"Supabase get_dashboard_stats failed: {e}. Using SQLite fallback.")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM faculty_profiles WHERE status = 'active'")
    total_faculty = cursor.fetchone()[0]

    cursor.execute("SELECT count(*) FROM departments")
    total_departments = cursor.fetchone()[0]

    cursor.execute("SELECT status FROM attendance_records WHERE date = ?", (today,))
    att_rows = cursor.fetchall()
    present_today = sum(1 for r in att_rows if r["status"] in ("present", "late", "on-duty"))
    absent_today = sum(1 for r in att_rows if r["status"] == "absent")

    cursor.execute("SELECT count(*) FROM leave_applications WHERE status = 'pending'")
    pending_leaves = cursor.fetchone()[0]

    cursor.execute("SELECT count(*) FROM leave_applications WHERE status = 'approved' AND from_date <= ? AND to_date >= ?", (today, today))
    on_leave_today = cursor.fetchone()[0]

    conn.close()
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
        d1 = date.fromisoformat(str(from_date).split("T")[0])
        d2 = date.fromisoformat(str(to_date).split("T")[0])
        days = (d2 - d1).days + 1
        return 0.5 if half_day else float(days)
    except Exception:
        return 0.5 if half_day else 1.0


def _update_leave_balance_pending(faculty_id: str, leave_type_id: str, direction: int, half_day: bool, from_date, to_date):
    days = _calculate_days(from_date, to_date, half_day)
    delta = int(days * direction) if not half_day else direction

    sb = get_supabase()
    if sb:
        try:
            bal = sb.table("leave_balances").select("id,pending").eq("faculty_id", faculty_id).eq("leave_type_id", leave_type_id).eq("academic_year", "2026-27").single().execute()
            if bal.data:
                new_pending = max(0, (bal.data.get("pending", 0) + delta))
                sb.table("leave_balances").update({"pending": new_pending}).eq("id", bal.data["id"]).execute()
                return
        except Exception:
            pass

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, pending FROM leave_balances WHERE faculty_id = ? AND leave_type_id = ? AND academic_year = '2026-27'", (faculty_id, leave_type_id))
    bal = cursor.fetchone()
    if bal:
        new_pending = max(0, (bal["pending"] + delta))
        cursor.execute("UPDATE leave_balances SET pending = ? WHERE id = ?", (new_pending, bal["id"]))
        conn.commit()
    conn.close()


def _move_pending_to_used(faculty_id: str, leave_type_id: str, half_day: bool, from_date, to_date):
    days = _calculate_days(from_date, to_date, half_day)
    delta = int(days) if not half_day else 1

    sb = get_supabase()
    if sb:
        try:
            bal = sb.table("leave_balances").select("id,pending,used").eq("faculty_id", faculty_id).eq("leave_type_id", leave_type_id).eq("academic_year", "2026-27").single().execute()
            if bal.data:
                new_pending = max(0, (bal.data.get("pending", 0) - delta))
                new_used = (bal.data.get("used", 0) + delta)
                sb.table("leave_balances").update({"pending": new_pending, "used": new_used}).eq("id", bal.data["id"]).execute()
                return
        except Exception:
            pass

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, pending, used FROM leave_balances WHERE faculty_id = ? AND leave_type_id = ? AND academic_year = '2026-27'", (faculty_id, leave_type_id))
    bal = cursor.fetchone()
    if bal:
        new_pending = max(0, (bal["pending"] - delta))
        new_used = (bal["used"] + delta)
        cursor.execute("UPDATE leave_balances SET pending = ?, used = ? WHERE id = ?", (new_pending, new_used, bal["id"]))
        conn.commit()
    conn.close()
