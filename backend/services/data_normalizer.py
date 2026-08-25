"""
Data Normalization Pipeline for Planify.exe Academic Ingestion.

Normalizes extracted academic entities (Faculty, Subjects, Codes, Sections, Programs, Rooms, Loads)
to ensure canonical identifiers, fuzzy match deduplication, and database consistency.
"""
import re
import unicodedata
from typing import Dict, Any, Optional, Tuple


HONORIFICS = [
    r"^dr\.\s*", r"^dr\s+", r"^prof\.\s*", r"^prof\s+", r"^mr\.\s*", r"^mr\s+",
    r"^mrs\.\s*", r"^mrs\s+", r"^ms\.\s*", r"^ms\s+"
]

SPECIAL_CHARACTER_FIXES = {
    "ish(cid:407)a": "शिक्षा",
    "vishwakar ma": "vishwakarma",
    "deepshikh a": "deepshikha",
    "shrivastva": "shrivastava",
    "kaiwalya": "kaivalya",
    "deptt": "department",
}


def normalize_whitespace(text: str) -> str:
    if not text:
        return ""
    # Normalize unicode (NFKC)
    text = unicodedata.normalize("NFKC", str(text))
    # Replace newlines, tabs, and non-breaking spaces with standard single space
    text = re.sub(r'[\r\n\t\xa0]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def normalize_faculty_name(raw_name: str) -> Dict[str, Any]:
    """
    Normalizes a faculty name, extracts title/designation hint, cleans typos and whitespace.
    Example: 'Dr.  Alka Gulati' -> normalized_name: 'Dr. Alka Gulati', canonical_name: 'Alka Gulati', title: 'Dr.'
    """
    cleaned = normalize_whitespace(raw_name)
    if not cleaned:
        return {"raw": raw_name, "normalized_name": "", "canonical_name": "", "title": None}

    # Apply known OCR word boundary fixes
    lower_check = cleaned.lower()
    for bad_w, good_w in SPECIAL_CHARACTER_FIXES.items():
        if bad_w in lower_check:
            cleaned = re.sub(re.escape(bad_w), good_w, cleaned, flags=re.IGNORECASE)

    title = None
    canonical = cleaned

    for pattern in HONORIFICS:
        match = re.match(pattern, canonical, flags=re.IGNORECASE)
        if match:
            matched_prefix = match.group(0).strip()
            title = "Dr." if "dr" in matched_prefix.lower() else ("Prof." if "prof" in matched_prefix.lower() else "Mr./Ms.")
            canonical = canonical[match.end():].strip()
            break

    # Title-case canonical name
    canonical = " ".join([word.capitalize() for word in canonical.split()])
    normalized_name = f"{title} {canonical}" if title else canonical

    return {
        "raw": raw_name,
        "normalized_name": normalized_name,
        "canonical_name": canonical,
        "title": title
    }


def normalize_subject_code(raw_code: str) -> str:
    """Normalizes subject code, uppercase, strips spaces around hyphens."""
    cleaned = normalize_whitespace(raw_code).upper()
    # E.g. "BAI - 101" -> "BAI-101"
    cleaned = re.sub(r'\s*-\s*', '-', cleaned)
    return cleaned


def normalize_subject_name(raw_name: str) -> str:
    """Normalizes subject names and cleans multiline OCR splits."""
    cleaned = normalize_whitespace(raw_name)
    # Fix broken syllables like "Programm ing" -> "Programming"
    cleaned = re.sub(r'(\b[A-Za-z]+)\s+ing\b', r'\1ing', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'(\b[A-Za-z]+)\s+tion\b', r'\1tion', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'Environme\s+ntal', 'Environmental', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'Fundamen\s+tals', 'Fundamentals', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'Organizati\s+on', 'Organization', cleaned, flags=re.IGNORECASE)
    return cleaned


def parse_program_and_section(raw_header: str) -> Dict[str, Any]:
    """
    Parses section header string to extract Program, Level, Semester, Section Letter, Specialization.
    Examples:
      - 'BCA-I Sem. Section A (AI/DA)' -> Program: BCA, Level: UG, Sem: 1, Sec: A, Spec: AI/DA
      - 'MCA-I Sem. Section D' -> Program: MCA, Level: PG, Sem: 1, Sec: D, Spec: None
      - 'BCA-III Sem. Section B (CA)' -> Program: BCA, Level: UG, Sem: 3, Sec: B, Spec: CA
      - 'MCA-III Sem. Section A (AIML)' -> Program: MCA, Level: PG, Sem: 3, Sec: A, Spec: AIML
    """
    cleaned = normalize_whitespace(raw_header)
    
    # 1. Determine Program
    program_code = "BCA"
    if "MCA" in cleaned.upper() or "MAI" in cleaned.upper() or "LUMCA" in cleaned.upper():
        program_code = "MCA"
    elif "B.TECH" in cleaned.upper() or "BTECH" in cleaned.upper():
        program_code = "B.Tech"
    elif "MBA" in cleaned.upper():
        program_code = "MBA"
    elif "BCA" in cleaned.upper() or "BAI" in cleaned.upper():
        program_code = "BCA"

    # Level
    level = "PG" if program_code in ["MCA", "M.Tech", "MBA"] else "UG"

    # 2. Determine Semester Number
    sem_num = 1
    roman_match = re.search(r'[-_\s](I{1,3}|IV|V|VI|VII|VIII)\b', cleaned, re.IGNORECASE)
    if roman_match:
        roman = roman_match.group(1).upper()
        roman_map = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8}
        sem_num = roman_map.get(roman, 1)
    else:
        digit_match = re.search(r'(\d+)\s*(?:st|nd|rd|th)?\s*Sem', cleaned, re.IGNORECASE)
        if digit_match:
            sem_num = int(digit_match.group(1))

    # 3. Determine Section letter
    sec_match = re.search(r'Section\s+([A-G0-9])\b', cleaned, re.IGNORECASE)
    sec_letter = sec_match.group(1).upper() if sec_match else "A"

    # 4. Determine Specialization / Branch hint
    spec = None
    spec_match = re.search(r'\(([A-Za-z0-9\/\s\-]+)\)', cleaned)
    if spec_match:
        spec = normalize_whitespace(spec_match.group(1)).upper()

    full_name = f"{program_code}-{'I' * sem_num if sem_num <= 3 else ('IV' if sem_num == 4 else ('V' if sem_num == 5 else 'VI'))} Sem. Section {sec_letter}"
    if spec:
        full_name += f" ({spec})"

    return {
        "raw": raw_header,
        "program_code": program_code,
        "program_name": "Bachelor of Computer Applications" if program_code == "BCA" else ("Master of Computer Applications" if program_code == "MCA" else program_code),
        "level": level,
        "semester_number": sem_num,
        "semester_name": f"Semester {sem_num}",
        "section_name": f"Section {sec_letter}",
        "section_letter": sec_letter,
        "specialization": spec,
        "full_name": full_name
    }


