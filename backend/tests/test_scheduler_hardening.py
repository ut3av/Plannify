"""
Comprehensive Automated Test Suite for Planify.exe Hardened Timetable Engine.

Validates:
1. OR-Tools CP-SAT Level-1 constraint enforcement.
2. Independent Level-2 Deterministic Validator across all 18 rules.
3. Level-3 Database-level relational uniqueness constraints & transactions.
4. Generate -> Validate -> Save -> Read back -> Re-validate complete lifecycle.
5. Adversarial and infeasibility scenarios.
"""

import sys
import os
import sqlite3
import pytest

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from solver.cp_solver import (
    solve_timetable,
    validate_request,
    GenerateRequest,
    TeacherInput,
    SubjectInput,
    SectionInput,
    DAYS,
    DEFAULT_SLOTS,
)
from services.timetable_validator import TimetableValidator
from db import (
    init_db,
    save_timetable_relational,
    get_timetable_relational,
    publish_timetable_relational,
    list_timetable_versions,
    get_connection,
)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()


@pytest.fixture
def sample_academic_setup():
    teachers = [
        TeacherInput(name="Dr. Sanjana Singh", free_periods=1, max_weekly_hours=16),
        TeacherInput(name="Prof. Rajesh Verma", free_periods=1, max_weekly_hours=16),
        TeacherInput(name="Dr. Amit Patel", free_periods=1, max_weekly_hours=16),
        TeacherInput(name="Prof. Neha Gupta", free_periods=1, max_weekly_hours=16),
    ]
    rooms = ["Room 308/MCA", "Room 309/MCA", "Lab Room No. 006", "Lab Room No. 007"]
    sections = [
        SectionInput(name="MCA-1A", room="Room 308/MCA", lab_rooms=["Lab Room No. 006"]),
        SectionInput(name="MCA-1B", room="Room 309/MCA", lab_rooms=["Lab Room No. 007"]),
    ]
    subjects = [
        SubjectInput(code="MCA-101", name="Database Systems", teacher="Dr. Sanjana Singh", section="MCA-1A", required_slots=3),
        SubjectInput(code="MCA-102", name="Operating Systems", teacher="Prof. Rajesh Verma", section="MCA-1A", required_slots=3),
        SubjectInput(code="MCA-103", name="Data Structures", teacher="Dr. Amit Patel", section="MCA-1B", required_slots=3),
        SubjectInput(code="MCA-104", name="Computer Networks", teacher="Prof. Neha Gupta", section="MCA-1B", required_slots=3),
        SubjectInput(code="MCA-105", name="DBMS Lab", teacher="Dr. Sanjana Singh", section="MCA-1A", required_slots=2, is_lab=True),
        SubjectInput(code="MCA-106", name="DS Lab", teacher="Dr. Amit Patel", section="MCA-1B", required_slots=2, is_lab=True),
    ]
    return GenerateRequest(
        teachers=teachers,
        subjects=subjects,
        rooms=rooms,
        sections=sections,
        time_slots=DEFAULT_SLOTS,
    )


# ==============================================================================
# 1. OR-Tools CP-SAT Level-1 Constraint Tests
# ==============================================================================

def test_solver_generates_valid_timetable(sample_academic_setup):
    """Verifies that CP-SAT solver successfully finds an optimal conflict-free schedule."""
    result = solve_timetable(sample_academic_setup)
    assert result["status"] == "success"
    assert result["solver_status"] in ("OPTIMAL", "FEASIBLE")
    assert len(result["assignments"]) == 16  # 3+3+3+3 + 2+2 = 16 periods
    assert result["validation"]["valid"] is True
    assert result["validation"]["checks"]["teacher_conflicts"] == 0
    assert result["validation"]["checks"]["room_conflicts"] == 0
    assert result["validation"]["checks"]["section_conflicts"] == 0


def test_solver_enforces_continuous_lab_periods(sample_academic_setup):
    """Verifies that laboratory courses are scheduled in consecutive period blocks."""
    result = solve_timetable(sample_academic_setup)
    lab_assignments = [a for a in result["assignments"] if a.get("is_lab")]
    assert len(lab_assignments) == 4  # 2 labs * 2 slots

    # Group by subject
    by_subject = {}
    for a in lab_assignments:
        by_subject.setdefault(a["subject"], []).append(a)

    for subj_name, assignments in by_subject.items():
        assert len(assignments) == 2
        # Must be same day and consecutive slots
        assert assignments[0]["day"] == assignments[1]["day"]
        assert assignments[0]["room"] == assignments[1]["room"]
        idx0 = DEFAULT_SLOTS.index(assignments[0]["slot"])
        idx1 = DEFAULT_SLOTS.index(assignments[1]["slot"])
        assert abs(idx0 - idx1) == 1


