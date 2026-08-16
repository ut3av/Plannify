"""
Pydantic models for the Faculty Management System.
Includes robust date/datetime validators for SQLite and Supabase type consistency.
"""
from datetime import date, datetime
from typing import Any, List, Optional, Union
from pydantic import BaseModel, Field, field_validator


def _parse_date_value(v: Any) -> Optional[date]:
    if v is None:
        return None
    if isinstance(v, date) and not isinstance(v, datetime):
        return v
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, str):
        v = v.strip()
        if not v:
            return None
        # Handle ISO with T (e.g. 2026-08-16T00:00:00)
        date_part = v.split("T")[0]
        return date.fromisoformat(date_part)
    return v


def _parse_datetime_value(v: Any) -> Optional[datetime]:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, str):
        v = v.strip()
        if not v:
            return None
        # Replace Z with +00:00 if needed for standard fromisoformat
        clean_str = v.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(clean_str)
        except ValueError:
            # Fallback to date parsing
            try:
                d = date.fromisoformat(v.split("T")[0])
                return datetime(d.year, d.month, d.day)
            except Exception:
                return None
    return v


# ── Department ──────────────────────────────────────────────
class DepartmentCreate(BaseModel):
    name: str
    hod_faculty_id: Optional[str] = None


class DepartmentOut(BaseModel):
    id: str
    name: str
    hod_faculty_id: Optional[str] = None
    hod_name: Optional[str] = None
    faculty_count: int = 0
    created_at: Optional[datetime] = None

    @field_validator("created_at", mode="before")
    @classmethod
    def validate_created_at(cls, v):
        return _parse_datetime_value(v)


# ── Faculty Profile ─────────────────────────────────────────
class FacultyCreate(BaseModel):
    teacher_name: str
    employee_id: str
    department_id: Optional[str] = None
    designation: str = "Lecturer"
    qualification: Optional[str] = None
    employment_type: str = "full-time"
    joining_date: Optional[date] = Field(default_factory=date.today)
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    email: Optional[str] = None

    @field_validator("joining_date", mode="before")
    @classmethod
    def validate_joining_date(cls, v):
        return _parse_date_value(v)


class FacultyUpdate(BaseModel):
    teacher_name: Optional[str] = None
    department_id: Optional[str] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    employment_type: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    status: Optional[str] = None


class FacultyOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    teacher_name: str
    employee_id: str
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    designation: str
    qualification: Optional[str] = None
    employment_type: str
    joining_date: date
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator("joining_date", mode="before")
    @classmethod
    def validate_joining_date(cls, v):
        return _parse_date_value(v)

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def validate_datetimes(cls, v):
        return _parse_datetime_value(v)


class FacultyDetail(FacultyOut):
    leave_balances: List[dict] = []
    attendance_summary: dict = {}


# ── Leave Types ─────────────────────────────────────────────
class LeaveTypeCreate(BaseModel):
    code: str
    name: str
    max_per_year: int = 12
    carry_forward: bool = False
    requires_document: bool = False
    color: str = "#3b82f6"


class LeaveTypeOut(BaseModel):
    id: str
    code: str
    name: str
    max_per_year: int
    carry_forward: bool
    requires_document: bool
    color: str


# ── Leave Application ──────────────────────────────────────
class LeaveApply(BaseModel):
    faculty_id: str
    leave_type_id: str
    from_date: date
    to_date: date
    half_day: bool = False
    reason: str
    document_url: Optional[str] = None

    @field_validator("from_date", "to_date", mode="before")
    @classmethod
    def validate_dates(cls, v):
        return _parse_date_value(v)


class LeaveReview(BaseModel):
    reviewed_by: str
    review_remarks: Optional[str] = None
    substitute_id: Optional[str] = None


class LeaveApplicationOut(BaseModel):
    id: str
    faculty_id: str
    faculty_name: Optional[str] = None
    leave_type_id: str
    leave_type_code: Optional[str] = None
    leave_type_name: Optional[str] = None
    leave_type_color: Optional[str] = None
    from_date: date
    to_date: date
    half_day: bool
    reason: str
    document_url: Optional[str] = None
    status: str
    applied_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_remarks: Optional[str] = None
    substitute_id: Optional[str] = None
    substitute_name: Optional[str] = None
    days_count: float = 0.0

    @field_validator("from_date", "to_date", mode="before")
    @classmethod
    def validate_dates(cls, v):
        return _parse_date_value(v)

    @field_validator("applied_at", "reviewed_at", mode="before")
    @classmethod
    def validate_datetimes(cls, v):
        return _parse_datetime_value(v)


