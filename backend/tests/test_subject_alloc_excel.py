"""
Automated Verification for Subject Allocation & BCA Excel Ingestion.
Tests multi-sheet workbook parsing against real institutional source files.
"""
import os
import sys
import pytest

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.document_parser import DocumentParser


def test_bca_excel_extraction():
    sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "sample_data", "bca 1st sem.xlsx")
    assert os.path.exists(sample_path), f"Sample file not found: {sample_path}"

    with open(sample_path, "rb") as f:
        file_bytes = f.read()

    parser = DocumentParser()
    result = parser.parse_excel(file_bytes, "bca 1st sem.xlsx")

    # Assert 7 Sections
    sections = result.get("sections", [])
    assert len(sections) == 7, f"Expected 7 sections, got {len(sections)}"

    # Assert BCA Program
    for s in sections:
        assert s["program_code"] == "BCA"
        assert s["level"] == "UG"
        assert s["semester_number"] == 1

    # Assert Subjects
    subjects = result.get("subjects", [])
    sub_codes = {s["code"] for s in subjects}
    expected_codes = {"BAI-101", "BAI-102", "BAI-103", "BAI-104", "BAI-105", "BAI-106", "BAI-107", "FC-112"}
    for ec in expected_codes:
        assert ec in sub_codes, f"Expected subject code {ec} in extracted subjects"

    # Assert Faculty
    faculty = result.get("faculty", [])
    fac_names = {f["canonical_name"].lower() for f in faculty}
    expected_faculty = [
        "mayank patel",
        "muskan mirza",
        "ravi bhushan roy",
        "karuna vishwakarma",
        "rashmi shaikh",
        "seema joshi",
        "atul verma",
        "rohit singh",
        "sanjana igral",
        "deepshikha arya",
        "kanal soni"
    ]
    for ef in expected_faculty:
        assert any(ef in fn for fn in fac_names), f"Expected faculty '{ef}' in extracted roster"

    print("✓ test_bca_excel_extraction PASSED successfully!")


def test_subject_allocation_workbook_extraction():
    sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "sample_data", "Subject Allocation Jul-Dec 2026.xlsx")
    assert os.path.exists(sample_path), f"Sample file not found: {sample_path}"

    with open(sample_path, "rb") as f:
        file_bytes = f.read()

    parser = DocumentParser()
    result = parser.parse_excel(file_bytes, "Subject Allocation Jul-Dec 2026.xlsx")

    # 1. Assert Sheets Detected
    sheets = result.get("sheets_detected", [])
    assert "Sub-AllOC" in sheets
    assert "Teaching Load" in sheets
    assert "Projector Room" in sheets
    assert "Room Shifting" in sheets
    assert "Lab Time Table" in sheets

    # 2. Assert Multiple Programs Detected in Sub-AllOC (BCA, MCA)
    sections = result.get("sections", [])
    programs = {s["program_code"] for s in sections}
    assert "BCA" in programs, "Expected BCA program in sections"
    assert "MCA" in programs, "Expected MCA program in sections"

    # Assert Semesters
    semesters = {s["semester_number"] for s in sections}
    assert 1 in semesters
    assert 3 in semesters

    # 3. Assert Subjects (MCA and BCA codes)
    subjects = result.get("subjects", [])
    sub_codes = {s["code"] for s in subjects}
    assert "MCA-101" in sub_codes, "Expected MCA-101 in subjects"
    assert "MCA-102" in sub_codes, "Expected MCA-102 in subjects"
    assert "BCA-101" in sub_codes or "BAI-101" in sub_codes, "Expected BCA/BAI subjects"

    # 4. Assert Projector Rooms Extracted
    rooms = result.get("rooms", [])
    room_numbers = {r["room_number"] for r in rooms}
    assert "Room-103" in room_numbers or "Room-104" in room_numbers or "Room-204" in room_numbers
    assert any(r.get("has_projector") or r.get("has_smart_board") for r in rooms)

    # 5. Assert Labs Extracted
    lab_rooms = [r for r in rooms if r["room_type"] == "LAB"]
    assert len(lab_rooms) >= 1
    assert any("002" in lr["room_number"] or "003" in lr["room_number"] for lr in lab_rooms)

    # 6. Assert Teaching Loads Extracted
    teaching_loads = result.get("teaching_loads", [])
    assert len(teaching_loads) >= 5
    load_fac_names = {tl["canonical_name"].lower() for tl in teaching_loads}
    assert any("alka gulati" in fn for fn in load_fac_names)
    assert any("kavita kanathey" in fn for fn in load_fac_names)

    # 7. Assert Room Shifts Extracted
    shifts = result.get("room_shifts", [])
    assert len(shifts) >= 5
    assert any(s["to_building"] == "Agriculture Building" for s in shifts)

    print("✓ test_subject_allocation_workbook_extraction PASSED successfully!")


if __name__ == "__main__":
    test_bca_excel_extraction()
    test_subject_allocation_workbook_extraction()
