"""
Plannify Academic Operations Platform — Core Backend ASGI Application.
Modularized architecture connecting:
- Google OR-Tools CP-SAT Solver & UGC Workload Constraints
- Groq AI Assistant & Natural Language Processing
- OpenpyXL Institutional Excel Workbooks Exporter
- Faculty Lifecycle Management & Leave Balances
- Attendance & Proxy Substitution Pipelines
- Make.com Enterprise Automation Webhooks
"""
import sys
import os

# Ensure backend directory is in sys.path for Render / Docker / local execution
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import copy
import logging
import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Local Service Routers & Solvers
from solver.cp_solver import (
    solve_timetable,
    find_available_proxy,
    validate_request,
    DAYS,
    DEFAULT_SLOTS,
    GenerateRequest,
    RescheduleRequest,
    SubjectInput,
    TeacherInput,
    SectionInput,
)
from exporters.excel_export import create_teacher_excel, create_master_timetable_excel
from ai_routes import router as ai_router
from faculty_routes import router as faculty_router
from leave_routes import router as leave_router
from attendance_routes import router as attendance_router
from substitution_routes import router as substitution_router
from analytics_routes import router as analytics_router
from db import init_db, save_timetable_to_db, get_timetables_from_db, get_timetable_by_id, delete_timetable_from_db

# Load environment configuration
load_dotenv()
init_db()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("plannify.core")

app = FastAPI(
    title="Planify Academic Operations Platform",
    description="Enterprise Timetable Optimization, Faculty Lifecycle & Substitution ERP",
    version="3.69.0",
)

# Robust Wildcard Origin Matching with Full Credentials Support
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global State Memory
LAST_REQUEST: Optional[GenerateRequest] = None
LAST_TIMETABLE: Optional[dict] = None
UNAVAILABILITY: Dict[str, List[Tuple[str, str]]] = defaultdict(list)


# ─────────────────────────────────────────────────────────────
# Exception Handlers (Always inject CORS headers)
# ─────────────────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    origin = request.headers.get("origin")
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error: {exc}", exc_info=True)
    origin = request.headers.get("origin")
    response = JSONResponse(
        status_code=500,
        content={
            "detail": {
                "message": "An unexpected academic operations server error occurred.",
                "suggestions": ["Refresh the page.", "Check backend solver logs."],
                "facts": [str(exc)[:150]],
            }
        },
    )
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
    return response


# ─────────────────────────────────────────────────────────────
# Make.com Automation Webhook Helper
# ─────────────────────────────────────────────────────────────

def notify_make(event: str, data: dict) -> dict:
    webhook_url = os.getenv("MAKE_WEBHOOK_URL", "").strip()
    if not webhook_url:
        load_dotenv(override=True)
        webhook_url = os.getenv("MAKE_WEBHOOK_URL", "").strip()

    if not webhook_url:
        return {
            "enabled": False,
            "delivered": False,
            "message": "Set MAKE_WEBHOOK_URL in backend/.env to enable Make automation workflows.",
        }

    payload = {
        "event": event,
        "service": "plannify-core",
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "data": data,
    }

    try:
        response = requests.post(webhook_url, json=payload, timeout=12)
        response.raise_for_status()
        return {"enabled": True, "delivered": True, "status_code": response.status_code}
    except requests.RequestException as exc:
        return {"enabled": True, "delivered": False, "message": f"Make delivery failed: {str(exc)}"}


# ─────────────────────────────────────────────────────────────
# Core Timetable Solver & Rescheduling Endpoints
# ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "healthy",
        "service": "Planify Academic Operations Platform",
        "version": "3.69.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/generate")
def generate_timetable_endpoint(request: GenerateRequest):
    global LAST_REQUEST, UNAVAILABILITY, LAST_TIMETABLE
    LAST_REQUEST = validate_request(request)
    UNAVAILABILITY = defaultdict(list)
    LAST_TIMETABLE = solve_timetable(LAST_REQUEST)
    LAST_TIMETABLE["make_delivery"] = notify_make(
        "timetable.generated",
        {"request": LAST_REQUEST.model_dump(), "result": LAST_TIMETABLE},
    )
    return LAST_TIMETABLE