# ── Leave Balance ───────────────────────────────────────────
class LeaveBalanceOut(BaseModel):
    id: str
    faculty_id: str
    leave_type_id: str
    leave_type_code: Optional[str] = None
    leave_type_name: Optional[str] = None
    leave_type_color: Optional[str] = None
    academic_year: str
    total_allowed: int
    used: int
    pending: int
    remaining: int = 0


# ── Attendance ──────────────────────────────────────────────
class AttendanceManualEntry(BaseModel):
    faculty_id: str
    date: date
    punch_in: Optional[str] = None   # HH:MM format
    punch_out: Optional[str] = None  # HH:MM format
    status: str = "present"
    remarks: Optional[str] = None

    @field_validator("date", mode="before")
    @classmethod
    def validate_date(cls, v):
        return _parse_date_value(v)


class AttendanceRecordOut(BaseModel):
    id: str
    faculty_id: str
    faculty_name: Optional[str] = None
    employee_id: Optional[str] = None
    date: date
    punch_in: Optional[datetime] = None
    punch_out: Optional[datetime] = None
    source: str
    status: str
    late_minutes: int = 0
    remarks: Optional[str] = None

    @field_validator("date", mode="before")
    @classmethod
    def validate_date(cls, v):
        return _parse_date_value(v)

    @field_validator("punch_in", "punch_out", mode="before")
    @classmethod
    def validate_punch_times(cls, v):
        return _parse_datetime_value(v)


class AttendanceImportResult(BaseModel):
    total_rows: int
    matched: int
    unmatched: int
    duplicates: int
    imported: int
    errors: List[str] = []
    unmatched_ids: List[str] = []


class AttendanceSummary(BaseModel):
    total_working_days: int = 0
    present: int = 0
    absent: int = 0
    late: int = 0
    half_day: int = 0
    on_duty: int = 0
    attendance_percentage: float = 0.0


# ── Substitution ───────────────────────────────────────────
class SubstitutionAssign(BaseModel):
    leave_application_id: Optional[str] = None
    original_faculty_id: str
    substitute_faculty_id: str
    date: date
    slot: str
    subject: Optional[str] = None
    section: Optional[str] = None
    room: Optional[str] = None

    @field_validator("date", mode="before")
    @classmethod
    def validate_date(cls, v):
        return _parse_date_value(v)


class SubstitutionOut(BaseModel):
    id: str
    leave_application_id: Optional[str] = None
    original_faculty_id: str
    original_faculty_name: Optional[str] = None
    substitute_faculty_id: str
    substitute_faculty_name: Optional[str] = None
    date: date
    slot: str
    subject: Optional[str] = None
    section: Optional[str] = None
    room: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    @field_validator("date", mode="before")
    @classmethod
    def validate_date(cls, v):
        return _parse_date_value(v)

    @field_validator("created_at", mode="before")
    @classmethod
    def validate_created_at(cls, v):
        return _parse_datetime_value(v)


class SubstituteSuggestion(BaseModel):
    faculty_id: str
    faculty_name: str
    employee_id: str
    department: Optional[str] = None
    reason: str  # e.g. "Free during this slot", "Least substitutions this month"
    workload_score: int = 0  # lower = less loaded = better candidate


# ── Simulation & Impact Models ──────────────────────────────
class SimulateInfluxRequest(BaseModel):
    count: int = 30
    date: Optional[str] = None


class SimulateInfluxResponse(BaseModel):
    message: str
    simulated_count: int
    present: int
    late: int
    absent: int
    date: str


class AffectedPeriod(BaseModel):
    day: str
    slot: str
    subject: str
    section: Optional[str] = None
    room: Optional[str] = None


class LeaveImpactResponse(BaseModel):
    leave_id: str
    faculty_id: str
    faculty_name: str
    from_date: str
    to_date: str
    affected_lectures_count: int
    affected_periods: List[AffectedPeriod] = []
    available_substitutes_count: int
    recommended_substitutes: List[SubstituteSuggestion] = []
