"""
Automated Test for End-to-End Ingestion Pipeline (Analyze -> Preview -> Commit).
"""
import os
import sys
import pytest

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.ingest_service import IngestService


def test_full_pdf_ingest_lifecycle():
    sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "sample_data", "bca 1st sem.pdf")
    with open(sample_path, "rb") as f:
        pdf_bytes = f.read()

    service = IngestService()

    # 1. Analyze Document (Generate Preview)
    preview = service.analyze_document(pdf_bytes, "bca 1st sem.pdf")
    assert preview["ready_for_commit"] is True
    assert preview["file_info"]["filename"] == "bca 1st sem.pdf"
    assert preview["summary_stats"]["total_sections"] == 7
    assert preview["summary_stats"]["total_subjects"] >= 8
    assert len(preview["programs_hierarchy"]) >= 1

    # 2. Transactionally Commit Preview
    commit_res = service.commit_ingestion(preview, "Test Administrator")
    assert commit_res["status"] == "success"
    assert "audit_log_id" in commit_res
    assert commit_res["records_inserted"]["sections"] >= 7 or commit_res["summary"]["total_sections"] >= 7

    print("✓ test_full_pdf_ingest_lifecycle PASSED successfully!")


def test_full_excel_ingest_lifecycle():
    sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "sample_data", "Subject Allocation Jul-Dec 2026.xlsx")
    with open(sample_path, "rb") as f:
        excel_bytes = f.read()

    service = IngestService()

    # 1. Analyze Document
    preview = service.analyze_document(excel_bytes, "Subject Allocation Jul-Dec 2026.xlsx")
    assert preview["ready_for_commit"] is True
    assert preview["summary_stats"]["total_faculty"] >= 10
    assert len(preview["programs_hierarchy"]) >= 2  # BCA and MCA

    # 2. Commit Preview
    commit_res = service.commit_ingestion(preview, "Test Administrator")
    assert commit_res["status"] == "success"
    assert "audit_log_id" in commit_res

    print("✓ test_full_excel_ingest_lifecycle PASSED successfully!")


if __name__ == "__main__":
    test_full_pdf_ingest_lifecycle()
    test_full_excel_ingest_lifecycle()
