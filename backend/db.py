import sqlite3
import json
from pathlib import Path

DB_FILE = Path(__file__).parent / "timetables.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS timetables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_timetable_to_db(name: str, timetable_data: dict):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO timetables (name, data) VALUES (?, ?)",
        (name, json.dumps(timetable_data))
    )
    timetable_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return timetable_id

def get_timetables_from_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, created_at FROM timetables ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": row[0], "name": row[1], "created_at": row[2]} for row in rows]

def get_timetable_by_id(timetable_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM timetables WHERE id = ?", (timetable_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row[0])
    return None

def delete_timetable_from_db(timetable_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM timetables WHERE id = ?", (timetable_id,))
    conn.commit()
    conn.close()

init_db()
