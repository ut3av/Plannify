import React from 'react';
import { render, screen } from '@testing-library/react';
import BrandLogo from './components/common/BrandLogo';
import { DEMO_TIMETABLE_DATA } from './data/demoTimetableData';

test('renders BrandLogo with Plannify branding', () => {
  render(<BrandLogo size="md" />);
  const matches = screen.getAllByText(/Plannify/i);
  expect(matches.length).toBeGreaterThan(0);
});

test('contains valid demo timetable faculty dataset', () => {
  expect(DEMO_TIMETABLE_DATA.teachers.length).toBeGreaterThan(0);
  expect(DEMO_TIMETABLE_DATA.sections.length).toBeGreaterThan(0);
  expect(DEMO_TIMETABLE_DATA.subjects.length).toBeGreaterThan(0);
});