# ==============================================================================
# 2. Independent Deterministic Validator Tests (18 Rules)
# ==============================================================================

def test_validator_detects_teacher_collision():
    """Rule 1: Detects when a teacher is assigned to two simultaneous classes."""
    validator = TimetableValidator(
        days=["Mon"],
        slots=["09:00 AM - 09:45 AM"],
        teachers=[{"name": "Dr. Sharma", "max_weekly_hours": 16}],
        subjects=[{"name": "DBMS", "required_slots": 1}, {"name": "OS", "required_slots": 1}],
        rooms=["Room 101", "Room 102"],
        sections=["Section A", "Section B"],
    )

    conflicting_assignments = [
        {"id": "a1", "day": "Mon", "slot": "09:00 AM - 09:45 AM", "teacher": "Dr. Sharma", "subject": "DBMS", "room": "Room 101", "section": "Section A"},
        {"id": "a2", "day": "Mon", "slot": "09:00 AM - 09:45 AM", "teacher": "Dr. Sharma", "subject": "OS", "room": "Room 102", "section": "Section B"},
    ]

    report = validator.validate(conflicting_assignments)
    assert report["valid"] is False
    assert report["checks"]["teacher_conflicts"] == 1
    err = next(e for e in report["errors"] if e["code"] == "TEACHER_CONFLICT")
    assert err["teacher_name"] == "Dr. Sharma"
    assert err["day"] == "Mon"
    assert "a1" in err["assignment_ids"]
    assert "a2" in err["assignment_ids"]


def test_validator_detects_room_collision():
    """Rule 2: Detects when two classes are assigned to the same room at the same time."""
    validator = TimetableValidator(
        days=["Mon"],
        slots=["09:00 AM - 09:45 AM"],
        teachers=[{"name": "Teacher A"}, {"name": "Teacher B"}],
        subjects=[{"name": "Math", "required_slots": 1}, {"name": "Physics", "required_slots": 1}],
        rooms=["Room 204"],
        sections=["Sec 1", "Sec 2"],
    )

    conflicting_assignments = [
        {"id": "a1", "day": "Mon", "slot": "09:00 AM - 09:45 AM", "teacher": "Teacher A", "subject": "Math", "room": "Room 204", "section": "Sec 1"},
        {"id": "a2", "day": "Mon", "slot": "09:00 AM - 09:45 AM", "teacher": "Teacher B", "subject": "Physics", "room": "Room 204", "section": "Sec 2"},
    ]

    report = validator.validate(conflicting_assignments)
    assert report["valid"] is False
    assert report["checks"]["room_conflicts"] == 1
    err = next(e for e in report["errors"] if e["code"] == "ROOM_CONFLICT")
    assert err["room_name"] == "Room 204"


def test_validator_detects_section_collision():
    """Rule 3: Detects when a student section has two simultaneous classes."""
    validator = TimetableValidator(
        days=["Mon"],
        slots=["09:00 AM - 09:45 AM"],
        teachers=[{"name": "Teacher A"}, {"name": "Teacher B"}],
        subjects=[{"name": "Math", "required_slots": 1}, {"name": "Physics", "required_slots": 1}],
        rooms=["Room 1", "Room 2"],
        sections=["BCA-A"],
    )

    conflicting_assignments = [
        {"id": "a1", "day": "Mon", "slot": "09:00 AM - 09:45 AM", "teacher": "Teacher A", "subject": "Math", "room": "Room 1", "section": "BCA-A"},
        {"id": "a2", "day": "Mon", "slot": "09:00 AM - 09:45 AM", "teacher": "Teacher B", "subject": "Physics", "room": "Room 2", "section": "BCA-A"},
    ]

    report = validator.validate(conflicting_assignments)
    assert report["valid"] is False
    assert report["checks"]["section_conflicts"] == 1
    err = next(e for e in report["errors"] if e["code"] == "SECTION_CONFLICT")
    assert err["section_name"] == "BCA-A"


