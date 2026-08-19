"""
AI Assistant and Conversational Operations API Router.
Powered by Groq LLM with fallback rule-based NLP intent recognition.
"""
import os
import json
import re
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from groq import Groq

router = APIRouter(prefix="", tags=["AI Assistant"])


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None
    history: List[dict] = []
    image: Optional[str] = None


def generate_fallback_nlp_response(user_msg: str, ctx: dict) -> str:
    msg_lower = user_msg.lower().strip()
    assignments = ctx.get("assignments") or []
    score = ctx.get("score") or "100%"
    status = ctx.get("status") or "Optimal"

    # 1. Add Teacher
    if any(k in msg_lower for k in ["add teacher", "add faculty", "create teacher", "new teacher", "add professor", "create faculty"]):
        cleaned = re.sub(r'^(please\s+)?(add|create|new)\s+(teacher|faculty|professor|dr|mr|ms|prof)\s+', '', user_msg, flags=re.IGNORECASE).strip()
        dept_match = re.search(r'\b(?:in|dept|department|for)\s+([A-Za-z\s&]+)', cleaned, re.IGNORECASE)
        dept = dept_match.group(1).strip() if dept_match else "Computer Applications"
        name_only = re.split(r'\b(in|dept|department|for|with|email|phone)\b', cleaned, flags=re.IGNORECASE)[0].strip()
        if len(name_only) < 2:
            name_only = "Dr. Arvind Kumar"

        json_payload = json.dumps({
            "action": "add_data",
            "teachers": [
                {
                    "name": name_only,
                    "department": dept,
                    "designation": "Assistant Professor",
                    "free_periods": 1,
                    "email": f"{name_only.lower().replace(' ', '').replace('.', '')}@lnctu.ac.in",
                    "phone": "+91-9893700000"
                }
            ]
        }, indent=2)

        return (
            f"### 👨‍🏫 Faculty Member Created!\n\n"
            f"I have registered **{name_only}** in the **{dept}** department with standard UGC 14-18 hrs workload settings.\n\n"
            f"```json\n{json_payload}\n```\n\n"
            f"- **Faculty**: `{name_only}`\n"
            f"- **Department**: `{dept}`\n"
            f"- **Free Period Gap**: `1 Period/Day`"
        )

    # 2. Add Subject
    if any(k in msg_lower for k in ["add subject", "add course", "create subject", "new subject"]):
        is_lab = "lab" in msg_lower or "practical" in msg_lower
        cleaned = re.sub(r'^(please\s+)?(add|create|new)\s+(subject|course|lab)\s+', '', user_msg, flags=re.IGNORECASE).strip()
        parts = re.split(r'\b(code|for|taught by|teacher|section|slots|in)\b', cleaned, flags=re.IGNORECASE)
        sub_name = parts[0].strip() if parts else "Advanced Cloud Architecture"
        if len(sub_name) < 2:
            sub_name = "Cloud Computing"

        teacher_match = re.search(r'\b(?:taught by|teacher|prof|dr)\s+([A-Za-z\.\s]+)', user_msg, re.IGNORECASE)
        teacher_name = teacher_match.group(1).strip() if teacher_match else "Prof Ripusoodan Sharma"

        code_match = re.search(r'\b(?:code)\s+([A-Za-z0-9\-]+)', user_msg, re.IGNORECASE)
        sub_code = code_match.group(1).strip() if code_match else f"CS-{abs(hash(sub_name)) % 800 + 100}"

        sec_match = re.search(r'\b(?:section|sec|for)\s+([A-Za-z0-9\-]+)', user_msg, re.IGNORECASE)
        sec_name = sec_match.group(1).strip() if sec_match else "MCA-A"

        json_payload = json.dumps({
            "action": "add_data",
            "subjects": [
                {
                    "code": sub_code,
                    "name": sub_name,
                    "teacher": teacher_name,
                    "section": sec_name,
                    "required_slots": 4,
                    "is_lab": is_lab,
                    "colorIndex": abs(hash(sub_name)) % 8
                }
            ]
        }, indent=2)

        return (
            f"### 📚 Subject Added to Curriculum!\n\n"
            f"I have configured **{sub_name}** (`{sub_code}`) for Section **{sec_name}**, instructed by **{teacher_name}**.\n\n"
            f"```json\n{json_payload}\n```\n\n"
            f"- **Subject**: `{sub_name}` (`{sub_code}`)\n"
            f"- **Instructor**: `{teacher_name}`\n"
            f"- **Weekly Hours**: `4 Slots` {'(Laboratory)' if is_lab else '(Theory)'}"
        )

    # 3. Add Section
    if any(k in msg_lower for k in ["add section", "create section", "new section", "add batch"]):
        cleaned = re.sub(r'^(please\s+)?(add|create|new)\s+(section|batch)\s+', '', user_msg, flags=re.IGNORECASE).strip()
        sec_name = re.split(r'\b(with|room|in|lab)\b', cleaned, flags=re.IGNORECASE)[0].strip()
        if len(sec_name) < 1:
            sec_name = "MCA-C"

        room_match = re.search(r'\b(?:room|classroom)\s+([A-Za-z0-9\/\-\s]+)', user_msg, re.IGNORECASE)
        room_name = room_match.group(1).strip() if room_match else "Room-308"

        json_payload = json.dumps({
            "action": "add_data",
            "sections": [
                {
                    "name": sec_name,
                    "room": room_name,
                    "lab_room": "Lab-006"
                }
            ],
            "rooms": [room_name]
        }, indent=2)

        return (
            f"### 🏛️ Academic Section Registered!\n\n"
            f"I have created Section **{sec_name}** with primary lecture hall **{room_name}** and lab facility **Lab-006**.\n\n"
            f"```json\n{json_payload}\n```"
        )

    # 4. Generate Timetable
    if any(k in msg_lower for k in ["generate timetable", "solve timetable", "generate schedule", "optimize schedule"]):
        json_payload = json.dumps({"action": "generate_timetable"}, indent=2)
        return (
            f"### 🚀 Launching AI Constraint Solver!\n\n"
            f"I am now invoking the Google OR-Tools constraint satisfaction engine on your active academic matrix.\n\n"
            f"```json\n{json_payload}\n```\n\n"
            f"- Checking UGC max workload limit per teacher.\n"
            f"- Optimizing hard room and teacher collision constraints."
        )

    # 5. Load Demo / Remove Demo
    if "load demo" in msg_lower or "seed demo" in msg_lower:
        json_payload = json.dumps({"action": "load_demo"}, indent=2)
        return f"### 🚀 Loading Full Academic Demo Dataset...\n\n```json\n{json_payload}\n```"

    if "remove demo" in msg_lower or "clear demo" in msg_lower or "reset workspace" in msg_lower:
        json_payload = json.dumps({"action": "clear_demo"}, indent=2)
        return f"### 🧹 Resetting Workspace to Clean Real Implementation...\n\n```json\n{json_payload}\n```"

    return (
        "### 🤖 Planify AI Operations Assistant\n\n"
        f"I have analyzed your active operational context (`{len(assignments)} scheduled sessions` across active sections).\n\n"
        "**Available Voice & Text Commands**:\n"
        "- 👨‍🏫 `Add teacher Dr. Ananya in Data Science`\n"
        "- 📚 `Add subject Machine Learning code CS701 taught by Dr. Satish for section MCA-A`\n"
        "- 🏛️ `Add section MCA-C with room Room-205`\n"
        "- 🏢 `Add rooms Lab-3, Room-204, Auditorium`\n"
        "- ✨ `Generate timetable now`\n"
        "- 🚀 `Load demo data` or 🗑️ `Remove demo data`"
    )


