from collections import defaultdict #Provides a dictionary-like object that allows us to specify a default value type for keys that haven't been set yet. In this code, it's used to track teacher unavailability without having to check if the key exists first.
from typing import Dict, List, Optional, Tuple #Used for type annotations to improve code readability and help with static analysis. Dict is a generic type for dictionaries, List for lists, Optional indicates that a value can be of a specified type or None, and Tuple is used for fixed-length tuples of specified types.

from fastapi import FastAPI, HTTPException #Backend framework for building APIs
from fastapi.middleware.cors import CORSMiddleware #Middleware to handle Cross-Origin Resource Sharing (CORS) which allows the frontend (running on a different origin) to communicate with this backend API.
from ortools.sat.python import cp_model    #Main Ai tool by google (OR-CP-SAT Solver or Satisfier )
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
from pydantic import BaseModel, Field #Data validation and settings management using Python type annotations. It allows us to define data models with type hints and automatically validates incoming data against those models.
try:#Relative import for database functions, used when this file is imported as a module. This allows the code to work in both contexts (as a module or as a standalone script) without modification. If this file is run as a script, the relative import will fail, so we catch the ImportError and do an absolute import instead.
    from .db import (
        delete_timetable_from_db,
        get_timetable_by_id,
        get_timetables_from_db,
        save_timetable_to_db,
    ) #Relative import for database functions. If this file is run as a script, the relative import will fail, so we catch the ImportError and do an absolute import instead.
except ImportError:
    from db import (
        delete_timetable_from_db,
        get_timetable_by_id,
        get_timetables_from_db,
        save_timetable_to_db,
    )#Absolute import for database functions, used when the file is run as a script. This allows the code to work in both contexts (as a module or as a standalone script) without modification.


DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
DEFAULT_SLOTS = ["9-10", "10-11", "11-12", "12-1", "2-3"]

app = FastAPI(title="AI-Powered Timetable Scheduler")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


class SectionInput(BaseModel):
    name: str
    room: Optional[str] = None
    lab_room: Optional[str] = None

class GenerateRequest(BaseModel):
    teachers: List[TeacherInput]
    subjects: List[SubjectInput]
    rooms: List[str]
    sections: List[SectionInput] = []
    time_slots: List[str] = DEFAULT_SLOTS


class RescheduleRequest(BaseModel):
    teacher: str
    day: Optional[str] = None
    slots: List[str] = []


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None
    history: List[dict] = []


LAST_REQUEST: Optional[GenerateRequest] = None
UNAVAILABILITY: Dict[str, List[Tuple[str, str]]] = defaultdict(list)
LAST_TIMETABLE: Optional[dict] = None


def clean_name(value: str) -> str:
    return value.strip()


def validate_request(request: GenerateRequest) -> GenerateRequest:
    teachers = [
        TeacherInput(name=clean_name(t.name), free_periods=t.free_periods)
        for t in request.teachers if clean_name(t.name)
    ]
    rooms = [clean_name(room) for room in request.rooms if clean_name(room)]
    slots = [clean_name(slot)
             for slot in request.time_slots if clean_name(slot)]
    subjects = []
    for subject in request.subjects:
        if clean_name(subject.name) and clean_name(subject.teacher):
            if getattr(subject, 'sections', None) and len(subject.sections) > 0:
                for sec in subject.sections:
                    subjects.append(
                        SubjectInput(
                            code=clean_name(subject.code),
                            name=clean_name(subject.name),
                            teacher=clean_name(subject.teacher),
                            section=clean_name(sec),
                            room=clean_name(subject.room) if subject.room else None,
                            is_lab=subject.is_lab,
                            required_slots=subject.required_slots,
                        )
                    )
            else:
                subjects.append(
                    SubjectInput(
                        code=clean_name(subject.code),
                        name=clean_name(subject.name),
                        teacher=clean_name(subject.teacher),
                        section=clean_name(subject.section) if subject.section else None,
                        room=clean_name(subject.room) if subject.room else None,
                        is_lab=subject.is_lab,
                        required_slots=subject.required_slots,
                    )
                )
    sections = [
        SectionInput(
            name=clean_name(sec.name),
            room=clean_name(sec.room) if sec.room else None,
            lab_room=clean_name(sec.lab_room) if sec.lab_room else None
        )
        for sec in request.sections if clean_name(sec.name)
    ]

    if not teachers:
        raise HTTPException(
            status_code=400,
            detail="Add at least one teacher.")
    if not rooms:
        raise HTTPException(
            status_code=400,
            detail="Add at least one classroom.")
    if not slots:
        raise HTTPException(
            status_code=400,
            detail="Add at least one time slot.")
    if not subjects:
        raise HTTPException(
            status_code=400,
            detail="Add at least one subject.")

    teacher_names = {t.name for t in teachers}
    unknown_teachers = sorted(
        {subject.teacher for subject in subjects} - teacher_names)
    if unknown_teachers:
        raise HTTPException(
            status_code=400, detail=f"Subject teacher not found: {
                ', '.join(unknown_teachers)}.", )

    total_required = sum(subject.required_slots for subject in subjects)
    total_capacity = len(DAYS) * len(slots) * len(rooms)
    if total_required > total_capacity:
        raise HTTPException(
            status_code=400,
            detail="Required subject slots exceed total room capacity.",
        )

    return GenerateRequest(
        teachers=teachers,
        subjects=subjects,
        rooms=rooms,
        sections=sections,
        time_slots=slots,
    )


