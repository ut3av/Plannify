/**
 * Timetable Formatters & Payload Builders
 * Pure formatting and structure normalizers for the institutional timetable engine.
 */

export function buildApiPayload(data) {
  const formattedTeachers = (data.teachers || []).map(t => {
    if (typeof t === "string") {
      const clean = t.trim();
      return {
        name: clean,
        department: "Computer Applications",
        designation: clean.startsWith("Dr") ? "Associate Professor" : (clean.startsWith("Prof") ? "Professor" : "Assistant Professor"),
        email: `${clean.toLowerCase().replace(/[^a-z0-9]/g, '.')}@university.edu`,
        phone: "+91-9876543210",
        free_periods: 1,
        max_weekly_hours: 16,
        weekly_workload_capacity: 16
      };
    }
    const cleanName = (t?.name || "Faculty Member").trim();
    const capacity = t?.weekly_workload_capacity || t?.max_weekly_hours || 16;
    return {
      ...t,
      name: cleanName,
      free_periods: t?.free_periods !== undefined ? t.free_periods : 1,
      max_weekly_hours: capacity,
      weekly_workload_capacity: capacity,
      email: (t?.email || "").trim() || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@university.edu`,
      phone: (t?.phone || "").trim() || "+91-9876543210",
    };
  });

  const formattedSubjects = (data.subjects || []).map(sub => {
    const isLab = Boolean(sub.is_lab || (sub.name && sub.name.toLowerCase().includes("lab")));
    const slots = sub.required_slots && sub.required_slots > 0 ? sub.required_slots : 4;
    return {
      ...sub,
      is_lab: isLab,
      required_slots: isLab && slots % 2 !== 0 ? slots + 1 : slots
    };
  });

  const formattedSections = (data.sections || []).map(s => {
    if (typeof s === "string") {
      return { name: s, room: "", lab_room: "", lab_rooms: [], preferred_faculty: [] };
    }
    const labs = Array.isArray(s?.lab_rooms) && s.lab_rooms.length > 0
      ? s.lab_rooms
      : (s?.lab_room ? [s.lab_room] : []);
    return {
      name: s?.name || "Section",
      room: s?.room || "",
      lab_room: labs[0] || s?.lab_room || "",
      lab_rooms: labs,
      preferred_faculty: Array.isArray(s?.preferred_faculty) ? s.preferred_faculty : []
    };
  });

  return {
    teachers: formattedTeachers,
    subjects: formattedSubjects,
    rooms: data.rooms || [],
    sections: formattedSections,
    time_slots: data.timeSlots || [],
  };
}

export function formatResult(rawResult) {
  if (!rawResult) return null;
  const days = rawResult.days || ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const time_slots = rawResult.time_slots || [
    "09:00 AM - 09:45 AM",
    "09:45 AM - 10:30 AM",
    "10:30 AM - 11:20 AM",
    "11:20 AM - 12:10 PM",
    "01:00 PM - 01:50 PM",
    "01:50 PM - 02:40 PM",
    "02:40 PM - 03:30 PM",
  ];
  const assignments = rawResult.assignments || [];

  // Build complete 2D timetable grid map
  const timetable = {};
  days.forEach(d => {
    timetable[d] = {};
    time_slots.forEach(s => {
      timetable[d][s] = [];
    });
  });

  // If rawResult already has a valid nested timetable object, copy over
  if (rawResult.timetable && typeof rawResult.timetable === "object") {
    Object.keys(rawResult.timetable).forEach(d => {
      if (!timetable[d]) timetable[d] = {};
      Object.keys(rawResult.timetable[d]).forEach(s => {
        timetable[d][s] = Array.isArray(rawResult.timetable[d][s]) ? [...rawResult.timetable[d][s]] : [];
      });
    });
  }

  // Populate from assignments array
  assignments.forEach(item => {
    const d = item.day;
    const s = item.slot;
    if (timetable[d] && timetable[d][s]) {
      const exists = timetable[d][s].some(
        existing => existing.subject === item.subject && existing.section === item.section && existing.teacher === item.teacher
      );
      if (!exists) {
        timetable[d][s].push({
          code: item.code || "",
          subject: item.subject || "",
          teacher: item.teacher || "",
          room: item.room || "",
          section: item.section || "",
          is_lab: !!item.is_lab,
          is_proxy: !!item.is_proxy,
          original_teacher: item.original_teacher || null
        });
      }
    }
  });

  return {
    ...rawResult,
    days,
    time_slots,
    timetable,
    assignments
  };
}