@router.post("/chat")
def chat_with_groq(request: ChatRequest):
    api_key = os.getenv("GROQ_API_KEY")
    ctx = request.context or {}

    system_instruction = (
        "You are an elite, highly intelligent AI Timetable Scheduling & Academic Operations Assistant powered by Groq. "
        "You have FULL OPERATIONAL POWERS over the university timetable system:\n"
        "1. Adding/Managing Teachers and Faculty profiles.\n"
        "2. Adding/Managing Subjects, Labs, and Course Workloads.\n"
        "3. Adding/Managing Sections, Batches, and Classrooms.\n"
        "4. Adding/Managing Rooms and Facilities.\n"
        "5. Generating and Solving Academic Timetables with Google OR-Tools.\n\n"
        "Whenever the user asks to add, update, generate, or modify any scheduling entities, YOU MUST ALWAYS provide a friendly markdown summary AND a STRICT JSON block in ```json ... ``` with any of these keys as needed:\n"
        "- `teachers`: list of objects with `name`, `department`, `designation`, `email`, `phone`, `free_periods`\n"
        "- `subjects`: list of objects with `code`, `name`, `teacher`, `section`, `required_slots`, `is_lab`, `colorIndex`\n"
        "- `sections`: list of objects with `name`, `room`, `lab_room`\n"
        "- `rooms`: list of string room names\n"
        "- `action`: 'add_data' | 'generate_timetable' | 'load_demo' | 'clear_demo'\n\n"
        f"Active System Context: {json.dumps(ctx, default=str)}"
    )

    if not api_key:
        fallback_reply = generate_fallback_nlp_response(request.message, ctx)
        return {
            "reply": fallback_reply,
            "engine": "local_nlp_intelligence",
            "model": "rule-based-nlp",
        }

    try:
        client = Groq(api_key=api_key)
        messages = [{"role": "system", "content": system_instruction}]

        for h in request.history[-6:]:
            role = "assistant" if h.get("sender") == "ai" else "user"
            messages.append({"role": role, "content": h.get("text", "")})

        messages.append({"role": "user", "content": request.message})

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.2,
            max_tokens=1500,
        )
        reply_content = response.choices[0].message.content
        return {
            "reply": reply_content,
            "engine": "groq_cloud",
            "model": "llama-3.3-70b-versatile",
        }
    except Exception as e:
        fallback_reply = generate_fallback_nlp_response(request.message, ctx)
        return {
            "reply": fallback_reply,
            "engine": "local_nlp_fallback",
            "error_note": str(e),
        }
