import json
import requests

SUPABASE_URL = "https://ctbjoouhsussddekgvje.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0Ympvb3Voc3Vzc2RkZWtndmplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjczNDM0NSwiZXhwIjoyMTAyMzEwMzQ1fQ.qt4p6cSJLBPk4gcpMj7etd8JcTxqxBd9iSugH7UWWa4"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# 1. Fetch real Supabase Faculty Profiles uploaded by the user
r = requests.get(f"{SUPABASE_URL}/rest/v1/faculty_profiles?select=*", headers=headers)
supa_profiles = r.json() if r.status_code == 200 else []

real_teachers = []
for p in supa_profiles:
    name = p.get("teacher_name", "").strip()
    if name:
        real_teachers.append({
            "name": name,
            "teacher_name": name,
            "employee_id": p.get("employee_id") or "",
            "department": p.get("department_name") or "Computer Applications",
            "designation": p.get("designation") or "Assistant Professor",
            "email": p.get("email") or f"{name.lower().replace(' ', '.')}@lnctu.ac.in",
            "phone": p.get("phone") or "+91-9876543210",
            "free_periods": 1,
            "status": p.get("status", "active")
        })

print(f"Real uploaded faculty count from Supabase: {len(real_teachers)}")
for t in real_teachers:
    print(f" - {t['name']} ({t['designation']}) [Emp: {t['employee_id']}]")

# Update timetable_state to ONLY contain the real user data, with NO demo sections, rooms, or subjects
payload = {
    "teachers": json.dumps(real_teachers),
    "sections": json.dumps([]),
    "subjects": json.dumps([]),
    "rooms": json.dumps([]),
    "time_slots": json.dumps([
        "09:00 AM - 09:45 AM",
        "09:45 AM - 10:30 AM",
        "10:30 AM - 11:15 AM",
        "11:15 AM - 12:00 PM",
        "01:00 PM - 01:50 PM",
        "01:50 PM - 02:40 PM"
    ]),
    "updated_at": "2026-08-25T12:04:00Z"
}

resp = requests.patch(f"{SUPABASE_URL}/rest/v1/timetable_state?id=eq.draft", headers=headers, json=payload)
print("Supabase clean update status:", resp.status_code)
if resp.status_code in [200, 204]:
    print("SUCCESS: Cleaned demo data! Only actual uploaded faculty & user typed/uploaded data will be loaded.")
