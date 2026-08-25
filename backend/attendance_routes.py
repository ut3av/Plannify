"""
Attendance API routes — CSV import, daily/monthly view, manual entry, simulation, reports.
"""
import csv
import io
import random
from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Query

try:
    from .models import AttendanceManualEntry, SimulateInfluxRequest, SimulateInfluxResponse
    from .faculty_db import (
        import_attendance_csv, get_attendance, manual_attendance,
        get_attendance_summary, list_faculty, create_faculty,
    )
except ImportError:
    from models import AttendanceManualEntry, SimulateInfluxRequest, SimulateInfluxResponse
    from faculty_db import (
        import_attendance_csv, get_attendance, manual_attendance,
        get_attendance_summary, list_faculty, create_faculty,
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
        d = date.fromisoformat(rec_date.split("T")[0])
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


# ── Live Biometric Influx Simulator (Hackathon Demo) ────────

@router.post("/simulate-influx", response_model=SimulateInfluxResponse)
def simulate_influx(
    payload: Optional[SimulateInfluxRequest] = None,
    count: int = Query(30, description="Maximum faculty records to simulate"),
    target_date: Optional[str] = Query(None, alias="date", description="YYYY-MM-DD"),
):
    """
    Simulates realistic biometric hardware check-in logs for active faculty
    for the current date with natural variations in punch times (08:45 AM - 09:20 AM),
    automatically calculating late_minutes and status.
    """
    try:
        req_count = payload.count if (payload and payload.count) else (count if isinstance(count, int) else 30)
        sim_date = (payload.date if (payload and payload.date) else None) or (target_date if isinstance(target_date, str) else None) or date.today().isoformat()

        active_faculty = list_faculty(status="active")

        # If no active faculty exist in the database, return clean zero-count response
        if not active_faculty:
            return SimulateInfluxResponse(
                message="No active faculty members found in institutional directory to record biometric punches.",
                simulated_count=0,
                present=0,
                late=0,
                absent=0,
                date=sim_date
            )

        faculty_to_simulate = active_faculty[:req_count]

        present_count = 0
        late_count = 0
        absent_count = 0

        # Seed pseudo-random generator with date for deterministic replay if requested
        rng = random.Random()

        for fac in faculty_to_simulate:
            fid = fac["id"]
            roll = rng.random()

            if roll < 0.70:
                # On-time check in: 08:45 AM - 08:59 AM
                minute = rng.randint(45, 59)
                punch_in = f"08:{minute:02d}"
                out_hour = rng.randint(16, 17)
                out_minute = rng.randint(0, 59)
                punch_out = f"{out_hour:02d}:{out_minute:02d}"
                late_mins = 0
                status = "present"
                present_count += 1
            elif roll < 0.90:
                # Late check in: 09:01 AM - 09:25 AM
                minute = rng.randint(1, 25)
                punch_in = f"09:{minute:02d}"
                out_hour = rng.randint(16, 17)
                out_minute = rng.randint(30, 59)
                punch_out = f"{out_hour:02d}:{out_minute:02d}"
                late_mins = minute
                status = "late"
                late_count += 1
            else:
                # Absent (no punch)
                punch_in = None
                punch_out = None
                late_mins = 0
                status = "absent"
                absent_count += 1

            record_payload = {
                "faculty_id": fid,
                "date": sim_date,
                "punch_in": _parse_time(punch_in, sim_date) if punch_in else None,
                "punch_out": _parse_time(punch_out, sim_date) if punch_out else None,
                "status": status,
                "late_minutes": late_mins,
                "remarks": "Simulated Influx",
                "source": "biometric_sim"
            }
            manual_attendance(record_payload)

        return SimulateInfluxResponse(
            message=f"Simulated {len(faculty_to_simulate)} biometric punch records for {sim_date}.",
            simulated_count=len(faculty_to_simulate),
            present=present_count,
            late=late_count,
            absent=absent_count,
            date=sim_date
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


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
            norm = {k.strip().lower().replace(" ", ""): v.strip() for k, v in row.items() if k}

            emp_id = norm.get("employeeid") or norm.get("empid") or norm.get("emp_id") or norm.get("id") or ""
            date_str = norm.get("date") or norm.get("attendancedate") or ""
            punch_in = norm.get("punchin") or norm.get("punch_in") or norm.get("checkin") or norm.get("timein") or ""
            punch_out = norm.get("punchout") or norm.get("punch_out") or norm.get("checkout") or norm.get("timeout") or ""

            parsed_date = None
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
                try:
                    parsed_date = datetime.strptime(date_str, fmt).date().isoformat()
                    break
                except ValueError:
                    continue

            if not parsed_date:
                continue

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


@router.get("", response_model=None)
@router.get("/", response_model=None)
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
            payload["late_minutes"] = _calculate_late_minutes(data.punch_in)
        if data.punch_out:
            payload["punch_out"] = _parse_time(data.punch_out, str(data.date))

        result = manual_attendance(payload)
        return {"message": "Attendance recorded", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Monthly Report ──────────────────────────────────────────

@router.get("/report/monthly")
def monthly_report(month: int = Query(..., ge=1, le=12), year: int = Query(...)):
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