def build_empty_grid(slots: List[str]):
    return {day: {slot: [] for slot in slots} for day in DAYS}


def solve_timetable(request: GenerateRequest):
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
            for day_idx, day in enumerate(DAYS):
                for slot_idx, slot in enumerate(slots):
                    for room_idx in range(room_count):
                        x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)] = (
                            model.NewBoolVar(
                                f"x_s{subject_idx}_o{occurrence}_d{day_idx}_t{slot_idx}_r{room_idx}"
                            )
                        )

    # Each required occurrence of a subject must be placed exactly once.
    for subject_idx, subject in enumerate(request.subjects):
        target_room_idx = -1
        if subject.room and subject.room in rooms:
            target_room_idx = rooms.index(subject.room)
        else:
            section_obj = next((s for s in request.sections if s.name == subject.section), None)
            if section_obj:
                target_room = section_obj.lab_room if subject.is_lab else section_obj.room
                if target_room and target_room in rooms:
                    target_room_idx = rooms.index(target_room)

        for occurrence in range(subject.required_slots):
            model.AddExactlyOne(
                x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]
                for day_idx in range(len(DAYS))
                for slot_idx in range(len(slots))
                for room_idx in range(room_count)
            )
            # Enforce fixed room if configured for the section
            if target_room_idx != -1:
                for day_idx in range(len(DAYS)):
                    for slot_idx in range(len(slots)):
                        for room_idx in range(room_count):
                            if room_idx != target_room_idx:
                                model.Add(x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)] == 0)

        # If it's a lab, enforce continuous 2-period blocks
        if subject.is_lab:
            num_labs = subject.required_slots // 2
            for lab_idx in range(num_labs):
                first_occ = 2 * lab_idx
                second_occ = 2 * lab_idx + 1
                for day_idx in range(len(DAYS)):
                    for room_idx in range(room_count):
                        for slot_idx in range(len(slots)):
                            if slot_idx == len(slots) - 1:
                                # Cannot start a 2-period lab in the very last
                                # slot of the day
                                model.Add(
                                    x[(subject_idx, first_occ, day_idx, slot_idx, room_idx)] == 0)
                            else:
                                # The second occurrence must immediately follow
                                # the first in the same room
                                model.Add(
                                    x[(subject_idx, first_occ, day_idx, slot_idx, room_idx)] ==
                                    x[(subject_idx, second_occ, day_idx, slot_idx + 1, room_idx)]
                                )

    # No room can host two classes at the same day and time.
    for day_idx in range(len(DAYS)):
        for slot_idx in range(len(slots)):
            for room_idx in range(room_count):
                model.AddAtMostOne(
                    x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]
                    for subject_idx, subject in enumerate(request.subjects)
                    for occurrence in range(subject.required_slots)
                )

    # The same teacher cannot teach overlapping classes.
    for teacher in teachers:
        subject_indexes = [idx for idx, subject in enumerate(
            request.subjects) if subject.teacher == teacher.name]
        for day_idx in range(len(DAYS)):
            for slot_idx in range(len(slots)):
                model.AddAtMostOne(
                    x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]
                    for subject_idx in subject_indexes
                    for occurrence in range(request.subjects[subject_idx].required_slots)
                    for room_idx in range(room_count)
                )

    # Avoid assigning two occurrences of the same subject at the same time.
    for subject_idx, subject in enumerate(request.subjects):
        for day_idx in range(len(DAYS)):
            for slot_idx in range(len(slots)):
                model.AddAtMostOne(
                    x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]
                    for occurrence in range(subject.required_slots)
                    for room_idx in range(room_count)
                )

    # Dynamic section assignment and overlap constraint
    subject_section_vars = {}
    section_names = [sec.name for sec in request.sections]
    if section_names:
        for subject_idx, subject in enumerate(request.subjects):
            if not subject.section or subject.section not in section_names:
                for sec_idx in range(len(section_names)):
                    subject_section_vars[(subject_idx, sec_idx)] = model.NewBoolVar(
                        f"subj_sec_{subject_idx}_{sec_idx}")
                model.AddExactlyOne(subject_section_vars[(
                    subject_idx, sec_idx)] for sec_idx in range(len(section_names)))

        for day_idx in range(len(DAYS)):
            for slot_idx in range(len(slots)):
                for sec_idx, section_name in enumerate(section_names):
                    occurrences_in_this_slot_for_sec = []
                    for subject_idx, subject in enumerate(request.subjects):
                        if subject.section == section_name:
                            for occurrence in range(subject.required_slots):
                                for room_idx in range(room_count):
                                    occurrences_in_this_slot_for_sec.append(
                                        x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)])
                        elif not subject.section or subject.section not in section_names:
                            for occurrence in range(subject.required_slots):
                                for room_idx in range(room_count):
                                    is_scheduled = x[(
                                        subject_idx, occurrence, day_idx, slot_idx, room_idx)]
                                    aux = model.NewBoolVar(
                                        f"aux_s{subject_idx}_o{occurrence}_d{day_idx}_t{slot_idx}_sec{sec_idx}")
                                    model.AddBoolAnd([is_scheduled, subject_section_vars[(
                                        subject_idx, sec_idx)]]).OnlyEnforceIf(aux)
                                    model.AddBoolOr([is_scheduled.Not(), subject_section_vars[(
                                        subject_idx, sec_idx)].Not()]).OnlyEnforceIf(aux.Not())
                                    occurrences_in_this_slot_for_sec.append(
                                        aux)

                    if occurrences_in_this_slot_for_sec:
                        model.AddAtMostOne(occurrences_in_this_slot_for_sec)

    # Dynamic rescheduling: block unavailable teacher/day/slot combinations.
    for teacher, blocked_times in UNAVAILABILITY.items():
        subject_indexes = [idx for idx, subject in enumerate(
            request.subjects) if subject.teacher == teacher]
        for day, slot in blocked_times:
            if day not in DAYS or slot not in slots:
                continue
            day_idx = DAYS.index(day)
            slot_idx = slots.index(slot)
            for subject_idx in subject_indexes:
                for occurrence in range(
                        request.subjects[subject_idx].required_slots):
                    for room_idx in range(room_count):
                        model.Add(
                            x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)] == 0
                        )

    for teacher_idx, teacher in enumerate(teachers):
        subject_indexes = [idx for idx, subject in enumerate(
            request.subjects) if subject.teacher == teacher.name]
        for day_idx in range(len(DAYS)):
            daily_active_slots = []
            for slot_idx in range(len(slots)):
                active = model.NewBoolVar(
                    f"active_t{teacher_idx}_d{day_idx}_s{slot_idx}")
                teacher_active[(teacher.name, day_idx, slot_idx)] = active
                daily_active_slots.append(active)
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

            # Enforce free periods constraint for each teacher on each day
            if teacher.free_periods > 0:
                max_classes_for_teacher = max(
                    0, len(slots) - teacher.free_periods)
                model.Add(sum(daily_active_slots) <= max_classes_for_teacher)

    penalties = []

    # Soft constraint: minimize teacher idle gaps between two classes in a day.
    for teacher in teachers:
        for day_idx in range(len(DAYS)):
            for slot_idx in range(1, len(slots) - 1):
                gap = model.NewBoolVar(
                    f"idle_{teacher.name}_{day_idx}_{slot_idx}")
                model.AddBoolAnd(
                    [
                        teacher_active[(teacher.name, day_idx, slot_idx - 1)],
                        teacher_active[(teacher.name, day_idx, slot_idx + 1)],
                        teacher_active[(teacher.name, day_idx, slot_idx)].Not(),
                    ]
                ).OnlyEnforceIf(gap)
                model.AddBoolOr(
                    [
                        teacher_active[(teacher.name, day_idx, slot_idx - 1)].Not(),
                        teacher_active[(teacher.name, day_idx, slot_idx + 1)].Not(),
                        teacher_active[(teacher.name, day_idx, slot_idx)],
                    ]
                ).OnlyEnforceIf(gap.Not())
                penalties.append(gap * 3)

    # Soft constraint: avoid three back-to-back classes for the same teacher.
    for teacher in teachers:
        for day_idx in range(len(DAYS)):
            for slot_idx in range(max(0, len(slots) - 2)):
                overload = model.NewBoolVar(
                    f"overload_{teacher.name}_{day_idx}_{slot_idx}")
                model.AddBoolAnd(
                    [
                        teacher_active[(teacher.name, day_idx, slot_idx)],
                        teacher_active[(teacher.name, day_idx, slot_idx + 1)],
                        teacher_active[(teacher.name, day_idx, slot_idx + 2)],
                    ]
                ).OnlyEnforceIf(overload)
                model.AddBoolOr(
                    [
                        teacher_active[(teacher.name, day_idx, slot_idx)].Not(),
                        teacher_active[(teacher.name, day_idx, slot_idx + 1)].Not(),
                        teacher_active[(teacher.name, day_idx, slot_idx + 2)].Not(),
                    ]
                ).OnlyEnforceIf(overload.Not())
                penalties.append(overload * 5)

    # Soft constraint: distribute each subject across the week where possible.
    for subject_idx, subject in enumerate(request.subjects):
        daily_counts = []
        for day_idx in range(len(DAYS)):
            count = model.NewIntVar(
                0,
                subject.required_slots,
                f"subject_{subject_idx}_d{day_idx}")
            model.Add(
                count
                == sum(
                    x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]
                    for occurrence in range(subject.required_slots)
                    for slot_idx in range(len(slots))
                    for room_idx in range(room_count)
                )
            )
            daily_counts.append(count)

            extra_same_day = model.NewIntVar(
                0, subject.required_slots, f"same_day_penalty_{subject_idx}_{day_idx}")
            model.AddMaxEquality(extra_same_day, [count - 1, 0])
            penalties.append(extra_same_day * 2)

        max_daily = model.NewIntVar(
            0, subject.required_slots, f"max_subject_{subject_idx}")
        min_daily = model.NewIntVar(
            0, subject.required_slots, f"min_subject_{subject_idx}")
        model.AddMaxEquality(max_daily, daily_counts)
        model.AddMinEquality(min_daily, daily_counts)
        spread = model.NewIntVar(
            0,
            subject.required_slots,
            f"spread_subject_{subject_idx}")
        model.Add(spread == max_daily - min_daily)
        penalties.append(spread)

    model.Minimize(sum(penalties))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 8
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise HTTPException(
            status_code=422,
            detail="No feasible timetable found. Try adding more rooms or time slots.",
        )

    timetable = build_empty_grid(slots)
    assignments = []
    for subject_idx, subject in enumerate(request.subjects):
        for occurrence in range(subject.required_slots):
            for day_idx, day in enumerate(DAYS):
                for slot_idx, slot in enumerate(slots):
                    for room_idx, room in enumerate(rooms):
                        if solver.Value(
                                x[(subject_idx, occurrence, day_idx, slot_idx, room_idx)]):
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
                            assignments.append(
                                {
                                    "day": day,
                                    "slot": slot,
                                    **assignment,
                                }
                            )

    score = int(solver.ObjectiveValue())
    
    if score == 0:
        ai_desc = "Perfect! The timetable was generated with an optimal score of 0. All teacher preferences and subject distributions are perfectly balanced with no idle gaps or overloads."
    elif score <= 10:
        ai_desc = f"Great schedule! A low score of {score} means the timetable is highly optimized, with only minor compromises in teacher gaps or subject spread."
    elif score <= 25:
        ai_desc = f"Good schedule. We had to make a few trade-offs, such as some back-to-back classes for teachers or uneven subject distribution across days."
    else:
        ai_desc = f"Feasible but tight schedule. The higher score indicates several teacher overloads or idle gaps were necessary. Consider adding more resources if possible."

    return {
        "days": DAYS,
        "time_slots": slots,
        "timetable": timetable,
        "assignments": assignments,
        "solver_status": solver.StatusName(status),
        "objective_score": score,
        "ai_description": ai_desc,
    }


