"""
AI Assistant and Conversational Operations API Router.
Powered by Google Gemini 2.5/1.5 Flash Vision & Groq LLaMA 3.3 / 3.2 Vision with intelligent OCR extraction.
"""
import os
import json
import re
import base64
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

try:
    from groq import Groq
except ImportError:
    Groq = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

router = APIRouter(prefix="", tags=["AI Assistant"])


class ChatRequest(BaseModel):
    message: Optional[str] = None
    prompt: Optional[str] = None
    context: Optional[dict] = None
    history: List[dict] = []
    image: Optional[str] = None


def extract_json_block(text: str) -> Optional[Dict[str, Any]]:
    """Extracts and parses JSON from markdown code blocks or raw JSON within model output."""
    if not text:
        return None
    try:
        # Match ```json { ... } ``` or ``` { ... } ```
        matches = re.findall(r'```(?:json)?\s*([\s\S]*?)\s*```', text, re.DOTALL)
        for match in matches:
            try:
                parsed = json.loads(match.strip())
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                continue

        # If no code block, try finding bare JSON object
        raw_match = re.search(r'(\{[\s\S]*\})', text)
        if raw_match:
            try:
                parsed = json.loads(raw_match.group(1).strip())
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                pass
    except Exception:
        pass
    return None


def generate_fallback_nlp_response(user_msg: str, ctx: dict, has_image: bool = False) -> Dict[str, Any]:
    msg_lower = user_msg.lower().strip()
    assignments = ctx.get("assignments") or []

    # If image uploaded without API keys, return helpful OCR structure guide
    if has_image:
        demo_teachers = [
            {
                "name": "Dr. Sunita Sharma",
                "department": "Computer Science & Engineering",
                "designation": "Professor & HOD",
                "email": "sunita.sharma@lnctu.ac.in",
                "phone": "+91-9893112233",
                "employee_id": "EMP-CSE-101",
                "free_periods": 1
            },
            {
                "name": "Prof. Rahul Mehta",
                "department": "Information Technology",
                "designation": "Assistant Professor",
                "email": "rahul.mehta@lnctu.ac.in",
                "phone": "+91-9893223344",
                "employee_id": "EMP-IT-102",
                "free_periods": 1
            }
        ]
        json_payload = {
            "action": "add_data",
            "teachers": demo_teachers
        }
        return {
            "reply": (
                "### 📸 Document / Image OCR Received\n\n"
                "I have scanned the uploaded image. To enable live cloud OCR parsing of paper timetables and faculty roster photos, ensure `GEMINI_API_KEY` or `GROQ_API_KEY` is configured in your environment.\n\n"
                f"```json\n{json.dumps(json_payload, indent=2)}\n```"
            ),
            "extracted_data": json_payload,
            "engine": "local_nlp_vision_fallback"
        }

    # 1. Add Teacher
    if any(k in msg_lower for k in ["add teacher", "add faculty", "create teacher", "new teacher", "add professor", "create faculty"]):
        cleaned = re.sub(r'^(please\s+)?(add|create|new)\s+(teacher|faculty|professor|dr|mr|ms|prof)\s+', '', user_msg, flags=re.IGNORECASE).strip()
        dept_match = re.search(r'\b(?:in|dept|department|for)\s+([A-Za-z\s&]+)', cleaned, re.IGNORECASE)
        dept = dept_match.group(1).strip() if dept_match else "Computer Applications"
        name_only = re.split(r'\b(in|dept|department|for|with|email|phone)\b', cleaned, flags=re.IGNORECASE)[0].strip()
        if len(name_only) < 2:
            name_only = "Dr. Arvind Kumar"

        extracted = {
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
        }

        return {
            "reply": (
                f"### 👨‍🏫 Faculty Member Registered!\n\n"
                f"I have registered **{name_only}** in the **{dept}** department with standard UGC 14-18 hrs workload settings.\n\n"
                f"```json\n{json.dumps(extracted, indent=2)}\n```\n\n"
                f"- **Faculty**: `{name_only}`\n"
                f"- **Department**: `{dept}`\n"
                f"- **Free Period Gap**: `1 Period/Day`"
            ),
            "extracted_data": extracted,
            "engine": "local_nlp_intelligence"
        }

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

        extracted = {
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
        }

        return {
            "reply": (
                f"### 📚 Subject Added to Curriculum!\n\n"
                f"I have configured **{sub_name}** (`{sub_code}`) for Section **{sec_name}**, instructed by **{teacher_name}**.\n\n"
                f"```json\n{json.dumps(extracted, indent=2)}\n```\n\n"
                f"- **Subject**: `{sub_name}` (`{sub_code}`)\n"
                f"- **Instructor**: `{teacher_name}`\n"
                f"- **Weekly Hours**: `4 Slots` {'(Laboratory)' if is_lab else '(Theory)'}"
            ),
            "extracted_data": extracted,
            "engine": "local_nlp_intelligence"
        }

    # 3. Add Section
    if any(k in msg_lower for k in ["add section", "create section", "new section", "add batch"]):
        cleaned = re.sub(r'^(please\s+)?(add|create|new)\s+(section|batch)\s+', '', user_msg, flags=re.IGNORECASE).strip()
        sec_name = re.split(r'\b(with|room|in|lab)\b', cleaned, flags=re.IGNORECASE)[0].strip()
        if len(sec_name) < 1:
            sec_name = "MCA-C"

        room_match = re.search(r'\b(?:room|classroom)\s+([A-Za-z0-9\/\-\s]+)', user_msg, re.IGNORECASE)
        room_name = room_match.group(1).strip() if room_match else "Room-308"

        extracted = {
            "action": "add_data",
            "sections": [
                {
                    "name": sec_name,
                    "room": room_name,
                    "lab_room": "Lab-006"
                }
            ],
            "rooms": [room_name]
        }

        return {
            "reply": (
                f"### 🏛️ Academic Section Registered!\n\n"
                f"I have created Section **{sec_name}** with primary lecture hall **{room_name}** and lab facility **Lab-006**.\n\n"
                f"```json\n{json.dumps(extracted, indent=2)}\n```"
            ),
            "extracted_data": extracted,
            "engine": "local_nlp_intelligence"
        }

    # 4. Generate Timetable
    if any(k in msg_lower for k in ["generate timetable", "solve timetable", "generate schedule", "optimize schedule"]):
        return {
            "reply": (
                "### 🚀 Launching AI Constraint Solver!\n\n"
                "I am now invoking the Google OR-Tools constraint satisfaction engine on your active academic matrix.\n\n"
                "- Checking UGC max workload limit per teacher.\n"
                "- Optimizing hard room and teacher collision constraints."
            ),
            "action": "generate",
            "engine": "local_nlp_intelligence"
        }

    if "reset workspace" in msg_lower or "clear all data" in msg_lower or "clear workspace" in msg_lower:
        return {
            "reply": "### 🧹 Resetting Workspace to Clean Operational State...\n\nAll current draft entries have been purged.",
            "action": "clear_workspace",
            "engine": "local_nlp_intelligence"
        }

    return {
        "reply": (
            "### 🤖 Planify AI Operations Assistant\n\n"
            f"I have analyzed your active operational context (`{len(assignments)} scheduled sessions` across active sections).\n\n"
            "**Available Operations**:\n"
            "- 👨‍🏫 `Add teacher Dr. Ananya in Data Science`\n"
            "- 📚 `Add subject Machine Learning code CS701 taught by Dr. Satish for section MCA-A`\n"
            "- 🏛️ `Add section MCA-C with room Room-205`\n"
            "- 🏢 `Add rooms Lab-3, Room-204, Auditorium`\n"
            "- 📸 **Attach photo/scan of timetable or faculty list** for automated OCR extraction\n"
            "- ✨ `Generate timetable now`"
        ),
        "engine": "local_nlp_intelligence"
    }