@app.post("/reschedule")
def reschedule_endpoint(request: RescheduleRequest):
    global LAST_REQUEST, UNAVAILABILITY, LAST_TIMETABLE
    if LAST_REQUEST is None:
        raise HTTPException(status_code=400, detail="Generate a timetable before rescheduling.")

    teacher = request.teacher.strip()
    teacher_names = [t.name for t in LAST_REQUEST.teachers]
    if teacher not in teacher_names:
        raise HTTPException(status_code=400, detail=f"Teacher '{teacher}' not found in current timetable.")

    blocked_days = [request.day] if request.day else DAYS
    blocked_slots = request.slots or LAST_REQUEST.time_slots

    for day in blocked_days:
        if day not in DAYS:
            raise HTTPException(status_code=400, detail=f"Unknown day: {day}.")
        for slot in blocked_slots:
            if slot not in LAST_REQUEST.time_slots:
                raise HTTPException(status_code=400, detail=f"Unknown slot: {slot}.")
            blocked_time = (day, slot)
            if blocked_time not in UNAVAILABILITY[teacher]:
                UNAVAILABILITY[teacher].append(blocked_time)

    response = solve_timetable(LAST_REQUEST)
    response["reschedule_note"] = {
        "teacher": teacher,
        "blocked": [{"day": day, "slot": slot} for day, slot in UNAVAILABILITY[teacher]],
    }
    LAST_TIMETABLE = response
    response["make_delivery"] = notify_make(
        "timetable.rescheduled",
        {"request": request.model_dump(), "result": response},
    )
    return response


@app.post("/proxy")
def assign_proxy_endpoint(request: RescheduleRequest):
    global LAST_TIMETABLE, LAST_REQUEST

    active_tt = LAST_TIMETABLE
    if active_tt is None and request.timetable_data:
        active_tt = copy.deepcopy(request.timetable_data)

    if active_tt is None:
        saved = get_timetables_from_db()
        if saved:
            saved_doc = get_timetable_by_id(saved[0].get("id"))
            if saved_doc and "timetable_data" in saved_doc:
                active_tt = saved_doc["timetable_data"]

    if active_tt is None:
        raise HTTPException(status_code=400, detail="Generate or load a timetable before assigning proxies.")

    teacher = request.teacher.strip()
    all_teachers_pool = []
    if request.teachers:
        all_teachers_pool = request.teachers
    elif LAST_REQUEST and LAST_REQUEST.teachers:
        all_teachers_pool = LAST_REQUEST.teachers
    else:
        t_set = {a.get("teacher") for a in active_tt.get("assignments", []) if a.get("teacher")}
        all_teachers_pool = [{"name": t} for t in t_set]

    day = request.day or (DAYS[0] if DAYS else "Mon")
    target_slots = set(request.slots) if request.slots else None
    new_timetable = copy.deepcopy(active_tt.get("timetable", {}))
    proxies_assigned = []

    if day in new_timetable:
        slots_list = active_tt.get("time_slots") or list(new_timetable[day].keys())
        for s in slots_list:
            if s in new_timetable[day]:
                if target_slots is not None and s not in target_slots:
                    continue
                classes_in_slot = new_timetable[day][s]
                for cls in classes_in_slot:
                    if cls.get("teacher") == teacher:
                        proxy_name = request.proxy_teacher or find_available_proxy(
                            teacher, day, s, new_timetable, all_teachers_pool
                        )
                        if proxy_name:
                            cls["original_teacher"] = teacher
                            cls["teacher"] = proxy_name
                            cls["is_proxy"] = True
                            cls["proxy_reason"] = request.reason or "Substitution"
                            proxies_assigned.append({
                                "day": day,
                                "slot": s,
                                "original": teacher,
                                "proxy": proxy_name,
                                "subject": cls.get("subject", ""),
                                "section": cls.get("section", ""),
                                "room": cls.get("room", ""),
                            })

    new_assignments = []
    days_order = active_tt.get("days") or DAYS
    for d in days_order:
        if d in new_timetable:
            slots_order = active_tt.get("time_slots") or list(new_timetable[d].keys())
            for s in slots_order:
                if s in new_timetable[d]:
                    for cls in new_timetable[d][s]:
                        new_assignments.append({"day": d, "slot": s, **cls})

    result_payload = {
        **active_tt,
        "timetable": new_timetable,
        "assignments": new_assignments,
        "reschedule_note": {
            "teacher": teacher,
            "proxies_assigned": proxies_assigned,
            "message": f"Successfully assigned {len(proxies_assigned)} proxy class(es) for {teacher} on {day}.",
        },
    }

    LAST_TIMETABLE = result_payload
    result_payload["make_delivery"] = notify_make(
        "timetable.proxy_assigned",
        {"request": request.model_dump(), "result": result_payload},
    )
    return result_payload


