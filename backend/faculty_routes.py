"""
Faculty CRUD and Department API routes.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

try:
    from .models import (
        FacultyCreate, FacultyUpdate, FacultyOut, FacultyDetail,
        DepartmentCreate, DepartmentOut,
    )
    from .faculty_db import (
        list_faculty, get_faculty, create_faculty, update_faculty, deactivate_faculty, delete_faculty, clear_all_faculty,
        sync_account_profile,
        list_departments, create_department, update_department, delete_department,
        get_leave_balances, get_attendance_summary, initialize_leave_balances,
        get_dashboard_stats,
    )
except ImportError:
    from models import (
        FacultyCreate, FacultyUpdate, FacultyOut, FacultyDetail,
        DepartmentCreate, DepartmentOut,
    )
    from faculty_db import (
        list_faculty, get_faculty, create_faculty, update_faculty, deactivate_faculty, delete_faculty, clear_all_faculty,
        sync_account_profile,
        list_departments, create_department, update_department, delete_department,
        get_leave_balances, get_attendance_summary, initialize_leave_balances,
        get_dashboard_stats,
    )

from datetime import date

router = APIRouter(prefix="/faculty", tags=["Faculty"])


# ── Dashboard Stats ─────────────────────────────────────────

@router.get("/dashboard-stats")
def faculty_dashboard_stats():
    """Overview statistics for the admin faculty dashboard."""
    try:
        return get_dashboard_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/seed-lnct")
def seed_lnct():
    """Seeds LNCT University Bhopal 17 Faculty Members."""
    lnct = [
        {"teacher_name": "Prof Ripusoodan Sharma", "employee_id": "EMP-LNCT-001", "designation": "Professor", "phone": "+91-7869543871"},
        {"teacher_name": "Prof Anshu Gangwar", "employee_id": "EMP-LNCT-002", "designation": "Professor", "phone": "+91-8519064890"},
        {"teacher_name": "Dr Satish Manwani", "employee_id": "EMP-LNCT-003", "designation": "Associate Professor", "phone": "+91-9893724144"},
        {"teacher_name": "Prof Pragya Shastri", "employee_id": "EMP-LNCT-004", "designation": "Assistant Professor", "phone": "+91-9589952503"},
        {"teacher_name": "Prof Mohit Kubade", "employee_id": "EMP-LNCT-005", "designation": "Assistant Professor", "phone": "+91-7804817594"},
        {"teacher_name": "Dr Sonal Sharma", "employee_id": "EMP-LNCT-006", "designation": "Professor", "phone": "+91-9425644974"},
        {"teacher_name": "Mr. Aniket Satpute", "employee_id": "EMP-LNCT-007", "designation": "Assistant Professor", "phone": "+91-7028467010"},
        {"teacher_name": "Prof Jagruti Durugkar", "employee_id": "EMP-LNCT-008", "designation": "Assistant Professor", "phone": "+91-8964877562"},
        {"teacher_name": "Mr Kaiwalya Zankar", "employee_id": "EMP-LNCT-009", "designation": "Lecturer", "phone": "+91-9834921305"},
        {"teacher_name": "Ms. Swarupa Waghmare", "employee_id": "EMP-LNCT-010", "designation": "Lecturer", "phone": "+91-8482894207"},
        {"teacher_name": "Prof Dipanshu Jha", "employee_id": "EMP-LNCT-011", "designation": "Assistant Professor", "phone": "+91-8462821467"},
        {"teacher_name": "Dr Alka Gulati", "employee_id": "EMP-LNCT-012", "designation": "Associate Professor", "phone": "+91-9826722264"},
        {"teacher_name": "Prof Neha Swanakar", "employee_id": "EMP-LNCT-013", "designation": "Assistant Professor", "phone": "+91-9300787622"},
        {"teacher_name": "Dr Swagatika Lenka", "employee_id": "EMP-LNCT-014", "designation": "Associate Professor", "phone": "+91-8637248598"},
        {"teacher_name": "Mr Jitendra Maind", "employee_id": "EMP-LNCT-015", "designation": "Assistant Professor", "phone": "+91-7875492545"},
        {"teacher_name": "Prof Pramod Kumar Saket", "employee_id": "EMP-LNCT-016", "designation": "Assistant Professor", "phone": "+91-9039371123"},
        {"teacher_name": "Prof Atul Verma", "employee_id": "EMP-LNCT-017", "designation": "Assistant Professor", "phone": "+91-9569455529"}
    ]
    added = []
    for f in lnct:
        try:
            res = create_faculty(f)
            if res and res.get("id"):
                initialize_leave_balances(res["id"])
                added.append(res)
        except Exception:
            pass
    return {"message": "LNCT Faculty members seeded successfully", "count": len(added)}


# ── Departments ─────────────────────────────────────────────

@router.get("/departments")
def get_departments():
    try:
        return list_departments()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/departments")
def add_department(data: DepartmentCreate):
    try:
        return create_department(data.model_dump(exclude_none=True))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/departments/{dept_id}")
def edit_department(dept_id: str, data: DepartmentCreate):
    try:
        return update_department(dept_id, data.model_dump(exclude_none=True))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/departments/{dept_id}")
def remove_department(dept_id: str):
    try:
        delete_department(dept_id)
        return {"message": "Department deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Faculty CRUD ────────────────────────────────────────────

@router.get("", response_model=None)
@router.get("/", response_model=None)
def get_all_faculty(
    department_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    try:
        return list_faculty(department_id=department_id, status=status, search=search)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{faculty_id}")
def get_faculty_detail(faculty_id: str):
    try:
        f = get_faculty(faculty_id)
        if not f:
            raise HTTPException(status_code=404, detail="Faculty not found")

        # Enrich with leave balances and attendance summary
        f["leave_balances"] = get_leave_balances(faculty_id)
        today = date.today()
        f["attendance_summary"] = get_attendance_summary(faculty_id, today.month, today.year)
        return f
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=None)
@router.post("/", response_model=None)
def add_faculty(data: FacultyCreate):
    try:
        payload = data.model_dump(exclude_none=True)
        result = create_faculty(payload)
        if result and result.get("id"):
            # Initialize leave balances
            initialize_leave_balances(result["id"])
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{faculty_id}")
def edit_faculty(faculty_id: str, data: FacultyUpdate):
    try:
        payload = data.model_dump(exclude_none=True)
        if not payload:
            raise HTTPException(status_code=400, detail="No fields to update")
        return update_faculty(faculty_id, payload)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{faculty_id}")
def remove_faculty(faculty_id: str, hard_delete: bool = True):
    try:
        if hard_delete:
            result = delete_faculty(faculty_id)
            return {"message": "Faculty deleted successfully", "data": result}
        else:
            result = deactivate_faculty(faculty_id)
            return {"message": "Faculty deactivated", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/clear-all")
@router.delete("/clear-all")
def purge_all_faculty():
    """Purges all faculty profiles and associated records to allow clean real data onboarding."""
    try:
        return clear_all_faculty()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync-account")
def sync_faculty_account(data: dict):
    """Seamlessly creates or updates a faculty profile when a user account is created or authenticated."""
    try:
        return sync_account_profile(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


