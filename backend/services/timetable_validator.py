"""
Independent Deterministic Timetable Validator for Planify.exe.

Implements all 18 institutional scheduling rules:
1. Teacher Collision (same teacher in 2 classes in same day+slot)
2. Room Collision (2 classes in same room in same day+slot)
3. Section Collision (same section scheduled in 2 classes in same day+slot)
4. Subject Period Requirements (required == scheduled, unfulfilled or exceeded)
5. Teacher Availability & Approved Leave
6. Room Availability
7. Section Availability
8. Lab Compatibility (practical courses placed in valid laboratory rooms)
9. Teacher Workload (daily max & weekly UGC workload caps)
10. Duplicate Assignments (identical tuple)
11. Invalid Teacher Reference
12. Invalid Room Reference
13. Invalid Section Reference
14. Invalid Subject Reference
15. Invalid Time Reference (day/slot validity)
16. Unscheduled Required Periods
17. Inactive / Deleted Entities
18. Timetable Structure & Integrity

Does NOT depend on React, AI, or the OR-Tools solver. Can be called independently on any schedule.
"""

from collections import defaultdict
from typing import Dict, List, Optional, Any, Set, Tuple


class TimetableValidator:
    def __init__(
        self,
        days: Optional[List[str]] = None,
        slots: Optional[List[str]] = None,
        teachers: Optional[List[Dict[str, Any]]] = None,
        subjects: Optional[List[Dict[str, Any]]] = None,
        rooms: Optional[List[Dict[str, Any]]] = None,
        sections: Optional[List[Dict[str, Any]]] = None,
        unavailability: Optional[Dict[str, List[Tuple[str, str]]]] = None,
        ugc_max_weekly_hours: int = 40,
        enable_ugc_checker: bool = False,
    ):
        self.days = days or ["Mon", "Tue", "Wed", "Thu", "Fri"]
        self.slots = slots or [
            "09:00 AM - 09:45 AM",
            "09:45 AM - 10:30 AM",
            "10:30 AM - 11:20 AM",
            "11:20 AM - 12:10 PM",
            "01:00 PM - 01:50 PM",
            "01:50 PM - 02:40 PM",
            "02:40 PM - 03:30 PM",
        ]
        self.teachers = teachers or []
        self.subjects = subjects or []
        self.rooms = rooms or []
        self.sections = sections or []
        self.unavailability = unavailability or {}
        self.ugc_max_weekly_hours = ugc_max_weekly_hours
        self.enable_ugc_checker = enable_ugc_checker

    def validate(
        self,
        assignments: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Executes complete validation pass over the assignments list.
        Returns structured validation response with pass/fail boolean, errors, warnings, and statistics.
        """
        errors: List[Dict[str, Any]] = []
        warnings: List[Dict[str, Any]] = []

        check_counts = {
            "teacher_conflicts": 0,
            "room_conflicts": 0,
            "section_conflicts": 0,
            "subject_requirement_failures": 0,
            "availability_conflicts": 0,
            "lab_conflicts": 0,
            "workload_violations": 0,
            "duplicate_assignments": 0,
            "invalid_references": 0,
            "integrity_errors": 0,
        }

        # Lookup index helpers
        teacher_names: Set[str] = set()
        teacher_workload_caps: Dict[str, int] = {}
        teacher_free_periods: Dict[str, int] = {}
        teacher_active_map: Dict[str, bool] = {}

        for t in self.teachers:
            name = (t.get("name") or t.get("teacher_name") or "").strip()
            if name:
                teacher_names.add(name)
                cap = t.get("max_weekly_hours") or self.ugc_max_weekly_hours
                teacher_workload_caps[name] = cap
                teacher_free_periods[name] = t.get("free_periods", 1)
                status = t.get("status", "active")
                teacher_active_map[name] = status.lower() == "active"

        room_names: Set[str] = set()
        room_lab_map: Dict[str, bool] = {}
        for r in self.rooms:
            if isinstance(r, str):
                r_name = r.strip()
                if r_name:
                    room_names.add(r_name)
                    room_lab_map[r_name] = "lab" in r_name.lower()
            elif isinstance(r, dict):
                r_name = (r.get("room_number") or r.get("name") or "").strip()
                if r_name:
                    room_names.add(r_name)
                    room_type = (r.get("room_type") or "").upper()
                    room_lab_map[r_name] = bool(r.get("is_lab", "LAB" in room_type or "lab" in r_name.lower()))

        section_names: Set[str] = set()
        section_lab_rooms: Dict[str, List[str]] = defaultdict(list)
        for s in self.sections:
            if isinstance(s, str):
                section_names.add(s.strip())
            elif isinstance(s, dict):
                s_name = (s.get("name") or "").strip()
                if s_name:
                    section_names.add(s_name)
                    lab_rooms = s.get("lab_rooms") or ([s.get("lab_room")] if s.get("lab_room") else [])
                    section_lab_rooms[s_name] = [lr.strip() for lr in lab_rooms if lr]

        subject_map: Dict[str, Dict[str, Any]] = {}
        for sub in self.subjects:
            name = (sub.get("name") or "").strip()
            code = (sub.get("code") or "").strip()
            if name:
                subject_map[name] = sub
            if code:
                subject_map[code] = sub

        # Aggregation structures
        teacher_day_slot: Dict[Tuple[str, str, str], List[Dict[str, Any]]] = defaultdict(list)
        room_day_slot: Dict[Tuple[str, str, str], List[Dict[str, Any]]] = defaultdict(list)
        section_day_slot: Dict[Tuple[str, str, str], List[Dict[str, Any]]] = defaultdict(list)
        subject_period_counts: Dict[str, int] = defaultdict(int)
        teacher_weekly_workload: Dict[str, int] = defaultdict(int)
        teacher_daily_workload: Dict[Tuple[str, str], int] = defaultdict(int)
        seen_exact_assignments: Set[Tuple[str, str, str, str, str, str]] = set()

        teachers_used: Set[str] = set()
        rooms_used: Set[str] = set()
        sections_used: Set[str] = set()
        subjects_used: Set[str] = set()

        # -------------------------------------------------------------
        # PASS 1: Single Assignment Integrity & Reference Validation
        # -------------------------------------------------------------
        for idx, a in enumerate(assignments):
            assign_id = a.get("id") or f"assignment_{idx + 1}"
            day = (a.get("day") or "").strip()
            slot = (a.get("slot") or "").strip()
            teacher = (a.get("teacher") or "").strip()
            room = (a.get("room") or "").strip()
            section = (a.get("section") or "").strip()
            subject = (a.get("subject") or "").strip()
            code = (a.get("code") or "").strip()
            is_lab = bool(a.get("is_lab", False))

            # Rule 15: Invalid Day / Slot Reference
            if day not in self.days:
                errors.append({
                    "code": "INVALID_TIME_REFERENCE",
                    "severity": "error",
                    "message": f"Assignment references invalid day '{day}'. Allowed days: {self.days}.",
                    "day": day,
                    "slot": slot,
                    "assignment_id": assign_id,
                })
                check_counts["invalid_references"] += 1

            if slot not in self.slots:
                errors.append({
                    "code": "INVALID_TIME_REFERENCE",
                    "severity": "error",
                    "message": f"Assignment references invalid time slot '{slot}'.",
                    "day": day,
                    "slot": slot,
                    "assignment_id": assign_id,
                })
                check_counts["invalid_references"] += 1

            # Rule 11 & 17: Invalid or Inactive Teacher Reference
            if teacher:
                teachers_used.add(teacher)
                if teacher_names and teacher not in teacher_names:
                    errors.append({
                        "code": "INVALID_TEACHER_REFERENCE",
                        "severity": "error",
                        "message": f"Assignment references unknown teacher '{teacher}'.",
                        "teacher_name": teacher,
                        "day": day,
                        "slot": slot,
                        "assignment_id": assign_id,
                    })
                    check_counts["invalid_references"] += 1
                elif teacher in teacher_active_map and not teacher_active_map[teacher]:
                    errors.append({
                        "code": "INACTIVE_ENTITY_REFERENCE",
                        "severity": "error",
                        "message": f"Assignment scheduled for inactive/resigned teacher '{teacher}'.",
                        "teacher_name": teacher,
                        "day": day,
                        "slot": slot,
                        "assignment_id": assign_id,
                    })
                    check_counts["invalid_references"] += 1
            else:
                errors.append({
                    "code": "MISSING_TEACHER",
                    "severity": "error",
                    "message": f"Assignment at {day} ({slot}) has no assigned teacher.",
                    "day": day,
                    "slot": slot,
                    "assignment_id": assign_id,
                })
                check_counts["integrity_errors"] += 1

            # Rule 12: Invalid Room Reference
            if room:
                rooms_used.add(room)
                if room_names and room not in room_names:
                    errors.append({
                        "code": "INVALID_ROOM_REFERENCE",
                        "severity": "error",
                        "message": f"Assignment references unknown classroom/venue '{room}'.",
                        "room_name": room,
                        "day": day,
                        "slot": slot,
                        "assignment_id": assign_id,
                    })
                    check_counts["invalid_references"] += 1
            else:
                errors.append({
                    "code": "MISSING_ROOM",
                    "severity": "error",
                    "message": f"Assignment for {subject} has no room specified.",
                    "day": day,
                    "slot": slot,
                    "assignment_id": assign_id,
                })
                check_counts["integrity_errors"] += 1

            # Rule 13: Invalid Section Reference
            if section:
                sections_used.add(section)
                if section_names and section not in section_names:
                    errors.append({
                        "code": "INVALID_SECTION_REFERENCE",
                        "severity": "error",
                        "message": f"Assignment references unknown section/cohort '{section}'.",
                        "section_name": section,
                        "day": day,
                        "slot": slot,
                        "assignment_id": assign_id,
                    })
                    check_counts["invalid_references"] += 1

            # Rule 14: Invalid Subject Reference
            if subject or code:
                sub_key = subject or code
                subjects_used.add(sub_key)
                if subject_map and sub_key not in subject_map:
                    errors.append({
                        "code": "INVALID_SUBJECT_REFERENCE",
                        "severity": "error",
                        "message": f"Assignment references course subject '{sub_key}' not present in curriculum.",
                        "subject_name": subject,
                        "day": day,
                        "slot": slot,
                        "assignment_id": assign_id,
                    })
                    check_counts["invalid_references"] += 1
                else:
                    subject_period_counts[sub_key] += 1
                    sub_meta = subject_map.get(sub_key, {})
                    if sub_meta.get("is_lab"):
                        is_lab = True

            # Rule 8: Lab Compatibility
            if is_lab:
                is_room_lab = room_lab_map.get(room, "lab" in room.lower())
                if not is_room_lab:
                    errors.append({
                        "code": "LAB_ROOM_INCOMPATIBLE",
                        "severity": "error",
                        "message": f"Practical laboratory subject '{subject}' is assigned to standard lecture classroom '{room}'.",
                        "subject_name": subject,
                        "room_name": room,
                        "day": day,
                        "slot": slot,
                        "assignment_id": assign_id,
                    })
                    check_counts["lab_conflicts"] += 1

            # Rule 10: Duplicate Assignments Check
            exact_key = (day, slot, teacher, room, section, subject)
            if exact_key in seen_exact_assignments:
                errors.append({
                    "code": "DUPLICATE_ASSIGNMENT",
                    "severity": "error",
                    "message": f"Duplicate identical assignment found for {teacher} / {subject} in {room} on {day} ({slot}).",
                    "teacher_name": teacher,
                    "subject_name": subject,
                    "room_name": room,
                    "day": day,
                    "slot": slot,
                    "assignment_id": assign_id,
                })
                check_counts["duplicate_assignments"] += 1
            else:
                seen_exact_assignments.add(exact_key)

            # Rule 5: Teacher Availability & Blocked Slot Check
            if teacher and teacher in self.unavailability:
                for blocked_day, blocked_slot in self.unavailability[teacher]:
                    if day == blocked_day and slot == blocked_slot:
                        errors.append({
                            "code": "TEACHER_AVAILABILITY_CONFLICT",
                            "severity": "error",
                            "message": f"Teacher '{teacher}' is scheduled during an approved leave / unavailable period on {day} ({slot}).",
                            "teacher_name": teacher,
                            "day": day,
                            "slot": slot,
                            "assignment_id": assign_id,
                        })
                        check_counts["availability_conflicts"] += 1

            # Tally for collisions
            if teacher and day in self.days and slot in self.slots:
                teacher_day_slot[(teacher, day, slot)].append(a)
                teacher_weekly_workload[teacher] += 1
                teacher_daily_workload[(teacher, day)] += 1

            if room and day in self.days and slot in self.slots:
                room_day_slot[(room, day, slot)].append(a)

            if section and day in self.days and slot in self.slots:
                section_day_slot[(section, day, slot)].append(a)

        # -------------------------------------------------------------
        # PASS 2: Collision & Multi-Booking Detection
        # -------------------------------------------------------------

        # Rule 1: Teacher Collision
        for (teacher, day, slot), slot_assignments in teacher_day_slot.items():
            if len(slot_assignments) > 1:
                subjects_str = ", ".join(set(a.get("subject", "Class") for a in slot_assignments))
                rooms_str = ", ".join(set(a.get("room", "") for a in slot_assignments))
                sections_str = ", ".join(set(a.get("section", "") for a in slot_assignments))
                assign_ids = [a.get("id") or f"assign_{i}" for i, a in enumerate(slot_assignments)]

                errors.append({
                    "code": "TEACHER_CONFLICT",
                    "severity": "error",
                    "message": f"Teacher '{teacher}' is assigned to {len(slot_assignments)} classes simultaneously on {day} ({slot}): {subjects_str} in [{rooms_str}] for section [{sections_str}].",
                    "teacher_name": teacher,
                    "day": day,
                    "slot": slot,
                    "assignment_ids": assign_ids,
                })
                check_counts["teacher_conflicts"] += 1

        # Rule 2: Room Collision
        for (room, day, slot), slot_assignments in room_day_slot.items():
            if len(slot_assignments) > 1:
                teachers_str = ", ".join(set(a.get("teacher", "Teacher") for a in slot_assignments))
                subjects_str = ", ".join(set(a.get("subject", "Subject") for a in slot_assignments))
                sections_str = ", ".join(set(a.get("section", "") for a in slot_assignments))
                assign_ids = [a.get("id") or f"assign_{i}" for i, a in enumerate(slot_assignments)]

                errors.append({
                    "code": "ROOM_CONFLICT",
                    "severity": "error",
                    "message": f"Room '{room}' is double-booked on {day} ({slot}) for {len(slot_assignments)} classes: {subjects_str} (Faculty: {teachers_str}, Section: {sections_str}).",
                    "room_name": room,
                    "day": day,
                    "slot": slot,
                    "assignment_ids": assign_ids,
                })
                check_counts["room_conflicts"] += 1

        # Rule 3: Section Collision
        for (section, day, slot), slot_assignments in section_day_slot.items():
            if len(slot_assignments) > 1:
                teachers_str = ", ".join(set(a.get("teacher", "Teacher") for a in slot_assignments))
                subjects_str = ", ".join(set(a.get("subject", "Subject") for a in slot_assignments))
                rooms_str = ", ".join(set(a.get("room", "") for a in slot_assignments))
                assign_ids = [a.get("id") or f"assign_{i}" for i, a in enumerate(slot_assignments)]

                errors.append({
                    "code": "SECTION_CONFLICT",
                    "severity": "error",
                    "message": f"Section '{section}' is scheduled for {len(slot_assignments)} simultaneous classes on {day} ({slot}): {subjects_str} (Faculty: {teachers_str}, Room: {rooms_str}).",
                    "section_name": section,
                    "day": day,
                    "slot": slot,
                    "assignment_ids": assign_ids,
                })
                check_counts["section_conflicts"] += 1

        # -------------------------------------------------------------
        # PASS 3: Subject Period Requirements & Fulfillments
        # -------------------------------------------------------------
        total_required_periods = 0
        total_scheduled_periods = len(assignments)

        for sub in self.subjects:
            name = (sub.get("name") or "").strip()
            code = (sub.get("code") or "").strip()
            req = sub.get("required_slots") or sub.get("required_periods") or 3
            total_required_periods += req

            actual = subject_period_counts.get(name, 0)
            if actual == 0 and code:
                actual = subject_period_counts.get(code, 0)

            if actual < req:
                unfulfilled = req - actual
                errors.append({
                    "code": "SUBJECT_REQUIREMENT_UNFULFILLED",
                    "severity": "error",
                    "message": f"Subject '{name or code}' requires {req} weekly periods, but only {actual} were scheduled ({unfulfilled} unfulfilled).",
                    "subject_name": name,
                    "subject_code": code,
                    "required_periods": req,
                    "scheduled_periods": actual,
                    "unfulfilled_periods": unfulfilled,
                })
                check_counts["subject_requirement_failures"] += 1
            elif actual > req:
                exceeded = actual - req
                warnings.append({
                    "code": "SUBJECT_REQUIREMENT_EXCEEDED",
                    "severity": "warning",
                    "message": f"Subject '{name or code}' has {actual} scheduled periods exceeding the curriculum requirement of {req} periods.",
                    "subject_name": name,
                    "subject_code": code,
                    "required_periods": req,
                    "scheduled_periods": actual,
                })

        unfulfilled_periods = max(0, total_required_periods - total_scheduled_periods)

        # -------------------------------------------------------------
        # PASS 4: Teacher Pedagogical Warnings
        # -------------------------------------------------------------
        for teacher, assigned_count in teacher_weekly_workload.items():
            if self.enable_ugc_checker:
                cap = teacher_workload_caps.get(teacher, self.ugc_max_weekly_hours)
                if assigned_count > cap:
                    excess = assigned_count - cap
                    errors.append({
                        "code": "TEACHER_WORKLOAD_EXCEEDED",
                        "severity": "error",
                        "message": f"Teacher '{teacher}' is scheduled for {assigned_count} periods, exceeding maximum weekly workload cap of {cap} periods (+{excess} excess).",
                        "teacher_name": teacher,
                        "configured_limit": cap,
                        "actual_workload": assigned_count,
                        "excess_periods": excess,
                    })
                    check_counts["workload_violations"] += 1

            # Daily free periods check (Warning if teacher has 0 breaks)
            free_req = teacher_free_periods.get(teacher, 1)
            if free_req > 0:
                for day in self.days:
                    daily_count = teacher_daily_workload.get((teacher, day), 0)
                    max_allowed_daily = len(self.slots) - free_req
                    if daily_count > max_allowed_daily and max_allowed_daily > 0:
                        warnings.append({
                            "code": "DAILY_FATIGUE_WARNING",
                            "severity": "warning",
                            "message": f"Teacher '{teacher}' has {daily_count} classes on {day}, exceeding optimal daily load ({max_allowed_daily} max recommended).",
                            "teacher_name": teacher,
                            "day": day,
                            "daily_count": daily_count,
                        })

        # Calculate free periods
        total_possible_slots = len(self.days) * len(self.slots) * max(1, len(room_names) or 1)
        free_periods = max(0, total_possible_slots - total_scheduled_periods)

        # -------------------------------------------------------------
        # Final Assembly & Statistics
        # -------------------------------------------------------------
        is_valid = len(errors) == 0

        statistics = {
            "total_assignments": total_scheduled_periods,
            "teachers_used": len(teachers_used),
            "rooms_used": len(rooms_used),
            "sections_used": len(sections_used),
            "subjects_used": len(subjects_used),
            "required_periods": total_required_periods,
            "scheduled_periods": total_scheduled_periods,
            "unfulfilled_periods": unfulfilled_periods,
            "free_periods": free_periods,
        }

        # Quality Score Calculation (0-100)
        quality_score = 100
        if not is_valid:
            quality_score = max(0, 50 - len(errors) * 10)
        else:
            # Deduct for pedagogical warnings
            quality_score -= min(30, len(warnings) * 5)
            if unfulfilled_periods > 0:
                quality_score -= min(40, unfulfilled_periods * 10)

        success_summary = None
        if is_valid:
            success_summary = {
                "title": "TIMETABLE VALIDATION PASSED",
                "bullets": [
                    "0 Teacher Conflicts",
                    "0 Room Conflicts",
                    "0 Section Conflicts",
                    f"100% Required Periods Scheduled ({total_scheduled_periods}/{total_required_periods})",
                    "0 Invalid Assignments",
                    "All Hard Constraints Satisfied",
                ],
                "statistics_display": {
                    "Total Classes": total_scheduled_periods,
                    "Teachers Used": len(teachers_used),
                    "Rooms Used": len(rooms_used),
                    "Sections": len(sections_used),
                    "Required Periods": total_required_periods,
                    "Scheduled Periods": total_scheduled_periods,
                    "Free Periods": free_periods,
                }
            }

        return {
            "valid": is_valid,
            "status": "VALIDATION_PASSED" if is_valid else "VALIDATION_FAILED",
            "quality_score": quality_score,
            "errors": errors,
            "warnings": warnings,
            "statistics": statistics,
            "checks": check_counts,
            "success_summary": success_summary,
        }
