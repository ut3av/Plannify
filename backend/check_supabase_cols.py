import requests

SUPABASE_URL = "https://ctbjoouhsussddekgvje.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0Ympvb3Voc3Vzc2RkZWtndmplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjczNDM0NSwiZXhwIjoyMTAyMzEwMzQ1fQ.qt4p6cSJLBPk4gcpMj7etd8JcTxqxBd9iSugH7UWWa4"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# Fetch single row or empty list to see columns
r = requests.get(f"{SUPABASE_URL}/rest/v1/timetable_state?limit=1", headers=headers)
print("status:", r.status_code)
print("headers:", r.headers)
print("data:", r.text)

# Also check timetable_drafts
r2 = requests.get(f"{SUPABASE_URL}/rest/v1/timetable_drafts?limit=1", headers=headers)
print("\ntimetable_drafts status:", r2.status_code)
if r2.status_code == 200:
    print("timetable_drafts data:", r2.text)
