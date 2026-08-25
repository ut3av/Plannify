import json
import requests

SUPABASE_URL = "https://ctbjoouhsussddekgvje.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0Ympvb3Voc3Vzc2RkZWtndmplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjczNDM0NSwiZXhwIjoyMTAyMzEwMzQ1fQ.qt4p6cSJLBPk4gcpMj7etd8JcTxqxBd9iSugH7UWWa4"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

r = requests.get(f"{SUPABASE_URL}/rest/v1/timetable_state?select=*&id=eq.draft", headers=headers)
print("HTTP status:", r.status_code)
if r.status_code == 200:
    data = r.json()
    print("Timetable state on Supabase:")
    print(json.dumps(data, indent=2))