def normalize_room_number(raw_room: str) -> Dict[str, Any]:
    """
    Normalizes classroom and laboratory identifiers.
    Examples:
      - '103.0' or '103' -> 'Room-103', type: 'CLASSROOM'
      - 'Lab No 002' or 'LAB-002' -> 'LAB-002', type: 'LAB'
      - 'T2', 'S5' -> 'Room-T2', type: 'CLASSROOM'
    """
    cleaned = normalize_whitespace(str(raw_room))
    if not cleaned:
        return {"raw": raw_room, "room_number": "", "room_type": "CLASSROOM", "is_lab": False}

    # Handle float strings from excel like '103.0'
    if cleaned.endswith(".0"):
        cleaned = cleaned[:-2]

    is_lab = "lab" in cleaned.lower()
    room_type = "LAB" if is_lab else "CLASSROOM"

    if is_lab:
        digits = re.search(r'(\d+)', cleaned)
        if digits:
            num = digits.group(1).zfill(3)
            room_number = f"LAB-{num}"
        else:
            room_number = cleaned.upper().replace(" ", "-")
    else:
        # Check if numeric
        if cleaned.isdigit():
            room_number = f"Room-{cleaned}"
        elif cleaned.upper().startswith("ROOM"):
            room_number = re.sub(r'ROOM[\s\-_]*', 'Room-', cleaned.upper())
        else:
            room_number = f"Room-{cleaned.upper()}" if len(cleaned) <= 4 else cleaned

    return {
        "raw": raw_room,
        "room_number": room_number,
        "room_type": room_type,
        "is_lab": is_lab
    }


def normalize_phone_number(raw_phone: str) -> Optional[str]:
    """Cleans phone numbers, removes float trailing .0 from Excel."""
    if not raw_phone:
        return None
    s = str(raw_phone).strip()
    if s.endswith(".0"):
        s = s[:-2]
    # Remove non-digits
    digits = re.sub(r'\D', '', s)
    if len(digits) == 10:
        return f"+91-{digits}"
    elif len(digits) == 12 and digits.startswith("91"):
        return f"+{digits[:2]}-{digits[2:]}"
    elif digits:
        return f"+91-{digits[-10:]}"
    return None
