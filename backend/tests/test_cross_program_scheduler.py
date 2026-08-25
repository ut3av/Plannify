"""
Cross-Program Timetable Conflict & Solver Verification Test.
Verifies that BCA and MCA running concurrently in the same institution/building:
1. Prevent cross-program teacher collisions (same teacher at same slot in BCA and MCA).
2. Prevent cross-program classroom & laboratory collisions (same room at same slot in BCA and MCA).
3. Successfully solve a collision-free joint multi-program schedule with Level-2 verification.
"""
import os
import sys
import pytest

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.timetable_validator import TimetableValidator
from solver.cp_solver import solve_timetable, GenerateRequest, TeacherInput, SubjectInput, SectionInput


def test_cross_program_teacher_collision_fails():
    """
    Simulates Dr. Kavita Kanathey being scheduled in BCA Section A and MCA Section D at the same time.
    Must be caught by Level-2 Deterministic Validator as TEACHER_CONFLICT.
    """
    validator = TimetableValidator(
        days=["Mon", "Tue", "Wed", "Thu", "Fri"],
        slots=["09:00 AM - 09:45 AM", "09:45 AM - 10:30 AM", "10:30 AM - 11:20 AM"],
        teachers=[
            {"name": "Dr. Kavita Kanathey", "max_weekly_hours": 18, "status": "active"},
            {"name": "Prof. Mayank Patel", "max_weekly_hours": 18, "status": "active"}
        ],
        subjects=[
            {"code": "MCA-101", "name": "Programming in C and Data Structure", "required_slots": 2},
            {"code": "BAI-101", "name": "Problem Solving in C", "required_slots": 2}
        ],
        rooms=[{"name": "Room-204"}, {"name": "Room-302"}],
        sections=[{"name": "BCA-I A"}, {"name": "MCA-I D"}]
    )

    # Collision assignments: Dr. Kavita Kanathey in 2 different programs at Mon 09:00 AM
    conflicting_assignments = [
        {
            "id": "assign_1",
            "day": "Mon",
            "slot": "09:00 AM - 09:45 AM",
            "teacher": "Dr. Kavita Kanathey",
            "subject": "Programming in C and Data Structure",
            "code": "MCA-101",
            "section": "MCA-I D",
            "room": "Room-302"
        },
        {
            "id": "assign_2",
            "day": "Mon",
            "slot": "09:00 AM - 09:45 AM",
            "teacher": "Dr. Kavita Kanathey",
            "subject": "Problem Solving in C",
            "code": "BAI-101",
            "section": "BCA-I A",
            "room": "Room-204"
        }
    ]

    report = validator.validate(conflicting_assignments)
    assert not report["valid"], "Expected validation to FAIL due to cross-program teacher collision"
    assert report["checks"]["teacher_conflicts"] == 1
    assert any("TEACHER_CONFLICT" in err["code"] for err in report["errors"])
    print("✓ test_cross_program_teacher_collision_fails PASSED (Collision successfully caught).")


def test_cross_program_room_collision_fails():
    """
    Simulates Room-204 being double-booked by BCA Section A and MCA Section B at Mon 10:30 AM.
    Must be caught by Level-2 Deterministic Validator as ROOM_CONFLICT.
    """
    validator = TimetableValidator(
        days=["Mon", "Tue"],
        slots=["10:30 AM - 11:20 AM"],
        teachers=[
            {"name": "Dr. Alka Gulati", "max_weekly_hours": 18, "status": "active"},
            {"name": "Prof. Kanal Soni", "max_weekly_hours": 18, "status": "active"}
        ],
        subjects=[
            {"code": "BAI-301", "name": "Operating Systems", "required_slots": 1},
            {"code": "MCA-103", "name": "Operating System and Architecture", "required_slots": 1}
        ],
        rooms=[{"name": "Room-204"}],
        sections=[{"name": "BCA-III A"}, {"name": "MCA-I B"}]
    )

    conflicting_room_assignments = [
        {
            "id": "assign_r1",
            "day": "Mon",
            "slot": "10:30 AM - 11:20 AM",
            "teacher": "Dr. Alka Gulati",
            "subject": "Operating Systems",
            "code": "BAI-301",
            "section": "BCA-III A",
            "room": "Room-204"
        },
        {
            "id": "assign_r2",
            "day": "Mon",
            "slot": "10:30 AM - 11:20 AM",
            "teacher": "Prof. Kanal Soni",
            "subject": "Operating System and Architecture",
            "code": "MCA-103",
            "section": "MCA-I B",
            "room": "Room-204"
        }
    ]

    report = validator.validate(conflicting_room_assignments)
    assert not report["valid"], "Expected validation to FAIL due to cross-program room collision"
    assert report["checks"]["room_conflicts"] == 1
    assert any("ROOM_CONFLICT" in err["code"] for err in report["errors"])
    print("✓ test_cross_program_room_collision_fails PASSED (Room collision successfully caught).")


