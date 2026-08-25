"""
Academic Data Ingestion & OCR Intelligence API Router for Planify.exe.
"""
import os
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from services.ingest_service import IngestService

logger = logging.getLogger("plannify.ingest_routes")
router = APIRouter(prefix="", tags=["Academic Ingestion & OCR"])
ingest_service = IngestService()


class CommitIngestRequest(BaseModel):
    preview_payload: Dict[str, Any]
    user_name: Optional[str] = "Administrator"


@router.post("/ingest/analyze")
async def analyze_document_endpoint(file: UploadFile = File(...)):
    """
    Accepts PDF or Excel files, analyzes structure, extracts entities,
    runs duplicate & conflict detection, and returns an Import Preview report without DB write.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")

    ext = file.filename.split(".")[-1].lower()
    if ext not in ["pdf", "xlsx", "xls", "xlsm"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Planify supports PDF (.pdf) and Excel (.xlsx, .xls) workbooks."
        )

    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        preview = ingest_service.analyze_document(contents, file.filename)
        return preview
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"[Ingest Analyze Error] {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "message": f"Failed to analyze academic document: {str(e)}",
                "suggestions": ["Ensure the file is not corrupted or password-protected.", "Verify column formatting in the source workbook."]
            }
        )


@router.post("/ingest/commit")
def commit_ingest_endpoint(request: CommitIngestRequest):
    """
    Transactionally commits approved preview data to Supabase PostgreSQL (and local SQLite).
    Creates immutable audit logs and refreshes institutional state.
    """
    if not request.preview_payload:
        raise HTTPException(status_code=400, detail="Missing preview_payload for commit.")

    try:
        commit_res = ingest_service.commit_ingestion(
            preview_payload=request.preview_payload,
            user_name=request.user_name or "Administrator"
        )
        return commit_res
    except Exception as e:
        logger.error(f"[Ingest Commit Error] {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "message": f"Database transactional commit failed: {str(e)}",
                "suggestions": ["Check Supabase network connection.", "Verify foreign key references."]
            }
        )


@router.get("/ingest/audit-logs")
def list_import_audit_logs_endpoint():
    """Lists history of all imported academic files with timestamps and stats."""
    db_state = ingest_service.fetch_current_db_state()
    from db import get_connection
    if get_connection:
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM import_audit_logs ORDER BY created_at DESC LIMIT 50")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        except Exception:
            return []
        finally:
            conn.close()
    return []


@router.get("/ingest/sample/{sample_name}")
def analyze_sample_file_endpoint(sample_name: str):
    """
    Utility endpoint to analyze bundled sample files (bca_pdf, bca_excel, subject_alloc_excel).
    """
    sample_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_data")
    
    file_map = {
        "bca_pdf": "bca 1st sem.pdf",
        "bca_excel": "bca 1st sem.xlsx",
        "subject_alloc_excel": "Subject Allocation Jul-Dec 2026.xlsx",
    }

    target_filename = file_map.get(sample_name)
    if not target_filename:
        raise HTTPException(status_code=404, detail=f"Sample '{sample_name}' not found. Available: {list(file_map.keys())}")

    target_path = os.path.join(sample_dir, target_filename)
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"File not found on disk: {target_path}")

    with open(target_path, "rb") as f:
        bytes_data = f.read()

    preview = ingest_service.analyze_document(bytes_data, target_filename)
    return preview
