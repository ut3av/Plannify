import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Planify application shell without crashing', () => {
  render(<App />);
  const matches = screen.getAllByText(/Planify/i);
  expect(matches.length).toBeGreaterThan(0);
});
