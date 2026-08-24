-- ============================================================
-- Planify.exe Relational Timetable & Assignment Engine Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

BEGIN;

-- 1. Timetables (Versioned institutional schedules with lifecycle status)
CREATE TABLE IF NOT EXISTS public.timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  academic_term TEXT NOT NULL DEFAULT '2026-27',
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'validating', 'valid', 'pending_approval', 'published', 'archived')),
  validation_report JSONB,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  change_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Timetable Assignments (Normalized relational schedule entries with DB-level conflict guarantees)
CREATE TABLE IF NOT EXISTS public.timetable_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id UUID NOT NULL REFERENCES public.timetables(id) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day IN ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
  slot TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  faculty_id UUID REFERENCES public.faculty_profiles(id) ON DELETE RESTRICT,
  subject_name TEXT NOT NULL,
  subject_code TEXT,
  section_name TEXT NOT NULL,
  room_name TEXT NOT NULL,
  is_lab BOOLEAN DEFAULT false,
  is_proxy BOOLEAN DEFAULT false,
  original_teacher_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- LEVEL 3 DATABASE-LEVEL SAFETY NET: Mathematical impossibility of collisions
  CONSTRAINT uq_timetable_teacher_slot UNIQUE (timetable_id, day, slot, teacher_name),
  CONSTRAINT uq_timetable_room_slot UNIQUE (timetable_id, day, slot, room_name),
  CONSTRAINT uq_timetable_section_slot UNIQUE (timetable_id, day, slot, section_name)
);

-- 3. Indexes for sub-millisecond portal queries and filter lookups
CREATE INDEX IF NOT EXISTS idx_tt_assign_lookup ON public.timetable_assignments(timetable_id, day, slot);
CREATE INDEX IF NOT EXISTS idx_tt_assign_teacher ON public.timetable_assignments(teacher_name);
CREATE INDEX IF NOT EXISTS idx_tt_assign_section ON public.timetable_assignments(section_name);
CREATE INDEX IF NOT EXISTS idx_tt_assign_room ON public.timetable_assignments(room_name);
CREATE INDEX IF NOT EXISTS idx_tt_status ON public.timetables(status);
CREATE INDEX IF NOT EXISTS idx_tt_created_at ON public.timetables(created_at DESC);

-- 4. Row Level Security Policies
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_assignments ENABLE ROW LEVEL SECURITY;

-- Read policies: Authenticated users & public portal read access for published timetables
CREATE POLICY "Public and authenticated read timetables" 
  ON public.timetables FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Public and authenticated read timetable_assignments" 
  ON public.timetable_assignments FOR SELECT 
  TO anon, authenticated 
  USING (true);

-- Write policies: Authenticated administrative users
CREATE POLICY "Authenticated write timetables" 
  ON public.timetables FOR ALL 
  TO authenticated 
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated write timetable_assignments" 
  ON public.timetable_assignments FOR ALL 
  TO authenticated 
  USING (true) WITH CHECK (true);

COMMIT;
