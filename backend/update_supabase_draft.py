import json
import requests
import sqlite3

SUPABASE_URL = "https://ctbjoouhsussddekgvje.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0Ympvb3Voc3Vzc2RkZWtndmplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjczNDM0NSwiZXhwIjoyMTAyMzEwMzQ1fQ.qt4p6cSJLBPk4gcpMj7etd8JcTxqxBd9iSugH7UWWa4"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

# 1. Fetch Supabase Faculty Profiles
r = requests.get(f"{SUPABASE_URL}/rest/v1/faculty_profiles?select=*", headers=headers)
supa_profiles = r.json() if r.status_code == 200 else []

teachers_list = []
seen_teachers = set()

# Add Supabase profiles
for p in supa_profiles:
    name = p.get("teacher_name", "").strip()
    if name and name.lower() not in seen_teachers:
        seen_teachers.add(name.lower())
        teachers_list.append({
            "name": name,
            "teacher_name": name,
            "employee_id": p.get("employee_id") or f"EMP-{len(teachers_list)+1:03d}",
            "department": p.get("department_name") or "Computer Applications",
            "designation": p.get("designation") or "Assistant Professor",
            "email": p.get("email") or f"{name.lower().replace(' ', '.')}@lnctu.ac.in",
            "phone": p.get("phone") or "+91-9876543210",
            "free_periods": 1,
            "status": p.get("status", "active")
        })

# Also include teaching faculty from timetable
for name, dept, desig in [
    ("Dr. Sanjana Singh", "Computer Applications", "Associate Professor"),
    ("Dr. Amit Patel", "Computer Applications", "Associate Professor"),
    ("Prof. Rajesh Verma", "Computer Applications", "Assistant Professor"),
    ("Prof. Neha Gupta", "Computer Applications", "Assistant Professor"),
    ("Dr. Sharma", "Computer Science", "Professor"),
    ("Teacher A", "Computer Science", "Lecturer")
]:
    if name.lower() not in seen_teachers:
        seen_teachers.add(name.lower())
        teachers_list.append({
            "name": name,
            "teacher_name": name,
            "employee_id": f"EMP-LNCT-{len(teachers_list)+1:03d}",
            "department": dept,
            "designation": desig,
            "email": f"{name.lower().replace(' ', '.').replace('..', '.')}@lnctu.ac.in",
            "phone": "+91-9876543210",
            "free_periods": 1,
            "status": "active"
        })

# 2. Complete Classrooms & Labs allocation
rooms_list = [
    {"name": "Room 308/MCA", "capacity": 60, "is_lab": False, "type": "Lecture Hall", "building": "Academic Block A"},
    {"name": "Room 309/MCA", "capacity": 60, "is_lab": False, "type": "Lecture Hall", "building": "Academic Block A"},
    {"name": "Lab Room No. 006", "capacity": 40, "is_lab": True, "type": "Computing Lab", "building": "Tech Wing"},
    {"name": "Lab Room No. 007", "capacity": 40, "is_lab": True, "type": "Database Lab", "building": "Tech Wing"},
    {"name": "Room 204", "capacity": 65, "is_lab": False, "type": "Classroom", "building": "Main Block"},
    {"name": "Room 101", "capacity": 70, "is_lab": False, "type": "Classroom", "building": "Main Block"}
]

# 3. Complete Sections allocation
sections_list = [
    {
        "name": "MCA-1A",
        "room": "Room 308/MCA",
        "lab_room": "Lab Room No. 007",
        "lab_rooms": ["Lab Room No. 007", "Lab Room No. 006"],
        "student_count": 55,
        "preferred_faculty": ["Dr. Sanjana Singh", "Dr. Amit Patel", "Prof. Rajesh Verma"]
    },
    {
        "name": "MCA-1B",
        "room": "Room 309/MCA",
        "lab_room": "Lab Room No. 006",
        "lab_rooms": ["Lab Room No. 006", "Lab Room No. 007"],
        "student_count": 55,
        "preferred_faculty": ["Prof. Neha Gupta", "Dr. Sanjana Singh", "Prof. Rajesh Verma"]
    },
    {
        "name": "Sec A",
        "room": "Room 101",
        "lab_room": "Lab Room No. 006",
        "lab_rooms": ["Lab Room No. 006"],
        "student_count": 60,
        "preferred_faculty": ["Dr. Sharma", "Teacher A"]
    }
]

# 4. Complete Subjects & Course Catalog
subjects_list = [
    {
        "name": "Database Systems",
        "code": "MCA-101",
        "teacher": "Dr. Sanjana Singh",
        "department": "Computer Applications",
        "weekly_lectures": 4,
        "required_slots": 4,
        "is_lab": False,
        "room": "Room 308/MCA"
    },
    {
        "name": "Operating Systems",
        "code": "MCA-102",
        "teacher": "Dr. Amit Patel",
        "department": "Computer Applications",
        "weekly_lectures": 4,
        "required_slots": 4,
        "is_lab": False,
        "room": "Room 308/MCA"
    },
    {
        "name": "Data Structures",
        "code": "MCA-103",
        "teacher": "Prof. Rajesh Verma",
        "department": "Computer Applications",
        "weekly_lectures": 4,
        "required_slots": 4,
        "is_lab": False,
        "room": "Room 308/MCA"
    },
    {
        "name": "Computer Networks",
        "code": "MCA-104",
        "teacher": "Prof. Neha Gupta",
        "department": "Computer Applications",
        "weekly_lectures": 4,
        "required_slots": 4,
        "is_lab": False,
        "room": "Room 309/MCA"
    },
    {
        "name": "DBMS Lab",
        "code": "MCA-105",
        "teacher": "Dr. Sanjana Singh",
        "department": "Computer Applications",
        "weekly_lectures": 2,
        "required_slots": 2,
        "is_lab": True,
        "room": "Lab Room No. 007"
    },
    {
        "name": "DS Lab",
        "code": "MCA-106",
        "teacher": "Prof. Rajesh Verma",
        "department": "Computer Applications",
        "weekly_lectures": 2,
        "required_slots": 2,
        "is_lab": True,
        "room": "Lab Room No. 006"
    },
    {
        "name": "DBMS",
        "code": "CS-301",
        "teacher": "Dr. Sharma",
        "department": "Computer Science",
        "weekly_lectures": 3,
        "required_slots": 3,
        "is_lab": False,
        "room": "Room 101"
    }
]

# 5. Time Slots
time_slots = [
    "09:00 AM - 09:45 AM",
    "09:45 AM - 10:30 AM",
    "10:30 AM - 11:15 AM",
    "11:15 AM - 12:00 PM",
    "01:00 PM - 01:50 PM",
    "01:50 PM - 02:40 PM"
]

payload = {
    "teachers": json.dumps(teachers_list),
    "sections": json.dumps(sections_list),
    "subjects": json.dumps(subjects_list),
    "rooms": json.dumps(rooms_list),
    "time_slots": json.dumps(time_slots),
    "updated_at": "2026-08-25T11:59:00Z"
}

resp = requests.patch(f"{SUPABASE_URL}/rest/v1/timetable_state?id=eq.draft", headers=headers, json=payload)
print("Supabase update status:", resp.status_code)
if resp.status_code in [200, 204]:
    print("SUCCESS: Full academic state allocated on Supabase!")
    print(f"- {len(rooms_list)} Classrooms & Labs")
    print(f"- {len(sections_list)} Academic Sections")
    print(f"- {len(subjects_list)} Subjects")
    print(f"- {len(teachers_list)} Faculty Members")
else:
    print("Error:", resp.text)
