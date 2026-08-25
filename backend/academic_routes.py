"""
Academic Operations & Hierarchy API Router for Planify.exe.
Provides endpoints for institutions, programs, semesters, sections, subjects, allocations, and rooms.
"""
import uuid
import logging
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from faculty_db import get_supabase
    from db import get_connection
except ImportError:
    from .faculty_db import get_supabase
    from .db import get_connection

logger = logging.getLogger("plannify.academic_routes")
router = APIRouter(prefix="", tags=["Academic Hierarchy"])


# ── Pydantic Models ─────────────────────────────────────────

class ProgramCreate(BaseModel):
    name: str
    code: str
    level: str = "UG"  # 'UG', 'PG', 'Diploma', 'Doctoral'
    department_id: Optional[str] = None
    duration_semesters: int = 6


class SectionCreate(BaseModel):
    program_id: str
    semester_id: str
    name: str
    specialization: Optional[str] = None
    default_room_id: Optional[str] = None
    default_lab_room_id: Optional[str] = None
    mentor_faculty_id: Optional[str] = None
    capacity: int = 60


class SubjectCreate(BaseModel):
    program_id: str
    semester_id: Optional[str] = None
    code: str
    name: str
    credit_hours: float = 4.0
    lecture_hours: int = 4
    lab_hours: int = 0
    is_lab: bool = False


class RoomCreate(BaseModel):
    room_number: str
    room_type: str = "CLASSROOM"  # 'CLASSROOM', 'LAB', 'SEMINAR_HALL', 'PROJECTOR_ROOM'
    capacity: int = 60
    has_projector: bool = False
    has_smart_board: bool = False
    building_id: Optional[str] = None


class AllocationCreate(BaseModel):
    faculty_id: str
    faculty_name: str
    subject_id: str
    subject_code: str
    subject_name: str
    program_id: str
    semester_id: str
    section_id: str
    academic_term: str = "July-Dec 2026"
    weekly_load: int = 4
    is_lab: bool = False


# ── Endpoints ───────────────────────────────────────────────

@router.get("/academic/hierarchy")
def get_academic_hierarchy_endpoint():
    """
    Returns complete hierarchical tree of institutions, departments, programs (UG/PG),
    semesters, sections, courses, and active allocations.
    """
    sb = get_supabase()
    if sb:
        try:
            programs = sb.table("programs").select("*").order("code").execute().data or []
            semesters = sb.table("semesters").select("*").order("semester_number").execute().data or []
            sections = sb.table("sections").select("*").order("name").execute().data or []
            subjects = sb.table("subjects").select("*").order("code").execute().data or []
            rooms = sb.table("rooms").select("*").order("room_number").execute().data or []
            allocations = sb.table("faculty_subject_allocations").select("*").execute().data or []
            departments = sb.table("departments").select("*").order("name").execute().data or []

            # Build tree
            sem_map = {}
            for s in semesters:
                s_copy = {**s, "sections": [], "subjects": []}
                sem_map[s["id"]] = s_copy

            for sec in sections:
                if sec.get("semester_id") in sem_map:
                    sem_map[sec["semester_id"]]["sections"].append(sec)

            for sub in subjects:
                if sub.get("semester_id") in sem_map:
                    sem_map[sub["semester_id"]]["subjects"].append(sub)

            prog_list = []
            for p in programs:
                p_sems = [s for s in sem_map.values() if s.get("program_id") == p["id"]]
                p_subs = [sub for sub in subjects if sub.get("program_id") == p["id"]]
                prog_list.append({**p, "semesters": p_sems, "all_subjects": p_subs})

            return {
                "programs": prog_list,
                "departments": departments,
                "rooms": rooms,
                "total_allocations": len(allocations),
                "allocations": allocations
            }
        except Exception as e:
            logger.warning(f"Supabase hierarchy query failed: {e}. Falling back to SQLite.")

    # SQLite fallback
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM programs ORDER BY code")
        programs = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM semesters ORDER BY semester_number")
        semesters = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM sections ORDER BY name")
        sections = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM subjects ORDER BY code")
        subjects = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM rooms ORDER BY room_number")
        rooms = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM faculty_subject_allocations")
        allocations = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM departments ORDER BY name")
        departments = [dict(r) for r in cursor.fetchall()]

        sem_map = {}
        for s in semesters:
            s_copy = {**s, "sections": [], "subjects": []}
            sem_map[s["id"]] = s_copy

        for sec in sections:
            if sec.get("semester_id") in sem_map:
                sem_map[sec["semester_id"]]["sections"].append(sec)

        for sub in subjects:
            if sub.get("semester_id") in sem_map:
                sem_map[sub["semester_id"]]["subjects"].append(sub)

        prog_list = []
        for p in programs:
            p_sems = [s for s in sem_map.values() if s.get("program_id") == p["id"]]
            p_subs = [sub for sub in subjects if sub.get("program_id") == p["id"]]
            prog_list.append({**p, "semesters": p_sems, "all_subjects": p_subs})

        return {
            "programs": prog_list,
            "departments": departments,
            "rooms": rooms,
            "total_allocations": len(allocations),
            "allocations": allocations
        }
    finally:
        conn.close()


