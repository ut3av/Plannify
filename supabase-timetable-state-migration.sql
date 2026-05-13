begin;

alter table public.timetable_state
  add column if not exists teachers jsonb,
  add column if not exists sections jsonb,
  add column if not exists subjects jsonb,
  add column if not exists rooms jsonb,
  add column if not exists time_slots jsonb,
  add column if not exists updated_at timestamptz default now();

update public.timetable_state
set
  teachers = coalesce(teachers, nullif(room, '')::jsonb),
  sections = coalesce(sections, nullif(email, '')::jsonb),
  subjects = coalesce(subjects, nullif(day, '')::jsonb),
  rooms = coalesce(rooms, nullif(subject, '')::jsonb),
  time_slots = coalesce(time_slots, nullif(teacher_name, '')::jsonb),
  updated_at = coalesce(slot::timestamptz, updated_at, now())
where
  room is not null
  or email is not null
  or day is not null
  or subject is not null
  or teacher_name is not null
  or slot is not null;

alter table public.timetable_state
  drop column if exists teacher_name,
  drop column if exists email,
  drop column if exists subject,
  drop column if exists day,
  drop column if exists slot,
  drop column if exists room;

comment on table public.timetable_state is 'Planify cloud draft state for the timetable builder.';
comment on column public.timetable_state.id is 'Stable draft id used by the app.';
comment on column public.timetable_state.teachers is 'Teacher list JSON used by the timetable builder.';
comment on column public.timetable_state.sections is 'Section list JSON used by the timetable builder.';
comment on column public.timetable_state.subjects is 'Subject list JSON used by the timetable builder.';
comment on column public.timetable_state.rooms is 'Classroom and lab room list JSON used by the timetable builder.';
comment on column public.timetable_state.time_slots is 'Daily time slot list JSON used by the timetable builder.';
comment on column public.timetable_state.updated_at is 'Last cloud save timestamp.';

commit;