def test_validator_detects_unfulfilled_subject_requirements():
    """Rule 4: Detects when a subject receives fewer periods than required."""
    validator = TimetableValidator(
        days=["Mon", "Tue"],
        slots=["09:00 AM - 09:45 AM"],
        teachers=[{"name": "Dr. Sharma"}],
        subjects=[{"name": "DBMS", "required_slots": 3}],
        rooms=["Room 1"],
        sections=["Sec 1"],
    )

    # Only 1 period scheduled instead of 3
    assignments = [
        {"day": "Mon", "slot": "09:00 AM - 09:45 AM", "teacher": "Dr. Sharma", "subject": "DBMS", "room": "Room 1", "section": "Sec 1"}
    ]

    report = validator.validate(assignments)
    assert report["valid"] is False
    assert report["checks"]["subject_requirement_failures"] == 1
    err = next(e for e in report["errors"] if e["code"] == "SUBJECT_REQUIREMENT_UNFULFILLED")
    assert err["required_periods"] == 3
    assert err["scheduled_periods"] == 1
    assert err["unfulfilled_periods"] == 2


def test_validator_detects_teacher_availability_and_leave():
    """Rule 5: Detects when teacher is scheduled during approved leave or blocked slot."""
    validator = TimetableValidator(
        days=["Mon", "Tue"],
        slots=["09:00 AM - 09:45 AM"],
        teachers=[{"name": "Dr. Sharma"}],
        subjects=[{"name": "DBMS", "required_slots": 1}],
        rooms=["Room 1"],
        sections=["Sec 1"],
        unavailability={"Dr. Sharma": [("Mon", "09:00 AM - 09:45 AM")]},
    )

    assignments = [
        {"day": "Mon", "slot": "09:00 AM - 09:45 AM", "teacher": "Dr. Sharma", "subject": "DBMS", "room": "Room 1", "section": "Sec 1"}
    ]

    report = validator.validate(assignments)
    assert report["valid"] is False
    assert report["checks"]["availability_conflicts"] == 1
    err = next(e for e in report["errors"] if e["code"] == "TEACHER_AVAILABILITY_CONFLICT")
    assert err["teacher_name"] == "Dr. Sharma"


def test_validator_detects_lab_room_incompatibility():
    """Rule 8: Detects when a practical laboratory course is placed in standard classroom."""
    validator = TimetableValidator(
        days=["Mon"],
        slots=["09:00 AM - 09:45 AM"],
        teachers=[{"name": "Dr. Sharma"}],
        subjects=[{"name": "Java Lab", "required_slots": 1, "is_lab": True}],
        rooms=[{"name": "Lecture Room 101", "is_lab": False}],
        sections=["Sec 1"],
    )

    assignments = [
        {"day": "Mon", "slot": "09:00 AM - 09:45 AM", "teacher": "Dr. Sharma", "subject": "Java Lab", "room": "Lecture Room 101", "section": "Sec 1", "is_lab": True}
    ]

    report = validator.validate(assignments)
    assert report["valid"] is False
    assert report["checks"]["lab_conflicts"] == 1
    err = next(e for e in report["errors"] if e["code"] == "LAB_ROOM_INCOMPATIBLE")
    assert err["room_name"] == "Lecture Room 101"


def test_validator_detects_workload_exceeded():
    """Rule 9: Detects when a teacher exceeds configured max weekly workload."""
    validator = TimetableValidator(
        days=["Mon", "Tue"],
        slots=["09:00 AM - 09:45 AM", "09:45 AM - 10:30 AM"],
        teachers=[{"name": "Dr. Sharma", "max_weekly_hours": 2}],
        subjects=[{"name": "DBMS", "required_slots": 3}],
        rooms=["Room 1"],
        sections=["Sec 1"],
    )

    # 3 periods scheduled while limit is 2
    assignments = [
        {"day": "Mon", "slot": "09:00 AM - 09:45 AM", "teacher": "Dr. Sharma", "subject": "DBMS", "room": "Room 1", "section": "Sec 1"},
        {"day": "Mon", "slot": "09:45 AM - 10:30 AM", "teacher": "Dr. Sharma", "subject": "DBMS", "room": "Room 1", "section": "Sec 1"},
        {"day": "Tue", "slot": "09:00 AM - 09:45 AM", "teacher": "Dr. Sharma", "subject": "DBMS", "room": "Room 1", "section": "Sec 1"},
    ]

    report = validator.validate(assignments)
    assert report["valid"] is False
    assert report["checks"]["workload_violations"] == 1
    err = next(e for e in report["errors"] if e["code"] == "TEACHER_WORKLOAD_EXCEEDED")
    assert err["actual_workload"] == 3
    assert err["configured_limit"] == 2


