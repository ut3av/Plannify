"""
Leave management API routes — apply, approve, reject, balance, calendar.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

try:
    from .models import LeaveApply, LeaveReview, LeaveTypeCreate
    from .faculty_db import (
        apply_leave, list_leave_applications, approve_leave, reject_leave,
        get_leave_balances, get_leave_calendar,
        list_leave_types, create_leave_type,
    )
except ImportError:
    from models import LeaveApply, LeaveReview, LeaveTypeCreate
    from faculty_db import (
        apply_leave, list_leave_applications, approve_leave, reject_leave,
        get_leave_balances, get_leave_calendar,
        list_leave_types, create_leave_type,
    )

router = APIRouter(prefix="/leaves", tags=["Leave Management"])


# ── Leave Types ─────────────────────────────────────────────

@router.get("/types")
def get_leave_types():
    try:
        return list_leave_types()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/types")
def add_leave_type(data: LeaveTypeCreate):
    try:
        return create_leave_type(data.model_dump())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Leave Applications ──────────────────────────────────────

@router.post("/apply")
def submit_leave(data: LeaveApply):
    try:
        payload = data.model_dump()
        payload["from_date"] = str(payload["from_date"])
        payload["to_date"] = str(payload["to_date"])
        result = apply_leave(payload)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to submit leave application")
        return {"message": "Leave application submitted", "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=None)
@router.get("/", response_model=None)
def get_leaves(
    faculty_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
):
    try:
        return list_leave_applications(
            faculty_id=faculty_id,
            status=status,
            department_id=department_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{leave_id}/approve")
def approve(leave_id: str, data: LeaveReview):
    try:
        result = approve_leave(
            leave_id,
            reviewed_by=data.reviewed_by,
            remarks=data.review_remarks,
            substitute_id=data.substitute_id,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Leave application not found")
        return {"message": "Leave approved", "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{leave_id}/reject")
def reject(leave_id: str, data: LeaveReview):
    try:
        result = reject_leave(
            leave_id,
            reviewed_by=data.reviewed_by,
            remarks=data.review_remarks,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Leave application not found")
        return {"message": "Leave rejected", "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Leave Balance ───────────────────────────────────────────

@router.get("/balance/{faculty_id}")
def get_balance(faculty_id: str, academic_year: str = "2026-27"):
    try:
        return get_leave_balances(faculty_id, academic_year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Calendar View ───────────────────────────────────────────

@router.get("/calendar")
def leave_calendar(month: int = Query(..., ge=1, le=12), year: int = Query(...)):
    try:
        return get_leave_calendar(month, year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
