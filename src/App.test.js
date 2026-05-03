import { render, screen } from '@testing-library/react';
import App from './App';

test('renders timetable scheduler app', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /ai-powered timetable scheduler/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /generate timetable/i })).toBeInTheDocument();
});
