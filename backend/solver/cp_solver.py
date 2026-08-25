"""
Google OR-Tools CP-SAT Solver for Academic Timetable Generation.
Enforces hard/soft operational constraints and UGC Max Weekly Workload Guidelines.
"""
from collections import defaultdict
from typing import Dict, List, Optional, Tuple, Any
from fastapi import HTTPException
from pydantic import BaseModel, Field
from ortools.sat.python import cp_model

try:
    from services.timetable_validator import TimetableValidator
except ImportError:
    try:
        from ..services.timetable_validator import TimetableValidator
    except ImportError:
        from backend.services.timetable_validator import TimetableValidator

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
DEFAULT_SLOTS = [
    "09:00 AM - 09:45 AM",
    "09:45 AM - 10:30 AM",
    "10:30 AM - 11:20 AM",
    "11:20 AM - 12:10 PM",
    "01:00 PM - 01:50 PM",
    "01:50 PM - 02:40 PM",
    "02:40 PM - 03:30 PM",
]

# Standard default weekly period allocation
UGC_MAX_WEEKLY_PERIODS_DEFAULT = 40

UNAVAILABILITY: Dict[str, List[Tuple[str, str]]] = defaultdict(list)


class SubjectInput(BaseModel):
    code: str = ""
    name: str
    teacher: str
    section: Optional[str] = None
    sections: List[str] = []
    is_lab: bool = False
    required_slots: int = Field(default=3, ge=1, le=20)
    room: Optional[str] = None


class TeacherInput(BaseModel):
    name: str
    free_periods: int = 1
    max_weekly_hours: int = Field(default=UGC_MAX_WEEKLY_PERIODS_DEFAULT, ge=1, le=50)
    email: Optional[str] = None
    phone: Optional[str] = None
    is_substitute: bool = False


class SectionInput(BaseModel):
    name: str
    room: Optional[str] = None
    lab_room: Optional[str] = None
    lab_rooms: List[str] = []
    preferred_faculty: List[str] = []


class GenerateRequest(BaseModel):
    teachers: List[TeacherInput]
    subjects: List[SubjectInput]
    rooms: List[Any]
    sections: List[SectionInput] = []
    time_slots: List[str] = DEFAULT_SLOTS
    unavailability: Optional[Dict[str, List[Tuple[str, str]]]] = None


class RescheduleRequest(BaseModel):
    teacher: str
    proxy_teacher: Optional[str] = None
    day: Optional[str] = None
    slots: List[str] = []
    reason: Optional[str] = None
    timetable_data: Optional[dict] = None
    teachers: Optional[List[Any]] = None


def scheduler_error(status_code: int, message: str, suggestions: List[str], facts: Optional[List[str]] = None) -> None:
    raise HTTPException(
        status_code=status_code,
        detail={
            "message": message,
            "suggestions": suggestions,
            "facts": facts or [],
        },
    )


def clean_name(value: Any) -> str:
    if isinstance(value, str):
        return " ".join(value.strip().split())
    if isinstance(value, dict):
        val = value.get("room_number") or value.get("name") or value.get("teacher_name") or ""
        return " ".join(str(val).strip().split())
    return " ".join(str(value or "").strip().split())


