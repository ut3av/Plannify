import React from 'react';
import { render, screen } from '@testing-library/react';
import BrandLogo from './components/common/BrandLogo';
import { buildApiPayload, formatResult } from './utils/timetableFormatter';

test('renders BrandLogo with Plannify branding', () => {
  render(<BrandLogo size="md" />);
  const matches = screen.getAllByText(/Plannify/i);
  expect(matches.length).toBeGreaterThan(0);
});

test('formats institutional timetable payloads correctly', () => {
  const payload = buildApiPayload({
    teachers: [{ name: "Dr. Alan Turing", department: "Computer Science" }],
    sections: [{ name: "CS-A", room: "Room 101" }],
    subjects: [{ code: "CS101", name: "Data Structures", teacher: "Dr. Alan Turing", required_slots: 3 }],
    rooms: ["Room 101"],
    timeSlots: ["09:00 AM - 09:45 AM"]
  });

  expect(payload.teachers.length).toBe(1);
  expect(payload.teachers[0].name).toBe("Dr. Alan Turing");
  expect(payload.sections.length).toBe(1);
  expect(payload.subjects.length).toBe(1);

  const formatted = formatResult({
    days: ["Mon"],
    time_slots: ["09:00 AM - 09:45 AM"],
    assignments: [{ day: "Mon", slot: "09:00 AM - 09:45 AM", subject: "Data Structures", teacher: "Dr. Alan Turing", section: "CS-A", room: "Room 101" }]
  });

  expect(formatted.timetable.Mon["09:00 AM - 09:45 AM"].length).toBe(1);
  expect(formatted.timetable.Mon["09:00 AM - 09:45 AM"][0].teacher).toBe("Dr. Alan Turing");
});