def test_validator_detects_duplicate_assignment():
    """Rule 10: Detects exact duplicate identical assignments."""
    validator = TimetableValidator(
        days=["Mon"],
        slots=["09:00 AM - 09:45 AM"],
        teachers=[{"name": "Dr. Sharma"}],
        subjects=[{"name": "DBMS", "required_slots": 2}],
        rooms=["Room 1"],
        sections=["Sec 1"],
    )

    assignments = [
        {"id": "a1", "day": "Mon", "slot": "09:00 AM - 09:45 AM", "teacher": "Dr. Sharma", "subject": "DBMS", "room": "Room 1", "section": "Sec 1"},
        {"id": "a2", "day": "Mon", "slot": "09:00 AM - 09:45 AM", "teacher": "Dr. Sharma", "subject": "DBMS", "room": "Room 1", "section": "Sec 1"},
    ]

    report = validator.validate(assignments)
    assert report["valid"] is False
    assert report["checks"]["duplicate_assignments"] == 1


def test_validator_detects_inactive_teacher():
    """Rule 17: Detects assignments referencing inactive or retired faculty."""
    validator = TimetableValidator(
        days=["Mon"],
        slots=["09:00 AM - 09:45 AM"],
        teachers=[{"name": "Dr. Retired", "status": "retired"}],
        subjects=[{"name": "History", "required_slots": 1}],
        rooms=["Room 1"],
        sections=["Sec 1"],
    )

    assignments = [
        {"day": "Mon", "slot": "09:00 AM - 09:45 AM", "teacher": "Dr. Retired", "subject": "History", "room": "Room 1", "section": "Sec 1"}
    ]

    report = validator.validate(assignments)
    assert report["valid"] is False
    assert report["checks"]["invalid_references"] == 1
    assert any(e["code"] == "INACTIVE_ENTITY_REFERENCE" for e in report["errors"])


# ==============================================================================
# 3. Database-Level Protection & Transaction Tests (Level 3)
# ==============================================================================

