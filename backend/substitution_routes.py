"""
Substitution API routes — suggest substitutes, impact analysis, assign, history.
Implements strict leave-date filtering, timetable clash avoidance, and workload balancing.
"""
from datetime import date, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query

try:
    from .models import SubstitutionAssign, SubstituteSuggestion, LeaveImpactResponse, AffectedPeriod
    from .faculty_db import (
        create_substitution, list_substitutions, get_substitution_count,
        list_faculty, list_leave_applications, get_faculty,
    )
    from .db import get_latest_timetable_assignments
except ImportError:
    from models import SubstitutionAssign, SubstituteSuggestion, LeaveImpactResponse, AffectedPeriod
    from faculty_db import (
        create_substitution, list_substitutions, get_substitution_count,
        list_faculty, list_leave_applications, get_faculty,
    )
    from db import get_latest_timetable_assignments

router = APIRouter(prefix="/substitution", tags=["Substitution"])


def _get_active_timetable_assignments() -> List[dict]:
    """Fetch assignments from active memory solver or latest saved timetable."""
    try:
        import sys
        # Check if main module has LAST_TIMETABLE in memory
        for mod_name in ("main", "backend.main"):
            if mod_name in sys.modules:
                main_mod = sys.modules[mod_name]
                last_tt = getattr(main_mod, "LAST_TIMETABLE", None)
                if last_tt and "assignments" in last_tt and last_tt["assignments"]:
                    return last_tt["assignments"]
    except Exception:
        pass
    return get_latest_timetable_assignments()


@router.get("/suggest/{leave_id}")
def suggest_substitutes(
    leave_id: str,
    date_str: str = Query(..., alias="date", description="YYYY-MM-DD"),
    slot: str = Query(..., description="Time slot e.g. 9-10 or All Day"),
):
    """
    Suggest available faculty for substitution based on:
    1. Not on leave on that date (approved or pending leave covering date).
    2. Not already assigned a class in that slot on that day of the week.
    3. Not the faculty member whose leave is being substituted.
    4. Sorted by least substitutions taken this month (workload balance).
    """
    try:
        all_faculty = list_faculty(status="active")
        target_date = date.fromisoformat(date_str.split("T")[0])
        day_of_week = target_date.strftime("%a")  # "Mon", "Tue", "Wed", "Thu", "Fri", etc.

        # 1. Identify applicant faculty to exclude
        applicant_faculty_ids = set()
        applicant_names = set()
        leave_apps = list_leave_applications()
        for app in leave_apps:
            if str(app.get("id")) == str(leave_id):
                if app.get("faculty_id"):
                    applicant_faculty_ids.add(str(app.get("faculty_id")))
                if app.get("faculty_name"):
                    applicant_names.add(str(app.get("faculty_name")).strip().lower())
                break
        if not applicant_faculty_ids:
            fac = get_faculty(leave_id)
            if fac:
                applicant_faculty_ids.add(str(fac.get("id")))
                if fac.get("employee_id"):
                    applicant_faculty_ids.add(str(fac.get("employee_id")))
                if fac.get("teacher_name"):
                    applicant_names.add(str(fac.get("teacher_name")).strip().lower())

        # 2. Identify faculty who have an approved or pending leave on target_date
        on_leave_faculty_ids = set()
        on_leave_faculty_names = set()
        for app in leave_apps:
            if app.get("status") in ("approved", "pending"):
                f_date_str = str(app.get("from_date", "")).split("T")[0]
                t_date_str = str(app.get("to_date", "")).split("T")[0]
                if f_date_str and t_date_str:
                    try:
                        f_d = date.fromisoformat(f_date_str)
                        t_d = date.fromisoformat(t_date_str)
                        if f_d <= target_date <= t_d:
                            if app.get("faculty_id"):
                                on_leave_faculty_ids.add(str(app.get("faculty_id")))
                            if app.get("faculty_name"):
                                on_leave_faculty_names.add(str(app.get("faculty_name")).strip().lower())
                    except Exception:
                        pass

        # 3. Identify faculty who have a teaching clash in that slot on that day
        busy_faculty_names = set()
        if slot and slot != "All Day":
            assignments = _get_active_timetable_assignments()
            for a in assignments:
                if a.get("day") == day_of_week and a.get("slot") == slot:
                    busy_faculty_names.add(a.get("teacher"))

        # 4. Filter candidates
        suggestions = []
        for f in all_faculty:
            fid = str(f["id"])
            emp_id = str(f.get("employee_id", ""))
            name = str(f.get("teacher_name", "")).strip()
            name_lower = name.lower()

            # Exclude applicant
            if fid in applicant_faculty_ids or emp_id in applicant_faculty_ids or name_lower in applicant_names:
                continue

            # Exclude on leave
            if fid in on_leave_faculty_ids or name_lower in on_leave_faculty_names:
                continue

            # Exclude teaching in that slot
            if name in busy_faculty_names:
                continue

            sub_count = get_substitution_count(fid, target_date.month, target_date.year)

            suggestions.append({
                "faculty_id": fid,
                "faculty_name": name,
                "employee_id": f.get("employee_id", ""),
                "department": f.get("department_name", ""),
                "reason": f"Available — {sub_count} substitution(s) this month",
                "workload_score": sub_count,
            })

        # Sort by workload score (least loaded first)
        suggestions.sort(key=lambda x: x["workload_score"])
        return suggestions[:10]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/impact/{leave_id}", response_model=LeaveImpactResponse)
