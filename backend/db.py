import sqlite3
import json
import uuid
from datetime import datetime, date, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any

DB_FILE = Path(__file__).parent / "timetables.db"


def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Timetables table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS timetables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Departments table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS departments (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            hod_faculty_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Faculty profiles table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS faculty_profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            teacher_name TEXT NOT NULL,
            employee_id TEXT UNIQUE NOT NULL,
            department_id TEXT,
            designation TEXT DEFAULT 'Lecturer',
            qualification TEXT,
            employment_type TEXT DEFAULT 'full-time',
            joining_date TEXT DEFAULT (date('now')),
            phone TEXT,
            emergency_contact TEXT,
            address TEXT,
            photo_url TEXT,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments(id)
        )
    """)

    # Leave types table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leave_types (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            max_per_year INTEGER DEFAULT 12,
            carry_forward INTEGER DEFAULT 0,
            requires_document INTEGER DEFAULT 0,
            color TEXT DEFAULT '#3b82f6'
        )
    """)

    # Leave balances table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leave_balances (
            id TEXT PRIMARY KEY,
            faculty_id TEXT NOT NULL,
            leave_type_id TEXT NOT NULL,
            academic_year TEXT DEFAULT '2026-27',
            total_allowed INTEGER DEFAULT 12,
            used INTEGER DEFAULT 0,
            pending INTEGER DEFAULT 0,
            FOREIGN KEY (faculty_id) REFERENCES faculty_profiles(id),
            FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
        )
    """)

    # Leave applications table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leave_applications (
            id TEXT PRIMARY KEY,
            faculty_id TEXT NOT NULL,
            leave_type_id TEXT NOT NULL,
            from_date TEXT NOT NULL,
            to_date TEXT NOT NULL,
            half_day INTEGER DEFAULT 0,
            reason TEXT NOT NULL,
            document_url TEXT,
            status TEXT DEFAULT 'pending',
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_by TEXT,
            reviewed_at TIMESTAMP,
            review_remarks TEXT,
            substitute_id TEXT,
            FOREIGN KEY (faculty_id) REFERENCES faculty_profiles(id),
            FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
        )
    """)

    # Attendance records table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendance_records (
            id TEXT PRIMARY KEY,
            faculty_id TEXT NOT NULL,
            date TEXT NOT NULL,
            punch_in TEXT,
            punch_out TEXT,
            source TEXT DEFAULT 'manual',
            status TEXT DEFAULT 'present',
            late_minutes INTEGER DEFAULT 0,
            remarks TEXT,
            FOREIGN KEY (faculty_id) REFERENCES faculty_profiles(id)
        )
    """)

    # Substitution log table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS substitution_log (
            id TEXT PRIMARY KEY,
            leave_application_id TEXT,
            original_faculty_id TEXT NOT NULL,
            substitute_faculty_id TEXT NOT NULL,
            date TEXT NOT NULL,
            slot TEXT NOT NULL,
            subject TEXT,
            section TEXT,
            room TEXT,
            status TEXT DEFAULT 'assigned',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (original_faculty_id) REFERENCES faculty_profiles(id),
            FOREIGN KEY (substitute_faculty_id) REFERENCES faculty_profiles(id)
        )
    """)

    # Seed default leave types if empty
    cursor.execute("SELECT count(*) FROM leave_types")
    if cursor.fetchone()[0] == 0:
        default_types = [
            (str(uuid.uuid4()), "CL", "Casual Leave", 12, 0, 0, "#3b82f6"),
            (str(uuid.uuid4()), "EL", "Earned Leave", 15, 1, 0, "#10b981"),
            (str(uuid.uuid4()), "ML", "Medical Leave", 10, 0, 1, "#ef4444"),
            (str(uuid.uuid4()), "OD", "On Duty", 15, 0, 1, "#8b5cf6"),
            (str(uuid.uuid4()), "CO", "Compensatory Off", 5, 0, 0, "#f59e0b"),
        ]
        cursor.executemany(
            "INSERT INTO leave_types (id, code, name, max_per_year, carry_forward, requires_document, color) VALUES (?, ?, ?, ?, ?, ?, ?)",
            default_types
        )

    conn.commit()
    conn.close()


# ── Timetables Helper ──────────────────────────────────────────

def save_timetable_to_db(name: str, timetable_data: dict) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO timetables (name, data) VALUES (?, ?)",
        (name, json.dumps(timetable_data))
    )
    timetable_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return timetable_id


def get_timetables_from_db() -> List[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, created_at FROM timetables ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": row["id"], "name": row["name"], "created_at": row["created_at"]} for row in rows]


def get_timetable_by_id(timetable_id: int) -> Optional[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM timetables WHERE id = ?", (timetable_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row["data"])
    return None


def get_latest_timetable_assignments() -> List[dict]:
    """Retrieve assignments from the most recent timetable in SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM timetables ORDER BY created_at DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        try:
            data = json.loads(row["data"])
            return data.get("assignments", [])
        except Exception:
            return []
    return []


def delete_timetable_from_db(timetable_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM timetables WHERE id = ?", (timetable_id,))
    conn.commit()
    conn.close()


init_db()
