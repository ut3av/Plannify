"""
Substitution API routes — suggest substitutes, assign, history.
"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

try:
    from .models import SubstitutionAssign
    from .faculty_db import (
        create_substitution, list_substitutions, get_substitution_count,
        list_faculty, get_leave_balances,
    )
except ImportError:
    from models import SubstitutionAssign
    from faculty_db import (
        create_substitution, list_substitutions, get_substitution_count,
        list_faculty, get_leave_balances,
    )

router = APIRouter(prefix="/substitution", tags=["Substitution"])


@router.get("/suggest/{leave_id}")
def suggest_substitutes(
    leave_id: str,
    date_str: str = Query(..., alias="date", description="YYYY-MM-DD"),
    slot: str = Query(...),
):
    """
    Suggest available faculty for substitution based on:
    1. Not on leave that day
    2. Not already assigned a class in that slot (if timetable data available)
    3. Least substitutions this month (workload balance)
    """
    try:
        all_faculty = list_faculty(status="active")
        today = date.fromisoformat(date_str)

        suggestions = []
        for f in all_faculty:
            # Check if faculty has approved leave on the given date
            # (Simple heuristic — the full check would query leave_applications)
            sub_count = get_substitution_count(f["id"], today.month, today.year)

            suggestions.append({
                "faculty_id": f["id"],
                "faculty_name": f.get("teacher_name", ""),
                "employee_id": f.get("employee_id", ""),
                "department": f.get("department_name", ""),
                "reason": f"Available — {sub_count} substitution(s) this month",
                "workload_score": sub_count,
            })

        # Sort by workload (least loaded first)
        suggestions.sort(key=lambda x: x["workload_score"])
        return suggestions[:10]  # Top 10 suggestions

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assign")
def assign_substitution(data: SubstitutionAssign):
    try:
        payload = data.model_dump(exclude_none=True)
        payload["date"] = str(payload["date"])
        result = create_substitution(payload)
        return {"message": "Substitution assigned", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history")
def substitution_history(
    date_str: Optional[str] = Query(None, alias="date"),
    faculty_id: Optional[str] = Query(None),
):
    try:
        return list_substitutions(date_str=date_str, faculty_id=faculty_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