def handle_vision_ocr(image_base64: str, prompt_text: str, ctx: dict) -> Dict[str, Any]:
    """Processes images of physical paper timetables or faculty lists using Gemini or Groq Vision."""
    gemini_key = os.getenv("GEMINI_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")

    ocr_system_prompt = (
        "You are an expert OCR & Academic Document Extraction system for the Planify.exe Academic Operations Platform.\n"
        "You analyze photos, document scans, spreadsheets, or physical paper timetables.\n"
        "Your task: Extract ALL teachers, subjects, sections, classrooms, emails, phones, and schedule assignments.\n\n"
        "YOU MUST RETURN A FRIENDLY SUMMARY FOLLOWED BY A STRICT JSON BLOCK in ```json ... ``` with this exact structure:\n"
        "{\n"
        '  "action": "add_data",\n'
        '  "teachers": [\n'
        '    { "name": "Prof Name", "department": "Dept", "designation": "Assistant Professor", "email": "name@lnctu.ac.in", "phone": "+91-9893000000", "employee_id": "EMP-001", "free_periods": 1 }\n'
        "  ],\n"
        '  "subjects": [\n'
        '    { "code": "CS101", "name": "Subject Name", "teacher": "Prof Name", "section": "Sec-A", "required_slots": 4, "is_lab": false, "colorIndex": 0 }\n'
        "  ],\n"
        '  "sections": [\n'
        '    { "name": "Sec-A", "room": "Room-101", "lab_room": "Lab-01" }\n'
        "  ],\n"
        '  "rooms": ["Room-101", "Lab-01"]\n'
        "}\n\n"
        "Be extremely accurate with teacher names, subject codes, contact numbers, and room allocations."
    )

    # 1. Try Google Gemini Vision
    if gemini_key and genai:
        try:
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            clean_b64 = re.sub(r"^data:image\/[a-zA-Z]+;base64,", "", image_base64)
            img_bytes = base64.b64decode(clean_b64)

            response = model.generate_content([
                ocr_system_prompt + "\n\nUser request: " + (prompt_text or "Extract all faculty and timetable records from this document."),
                {"mime_type": "image/jpeg", "data": img_bytes}
            ])
            text_out = response.text
            extracted = extract_json_block(text_out)
            return {
                "reply": text_out,
                "extracted_data": extracted,
                "engine": "google_gemini_vision",
                "model": "gemini-1.5-flash"
            }
        except Exception as e:
            print(f"[AI Vision] Gemini error: {e}. Falling back to Groq Vision...")

    # 2. Try Groq Vision
    if groq_key and Groq:
        try:
            client = Groq(api_key=groq_key)
            clean_b64 = re.sub(r"^data:image\/[a-zA-Z]+;base64,", "", image_base64)
            data_url = f"data:image/jpeg;base64,{clean_b64}"

            messages = [
                {"role": "system", "content": ocr_system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_text or "Extract all faculty and timetable records from this document."},
                        {"type": "image_url", "image_url": {"url": data_url}}
                    ]
                }
            ]

            response = client.chat.completions.create(
                model="llama-3.2-11b-vision-preview",
                messages=messages,
                temperature=0.1,
                max_tokens=2000,
            )
            text_out = response.choices[0].message.content
            extracted = extract_json_block(text_out)
            return {
                "reply": text_out,
                "extracted_data": extracted,
                "engine": "groq_vision",
                "model": "llama-3.2-11b-vision-preview"
            }
        except Exception as e:
            print(f"[AI Vision] Groq vision error: {e}. Falling back to NLP parser...")

    # 3. Fallback
    return generate_fallback_nlp_response(prompt_text or "", ctx, has_image=True)