@app.get("/")
def health_check():
    return {"status": "ok", "service": "AI-Powered Timetable Scheduler"}


@app.post("/generate")
def generate(request: GenerateRequest):
    global LAST_REQUEST, UNAVAILABILITY, LAST_TIMETABLE
    LAST_REQUEST = validate_request(request)
    UNAVAILABILITY = defaultdict(list)
    LAST_TIMETABLE = solve_timetable(LAST_REQUEST)
    return LAST_TIMETABLE


@app.post("/reschedule")
def reschedule(request: RescheduleRequest):
    if LAST_REQUEST is None:
        raise HTTPException(
            status_code=400,
            detail="Generate a timetable before rescheduling.")

    teacher = clean_name(request.teacher)
    teacher_names = [t.name for t in LAST_REQUEST.teachers]
    if teacher not in teacher_names:
        raise HTTPException(
            status_code=400,
            detail="Teacher not found in the current timetable.")

    blocked_days = [request.day] if request.day else DAYS
    blocked_slots = request.slots or LAST_REQUEST.time_slots

    for day in blocked_days:
        if day not in DAYS:
            raise HTTPException(status_code=400, detail=f"Unknown day: {day}.")
        for slot in blocked_slots:
            if slot not in LAST_REQUEST.time_slots:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown slot: {slot}.")
            blocked_time = (day, slot)
            if blocked_time not in UNAVAILABILITY[teacher]:
                UNAVAILABILITY[teacher].append(blocked_time)

    response = solve_timetable(LAST_REQUEST)
    response["reschedule_note"] = {"teacher": teacher, "blocked": [
        {"day": day, "slot": slot} for day, slot in UNAVAILABILITY[teacher]], }
    global LAST_TIMETABLE
    LAST_TIMETABLE = response
    return response


