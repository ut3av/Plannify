"""
Automated Verification for BCA 1st Sem PDF Ingestion.
Tests exact extraction against real institutional source file.
"""
import os
import sys
import pytest

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.document_parser import DocumentParser
from services.data_normalizer import normalize_faculty_name, normalize_subject_code


def test_bca_pdf_extraction():
    sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "sample_data", "bca 1st sem.pdf")
    assert os.path.exists(sample_path), f"Sample file not found: {sample_path}"

    with open(sample_path, "rb") as f:
        file_bytes = f.read()

    parser = DocumentParser()
    result = parser.parse_pdf(file_bytes, "bca 1st sem.pdf")

    # Assert 7 Sections extracted (A, B, C, D, E, F, G)
    sections = result.get("sections", [])
    assert len(sections) == 7, f"Expected 7 sections, got {len(sections)}"

    section_letters = [s["section_letter"] for s in sections]
    assert sorted(section_letters) == ["A", "B", "C", "D", "E", "F", "G"]

    # Assert BCA Program
    for s in sections:
        assert s["program_code"] == "BCA"
        assert s["level"] == "UG"
        assert s["semester_number"] == 1

    # Assert Key Subjects Extracted
    subjects = result.get("subjects", [])
    sub_codes = {s["code"] for s in subjects}
    expected_codes = {"BAI-101", "BAI-102", "BAI-103", "BAI-104", "BAI-105", "BAI-106", "BAI-107", "FC-112"}
    for ec in expected_codes:
        assert ec in sub_codes, f"Expected subject code {ec} in extracted subjects"

    # Assert Key Faculty Extracted
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
        "kanal soni",
        "shubham shrivastava"
    ]
    for ef in expected_faculty:
        assert any(ef in fn for fn in fac_names), f"Expected faculty member '{ef}' in extracted faculty roster"

    # Assert Mentors and Phones
    mentors = result.get("mentors", [])
    assert len(mentors) >= 6, f"Expected at least 6 mentors, got {len(mentors)}"
    mentor_phones = [m["phone"] for m in mentors if m.get("phone")]
    assert len(mentor_phones) >= 6

    # Assert Allocations Count
    allocations = result.get("allocations", [])
    assert len(allocations) >= 50, f"Expected >= 50 subject allocations across 7 sections, got {len(allocations)}"

    print("✓ test_bca_pdf_extraction PASSED successfully!")


if __name__ == "__main__":
    test_bca_pdf_extraction()
