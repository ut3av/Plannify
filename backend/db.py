import sqlite3
import json
import uuid
from datetime import datetime, date, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any

DB_FILE = Path(__file__).parent / "timetables.db"


def get_connection():
    conn = sqlite3.connect(DB_FILE, timeout=30.0)
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
            institution_id TEXT,
            code TEXT,
            hod_faculty_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    try:
        cursor.execute("ALTER TABLE departments ADD COLUMN institution_id TEXT")
    except Exception:
        pass

    try:
        cursor.execute("ALTER TABLE departments ADD COLUMN code TEXT")
    except Exception:
        pass

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
            email TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments(id)
        )
    """)

    # Ensure email column exists in existing SQLite databases
    try:
        cursor.execute("ALTER TABLE faculty_profiles ADD COLUMN email TEXT")
    except Exception:
        pass

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

    # Relational Timetables table (Lifecycle & Versioning)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS timetables_v2 (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            academic_term TEXT DEFAULT '2026-27',
            version INTEGER DEFAULT 1,
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'validating', 'valid', 'pending_approval', 'published', 'archived')),
            validation_report TEXT,
            published_by TEXT,
            published_at TEXT,
            change_note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Relational Timetable Assignments table with Level-3 UNIQUE constraints
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS timetable_assignments (
            id TEXT PRIMARY KEY,
            timetable_id TEXT NOT NULL,
            day TEXT NOT NULL,
            slot TEXT NOT NULL,
            teacher_name TEXT NOT NULL,
            faculty_id TEXT,
            subject_name TEXT NOT NULL,
            subject_code TEXT,
            section_name TEXT NOT NULL,
            room_name TEXT NOT NULL,
            is_lab INTEGER DEFAULT 0,
            is_proxy INTEGER DEFAULT 0,
            original_teacher_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (timetable_id) REFERENCES timetables_v2(id) ON DELETE CASCADE,
            CONSTRAINT uq_teacher_slot UNIQUE (timetable_id, day, slot, teacher_name),
            CONSTRAINT uq_room_slot UNIQUE (timetable_id, day, slot, room_name),
            CONSTRAINT uq_section_slot UNIQUE (timetable_id, day, slot, section_name)
        )
    """)

    # Institutions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS institutions (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            code TEXT UNIQUE NOT NULL,
            city TEXT DEFAULT 'Bhopal',
            state TEXT DEFAULT 'Madhya Pradesh',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Seed default institution
    cursor.execute("""
        INSERT OR IGNORE INTO institutions (id, name, code, city, state)
        VALUES ('inst-lnct-01', 'Lakshmi Narain College of Technology', 'LNCT', 'Bhopal', 'Madhya Pradesh')
    """)

    # Buildings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS buildings (
            id TEXT PRIMARY KEY,
            institution_id TEXT,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id)
        )
    """)

    # Rooms & Labs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            institution_id TEXT,
            building_id TEXT,
            room_number TEXT NOT NULL,
            room_type TEXT DEFAULT 'CLASSROOM',
            capacity INTEGER DEFAULT 60,
            has_projector INTEGER DEFAULT 0,
            has_smart_board INTEGER DEFAULT 0,
            capabilities TEXT DEFAULT '[]',
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id),
            FOREIGN KEY (building_id) REFERENCES buildings(id)
        )
    """)

    # Academic Sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS academic_sessions (
            id TEXT PRIMARY KEY,
            institution_id TEXT,
            name TEXT NOT NULL,
            academic_year TEXT DEFAULT '2026-27',
            is_current INTEGER DEFAULT 0,
            start_date TEXT,
            end_date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id)
        )
    """)

    # Programs table (UG/PG, BCA, MCA, B.Tech)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS programs (
            id TEXT PRIMARY KEY,
            institution_id TEXT,
            department_id TEXT,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            level TEXT NOT NULL,
            duration_semesters INTEGER DEFAULT 6,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id),
            FOREIGN KEY (department_id) REFERENCES departments(id)
        )
    """)

    # Semesters table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS semesters (
            id TEXT PRIMARY KEY,
            program_id TEXT NOT NULL,
            semester_number INTEGER NOT NULL,
            name TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (program_id) REFERENCES programs(id)
        )
    """)

    # Sections table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sections (
            id TEXT PRIMARY KEY,
            program_id TEXT NOT NULL,
            semester_id TEXT NOT NULL,
            name TEXT NOT NULL,
            specialization TEXT,
            full_name TEXT NOT NULL,
            default_room_id TEXT,
            default_lab_room_id TEXT,
            mentor_faculty_id TEXT,
            mentor_name TEXT,
            mentor_phone TEXT,
            capacity INTEGER DEFAULT 60,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (program_id) REFERENCES programs(id),
            FOREIGN KEY (semester_id) REFERENCES semesters(id),
            FOREIGN KEY (default_room_id) REFERENCES rooms(id),
            FOREIGN KEY (default_lab_room_id) REFERENCES rooms(id),
            FOREIGN KEY (mentor_faculty_id) REFERENCES faculty_profiles(id)
        )
    """)

    # Subjects table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS subjects (
            id TEXT PRIMARY KEY,
            program_id TEXT NOT NULL,
            semester_id TEXT,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            short_name TEXT,
            credit_hours REAL DEFAULT 4.0,
            lecture_hours INTEGER DEFAULT 4,
            lab_hours INTEGER DEFAULT 0,
            is_lab INTEGER DEFAULT 0,
            color_index INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (program_id) REFERENCES programs(id),
            FOREIGN KEY (semester_id) REFERENCES semesters(id)
        )
    """)

    # Faculty-Subject Allocations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS faculty_subject_allocations (
            id TEXT PRIMARY KEY,
            faculty_id TEXT NOT NULL,
            faculty_name TEXT NOT NULL,
            subject_id TEXT NOT NULL,
            subject_code TEXT NOT NULL,
            subject_name TEXT NOT NULL,
            program_id TEXT NOT NULL,
            semester_id TEXT NOT NULL,
            section_id TEXT NOT NULL,
            academic_session_id TEXT,
            academic_term TEXT DEFAULT 'July-Dec 2026',
            weekly_load INTEGER DEFAULT 4,
            is_lab INTEGER DEFAULT 0,
            preferred_room_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (faculty_id) REFERENCES faculty_profiles(id),
            FOREIGN KEY (subject_id) REFERENCES subjects(id),
            FOREIGN KEY (program_id) REFERENCES programs(id),
            FOREIGN KEY (semester_id) REFERENCES semesters(id),
            FOREIGN KEY (section_id) REFERENCES sections(id)
        )
    """)

    # Import Audit Logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS import_audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            imported_by_name TEXT DEFAULT 'Administrator',
            filename TEXT NOT NULL,
            file_hash TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size_bytes INTEGER NOT NULL,
            status TEXT DEFAULT 'analyzed',
            records_detected TEXT DEFAULT '{}',
            records_inserted TEXT DEFAULT '{}',
            records_updated TEXT DEFAULT '{}',
            records_skipped TEXT DEFAULT '{}',
            conflicts_detected TEXT DEFAULT '[]',
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Document Extractions staging table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS document_extractions (
            id TEXT PRIMARY KEY,
            import_log_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            source_location TEXT,
            raw_payload TEXT NOT NULL,
            normalized_payload TEXT NOT NULL,
            confidence REAL DEFAULT 1.00,
            validation_status TEXT DEFAULT 'valid',
            validation_notes TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (import_log_id) REFERENCES import_audit_logs(id)
        )
    """)

    conn.commit()
    conn.close()


# ── Timetables Helper ──────────────────────────────────────────

def save_timetable_relational(
    name: str,
    assignments: List[Dict[str, Any]],
    validation_report: Dict[str, Any],
    status: str = "draft",
    academic_term: str = "2026-27",
    change_note: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Transactionally persists a relational timetable and all its assignments.
    Enforces atomic rollback if any uniqueness constraint fails.
    """
    timetable_id = str(uuid.uuid4())
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 1. Determine version for term
        cursor.execute(
            "SELECT COALESCE(MAX(version), 0) + 1 FROM timetables_v2 WHERE academic_term = ?",
            (academic_term,)
        )
        next_version = cursor.fetchone()[0]

        # 2. Insert Timetable metadata
        cursor.execute(
            """
            INSERT INTO timetables_v2 (
                id, name, academic_term, version, status, validation_report, change_note
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timetable_id,
                name,
                academic_term,
                next_version,
                status,
                json.dumps(validation_report, ensure_ascii=False),
                change_note or "Automated generation via OR-Tools & Deterministic Validator",
            ),
        )

        # 3. Insert individual assignments with Level-3 Unique constraint guarantees
        for a in assignments:
            assign_id = str(uuid.uuid4())
            cursor.execute(
                """
                INSERT INTO timetable_assignments (
                    id, timetable_id, day, slot, teacher_name, faculty_id,
                    subject_name, subject_code, section_name, room_name,
                    is_lab, is_proxy, original_teacher_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    assign_id,
                    timetable_id,
                    a.get("day", ""),
                    a.get("slot", ""),
                    a.get("teacher", ""),
                    a.get("faculty_id"),
                    a.get("subject", ""),
                    a.get("code", ""),
                    a.get("section", ""),
                    a.get("room", ""),
                    1 if a.get("is_lab") else 0,
                    1 if a.get("is_proxy") else 0,
                    a.get("original_teacher"),
                ),
            )

        # 4. Also store backward-compatible snapshot in legacy timetables table
        legacy_data = {
            "timetable_id": timetable_id,
            "assignments": assignments,
            "validation": validation_report,
            "version": next_version,
            "status": status,
        }
        cursor.execute(
            "INSERT INTO timetables (name, data) VALUES (?, ?)",
            (f"{name} (v{next_version})", json.dumps(legacy_data)),
        )

        conn.commit()
        return {
            "success": True,
            "timetable_id": timetable_id,
            "version": next_version,
            "status": status,
            "total_assignments": len(assignments),
        }
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def get_timetable_relational(timetable_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a relational timetable and its full assignments list."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM timetables_v2 WHERE id = ?", (timetable_id,))
    tt_row = cursor.fetchone()
    if not tt_row:
        conn.close()
        return None

    cursor.execute(
        """
        SELECT day, slot, teacher_name as teacher, faculty_id,
               subject_name as subject, subject_code as code,
               section_name as section, room_name as room,
               is_lab, is_proxy, original_teacher_name as original_teacher
        FROM timetable_assignments
        WHERE timetable_id = ?
        ORDER BY day, slot
        """,
        (timetable_id,)
    )
    assign_rows = cursor.fetchall()
    conn.close()

    assignments = []
    for r in assign_rows:
        assignments.append({
            "day": r["day"],
            "slot": r["slot"],
            "teacher": r["teacher"],
            "faculty_id": r["faculty_id"],
            "subject": r["subject"],
            "code": r["code"],
            "section": r["section"],
            "room": r["room"],
            "is_lab": bool(r["is_lab"]),
            "is_proxy": bool(r["is_proxy"]),
            "original_teacher": r["original_teacher"],
        })

    validation_json = None
    if tt_row["validation_report"]:
        try:
            validation_json = json.loads(tt_row["validation_report"])
        except Exception:
            pass

    return {
        "id": tt_row["id"],
        "name": tt_row["name"],
        "academic_term": tt_row["academic_term"],
        "version": tt_row["version"],
        "status": tt_row["status"],
        "validation_report": validation_json,
        "published_by": tt_row["published_by"],
        "published_at": tt_row["published_at"],
        "change_note": tt_row["change_note"],
        "created_at": tt_row["created_at"],
        "assignments": assignments,
    }