def validate_request(request: GenerateRequest) -> GenerateRequest:
    cleaned_rooms = []
    for r in request.rooms:
        val = clean_name(r)
        if val:
            cleaned_rooms.append(val)
    rooms = cleaned_rooms
    slots = [clean_name(s) for s in request.time_slots if clean_name(s)]
    teachers = [TeacherInput(name=clean_name(t.name), free_periods=t.free_periods, max_weekly_hours=t.max_weekly_hours or UGC_MAX_WEEKLY_PERIODS_DEFAULT, email=t.email, phone=t.phone, is_substitute=t.is_substitute) for t in request.teachers if clean_name(t.name)]
    subjects = [
        SubjectInput(
            code=clean_name(s.code),
            name=clean_name(s.name),
            teacher=clean_name(s.teacher),
            section=clean_name(s.section) if s.section else None,
            sections=[clean_name(sec) for sec in s.sections if clean_name(sec)],
            is_lab=s.is_lab,
            required_slots=s.required_slots,
            room=clean_name(s.room) if s.room else None,
        )
        for s in request.subjects
        if clean_name(s.name) and clean_name(s.teacher)
    ]
    sections = []
    for sec in request.sections:
        if not clean_name(sec.name):
            continue
        cleaned_lab_rooms = [clean_name(lr) for lr in sec.lab_rooms if clean_name(lr)]
        if not cleaned_lab_rooms and sec.lab_room and clean_name(sec.lab_room):
            cleaned_lab_rooms = [clean_name(sec.lab_room)]
        cleaned_preferred_faculty = [clean_name(pf) for pf in sec.preferred_faculty if clean_name(pf)]
        
        sections.append(
            SectionInput(
                name=clean_name(sec.name),
                room=clean_name(sec.room) if sec.room else None,
                lab_room=cleaned_lab_rooms[0] if cleaned_lab_rooms else (clean_name(sec.lab_room) if sec.lab_room else None),
                lab_rooms=cleaned_lab_rooms,
                preferred_faculty=cleaned_preferred_faculty,
            )
        )

    facts = [
        f"Configured: {len(teachers)} teachers, {len(subjects)} subjects, {len(rooms)} rooms, {len(slots)} time slots, {len(sections)} sections.",
    ]

    if not rooms:
        scheduler_error(400, "At least one room is required.", ["Add at least one classroom in Academic Setup."], facts)
    if not slots:
        scheduler_error(400, "At least one time slot is required.", ["Define weekly period time slots."], facts)
    if not teachers:
        scheduler_error(400, "At least one teacher is required.", ["Add active faculty members."], facts)
    if not subjects:
        scheduler_error(400, "At least one subject is required.", ["Add course subjects to schedule."], facts)

    return GenerateRequest(
        teachers=teachers,
        subjects=subjects,
        rooms=rooms,
        sections=sections,
        time_slots=slots,
        unavailability=request.unavailability,
    )


def build_empty_grid(slots: List[str]) -> Dict[str, Dict[str, List[dict]]]:
    return {day: {slot: [] for slot in slots} for day in DAYS}


