-- ==============================================================================
-- PLANIFY.EXE — PRODUCTION ACADEMIC HIERARCHY & REALTIME SYNC MIGRATION
-- Bulletproof & Idempotent (Handles both pre-existing and brand new tables)
-- ==============================================================================
BEGIN;

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Institutions Table
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  city TEXT DEFAULT 'Bhopal',
  state TEXT DEFAULT 'Madhya Pradesh',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Default Institution (LNCT)
INSERT INTO public.institutions (id, name, code, city, state)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Lakshmi Narain College of Technology', 'LNCT', 'Bhopal', 'Madhya Pradesh')
ON CONFLICT (name) DO NOTHING;

-- 3. Departments Table (Ensure created & altered)
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.departments 
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS hod_faculty_id UUID;

-- Backfill institution_id on existing departments
UPDATE public.departments 
SET institution_id = (SELECT id FROM public.institutions WHERE code = 'LNCT' LIMIT 1)
WHERE institution_id IS NULL;

-- 4. Buildings & Facilities
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;

UPDATE public.buildings
SET institution_id = (SELECT id FROM public.institutions WHERE code = 'LNCT' LIMIT 1)
WHERE institution_id IS NULL;

-- 5. Classrooms, Labs & Common Facilities
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'CLASSROOM',
  capacity INT DEFAULT 60,
  has_projector BOOLEAN DEFAULT false,
  has_smart_board BOOLEAN DEFAULT false,
  capabilities TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rooms 
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS room_number TEXT,
  ADD COLUMN IF NOT EXISTS room_type TEXT DEFAULT 'CLASSROOM',
  ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 60,
  ADD COLUMN IF NOT EXISTS has_projector BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_smart_board BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS capabilities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.rooms
SET institution_id = (SELECT id FROM public.institutions WHERE code = 'LNCT' LIMIT 1)
WHERE institution_id IS NULL;

-- 6. Academic Sessions / Terms (e.g., 'July-Dec 2026')
CREATE TABLE IF NOT EXISTS public.academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2026-27',
  is_current BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.academic_sessions
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;

UPDATE public.academic_sessions
SET institution_id = (SELECT id FROM public.institutions WHERE code = 'LNCT' LIMIT 1)
WHERE institution_id IS NULL;

-- 7. Academic Programs (BCA, MCA, B.Tech, MBA, etc.)
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'UG',
  duration_semesters INT NOT NULL DEFAULT 6,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'UG',
  ADD COLUMN IF NOT EXISTS duration_semesters INT DEFAULT 6,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.programs
SET institution_id = (SELECT id FROM public.institutions WHERE code = 'LNCT' LIMIT 1)
WHERE institution_id IS NULL;

-- 8. Program Semesters (BCA Sem 1 != MCA Sem 1)
CREATE TABLE IF NOT EXISTS public.semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_number INT NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.semesters
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS semester_number INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 9. Program Sections / Cohorts (BCA-I A..G, MCA-I A..E)
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  specialization TEXT,
  capacity INT DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS default_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_lab_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mentor_faculty_id UUID,
  ADD COLUMN IF NOT EXISTS mentor_name TEXT,
  ADD COLUMN IF NOT EXISTS mentor_phone TEXT,
  ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 60,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 10. Subjects / Course Catalog
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  credit_hours NUMERIC(3,1) DEFAULT 4.0,
  lecture_hours INT DEFAULT 4,
  lab_hours INT DEFAULT 0,
  is_lab BOOLEAN DEFAULT false,
  color_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS credit_hours NUMERIC(3,1) DEFAULT 4.0,
  ADD COLUMN IF NOT EXISTS lecture_hours INT DEFAULT 4,
  ADD COLUMN IF NOT EXISTS lab_hours INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_lab BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS color_index INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 11. Faculty Profiles (Ensure all columns exist)
CREATE TABLE IF NOT EXISTS public.faculty_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_name TEXT NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.faculty_profiles
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT 'Assistant Professor',
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full-time',
  ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.faculty_profiles
SET institution_id = (SELECT id FROM public.institutions WHERE code = 'LNCT' LIMIT 1)
WHERE institution_id IS NULL;

-- 12. Faculty-Subject Allocations (Bridge Table)
CREATE TABLE IF NOT EXISTS public.faculty_subject_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.faculty_profiles(id) ON DELETE CASCADE,
  faculty_name TEXT NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  academic_term TEXT NOT NULL DEFAULT 'July-Dec 2026',
  weekly_load INT NOT NULL DEFAULT 4,
  is_lab BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.faculty_subject_allocations
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preferred_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;

-- 13. Ingestion Audit Logs (Traceability & Checksum Protection)
CREATE TABLE IF NOT EXISTS public.import_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_by_name TEXT NOT NULL DEFAULT 'Administrator',
  filename TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'analyzed',
  records_detected JSONB DEFAULT '{}'::jsonb,
  records_inserted JSONB DEFAULT '{}'::jsonb,
  records_updated JSONB DEFAULT '{}'::jsonb,
  records_skipped JSONB DEFAULT '{}'::jsonb,
  conflicts_detected JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Document Extractions Staging