@app.post("/proxy")
def assign_proxy(request: RescheduleRequest):
    if LAST_REQUEST is None or LAST_TIMETABLE is None:
        raise HTTPException(
            status_code=400,
            detail="Generate a timetable before assigning proxies.")

    teacher = clean_name(request.teacher)
    if teacher not in [t.name for t in LAST_REQUEST.teachers]:
        raise HTTPException(status_code=400, detail="Teacher not found.")

    day = request.day
    if not day or day not in DAYS:
        raise HTTPException(
            status_code=400,
            detail="A valid day is required for proxy assignment.")

    blocked_slots = request.slots or LAST_REQUEST.time_slots
    timetable = LAST_TIMETABLE["timetable"]

    proxies_assigned = []

    import copy
    new_timetable = copy.deepcopy(timetable)
    new_assignments = []

    all_teachers = [t.name for t in LAST_REQUEST.teachers]

    for d in DAYS:
        for s in LAST_REQUEST.time_slots:
            if d == day and s in blocked_slots:
                # Need to find proxy for this teacher
                slot_classes = new_timetable[d][s]
                teacher_class_idx = -1
                for idx, cls in enumerate(slot_classes):
                    if cls["teacher"] == teacher:
                        teacher_class_idx = idx
                        break

                if teacher_class_idx != -1:
                    # Find busy teachers in this slot
                    busy_teachers = {cls["teacher"] for cls in slot_classes}
                    free_teachers = [
                        t for t in all_teachers if t not in busy_teachers and t != teacher]

                    if free_teachers:
                        # Pick the first available
                        proxy_teacher = free_teachers[0]
                        slot_classes[teacher_class_idx]["teacher"] = proxy_teacher
                        slot_classes[teacher_class_idx]["is_proxy"] = True
                        slot_classes[teacher_class_idx]["original_teacher"] = teacher
                        proxies_assigned.append(
                            {"day": d, "slot": s, "original": teacher, "proxy": proxy_teacher})

            # Rebuild assignments
            for cls in new_timetable[d][s]:
                new_assignments.append({"day": d, "slot": s, **cls})

    LAST_TIMETABLE["timetable"] = new_timetable
    LAST_TIMETABLE["assignments"] = new_assignments
    LAST_TIMETABLE["reschedule_note"] = {
        "teacher": teacher,
        "proxies_assigned": proxies_assigned,
        "message": f"Assigned {
            len(proxies_assigned)} proxies for {teacher} on {day}."}

    return LAST_TIMETABLE