def get_leave_impact(leave_id: str):
    """
    Computes affected timetable lectures and number of available substitutes
    for an applicant's leave duration.
    """
    try:
        leave_apps = list_leave_applications()
        target_app = next((a for a in leave_apps if str(a.get("id")) == str(leave_id)), None)

        if not target_app:
            fac = get_faculty(leave_id)
            if fac:
                target_app = {
                    "id": f"draft-{leave_id}",
                    "faculty_id": leave_id,
                    "faculty_name": fac.get("teacher_name"),
                    "from_date": date.today().isoformat(),
                    "to_date": date.today().isoformat(),
                }
            else:
                raise HTTPException(status_code=404, detail="Leave application not found")

        faculty_id = target_app.get("faculty_id")
        faculty_info = get_faculty(faculty_id) or {}
        faculty_name = faculty_info.get("teacher_name") or target_app.get("faculty_name", "Faculty")

        f_date_str = str(target_app.get("from_date", "")).split("T")[0]
        t_date_str = str(target_app.get("to_date", "")).split("T")[0]
        from_d = date.fromisoformat(f_date_str)
        to_d = date.fromisoformat(t_date_str)

        # Days involved in leave
        active_days = set()
        cur_d = from_d
        while cur_d <= to_d:
            if cur_d.weekday() < 5:  # Mon - Fri
                active_days.add(cur_d.strftime("%a"))
            cur_d += timedelta(days=1)

        # Cross-reference with timetable
        assignments = _get_active_timetable_assignments()
        affected_periods = []
        for a in assignments:
            if a.get("teacher") == faculty_name and a.get("day") in active_days:
                affected_periods.append(AffectedPeriod(
                    day=a.get("day"),
                    slot=a.get("slot"),
                    subject=a.get("subject", ""),
                    section=a.get("section"),
                    room=a.get("room"),
                ))

        # First slot or representative slot for suggestion query
        rep_slot = affected_periods[0].slot if affected_periods else "9-10"
        suggestions = suggest_substitutes(leave_id, f_date_str, rep_slot)

        return LeaveImpactResponse(
            leave_id=str(leave_id),
            faculty_id=faculty_id,
            faculty_name=faculty_name,
            from_date=f_date_str,
            to_date=t_date_str,
            affected_lectures_count=len(affected_periods),
            affected_periods=affected_periods,
            available_substitutes_count=len(suggestions),
            recommended_substitutes=[SubstituteSuggestion(**s) for s in suggestions],
        )

    except HTTPException:
        raise
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