CREATE TABLE IF NOT EXISTS public.document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_log_id UUID NOT NULL REFERENCES public.import_audit_logs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  source_location TEXT,
  raw_payload JSONB NOT NULL,
  normalized_payload JSONB NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 1.00,
  validation_status TEXT DEFAULT 'valid',
  validation_notes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Create Query Performance Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_inst ON public.rooms(institution_id);
CREATE INDEX IF NOT EXISTS idx_programs_dept ON public.programs(department_id);
CREATE INDEX IF NOT EXISTS idx_sections_sem ON public.sections(semester_id);
CREATE INDEX IF NOT EXISTS idx_subjects_prog ON public.subjects(program_id);
CREATE INDEX IF NOT EXISTS idx_allocations_fac ON public.faculty_subject_allocations(faculty_id, academic_term);
CREATE INDEX IF NOT EXISTS idx_import_audit_hash ON public.import_audit_logs(file_hash);

-- 16. Enable Row Level Security (RLS)
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_subject_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

-- Helper to safely recreate policies
DO $$
BEGIN
  -- Drop existing policies if present to prevent duplicate errors
  DROP POLICY IF EXISTS "Public & auth read institutions" ON public.institutions;
  DROP POLICY IF EXISTS "Public & auth read departments" ON public.departments;
  DROP POLICY IF EXISTS "Public & auth read buildings" ON public.buildings;
  DROP POLICY IF EXISTS "Public & auth read rooms" ON public.rooms;
  DROP POLICY IF EXISTS "Public & auth read academic_sessions" ON public.academic_sessions;
  DROP POLICY IF EXISTS "Public & auth read programs" ON public.programs;
  DROP POLICY IF EXISTS "Public & auth read semesters" ON public.semesters;
  DROP POLICY IF EXISTS "Public & auth read sections" ON public.sections;
  DROP POLICY IF EXISTS "Public & auth read subjects" ON public.subjects;
  DROP POLICY IF EXISTS "Public & auth read faculty_profiles" ON public.faculty_profiles;
  DROP POLICY IF EXISTS "Public & auth read faculty_subject_allocations" ON public.faculty_subject_allocations;
  DROP POLICY IF EXISTS "Public & auth read import_audit_logs" ON public.import_audit_logs;
  DROP POLICY IF EXISTS "Public & auth read document_extractions" ON public.document_extractions;

  DROP POLICY IF EXISTS "Auth write institutions" ON public.institutions;
  DROP POLICY IF EXISTS "Auth write departments" ON public.departments;
  DROP POLICY IF EXISTS "Auth write buildings" ON public.buildings;
  DROP POLICY IF EXISTS "Auth write rooms" ON public.rooms;
  DROP POLICY IF EXISTS "Auth write academic_sessions" ON public.academic_sessions;
  DROP POLICY IF EXISTS "Auth write programs" ON public.programs;
  DROP POLICY IF EXISTS "Auth write semesters" ON public.semesters;
  DROP POLICY IF EXISTS "Auth write sections" ON public.sections;
  DROP POLICY IF EXISTS "Auth write subjects" ON public.subjects;
  DROP POLICY IF EXISTS "Auth write faculty_profiles" ON public.faculty_profiles;
  DROP POLICY IF EXISTS "Auth write faculty_subject_allocations" ON public.faculty_subject_allocations;
  DROP POLICY IF EXISTS "Auth write import_audit_logs" ON public.import_audit_logs;
  DROP POLICY IF EXISTS "Auth write document_extractions" ON public.document_extractions;
END $$;

-- Read Policies (Public & Authenticated)
CREATE POLICY "Public & auth read institutions" ON public.institutions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public & auth read departments" ON public.departments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public & auth read buildings" ON public.buildings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public & auth read rooms" ON public.rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public & auth read academic_sessions" ON public.academic_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public & auth read programs" ON public.programs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public & auth read semesters" ON public.semesters FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public & auth read sections" ON public.sections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public & auth read subjects" ON public.subjects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public & auth read faculty_profiles" ON public.faculty_profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public & auth read faculty_subject_allocations" ON public.faculty_subject_allocations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public & auth read import_audit_logs" ON public.import_audit_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public & auth read document_extractions" ON public.document_extractions FOR SELECT TO anon, authenticated USING (true);

-- Write Policies
CREATE POLICY "Auth write institutions" ON public.institutions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth write departments" ON public.departments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth write buildings" ON public.buildings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth write rooms" ON public.rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth write academic_sessions" ON public.academic_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth write programs" ON public.programs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth write semesters" ON public.semesters FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth write sections" ON public.sections FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth write subjects" ON public.subjects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth write faculty_profiles" ON public.faculty_profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth write faculty_subject_allocations" ON public.faculty_subject_allocations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth write import_audit_logs" ON public.import_audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth write document_extractions" ON public.document_extractions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 17. Enable Supabase Realtime Synchronization
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.institutions;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.programs;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.semesters;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.sections;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.subjects;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_profiles;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_subject_allocations;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.import_audit_logs;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

COMMIT;
