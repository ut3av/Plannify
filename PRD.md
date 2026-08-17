# Plannify.exe — Product Requirement Document (PRD)

**Document Version**: 2.0.0  
**Status**: Institutional Production Specification  
**Target Platform**: University, College, and School ERP Ecosystems  

---

## 1. Executive Summary & Vision

**Plannify.exe** is an enterprise-grade **Smart Academic Operations & Faculty Management Platform**. Originally developed as a constraint-based timetable optimization solver (powered by Google OR-Tools and Groq AI), Plannify.exe has evolved into an institutional-grade B2B SaaS platform.

It seamlessly integrates:
1. **Mathematical Timetable Solver**: Hard/soft constraint satisfaction via Google OR-Tools CP-SAT model.
2. **Faculty Lifecycle & Directory**: Comprehensive records, qualifications, workload, department hierarchies.
3. **Digital Leave Approval System**: Multi-level workflow with automatic substitution suggestions.
4. **Hardware Punch Machine Integration**: Universal adapter layer for ZKTeco, eSSL, BioMax biometric hardware and CSV imports.
5. **Make.com Automation & Webhooks**: Automated notification triggers (email, WhatsApp, Slack, Excel reports).
6. **Supabase Cloud Sync & Relational Data**: Real-time state persistence and relational synchronization.

---

## 2. System Architecture

```
[ Biometric Hardware / Punch Machines ]
               │ (CSV / REST Push)
               ▼
   ┌───────────────────────┐         ┌───────────────────────┐
   │ Hardware Adapter      │ ──────> │ FastAPI Backend Core  │ <────> [ Google OR-Tools CP-SAT ]
   │ Integration Service   │         │ (Python 3.11+)        │ <────> [ Groq / Gemini AI Engine ]
   └───────────────────────┘         └───────────────────────┘
                                                 │
                                 ┌───────────────┴───────────────┐
                                 ▼                               ▼
                     ┌───────────────────────┐       ┌───────────────────────┐
                     │ Supabase PostgreSQL   │       │ Make Automation Engine│
                     │ Cloud Relational DB   │       │ (Webhooks & Scenarios)│
                     └───────────────────────┘       └───────────────────────┘
                                 ▲                               │
                                 └───────────────┬───────────────┘
                                                 ▼
                                     ┌───────────────────────┐
                                     │ React Admin/Faculty   │
                                     │ User Dashboard (Web)  │
                                     └───────────────────────┘
```

---

## 3. Database Schema Specification (Supabase / PostgreSQL)

Below is the complete SQL DDL schema required to set up the relational database in Supabase:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  hod_faculty_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. TEACHERS (Legacy compatibility table used by solver)
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  free_periods INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. FACULTY PROFILES (Extended FMS Profile)
-- ============================================================
CREATE TABLE IF NOT EXISTS faculty_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  teacher_name TEXT NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  designation TEXT NOT NULL DEFAULT 'Lecturer',
  qualification TEXT,
  employment_type TEXT DEFAULT 'full-time' CHECK (employment_type IN ('full-time','part-time','guest','contractual')),
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  phone TEXT,
  emergency_contact TEXT,
  address TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','on-leave','resigned','retired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add HOD FK constraint
ALTER TABLE departments 
  ADD CONSTRAINT fk_departments_hod 
  FOREIGN KEY (hod_faculty_id) REFERENCES faculty_profiles(id) ON DELETE SET NULL;

-- ============================================================
-- 4. LEAVE TYPES & BALANCES
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  max_per_year INT NOT NULL DEFAULT 12,
  carry_forward BOOLEAN DEFAULT false,
  requires_document BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3b82f6'
);

INSERT INTO leave_types (code, name, max_per_year, carry_forward, requires_document, color)
VALUES
  ('CL', 'Casual Leave', 12, false, false, '#3b82f6'),
  ('EL', 'Earned Leave', 15, true, false, '#0d9488'),
  ('ML', 'Medical Leave', 10, false, true, '#dc2626'),
  ('COMP', 'Compensatory Off', 5, false, false, '#d97706'),
  ('OD', 'On Duty', 0, false, false, '#6366f1')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES faculty_profiles(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL DEFAULT '2026-27',
  total_allowed INT NOT NULL,
  used INT DEFAULT 0,
  pending INT DEFAULT 0,
  UNIQUE(faculty_id, leave_type_id, academic_year)
);

-- ============================================================
-- 5. LEAVE APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES faculty_profiles(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  half_day BOOLEAN DEFAULT false,
  reason TEXT NOT NULL,
  document_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  applied_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES faculty_profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_remarks TEXT,
  substitute_id UUID REFERENCES faculty_profiles(id),
  notification_sent BOOLEAN DEFAULT false
);

-- ============================================================
-- 6. ATTENDANCE RECORDS (Biometric & Manual)
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES faculty_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  punch_in TIMESTAMPTZ,
  punch_out TIMESTAMPTZ,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','csv_import','api_sync','biometric')),
  status TEXT DEFAULT 'present' CHECK (status IN ('present','absent','half-day','late','on-duty','weekend','holiday')),
  late_minutes INT DEFAULT 0,
  remarks TEXT,
  UNIQUE(faculty_id, date)
);

-- ============================================================
-- 7. SUBSTITUTION LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS substitution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_application_id UUID REFERENCES leave_applications(id) ON DELETE SET NULL,
  original_faculty_id UUID NOT NULL REFERENCES faculty_profiles(id),
  substitute_faculty_id UUID NOT NULL REFERENCES faculty_profiles(id),
  date DATE NOT NULL,
  slot TEXT NOT NULL,
  subject TEXT,
  section TEXT,
  room TEXT,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned','completed','declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. TIMETABLE Core Entities (Rooms, Sections, Slots, Assignments)
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_lab BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT UNIQUE NOT NULL,
  slot_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id UUID REFERENCES timetables(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  slot_id UUID REFERENCES time_slots(id),
  teacher_id UUID REFERENCES teachers(id),
  section_id UUID REFERENCES sections(id),
  room_id UUID REFERENCES rooms(id),
  is_proxy BOOLEAN DEFAULT false
);