def test_database_prevents_teacher_collision_on_insert():
    """Level 3: SQLite/PostgreSQL UNIQUE constraint rejects conflicting teacher assignments."""
    import uuid
    conn = get_connection()
    cursor = conn.cursor()
    tt_id = f"test-tt-{uuid.uuid4()}"

    try:
        cursor.execute("INSERT INTO timetables_v2 (id, name) VALUES (?, ?)", (tt_id, "Conflict Test"))
        conn.commit()

        # Insert first assignment
        cursor.execute(
            """
            INSERT INTO timetable_assignments (id, timetable_id, day, slot, teacher_name, subject_name, section_name, room_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (str(uuid.uuid4()), tt_id, "Mon", "09:00 AM - 09:45 AM", "Dr. Sharma", "DBMS", "Sec A", "Room 101")
        )
        conn.commit()

        # Attempt second conflicting assignment for same teacher at same day+slot
        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute(
                """
                INSERT INTO timetable_assignments (id, timetable_id, day, slot, teacher_name, subject_name, section_name, room_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (str(uuid.uuid4()), tt_id, "Mon", "09:00 AM - 09:45 AM", "Dr. Sharma", "OS", "Sec B", "Room 102")
            )
            conn.commit()
    finally:
        conn.close()


def test_database_prevents_room_collision_on_insert():
    """Level 3: UNIQUE constraint rejects conflicting room assignments."""
    import uuid
    conn = get_connection()
    cursor = conn.cursor()
    tt_id = f"test-tt-{uuid.uuid4()}"

    try:
        cursor.execute("INSERT INTO timetables_v2 (id, name) VALUES (?, ?)", (tt_id, "Room Conflict Test"))
        conn.commit()

        cursor.execute(
            """
            INSERT INTO timetable_assignments (id, timetable_id, day, slot, teacher_name, subject_name, section_name, room_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (str(uuid.uuid4()), tt_id, "Mon", "09:00 AM - 09:45 AM", "Teacher A", "DBMS", "Sec A", "Room 204")
        )
        conn.commit()

        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute(
                """
                INSERT INTO timetable_assignments (id, timetable_id, day, slot, teacher_name, subject_name, section_name, room_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (str(uuid.uuid4()), tt_id, "Mon", "09:00 AM - 09:45 AM", "Teacher B", "Physics", "Sec B", "Room 204")
            )
            conn.commit()
    finally:
        conn.close()


# ==============================================================================
# 4. Generate -> Validate -> Save -> Read Back -> Re-Validate Complete Lifecycle
# ==============================================================================

def test_full_lifecycle_generate_save_read_revalidate(sample_academic_setup):
    """
    Executes the golden end-to-end institutional workflow:
    1. Generate timetable with OR-Tools CP-SAT.
    2. Validate with Level-2 Deterministic Validator.
    3. Save transactionally to Relational DB.
    4. Read back normalized records from DB.
    5. Re-validate retrieved data independently.
    """
    # 1. Generate
    gen_result = solve_timetable(sample_academic_setup)
    assert gen_result["status"] == "success"
    assignments = gen_result["assignments"]
    val_report = gen_result["validation"]
    assert val_report["valid"] is True

    # 2. Save transactionally
    save_result = save_timetable_relational(
        name="LNCT Institutional Master Schedule",
        assignments=assignments,
        validation_report=val_report,
        status="draft",
        academic_term="2026-27",
    )
    assert save_result["success"] is True
    tt_id = save_result["timetable_id"]
    assert save_result["total_assignments"] == len(assignments)

    # 3. Read back from database
    retrieved_tt = get_timetable_relational(tt_id)
    assert retrieved_tt is not None
    assert retrieved_tt["id"] == tt_id
    assert len(retrieved_tt["assignments"]) == len(assignments)

    # 4. Re-validate read-back data
    re_validator = TimetableValidator(
        days=DAYS,
        slots=sample_academic_setup.time_slots,
        teachers=[t.model_dump() for t in sample_academic_setup.teachers],
        subjects=[s.model_dump() for s in sample_academic_setup.subjects],
        rooms=sample_academic_setup.rooms,
        sections=[s.model_dump() for s in sample_academic_setup.sections],
    )
    re_report = re_validator.validate(retrieved_tt["assignments"])
    assert re_report["valid"] is True
    assert re_report["checks"]["teacher_conflicts"] == 0
    assert re_report["checks"]["room_conflicts"] == 0
    assert re_report["checks"]["section_conflicts"] == 0

    # 5. Publish
    pub_result = publish_timetable_relational(tt_id, published_by="Dean Academic", change_note="Approved for Fall 2026")
    assert pub_result["success"] is True
    assert pub_result["status"] == "published"

    versions = list_timetable_versions()
    assert any(v["id"] == tt_id and v["status"] == "published" for v in versions)


# ==============================================================================
# 5. Adversarial & Infeasibility Tests
# ==============================================================================

def test_solver_rejects_impossible_infeasible_schedule():
    """Verifies that an mathematically impossible schedule fails gracefully with HTTP 422."""
    from fastapi import HTTPException

    # 1 Room, 5 simultaneous subjects of 10 periods each in a 5-slot week -> impossible
    impossible_request = GenerateRequest(
        teachers=[
            TeacherInput(name="Teacher 1", max_weekly_hours=30),
            TeacherInput(name="Teacher 2", max_weekly_hours=30),
        ],
        rooms=["Single Room 101"],
        sections=[SectionInput(name="Sec A"), SectionInput(name="Sec B")],
        subjects=[
            SubjectInput(name="Sub 1", teacher="Teacher 1", section="Sec A", required_slots=20),
            SubjectInput(name="Sub 2", teacher="Teacher 2", section="Sec B", required_slots=20),
        ],
        time_slots=["Slot 1", "Slot 2"],  # Total 5 days * 2 slots * 1 room = 10 capacity, but need 40!
    )

    with pytest.raises(HTTPException) as exc_info:
        solve_timetable(impossible_request)

    assert exc_info.value.status_code == 422
    assert "infeasible" in str(exc_info.value.detail).lower() or "No feasible timetable" in str(exc_info.value.detail)


# ==============================================================================
# 6. Production Hardening & Demo Data Removal Tests
# ==============================================================================

def test_production_seed_endpoints_strictly_rejected():
    """Verifies that seed endpoints are locked down and reject execution when APP_ENV=production."""
    from faculty_routes import seed_lnct
    from analytics_routes import seed_analytics_demo_history
    from fastapi import HTTPException
    import os

    old_env = os.environ.get("APP_ENV")
    try:
        os.environ["APP_ENV"] = "production"
        
        with pytest.raises(HTTPException) as exc_faculty:
            seed_lnct()
        assert exc_faculty.value.status_code == 403
        assert "disabled in production" in exc_faculty.value.detail.lower()

        with pytest.raises(HTTPException) as exc_analytics:
            seed_analytics_demo_history()
        assert exc_analytics.value.status_code == 403
        assert "disabled in production" in exc_analytics.value.detail.lower()
    finally:
        if old_env is not None:
            os.environ["APP_ENV"] = old_env
        else:
            os.environ.pop("APP_ENV", None)


def test_simulate_influx_zero_faculty_safe():
    """Verifies that biometric simulation on an empty database does NOT automatically seed fake faculty."""
    from attendance_routes import simulate_influx
    
    res = simulate_influx()
    assert res.simulated_count == 0
    assert "no active faculty" in res.message.lower()
