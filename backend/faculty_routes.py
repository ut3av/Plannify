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
        list_faculty, get_faculty, create_faculty, update_faculty, deactivate_faculty,
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
        list_faculty, get_faculty, create_faculty, update_faculty, deactivate_faculty,
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

@router.get("/")
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


@router.post("/")
def add_faculty(data: FacultyCreate):
    try:
        payload = data.model_dump(exclude_none=True)
        # Remove email from payload (not a column in faculty_profiles)
        email = payload.pop("email", None)
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
def remove_faculty(faculty_id: str):
    try:
        result = deactivate_faculty(faculty_id)
        return {"message": "Faculty deactivated", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