class SaveTimetableRequest(BaseModel):
    name: str
    timetable_data: dict


@app.post("/save")
def save_timetable(request: SaveTimetableRequest):
    tid = save_timetable_to_db(request.name, request.timetable_data)
    return {"id": tid, "message": "Timetable saved successfully"}


@app.get("/saved")
def get_saved_timetables():
    return get_timetables_from_db()


@app.get("/saved/{tid}")
def get_saved_timetable(tid: int):
    data = get_timetable_by_id(tid)
    if not data:
        raise HTTPException(status_code=404, detail="Timetable not found")
    return data

@app.delete("/saved/{tid}")
def delete_saved_timetable(tid: int):
    data = get_timetable_by_id(tid)
    if not data:
        raise HTTPException(status_code=404, detail="Timetable not found")
    delete_timetable_from_db(tid)
    return {"message": "Timetable deleted successfully"}

@app.post("/chat")
def chat_with_gemini(request: ChatRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        return {"reply": "Please set your GEMINI_API_KEY in the backend/.env file and restart the backend to use the AI chatbot."}
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-pro')
        
        ctx = request.context or {}
        system_instruction = (
            "You are an elite, highly intelligent AI Timetable Scheduling Assistant. "
            "You MUST use Markdown heavily to make your responses beautiful, readable, and structured. "
            "Use tables, bullet points, bold text, and clear headings. "
        )
        if ctx:
            system_instruction += f"\nCurrent Timetable State:\n- Objective Score: {ctx.get('objective_score', 'N/A')}\n- Total Classes: {len(ctx.get('assignments', []))}\n"
        
        # Build conversation history
        formatted_history = []
        for h in request.history:
            role = "model" if h.get("sender") == "bot" else "user"
            # Skip the initial greeting as it might not match Google's format strictness sometimes, but we'll add it anyway
            if h.get("text"):
                formatted_history.append({"role": role, "parts": [h.get("text")]})
                
        # To avoid first message role errors, we ensure history starts properly if we use it
        # Actually, the simplest way to maintain history without start_chat is just appending to the prompt.
        prompt = f"{system_instruction}\n\n"
        if len(request.history) > 0:
            prompt += "--- CONVERSATION HISTORY ---\n"
            for h in request.history:
                sender = "AI Assistant" if h.get("sender") == "bot" else "User"
                prompt += f"**{sender}:** {h.get('text')}\n"
            prompt += "----------------------------\n\n"
            
        prompt += f"**User:** {request.message}\n**AI Assistant:**"
        
        response = model.generate_content(prompt)
        return {"reply": response.text}
    except Exception as e:
        return {"reply": f"Error communicating with Gemini: {str(e)}"}