# ─────────────────────────────────────────────────────────────
# Exporter Endpoints (OpenpyXL)
# ─────────────────────────────────────────────────────────────

class MasterExcelRequest(BaseModel):
    slots: List[str] = DEFAULT_SLOTS
    assignments: List[dict]
    sections: List[str] = []


class TeacherExcelRequest(BaseModel):
    teacher_name: str
    slots: List[str] = DEFAULT_SLOTS
    assignments: List[dict]


@app.post("/export/excel")
def export_master_excel(request: MasterExcelRequest):
    base64_data = create_master_timetable_excel(request.slots, request.assignments, request.sections)
    return {"excel_base64": base64_data, "filename": "Institutional_Timetable_Master.xlsx"}


@app.post("/export/teacher-excel")
def export_teacher_excel(request: TeacherExcelRequest):
    base64_data = create_teacher_excel(request.teacher_name, request.slots, request.assignments)
    return {
        "excel_base64": base64_data,
        "filename": f"Timetable_{request.teacher_name.replace(' ', '_')}.xlsx",
    }


class BulkEmailRequest(BaseModel):
    timetable_data: Optional[dict] = None
    teachers: Optional[List[dict]] = None
    time_slots: Optional[List[str]] = None


@app.post("/make/email-all")
async def trigger_bulk_emails(request: Optional[BulkEmailRequest] = None):
    # 1. Check if payload was supplied by client
    active_tt = None
    teachers_pool = []
    slots_pool = DEFAULT_SLOTS

    if request and request.timetable_data:
        active_tt = request.timetable_data
        slots_pool = request.time_slots or active_tt.get("time_slots") or DEFAULT_SLOTS
        if request.teachers:
            teachers_pool = request.teachers

    # 2. Check in-memory state
    if not active_tt and LAST_TIMETABLE:
        active_tt = LAST_TIMETABLE
        slots_pool = LAST_TIMETABLE.get("time_slots", DEFAULT_SLOTS)
        if LAST_REQUEST and LAST_REQUEST.teachers:
            teachers_pool = [t.model_dump() if hasattr(t, "model_dump") else t for t in LAST_REQUEST.teachers]

    # 3. Check SQLite / Supabase saved timetables fallback
    if not active_tt:
        saved = get_timetables_from_db()
        if saved:
            doc = get_timetable_by_id(saved[0].get("id"))
            if doc and "timetable_data" in doc:
                active_tt = doc["timetable_data"]
                slots_pool = active_tt.get("time_slots", DEFAULT_SLOTS)

    if not active_tt:
        raise HTTPException(
            status_code=400,
            detail="No timetable available. Please click 'Generate AI Timetable' first."
        )

    # Resolve teachers list from timetable assignments if empty
    if not teachers_pool:
        t_names = set(a.get("teacher") for a in active_tt.get("assignments", []) if a.get("teacher"))
        teachers_pool = [{"name": name} for name in sorted(t_names)]

    assignments = active_tt.get("assignments", [])
    teachers_data = []
    for t_item in teachers_pool:
        t_name = (t_item.get("name") or "").strip()
        if not t_name:
            continue
        excel_base64 = create_teacher_excel(t_name, slots_pool, assignments)
        
        safe_email = (t_item.get("email") or "").strip()
        if not safe_email:
            cleaned_handle = re.sub(r'[^a-zA-Z0-9]', '.', t_name.lower()).strip('.')
            safe_email = f"{cleaned_handle or 'faculty'}@lnctu.ac.in"

        teachers_data.append({
            "name": t_name,
            "email": safe_email,
            "phone": (t_item.get("phone") or "").strip() or "+91-9876543210",
            "filename": f"Timetable_{t_name.replace(' ', '_')}.xlsx",
            "excel_base64": excel_base64,
            "is_proxy_alert": bool(t_item.get("is_substitute", False)),
        })

    result = notify_make(
        "bulk_email_trigger",
        {
            "action": "distribute_timetables",
            "priority": "high",
            "teacher_count": len(teachers_data),
            "teachers": teachers_data,
            "requested_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    if not result.get("delivered"):
        raise HTTPException(
            status_code=500,
            detail=result.get("message") or "Failed to deliver webhook payload to Make.com. Make sure MAKE_WEBHOOK_URL is added to Render Environment."
        )

    return {
        "status": "triggered",
        "message": f"Bulk email workflow initiated for {len(teachers_data)} teachers.",
        "make_response": result,
    }


class MakeTestRequest(BaseModel):
    event: Optional[str] = "manual_test"
    payload: Optional[Dict[str, Any]] = None


@app.post("/make/test")
def test_make_webhook(request: MakeTestRequest):
    event = request.event or "manual_test"
    custom_msg = (request.payload or {}).get("message", "Ping from Plannify.exe Academic Operations")
    
    # Rich sample schema payload to allow Make.com to auto-detect all data structures
    test_data = {
        "event": event,
        "message": custom_msg,
        "action": "manual_webhook_test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "teacher_count": 1,
        "teachers": [
            {
                "name": "Dr. Sharma",
                "email": "sharma@example.edu",
                "phone": "+919876543210",
                "filename": "Timetable_Dr_Sharma.xlsx",
                "excel_base64": "UEsDBBQAAAAIAAA...",
                "is_proxy_alert": False,
            }
        ],
        "proxy_alert": {
            "original_teacher": "Prof. Verma",
            "proxy_teacher": "Dr. Sharma",
            "proxy_phone": "+919876543210",
            "proxy_email": "sharma@example.edu",
            "day": "Monday",
            "slot": "09:00 - 10:00 AM",
            "room": "Room 302",
            "subject": "CS301 Data Structures",
            "section": "CSE-A",
            "reason": "Medical Leave"
        }
    }

    result = notify_make(event, test_data)

    if not result.get("delivered"):
        raise HTTPException(
            status_code=500,
            detail=result.get("message", "Failed to deliver webhook ping to Make.com. Verify MAKE_WEBHOOK_URL.")
        )

    return {
        "status": "success",
        "message": "Make Automation Instance Verified & Online! Webhook delivered successfully.",
        "make_response": result,
    }


# ─────────────────────────────────────────────────────────────
# Database Timetable Versioning & Storage Endpoints
# ─────────────────────────────────────────────────────────────

class SaveTimetableRequest(BaseModel):
    name: str
    timetable_data: dict


@app.post("/save")
def save_timetable_endpoint(request: SaveTimetableRequest):
    tid = save_timetable_to_db(request.name, request.timetable_data)
    delivery = notify_make(
        "timetable.saved",
        {"id": tid, "name": request.name, "timetable_data": request.timetable_data},
    )
    return {"id": tid, "status": "saved", "name": request.name, "make_delivery": delivery}


@app.get("/saved-timetables")
def list_saved_timetables_endpoint():
    return get_timetables_from_db()


@app.get("/saved-timetables/{tid}")
def get_saved_timetable_endpoint(tid: int):
    data = get_timetable_by_id(tid)
    if not data:
        raise HTTPException(status_code=404, detail="Saved timetable not found.")
    return data


@app.delete("/saved-timetables/{tid}")
def delete_saved_timetable_endpoint(tid: int):
    success = delete_timetable_from_db(tid)
    if not success:
        raise HTTPException(status_code=404, detail="Could not delete timetable.")
    return {"status": "deleted", "id": tid}


# ─────────────────────────────────────────────────────────────
# Mount Modular Sub-Routers
# ─────────────────────────────────────────────────────────────

app.include_router(ai_router)
app.include_router(faculty_router)
app.include_router(leave_router)
app.include_router(attendance_router)
app.include_router(substitution_router)
app.include_router(analytics_router)
