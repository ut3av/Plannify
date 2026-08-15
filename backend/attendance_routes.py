"""
Attendance API routes — CSV import, daily/monthly view, manual entry, reports.
"""
import csv
import io
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Query

try:
    from .models import AttendanceManualEntry
    from .faculty_db import (
        import_attendance_csv, get_attendance, manual_attendance,
        get_attendance_summary, list_faculty,
    )
except ImportError:
    from models import AttendanceManualEntry
    from faculty_db import (
        import_attendance_csv, get_attendance, manual_attendance,
        get_attendance_summary, list_faculty,
    )

router = APIRouter(prefix="/attendance", tags=["Attendance"])

# Configurable late threshold (minutes after this time = late)
LATE_THRESHOLD_HOUR = 9
LATE_THRESHOLD_MINUTE = 0


def _parse_time(time_str: str, rec_date: str) -> Optional[str]:
    """Convert HH:MM to full ISO datetime string."""
    if not time_str or not time_str.strip():
        return None
    try:
        t = datetime.strptime(time_str.strip(), "%H:%M")
        d = date.fromisoformat(rec_date)
        full = datetime(d.year, d.month, d.day, t.hour, t.minute)
        return full.isoformat()
    except Exception:
        return None


def _calculate_late_minutes(punch_in_str: str) -> int:
    """Calculate minutes late based on punch-in time."""
    if not punch_in_str:
        return 0
    try:
        t = datetime.strptime(punch_in_str.strip(), "%H:%M")
        threshold = LATE_THRESHOLD_HOUR * 60 + LATE_THRESHOLD_MINUTE
        actual = t.hour * 60 + t.minute
        return max(0, actual - threshold)
    except Exception:
        return 0


def _determine_status(punch_in: str, punch_out: str, late_minutes: int) -> str:
    """Determine attendance status based on punch data."""
    if not punch_in and not punch_out:
        return "absent"
    if late_minutes > 0:
        return "late"
    if punch_out:
        try:
            t_out = datetime.strptime(punch_out.strip(), "%H:%M")
            # If punch out before 1 PM, consider half-day
            if t_out.hour < 13:
                return "half-day"
        except Exception:
            pass
    return "present"


# ── CSV Import ──────────────────────────────────────────────

@router.post("/import")
async def import_csv(file: UploadFile = File(...)):
    """
    Import attendance from a CSV file.
    Expected columns: EmployeeID, Name, Date, PunchIn, PunchOut
    Date format: YYYY-MM-DD or DD/MM/YYYY
    Time format: HH:MM (24h)
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    try:
        content = await file.read()
        text = content.decode("utf-8-sig")  # handle BOM
        reader = csv.DictReader(io.StringIO(text))

        records = []
        for row in reader:
            # Normalize column names (case-insensitive, strip spaces)
            norm = {k.strip().lower().replace(" ", ""): v.strip() for k, v in row.items() if k}

            emp_id = norm.get("employeeid") or norm.get("empid") or norm.get("emp_id") or norm.get("id") or ""
            name = norm.get("name") or norm.get("employeename") or ""
            date_str = norm.get("date") or norm.get("attendancedate") or ""
            punch_in = norm.get("punchin") or norm.get("punch_in") or norm.get("checkin") or norm.get("timein") or ""
            punch_out = norm.get("punchout") or norm.get("punch_out") or norm.get("checkout") or norm.get("timeout") or ""

            # Parse date (support multiple formats)
            parsed_date = None
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
                try:
                    parsed_date = datetime.strptime(date_str, fmt).date().isoformat()
                    break
                except ValueError:
                    continue

            if not parsed_date:
                continue  # Skip rows with unparseable dates

            late_minutes = _calculate_late_minutes(punch_in)
            status = _determine_status(punch_in, punch_out, late_minutes)

            records.append({
                "employee_id": emp_id,
                "date": parsed_date,
                "punch_in": _parse_time(punch_in, parsed_date),
                "punch_out": _parse_time(punch_out, parsed_date),
                "status": status,
                "late_minutes": late_minutes,
            })

        result = import_attendance_csv(records)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


# ── Daily / Monthly View ───────────────────────────────────

@router.get("/")
def get_attendance_records(
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    faculty_id: Optional[str] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
):
    try:
        return get_attendance(
            date_str=date,
            faculty_id=faculty_id,
            month=month,
            year=year,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Individual Faculty History ──────────────────────────────

@router.get("/{faculty_id}")
def get_faculty_attendance(
    faculty_id: str,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
):
    try:
        records = get_attendance(faculty_id=faculty_id, month=month, year=year)
        today = date.today()
        m = month or today.month
        y = year or today.year
        summary = get_attendance_summary(faculty_id, m, y)
        return {"records": records, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Manual Entry / Override ─────────────────────────────────

@router.post("/manual")
def add_manual_attendance(data: AttendanceManualEntry):
    try:
        payload = {
            "faculty_id": data.faculty_id,
            "date": str(data.date),
            "status": data.status,
            "remarks": data.remarks,
            "source": "manual",
            "late_minutes": 0,
        }
        if data.punch_in:
            payload["punch_in"] = _parse_time(data.punch_in, str(data.date))
        if data.punch_out:
            payload["punch_out"] = _parse_time(data.punch_out, str(data.date))

        result = manual_attendance(payload)
        return {"message": "Attendance recorded", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Monthly Report ──────────────────────────────────────────

@router.get("/report/monthly")
def monthly_report(month: int = Query(..., ge=1, le=12), year: int = Query(...)):
    """Generate a monthly attendance summary for all active faculty."""
    try:
        faculty_list = list_faculty(status="active")
        report = []
        for f in faculty_list:
            summary = get_attendance_summary(f["id"], month, year)
            report.append({
                "faculty_id": f["id"],
                "employee_id": f.get("employee_id", ""),
                "teacher_name": f.get("teacher_name", ""),
                "department_name": f.get("department_name", ""),
                **summary,
            })
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