-- ============================================================
-- INDEXES & PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_faculty_dept ON faculty_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_leave_app_dates ON leave_applications(from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_assignments_tt ON assignments(timetable_id);
```

---

## 4. Make.com Automation Engine & Webhook Specifications

The backend triggers Make.com via a central webhook endpoint configured by `MAKE_WEBHOOK_URL` in `.env`.

### Event Payload Specs

#### Event 1: `timetable.generated`
Triggered immediately when OR-Tools successfully solves a new timetable grid.

```json
{
  "event": "timetable.generated",
  "service": "plannify-os",
  "sent_at": "2026-08-15T08:30:00Z",
  "data": {
    "objective_score": 0,
    "total_classes": 45,
    "assignments_count": 45,
    "solver_status": "OPTIMAL"
  }
}
```

#### Event 2: `bulk_email_trigger`
Triggered by admin via `/make/email-all` to generate and send personalized Excel timetable attachments to all faculty members.

```json
{
  "event": "bulk_email_trigger",
  "service": "plannify-os",
  "sent_at": "2026-08-15T08:30:00Z",
  "data": {
    "action": "distribute_timetables",
    "teacher_count": 12,
    "teachers": [
      {
        "name": "Dr. Sharma",
        "email": "sharma@univ.edu",
        "phone": "+919876543210",
        "filename": "Timetable_Dr_Sharma.xlsx",
        "excel_base64": "<base64_encoded_xlsx>"
      }
    ]
  }
}
```

#### Event 3: `leave.applied` / `leave.approved`
Triggered when a faculty member applies for leave or an admin approves a leave application.

```json
{
  "event": "leave.approved",
  "service": "plannify-os",
  "sent_at": "2026-08-15T08:30:00Z",
  "data": {
    "leave_id": "uuid-here",
    "faculty_name": "Prof. Kumar",
    "leave_type": "Casual Leave",
    "from_date": "2026-08-20",
    "to_date": "2026-08-21",
    "substitute_assigned": "Dr. Meenakshi"
  }
}
```

---

## 5. Hardware Punch Machine Integration Specification

For physical attendance hardware (e.g. ZKTeco, eSSL, BioMax), Plannify provides two entry points:

### Option A: CSV Import Specification
Endpoint: `POST /attendance/import`  
Expected File Format: Standard 24h CSV export

```csv
EmployeeID,Name,Date,PunchIn,PunchOut
EMP-2024-001,Dr. Sharma,2026-08-15,08:55,17:05
EMP-2024-002,Prof. Kumar,2026-08-15,09:18,16:45
```

- **Late Threshold Logic**: Default arrival threshold is **9:00 AM**. If `PunchIn` > 09:00, `late_minutes` is calculated automatically.
- **Half-Day Logic**: If `PunchOut` < 13:00 (1:00 PM), status is set to `half-day`.

### Option B: Real-Time Biometric Push API
Biometric devices or local connector software can push punches directly to the API endpoint:  
`POST /attendance/manual`

```json
{
  "faculty_id": "uuid-here",
  "date": "2026-08-15",
  "punch_in": "08:55",
  "punch_out": "17:05",
  "status": "present",
  "remarks": "Biometric terminal 01"
}
```

---

## 6. Functional Requirements Matrix

| Module | Requirement | Status |
|--------|-------------|--------|
| **Scheduler Engine** | OR-Tools CP-SAT 2-period lab block matching, room constraints, spread constraints | Complete |
| **AI Advisor** | Groq (Llama 3.3 70B) & Gemini 2.5 Flash OCR timetable import | Complete |
| **Faculty Directory** | Faculty profiles, designations, department hierarchy, search & filter | Complete |
| **Leave Management** | Application, review, approval/rejection, balance tracking per academic year | Complete |
| **Attendance Tracking** | Daily/monthly views, CSV punch machine import, manual override, late calculation | Complete |
| **Substitution Engine** | Workload-balanced substitute recommendations based on timetable free periods | Complete |
| **Enterprise UI** | Clean slate, deep blue, teal palette (No neon/cyberpunk aesthetics) | Complete |
| **ERP Sync Layer** | Supabase relational table sync for external ERP integration | Complete |

---

## 7. Role-Based Access Control (RBAC)

1. **Super Admin / ERP Admin**:
   - Access to full platform, system configuration, department management, raw database triggers, bulk email distribution, and global logs.
2. **HOD (Head of Department)**:
   - Access to department faculty directory, department leave approvals, department substitution management, and attendance reports.
3. **Faculty / Teacher**:
   - Personal dashboard, personal class schedule, leave applications, personal attendance summary, and substitution notifications.

---

## 8. Deployment & Environmental Variables

### Backend Configuration (`backend/.env`)
```env
PORT=8080
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
MAKE_WEBHOOK_URL=https://hook.eu1.make.com/your-make-webhook-path
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### Frontend Configuration (`.env`)
```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_SUPABASE_URL=https://your-supabase-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 9. Next Steps for Database & Make.com Setup

1. **Database Setup**: Execute the DDL in Section 3 in your Supabase SQL Editor.
2. **Make.com Scenario Setup**: Create a webhook trigger in Make.com listening for `bulk_email_trigger`, `timetable.generated`, and `timetable.proxy_assigned` events.
3. **Biometric Integration**: Configure your hardware punch machine software to export daily CSVs or push directly to `POST /attendance/manual`.
