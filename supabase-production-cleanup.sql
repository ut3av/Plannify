-- ==============================================================================
-- PLANIFY.EXE — PRODUCTION DATABASE CLEANUP SCRIPT (IDEMPOTENT)
-- ==============================================================================
-- Safely purges test/demo data in foreign-key dependency order.
-- Preserves schema structure, constraints, RLS policies, and system leave types.
-- ==============================================================================

-- 1. Purge substitution logs
DELETE FROM public.substitution_log;

-- 2. Purge attendance & biometric punch records
DELETE FROM public.attendance_records;

-- 3. Purge leave applications
DELETE FROM public.leave_applications;

-- 4. Purge faculty leave balances
DELETE FROM public.leave_balances;

-- 5. Purge timetable assignments (relational)
DELETE FROM public.timetable_assignments;

-- 6. Purge timetable versions (relational)
DELETE FROM public.timetables;

-- 7. Disassociate department head foreign keys before deleting faculty
UPDATE public.departments
SET head_of_department_id = NULL
WHERE head_of_department_id IS NOT NULL;

-- 8. Purge demo / test faculty profiles
DELETE FROM public.faculty_profiles
WHERE employee_id LIKE 'EMP-LNCT-%'
   OR employee_id LIKE 'FAC%'
   OR email LIKE '%@lnctu.ac.in'
   OR email LIKE '%@example.com';

-- 9. Purge demo departments (optional - keeps schema intact)
DELETE FROM public.departments
WHERE code IN ('MCA', 'BCA', 'CSE', 'AI-DA', 'IT');

-- 10. Purge draft timetable state rows (will be cleanly recreated on first save)
DELETE FROM public.timetable_state;

-- 11. Ensure standard institutional leave types exist
INSERT INTO public.leave_types (code, name, max_per_year, carry_forward, requires_document, color)
VALUES
  ('CL', 'Casual Leave', 12, false, false, '#3b82f6'),
  ('EL', 'Earned Leave', 15, true, false, '#10b981'),
  ('ML', 'Medical Leave', 10, false, true, '#ef4444'),
  ('OD', 'On Duty', 15, false, true, '#8b5cf6'),
  ('CO', 'Compensatory Off', 5, false, false, '#f59e0b')
ON CONFLICT (code) DO NOTHING;

-- ==============================================================================
-- VERIFICATION: Run this to confirm 0 test records remaining
-- ==============================================================================
SELECT 'faculty_profiles' AS table_name, count(*) AS record_count FROM public.faculty_profiles
UNION ALL SELECT 'attendance_records', count(*) FROM public.attendance_records
UNION ALL SELECT 'substitution_log', count(*) FROM public.substitution_log
UNION ALL SELECT 'leave_applications', count(*) FROM public.leave_applications
UNION ALL SELECT 'leave_balances', count(*) FROM public.leave_balances
UNION ALL SELECT 'timetables', count(*) FROM public.timetables
UNION ALL SELECT 'timetable_assignments', count(*) FROM public.timetable_assignments
UNION ALL SELECT 'timetable_state', count(*) FROM public.timetable_state
UNION ALL SELECT 'leave_types (system configuration)', count(*) FROM public.leave_types;