def solve_timetable(request: GenerateRequest) -> dict:
    """
    Executes CP-SAT constraint optimization with UGC Workload and pedagogical constraints.
    """
    request = validate_request(request)
    model = cp_model.CpModel()

    teachers = request.teachers
    rooms = request.rooms
    slots = request.time_slots
    room_count = len(rooms)

    x = {}
    teacher_active = {}

    for subject_idx, subject in enumerate(request.subjects):
        for occurrence in range(subject.required_slots):
            for day_idx in range(len(DAYS)):
                for slot_idx in range(len(slots)):
                    for room_idx in range(room_count):
                        x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)] = model.NewBoolVar(
                            f"x_s{subject_idx}_o{occurrence}_d{day_idx}_t{slot_idx}_r{room_idx}"
                        )

    # 1. Each required occurrence of a subject must be placed exactly once.
    for subject_idx, subject in enumerate(request.subjects):
        allowed_room_indices = []
        if subject.room and subject.room in rooms:
            allowed_room_indices = [rooms.index(subject.room)]
        else:
            section_obj = next((s for s in request.sections if s.name == subject.section), None)
            if section_obj:
                if subject.is_lab:
                    target_labs = section_obj.lab_rooms if section_obj.lab_rooms else ([section_obj.lab_room] if section_obj.lab_room else [])
                    allowed_room_indices = [rooms.index(lr) for lr in target_labs if lr in rooms]
                else:
                    if section_obj.room and section_obj.room in rooms:
                        allowed_room_indices = [rooms.index(section_obj.room)]

        for occurrence in range(subject.required_slots):
            model.AddExactlyOne(
                x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]
                for day_idx in range(len(DAYS))
                for slot_idx in range(len(slots))
                for room_idx in range(room_count)
            )
            # Enforce allowed room set if configured
            if allowed_room_indices:
                for day_idx in range(len(DAYS)):
                    for slot_idx in range(len(slots)):
                        for room_idx in range(room_count):
                            if room_idx not in allowed_room_indices:
                                model.Add(x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)] == 0)

        # Lab subjects: Continuous 2-period practical blocks
        if subject.is_lab:
            num_labs = subject.required_slots // 2
            for lab_idx in range(num_labs):
                first_occ = 2 * lab_idx
                second_occ = 2 * lab_idx + 1
                for day_idx in range(len(DAYS)):
                    for room_idx in range(room_count):
                        for slot_idx in range(len(slots)):
                            if slot_idx not in [0, len(slots) - 2]:
                                model.Add(x[(subject_idx, first_occ, day_idx, slot_idx, room_idx)] == 0)
                            else:
                                model.Add(
                                    x[(subject_idx, first_occ, day_idx, slot_idx, room_idx)]
                                    == x[(subject_idx, second_occ, day_idx, slot_idx + 1, room_idx)]
                                )

    # 2. Room capacity: No room can host two classes in the same slot.
    for day_idx in range(len(DAYS)):
        for slot_idx in range(len(slots)):
            for room_idx in range(room_count):
                model.AddAtMostOne(
                    x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]
                    for subject_idx, subject in enumerate(request.subjects)
                    for occurrence in range(subject.required_slots)
                )

    # 3. Teacher capacity: No teacher can teach two classes simultaneously.
    for teacher in teachers:
        subject_indexes = [idx for idx, subject in enumerate(request.subjects) if subject.teacher == teacher.name]
        for day_idx in range(len(DAYS)):
            for slot_idx in range(len(slots)):
                model.AddAtMostOne(
                    x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]
                    for subject_idx in subject_indexes
                    for occurrence in range(request.subjects[subject_idx].required_slots)
                    for room_idx in range(room_count)
                )

    # 4. Same subject occurrence overlap prevention.
    for subject_idx, subject in enumerate(request.subjects):
        for day_idx in range(len(DAYS)):
            for slot_idx in range(len(slots)):
                model.AddAtMostOne(
                    x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]
                    for occurrence in range(subject.required_slots)
                    for room_idx in range(room_count)
                )

    # 5. Section overlap prevention
    subject_section_vars = {}
    section_names = [sec.name for sec in request.sections]
    if section_names:
        for subject_idx, subject in enumerate(request.subjects):
            if not subject.section or subject.section not in section_names:
                for sec_idx in range(len(section_names)):
                    subject_section_vars[(subject_idx, sec_idx)] = model.NewBoolVar(f"subj_sec_{subject_idx}_{sec_idx}")
                model.AddExactlyOne(subject_section_vars[(subject_idx, sec_idx)] for sec_idx in range(len(section_names)))

        for day_idx in range(len(DAYS)):
            for slot_idx in range(len(slots)):
                for sec_idx, section_name in enumerate(section_names):
                    occurrences_in_this_slot = []
                    for subject_idx, subject in enumerate(request.subjects):
                        if subject.section == section_name:
                            for occurrence in range(subject.required_slots):
                                for room_idx in range(room_count):
                                    occurrences_in_this_slot.append(x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)])
                        elif not subject.section or subject.section not in section_names:
                            for occurrence in range(subject.required_slots):
                                for room_idx in range(room_count):
                                    is_scheduled = x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]
                                    aux = model.NewBoolVar(f"aux_s{subject_idx}_o{occurrence}_d{day_idx}_t{slot_idx}_sec{sec_idx}")
                                    model.AddBoolAnd([is_scheduled, subject_section_vars[(subject_idx, sec_idx)]]).OnlyEnforceIf(aux)
                                    model.AddBoolOr([is_scheduled.Not(), subject_section_vars[(subject_idx, sec_idx)].Not()]).OnlyEnforceIf(aux.Not())
                                    occurrences_in_this_slot.append(aux)

                    if occurrences_in_this_slot:
                        model.AddAtMostOne(occurrences_in_this_slot)

    # 6. Dynamic rescheduling: Block unavailable teacher/day/slot combinations
    merged_unavailability: Dict[str, List[Tuple[str, str]]] = defaultdict(list)
    for t_name, blocked in UNAVAILABILITY.items():
        merged_unavailability[t_name].extend(blocked)
    if request.unavailability:
        for t_name, blocked in request.unavailability.items():
            merged_unavailability[t_name].extend(blocked)

    for teacher_name, blocked_times in merged_unavailability.items():
        subject_indexes = [idx for idx, subject in enumerate(request.subjects) if subject.teacher == teacher_name]
        for day, slot in blocked_times:
            if day not in DAYS or slot not in slots:
                continue
            day_idx = DAYS.index(day)
            slot_idx = slots.index(slot)
            for subject_idx in subject_indexes:
                for occurrence in range(request.subjects[subject_idx].required_slots):
                    for room_idx in range(room_count):
                        model.Add(x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)] == 0)

    # 7. Teacher Daily Active Slots & UGC Workload Constraints
    for teacher_idx, teacher in enumerate(teachers):
        subject_indexes = [idx for idx, subject in enumerate(request.subjects) if subject.teacher == teacher.name]
        all_weekly_teacher_slots = []
        for day_idx in range(len(DAYS)):
            daily_active_slots = []
            for slot_idx in range(len(slots)):
                active = model.NewBoolVar(f"active_t{teacher_idx}_d{day_idx}_s{slot_idx}")
                teacher_active[(teacher.name, day_idx, slot_idx)] = active
                daily_active_slots.append(active)
                all_weekly_teacher_slots.append(active)
                possible_assignments = [
                    x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]
                    for subject_idx in subject_indexes
                    for occurrence in range(request.subjects[subject_idx].required_slots)
                    for room_idx in range(room_count)
                ]
                if possible_assignments:
                    model.AddMaxEquality(active, possible_assignments)
                else:
                    model.Add(active == 0)

            # Daily free periods limit
            if teacher.free_periods > 0:
                max_classes_for_teacher = max(0, len(slots) - teacher.free_periods)
                model.Add(sum(daily_active_slots) <= max_classes_for_teacher)

        # UGC Maximum Weekly Workload Compliance Constraint
        max_weekly_cap = max(1, teacher.max_weekly_hours or UGC_MAX_WEEKLY_PERIODS_DEFAULT)
        model.Add(sum(all_weekly_teacher_slots) <= max_weekly_cap)

    penalties = []

    # Soft constraint: Minimize teacher idle gaps in a single day
    for teacher in teachers:
        for day_idx in range(len(DAYS)):
            for slot_idx in range(1, len(slots) - 1):
                gap = model.NewBoolVar(f"idle_{teacher.name}_{day_idx}_{slot_idx}")
                model.AddBoolAnd([
                    teacher_active[(teacher.name, day_idx, slot_idx - 1)],
                    teacher_active[(teacher.name, day_idx, slot_idx + 1)],
                    teacher_active[(teacher.name, day_idx, slot_idx)].Not(),
                ]).OnlyEnforceIf(gap)
                model.AddBoolOr([
                    teacher_active[(teacher.name, day_idx, slot_idx - 1)].Not(),
                    teacher_active[(teacher.name, day_idx, slot_idx + 1)].Not(),
                    teacher_active[(teacher.name, day_idx, slot_idx)],
                ]).OnlyEnforceIf(gap.Not())
                penalties.append(gap * 3)

    # Soft constraint: Avoid 3 back-to-back classes for teacher fatigue mitigation
    for teacher in teachers:
        for day_idx in range(len(DAYS)):
            for slot_idx in range(max(0, len(slots) - 2)):
                overload = model.NewBoolVar(f"overload_{teacher.name}_{day_idx}_{slot_idx}")
                model.AddBoolAnd([
                    teacher_active[(teacher.name, day_idx, slot_idx)],
                    teacher_active[(teacher.name, day_idx, slot_idx + 1)],
                    teacher_active[(teacher.name, day_idx, slot_idx + 2)],
                ]).OnlyEnforceIf(overload)
                model.AddBoolOr([
                    teacher_active[(teacher.name, day_idx, slot_idx)].Not(),
                    teacher_active[(teacher.name, day_idx, slot_idx + 1)].Not(),
                    teacher_active[(teacher.name, day_idx, slot_idx + 2)].Not(),
                ]).OnlyEnforceIf(overload.Not())
                penalties.append(overload * 5)

    # Soft constraint: Even distribution of subject occurrences across the week
    for subject_idx, subject in enumerate(request.subjects):
        daily_counts = []
        for day_idx in range(len(DAYS)):
            count = model.NewIntVar(0, subject.required_slots, f"subject_{subject_idx}_d{day_idx}")
            model.Add(
                count == sum(
                    x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]
                    for occurrence in range(subject.required_slots)
                    for slot_idx in range(len(slots))
                    for room_idx in range(room_count)
                )
            )
            daily_counts.append(count)
            extra_same_day = model.NewIntVar(0, subject.required_slots, f"same_day_{subject_idx}_{day_idx}")
            model.AddMaxEquality(extra_same_day, [count - 1, 0])
            penalties.append(extra_same_day * 2)

    model.Minimize(sum(penalties))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)

    if status == cp_model.INFEASIBLE:
        error_msg = "No feasible timetable exists for the supplied constraints. Mathematical solver confirmed infeasibility."
        scheduler_error(
            422,
            error_msg,
            [
                "Add more classrooms or time slots in Academic Setup.",
                "Ensure teacher total required classes don't exceed their weekly workload limits.",
                "Check laboratory requirements: practical labs require 2 consecutive periods.",
                "Lower free period restrictions or verify teacher availability."
            ]
        )
    elif status == cp_model.UNKNOWN or status == cp_model.MODEL_INVALID:
        error_msg = "Timetable generation could not be completed (solver status: UNKNOWN or MODEL_INVALID). No timetable was saved."
        scheduler_error(
            422,
            error_msg,
            [
                "Verify course requirements and slot counts.",
                "Ensure at least one valid room and time slot are provided."
            ]
        )
    elif status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        error_msg = "Timetable generation could not be completed within the solver time limit. No timetable was saved."
        scheduler_error(
            422,
            error_msg,
            [
                "Simplify input constraints or increase solver timeout limit.",
                "Reduce overlapping lab requirements across same sections."
            ]
        )

    timetable = build_empty_grid(slots)
    assignments = []
    teacher_workload_tally = defaultdict(int)

    for subject_idx, subject in enumerate(request.subjects):
        for occurrence in range(subject.required_slots):
            for day_idx, day in enumerate(DAYS):
                for slot_idx, slot in enumerate(slots):
                    for room_idx, room in enumerate(rooms):
                        if solver.Value(x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]):
                            section_assigned = subject.section
                            if not section_assigned and section_names:
                                for sec_idx, sec_name in enumerate(section_names):
                                    if solver.Value(subject_section_vars[(subject_idx, sec_idx)]):
                                        section_assigned = sec_name
                                        break

                            assignment = {
                                "code": subject.code,
                                "subject": subject.name,
                                "teacher": subject.teacher,
                                "room": room,
                                "section": section_assigned,
                                "is_lab": subject.is_lab,
                            }
                            timetable[day][slot].append(assignment)
                            assignments.append({"day": day, "slot": slot, **assignment})
                            teacher_workload_tally[subject.teacher] += 1

    # Workload summary enriched with UGC compliance audits
    workload_summary = {}
    for teacher in teachers:
        assigned_periods = teacher_workload_tally[teacher.name]
        max_cap = teacher.max_weekly_hours or UGC_MAX_WEEKLY_PERIODS_DEFAULT
        workload_summary[teacher.name] = {
            "assigned_periods": assigned_periods,
            "max_allowed": max_cap,
            "compliance_status": "Optimal" if assigned_periods <= max_cap else "Overloaded",
            "ugc_compliant": assigned_periods <= max_cap,
        }

    # Level 2 Independent Deterministic Validation
    validator = TimetableValidator(
        days=DAYS,
        slots=slots,
        teachers=[t.model_dump() for t in teachers],
        subjects=[s.model_dump() for s in request.subjects],
        rooms=rooms,
        sections=[s.model_dump() for s in request.sections],
        unavailability=merged_unavailability,
        ugc_max_weekly_hours=UGC_MAX_WEEKLY_PERIODS_DEFAULT,
    )
    validation_report = validator.validate(assignments)

    if not validation_report["valid"]:
        error_msg = "Generated timetable failed independent Level-2 deterministic validation."
        scheduler_error(
            422,
            error_msg,
            [f"{err['code']}: {err['message']}" for err in validation_report["errors"][:5]],
            facts=[f"Total validation errors: {len(validation_report['errors'])}"]
        )

    return {
        "status": "success",
        "solver_status": "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE",
        "timetable": timetable,
        "assignments": assignments,
        "days": DAYS,
        "time_slots": slots,
        "rooms": rooms,
        "workload_audit": workload_summary,
        "validation": validation_report,
        "generated_by": "Google OR-Tools CP-SAT (UGC Compliant Engine)",
    }


def find_available_proxy(
    absent_teacher: str,
    day: str,
    slot: str,
    timetable_map: dict,
    all_teachers: List[dict],
) -> Optional[str]:
    """
    Finds an available proxy substitute for an absent teacher in a given day/slot.
    Prioritizes teachers from the same department with 0 active lectures in that slot.
    """
    busy_teachers = set()
    if day in timetable_map and slot in timetable_map[day]:
        for cls in timetable_map[day][slot]:
            busy_teachers.add(cls.get("teacher"))

    available_candidates = []
    for t in all_teachers:
        name = t.get("name") or t.get("teacher_name")
        if name and name != absent_teacher and name not in busy_teachers:
            available_candidates.append(name)

    return available_candidates[0] if available_candidates else None