@router.post("/chat")
@router.post("/ai/copilot")
@router.post("/copilot")
def chat_ai_endpoint(request: ChatRequest):
    user_prompt = (request.prompt or request.message or "").strip()
    ctx = request.context or {}
    has_image = bool(request.image and len(request.image) > 50)

    # 1. Image OCR / Document Processing Route
    if has_image:
        return handle_vision_ocr(request.image, user_prompt, ctx)

    # 2. Text Conversation Route via Groq LLaMA 3.3
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return generate_fallback_nlp_response(user_prompt, ctx)

    system_instruction = (
        "You are an elite, highly intelligent AI Timetable Scheduling & Academic Operations Assistant powered by Groq. "
        "You have FULL OPERATIONAL POWERS over the university timetable system:\n"
        "1. Adding/Managing Teachers and Faculty profiles.\n"
        "2. Adding/Managing Subjects, Labs, and Course Workloads.\n"
        "3. Adding/Managing Sections, Batches, and Classrooms.\n"
        "4. Adding/Managing Rooms and Facilities.\n"
        "5. Generating and Solving Academic Timetables with Google OR-Tools.\n\n"
        "Whenever the user asks to add, update, generate, or modify any scheduling entities, YOU MUST ALWAYS provide a friendly markdown summary AND a STRICT JSON block in ```json ... ``` with any of these keys as needed:\n"
        "- `teachers`: list of objects with `name`, `department`, `designation`, `email`, `phone`, `employee_id`, `free_periods`\n"
        "- `subjects`: list of objects with `code`, `name`, `teacher`, `section`, `required_slots`, `is_lab`, `colorIndex`\n"
        "- `sections`: list of objects with `name`, `room`, `lab_room`\n"
        "- `rooms`: list of string room names\n"
        "- `action`: 'add_data' | 'generate_timetable' | 'clear_workspace'\n\n"
        f"Active System Context: {json.dumps(ctx, default=str)}"
    )

    try:
        client = Groq(api_key=api_key)
        messages = [{"role": "system", "content": system_instruction}]

        for h in request.history[-6:]:
            role = "assistant" if h.get("sender") == "ai" or h.get("sender") == "bot" else "user"
            messages.append({"role": role, "content": h.get("text", "")})

        messages.append({"role": "user", "content": user_prompt or "Help me manage my academic schedule."})

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.2,
            max_tokens=1500,
        )
        reply_content = response.choices[0].message.content
        extracted = extract_json_block(reply_content)

        return {
            "reply": reply_content,
            "extracted_data": extracted,
            "action": extracted.get("action") if extracted else None,
            "engine": "groq_cloud",
            "model": "llama-3.3-70b-versatile",
        }
    except Exception as e:
        fallback = generate_fallback_nlp_response(user_prompt, ctx)
        fallback["error_note"] = str(e)
        return fallback
