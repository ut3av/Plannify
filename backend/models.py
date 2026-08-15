"""
Pydantic models for the Faculty Management System.
"""
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field


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


# ── Faculty Profile ─────────────────────────────────────────
class FacultyCreate(BaseModel):
    teacher_name: str
    employee_id: str
    department_id: Optional[str] = None
    designation: str = "Lecturer"
    qualification: Optional[str] = None
    employment_type: str = "full-time"
    joining_date: date = Field(default_factory=date.today)
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    email: Optional[str] = None


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
    days_count: int = 0


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
    late_minutes: int
    remarks: Optional[str] = None


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


class SubstituteSuggestion(BaseModel):
    faculty_id: str
    faculty_name: str
    employee_id: str
    department: Optional[str] = None
    reason: str  # e.g. "Free during this slot", "Least substitutions this month"
    workload_score: int = 0  # lower = less loaded = better candidate