@router.get("/academic/programs")
def list_programs_endpoint():
    sb = get_supabase()
    if sb:
        try:
            return sb.table("programs").select("*").order("code").execute().data or []
        except Exception:
            pass
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM programs ORDER BY code")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@router.post("/academic/programs")
def create_program_endpoint(program: ProgramCreate):
    p_id = str(uuid.uuid4())
    sb = get_supabase()
    if sb:
        try:
            res = sb.table("programs").insert({
                "id": p_id,
                "name": program.name,
                "code": program.code.upper(),
                "level": program.level,
                "department_id": program.department_id,
                "duration_semesters": program.duration_semesters
            }).execute()
            return res.data[0] if res.data else {"id": p_id, **program.model_dump()}
        except Exception as e:
            logger.warning(f"Supabase create program failed: {e}")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO programs (id, name, code, level, department_id, duration_semesters) VALUES (?, ?, ?, ?, ?, ?)",
        (p_id, program.name, program.code.upper(), program.level, program.department_id, program.duration_semesters)
    )
    conn.commit()
    conn.close()
    return {"id": p_id, **program.model_dump()}


@router.get("/academic/sections")
def list_sections_endpoint(program_id: Optional[str] = None, semester_id: Optional[str] = None):
    sb = get_supabase()
    if sb:
        try:
            q = sb.table("sections").select("*")
            if program_id:
                q = q.eq("program_id", program_id)
            if semester_id:
                q = q.eq("semester_id", semester_id)
            return q.order("name").execute().data or []
        except Exception:
            pass
    conn = get_connection()
    cursor = conn.cursor()
    sql = "SELECT * FROM sections WHERE 1=1"
    params = []
    if program_id:
        sql += " AND program_id = ?"
        params.append(program_id)
    if semester_id:
        sql += " AND semester_id = ?"
        params.append(semester_id)
    sql += " ORDER BY name"
    cursor.execute(sql, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@router.get("/academic/subjects")
def list_subjects_endpoint(program_id: Optional[str] = None):
    sb = get_supabase()
    if sb:
        try:
            q = sb.table("subjects").select("*")
            if program_id:
                q = q.eq("program_id", program_id)
            return q.order("code").execute().data or []
        except Exception:
            pass
    conn = get_connection()
    cursor = conn.cursor()
    sql = "SELECT * FROM subjects WHERE 1=1"
    params = []
    if program_id:
        sql += " AND program_id = ?"
        params.append(program_id)
    sql += " ORDER BY code"
    cursor.execute(sql, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@router.get("/academic/rooms")
def list_rooms_endpoint():
    sb = get_supabase()
    if sb:
        try:
            return sb.table("rooms").select("*").order("room_number").execute().data or []
        except Exception:
            pass
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rooms ORDER BY room_number")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@router.get("/academic/allocations")
def list_allocations_endpoint(academic_term: Optional[str] = "July-Dec 2026"):
    sb = get_supabase()
    if sb:
        try:
            q = sb.table("faculty_subject_allocations").select("*")
            if academic_term:
                q = q.eq("academic_term", academic_term)
            return q.execute().data or []
        except Exception:
            pass
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM faculty_subject_allocations WHERE academic_term = ?", (academic_term,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows
