"""
Duplicate and Conflict Detection Service for Planify.exe Academic Ingestion.

Analyzes extracted academic entities against live Supabase PostgreSQL (and SQLite fallback)
to flag new entries, exact matches, fuzzy duplicates, and cross-source conflicts.
"""
import difflib
from typing import Dict, List, Any, Optional, Tuple


def calculate_similarity(a: str, b: str) -> float:
    """Computes normalized Levenshtein/Gestalt sequence similarity (0.0 to 1.0)."""
    if not a or not b:
        return 0.0
    a_clean = " ".join(a.lower().split())
    b_clean = " ".join(b.lower().split())
    if a_clean == b_clean:
        return 1.0
    return difflib.SequenceMatcher(None, a_clean, b_clean).ratio()


class DuplicateDetector:
    def __init__(self, existing_db_state: Optional[Dict[str, Any]] = None):
        """
        existing_db_state contains:
          - 'faculty': list of dicts (id, teacher_name, employee_id, email, phone)
          - 'subjects': list of dicts (id, code, name, program_code)
          - 'programs': list of dicts (id, code, name, level)
          - 'sections': list of dicts (id, name, full_name, program_code)
          - 'rooms': list of dicts (id, room_number, room_type)
          - 'allocations': list of dicts (faculty_name, subject_code, section_name, academic_term)
        """
        self.db = existing_db_state or {
            "faculty": [],
            "subjects": [],
            "programs": [],
            "sections": [],
            "rooms": [],
            "allocations": []
        }

    def analyze_faculty(self, extracted_faculty: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Classifies extracted faculty records."""
        new_records = []
        existing_matches = []
        possible_duplicates = []
        invalid_records = []

        existing_fac = self.db.get("faculty", [])

        for fac in extracted_faculty:
            name = fac.get("teacher_name", "").strip()
            canonical = fac.get("canonical_name", "").strip() or name

            if not name or len(name) < 2 or "new faculty" in name.lower() or "tba" in name.lower():
                invalid_records.append({**fac, "issue": "Generic or unassigned placeholder faculty name"})
                continue

            # 1. Check exact match
            exact_match = None
            for db_f in existing_fac:
                db_name = (db_f.get("teacher_name") or "").strip()
                if canonical.lower() == db_name.lower() or name.lower() == db_name.lower():
                    exact_match = db_f
                    break

            if exact_match:
                existing_matches.append({
                    "extracted": fac,
                    "matched_db_id": exact_match.get("id"),
                    "matched_name": exact_match.get("teacher_name"),
                    "employee_id": exact_match.get("employee_id"),
                    "status": "EXISTING_MATCH"
                })
                continue

            # 2. Check fuzzy match
            fuzzy_candidate = None
            highest_score = 0.0
            for db_f in existing_fac:
                db_name = (db_f.get("teacher_name") or "").strip()
                score = calculate_similarity(canonical, db_name)
                if score > highest_score and score >= 0.80:
                    highest_score = score
                    fuzzy_candidate = db_f

            if fuzzy_candidate:
                possible_duplicates.append({
                    "extracted": fac,
                    "candidate_db_id": fuzzy_candidate.get("id"),
                    "candidate_name": fuzzy_candidate.get("teacher_name"),
                    "similarity_score": round(highest_score, 2),
                    "recommendation": f"Merge with existing '{fuzzy_candidate.get('teacher_name')}' or import as new.",
                    "status": "POSSIBLE_DUPLICATE"
                })
            else:
                new_records.append({**fac, "status": "NEW"})

        return {
            "total": len(extracted_faculty),
            "new": new_records,
            "existing": existing_matches,
            "possible_duplicates": possible_duplicates,
            "invalid": invalid_records
        }

    def analyze_subjects(self, extracted_subjects: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Classifies extracted subjects."""
        new_records = []
        existing_matches = []
        possible_duplicates = []
        invalid_records = []

        existing_subs = self.db.get("subjects", [])

        for sub in extracted_subjects:
            code = sub.get("code", "").strip()
            name = sub.get("name", "").strip()
            prog = sub.get("program_code", "BCA")

            if not code or not name:
                invalid_records.append({**sub, "issue": "Missing subject code or course name"})
                continue

            exact_match = None
            for db_s in existing_subs:
                db_code = (db_s.get("code") or "").strip().upper()
                db_prog = (db_s.get("program_code") or "").strip().upper()
                if code.upper() == db_code and (not db_prog or prog.upper() == db_prog):
                    exact_match = db_s
                    break

            if exact_match:
                existing_matches.append({
                    "extracted": sub,
                    "matched_db_id": exact_match.get("id"),
                    "matched_name": exact_match.get("name"),
                    "matched_code": exact_match.get("code"),
                    "status": "EXISTING_MATCH"
                })
            else:
                # Check fuzzy name match with different code
                fuzzy_candidate = None
                for db_s in existing_subs:
                    db_name = (db_s.get("name") or "").strip()
                    score = calculate_similarity(name, db_name)
                    if score >= 0.90:
                        fuzzy_candidate = db_s
                        break

                if fuzzy_candidate:
                    possible_duplicates.append({
                        "extracted": sub,
                        "candidate_db_id": fuzzy_candidate.get("id"),
                        "candidate_code": fuzzy_candidate.get("code"),
                        "candidate_name": fuzzy_candidate.get("name"),
                        "status": "POSSIBLE_DUPLICATE"
                    })
                else:
                    new_records.append({**sub, "status": "NEW"})

        return {
            "total": len(extracted_subjects),
            "new": new_records,
            "existing": existing_matches,
            "possible_duplicates": possible_duplicates,
            "invalid": invalid_records
        }

    def analyze_rooms(self, extracted_rooms: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Classifies extracted classrooms and labs."""
        new_records = []
        existing_matches = []
        invalid_records = []

        existing_rooms = self.db.get("rooms", [])

        for room in extracted_rooms:
            r_num = room.get("room_number", "").strip()
            if not r_num:
                invalid_records.append({**room, "issue": "Empty room number"})
                continue

            exact_match = None
            for db_r in existing_rooms:
                db_num = (db_r.get("room_number") or "").strip().upper()
                if r_num.upper() == db_num:
                    exact_match = db_r
                    break

            if exact_match:
                existing_matches.append({
                    "extracted": room,
                    "matched_db_id": exact_match.get("id"),
                    "matched_room_number": exact_match.get("room_number"),
                    "status": "EXISTING_MATCH"
                })
            else:
                new_records.append({**room, "status": "NEW"})

        return {
            "total": len(extracted_rooms),
            "new": new_records,
            "existing": existing_matches,
            "invalid": invalid_records
        }

    def analyze_allocations(self, extracted_allocations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Classifies faculty-subject allocations and cross-program loads."""
        new_records = []
        existing_matches = []
        conflicts = []

        existing_allocs = self.db.get("allocations", [])

        for alloc in extracted_allocations:
            f_name = alloc.get("faculty_name", "").strip()
            s_code = alloc.get("subject_code", "").strip()
            sec_full = alloc.get("section_full_name", "").strip()

            exact_match = None
            conflict_match = None

            for db_a in existing_allocs:
                db_f = (db_a.get("faculty_name") or "").strip()
                db_s = (db_a.get("subject_code") or "").strip()
                db_sec = (db_a.get("section_full_name") or db_a.get("section_name") or "").strip()

                if s_code.upper() == db_s.upper() and sec_full.lower() == db_sec.lower():
                    if f_name.lower() == db_f.lower():
                        exact_match = db_a
                        break
                    else:
                        conflict_match = db_a
                        break

            if exact_match:
                existing_matches.append({
                    "extracted": alloc,
                    "matched_id": exact_match.get("id"),
                    "status": "EXISTING_MATCH"
                })
            elif conflict_match:
                conflicts.append({
                    "extracted": alloc,
                    "existing_db_allocation": conflict_match,
                    "issue": f"Section '{sec_full}' already has course '{s_code}' assigned to '{conflict_match.get('faculty_name')}' (Incoming: '{f_name}')",
                    "status": "CONFLICT"
                })
            else:
                new_records.append({**alloc, "status": "NEW"})

        return {
            "total": len(extracted_allocations),
            "new": new_records,
            "existing": existing_matches,
            "conflicts": conflicts
        }
