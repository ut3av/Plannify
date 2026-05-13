import { supabase } from "../supabaseClient";

/**
 * High-level service to sync the Timetable state to relational tables
 * for n8n automation and advanced analytics.
 */
export const syncRelationalData = async ({ teachers, sections, subjects, rooms, timeSlots, result }) => {
  try {
    // 1. Sync Teachers (n8n needs these for WhatsApp/Email)
    const { data: teacherData, error: tError } = await supabase
      .from('teachers')
      .upsert(
        teachers.map(t => ({
          name: t.name,
          email: t.email || `${t.name.toLowerCase().replace(/\s/g, '.')}@univ.edu`,
          phone: t.phone || "+910000000000",
          free_periods: t.free_periods || 1
        })),
        { onConflict: 'name' }
      )
      .select();

    if (tError) throw tError;

    // 2. Sync Rooms
    const { data: roomData, error: rError } = await supabase
      .from('rooms')
      .upsert(
        rooms.map(r => ({ name: r, is_lab: r.toLowerCase().includes('lab') })),
        { onConflict: 'name' }
      )
      .select();

    if (rError) throw rError;

    // 3. Sync Sections
    const { data: sectionData, error: sError } = await supabase
      .from('sections')
      .upsert(
        sections.map(s => ({ name: s.name })),
        { onConflict: 'name' }
      )
      .select();

    if (sError) throw sError;

    // 4. Sync Time Slots
    const { data: slotData, error: slError } = await supabase
      .from('time_slots')
      .upsert(
        timeSlots.map((s, idx) => ({ label: s, slot_order: idx })),
        { onConflict: 'label' }
      )
      .select();

    if (slError) throw slError;

    // 5. Sync Assignments (Only if a timetable was generated)
    if (result && result.assignments) {
      // First, create a new Timetable entry
      const { data: timetable, error: ttError } = await supabase
        .from('timetables')
        .insert({ name: `Generated ${new Date().toLocaleString()}`, status: 'active' })
        .select()
        .single();

      if (ttError) throw ttError;

      // Map local assignment names to DB IDs
      const teacherMap = Object.fromEntries(teacherData.map(t => [t.name, t.id]));
      const roomMap = Object.fromEntries(roomData.map(r => [r.name, r.id]));
      const sectionMap = Object.fromEntries(sectionData.map(s => [s.name, s.id]));
      const slotMap = Object.fromEntries(slotData.map(s => [s.label, s.id]));

      const dbAssignments = result.assignments.map(a => ({
        timetable_id: timetable.id,
        day: a.day,
        slot_id: slotMap[a.slot],
        teacher_id: teacherMap[a.teacher],
        section_id: sectionMap[a.section],
        room_id: roomMap[a.room],
        is_proxy: a.is_proxy || false
      }));

      const { error: assError } = await supabase
        .from('assignments')
        .insert(dbAssignments);

      if (assError) throw assError;
    }

    return { success: true };
  } catch (error) {
    console.error("Relational Sync Error:", error);
    throw error;
  }
};
