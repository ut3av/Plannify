-- ============================================================
-- Plannify Faculty Management System — Supabase Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

BEGIN;

-- 1. Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  hod_faculty_id UUID,  -- will add FK after faculty_profiles exists
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Faculty Profiles (extends existing teachers)
CREATE TABLE IF NOT EXISTS faculty_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  teacher_name TEXT NOT NULL,                          -- links to teachers.name
  employee_id TEXT UNIQUE NOT NULL,                    -- e.g. "EMP-2024-001"
  department_id UUID REFERENCES departments(id),
  designation TEXT NOT NULL DEFAULT 'Lecturer',        -- Professor, Asst Prof, Lecturer, etc.
  qualification TEXT,
  employment_type TEXT DEFAULT 'full-time'
    CHECK (employment_type IN ('full-time','part-time','guest','contractual')),
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  phone TEXT,
  emergency_contact TEXT,
  address TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active','on-leave','resigned','retired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK from departments.hod_faculty_id now that faculty_profiles exists
ALTER TABLE departments
  ADD CONSTRAINT fk_departments_hod
  FOREIGN KEY (hod_faculty_id) REFERENCES faculty_profiles(id)
  ON DELETE SET NULL;

-- 3. Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                           -- CL, EL, ML, COMP, OD
  name TEXT NOT NULL,                                  -- Casual Leave, Earned Leave, etc.
  max_per_year INT NOT NULL DEFAULT 12,
  carry_forward BOOLEAN DEFAULT false,
  requires_document BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3b82f6'
);

-- Seed default leave types
INSERT INTO leave_types (code, name, max_per_year, carry_forward, requires_document, color)
VALUES
  ('CL', 'Casual Leave',     12, false, false, '#3b82f6'),
  ('EL', 'Earned Leave',     15, true,  false, '#0d9488'),
  ('ML', 'Medical Leave',    10, false, true,  '#dc2626'),
  ('COMP', 'Compensatory Off', 5, false, false, '#d97706'),
  ('OD', 'On Duty',           0, false, false, '#6366f1')
ON CONFLICT (code) DO NOTHING;

-- 4. Leave Balances
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

-- 5. Leave Applications
CREATE TABLE IF NOT EXISTS leave_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES faculty_profiles(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  half_day BOOLEAN DEFAULT false,
  reason TEXT NOT NULL,
  document_url TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  applied_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES faculty_profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_remarks TEXT,
  substitute_id UUID REFERENCES faculty_profiles(id),
  notification_sent BOOLEAN DEFAULT false
);

-- 6. Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES faculty_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  punch_in TIMESTAMPTZ,
  punch_out TIMESTAMPTZ,
  source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual','csv_import','api_sync','biometric')),
  status TEXT DEFAULT 'present'
    CHECK (status IN ('present','absent','half-day','late','on-duty','weekend','holiday')),
  late_minutes INT DEFAULT 0,
  remarks TEXT,
  UNIQUE(faculty_id, date)
);

-- 7. Substitution Log
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
  status TEXT DEFAULT 'assigned'
    CHECK (status IN ('assigned','completed','declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_faculty_dept ON faculty_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_faculty_status ON faculty_profiles(status);
CREATE INDEX IF NOT EXISTS idx_leave_app_faculty ON leave_applications(faculty_id);
CREATE INDEX IF NOT EXISTS idx_leave_app_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_app_dates ON leave_applications(from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_attendance_faculty_date ON attendance_records(faculty_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_substitution_date ON substitution_log(date);

-- RLS Policies (basic — tighten per your security needs)
ALTER TABLE faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE substitution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all (write policies should be role-scoped)
CREATE POLICY "Authenticated read" ON faculty_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON leave_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON attendance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON substitution_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON leave_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON leave_balances FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update (admin enforcement in app layer)
CREATE POLICY "Authenticated write" ON faculty_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write" ON leave_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write" ON attendance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write" ON substitution_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write" ON departments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write" ON leave_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write" ON leave_balances FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