def publish_timetable_relational(
    timetable_id: str,
    published_by: str = "Admin",
    change_note: Optional[str] = None
) -> Dict[str, Any]:
    """Publishes a validated timetable version."""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check current status
        cursor.execute("SELECT status FROM timetables_v2 WHERE id = ?", (timetable_id,))
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Timetable '{timetable_id}' not found.")

        # Archive any previous published timetables for the same term
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            UPDATE timetables_v2
            SET status = 'archived', updated_at = ?
            WHERE status = 'published'
            """,
            (now_iso,)
        )

        # Set target timetable to published
        cursor.execute(
            """
            UPDATE timetables_v2
            SET status = 'published', published_by = ?, published_at = ?, change_note = COALESCE(?, change_note), updated_at = ?
            WHERE id = ?
            """,
            (published_by, now_iso, change_note, now_iso, timetable_id)
        )
        conn.commit()
        return {"success": True, "timetable_id": timetable_id, "status": "published", "published_at": now_iso}
    finally:
        conn.close()


def list_timetable_versions() -> List[Dict[str, Any]]:
    """Lists all timetable versions with their lifecycle status."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, name, academic_term, version, status, published_by, published_at, change_note, created_at
        FROM timetables_v2
        ORDER BY version DESC, created_at DESC
        """
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


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