def test_cross_program_cp_sat_generation_zero_conflicts():
    """
    Solves a joint multi-program timetable (BCA-I + MCA-I) sharing faculty and rooms.
    Verifies that Google OR-Tools produces a 100% collision-free schedule verified by Level-2 Validator.
    """
    req = GenerateRequest(
        teachers=[
            TeacherInput(name="Dr. Kavita Kanathey", max_weekly_hours=18),
            TeacherInput(name="Dr. Alka Gulati", max_weekly_hours=18),
            TeacherInput(name="Prof. Mayank Patel", max_weekly_hours=18),
            TeacherInput(name="Prof. Kanal Soni", max_weekly_hours=18),
            TeacherInput(name="Dr. Neelu Singh", max_weekly_hours=18)
        ],
        subjects=[
            # BCA Courses
            SubjectInput(code="BAI-101", name="Problem Solving in C", teacher="Prof. Mayank Patel", section="BCA-I A", required_slots=3, is_lab=False),
            SubjectInput(code="BAI-106", name="Programming Lab in C", teacher="Prof. Mayank Patel", section="BCA-I A", required_slots=2, is_lab=True),
            SubjectInput(code="BAI-102", name="Computer Fundamentals", teacher="Prof. Kanal Soni", section="BCA-I A", required_slots=3, is_lab=False),

            # MCA Courses (Shared Faculty: Dr. Kavita Kanathey & Prof. Kanal Soni)
            SubjectInput(code="MCA-101", name="Programming in C & DS", teacher="Dr. Kavita Kanathey", section="MCA-I D", required_slots=3, is_lab=False),
            SubjectInput(code="MCA-106", name="C and DS Lab", teacher="Dr. Kavita Kanathey", section="MCA-I D", required_slots=2, is_lab=True),
            SubjectInput(code="MCA-103", name="Operating Systems", teacher="Prof. Kanal Soni", section="MCA-I D", required_slots=3, is_lab=False),
            SubjectInput(code="MCA-104", name="Information Technology", teacher="Dr. Neelu Singh", section="MCA-I D", required_slots=2, is_lab=False),
        ],
        rooms=["Room-103", "Room-204", "Room-302", "LAB-002", "LAB-003"],
        sections=[
            SectionInput(name="BCA-I A", room="Room-103", lab_rooms=["LAB-002"]),
            SectionInput(name="MCA-I D", room="Room-204", lab_rooms=["LAB-003"])
        ],
        time_slots=[
            "09:00 AM - 09:45 AM",
            "09:45 AM - 10:30 AM",
            "10:30 AM - 11:20 AM",
            "11:20 AM - 12:10 PM",
            "01:00 PM - 01:50 PM"
        ]
    )

    result = solve_timetable(req)
    assert result is not None
    assert "assignments" in result
    assert len(result["assignments"]) == 18, f"Expected 18 total scheduled sessions, got {len(result['assignments'])}"

    # Check Level-2 validation report
    validation = result.get("validation", {})
    assert validation.get("valid") is True, f"Validation failed: {validation.get('errors')}"
    assert validation["checks"]["teacher_conflicts"] == 0
    assert validation["checks"]["room_conflicts"] == 0
    assert validation["checks"]["section_conflicts"] == 0
    assert validation["checks"]["lab_conflicts"] == 0
    assert validation["quality_score"] == 100

    print("✓ test_cross_program_cp_sat_generation_zero_conflicts PASSED with ZERO collisions and Quality Score 100!")


if __name__ == "__main__":
    test_cross_program_teacher_collision_fails()
    test_cross_program_room_collision_fails()
    test_cross_program_cp_sat_generation_zero_conflicts()
