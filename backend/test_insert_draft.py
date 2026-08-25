import requests

SUPABASE_URL = "https://ctbjoouhsussddekgvje.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0Ympvb3Voc3Vzc2RkZWtndmplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjczNDM0NSwiZXhwIjoyMTAyMzEwMzQ1fQ.qt4p6cSJLBPk4gcpMj7etd8JcTxqxBd9iSugH7UWWa4"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Try insert with id only
r = requests.post(f"{SUPABASE_URL}/rest/v1/timetable_state", headers=headers, json={"id": "draft"})
print("Insert draft status:", r.status_code)
print("Insert draft response:", r.text)

# Query back the table
r2 = requests.get(f"{SUPABASE_URL}/rest/v1/timetable_state", headers=headers)
print("Get all:", r2.text)
