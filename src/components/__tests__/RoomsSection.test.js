import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RoomsSection from '../RoomsSection';
import { AcademicProvider } from '../../context/AcademicContext';

// Mock @supabase/supabase-js directly so all imports of supabaseClient get a mock
jest.mock('@supabase/supabase-js', () => {
  const createMockChannel = () => {
    const ch = {};
    ch.on = jest.fn(() => ch);
    ch.subscribe = jest.fn(() => ch);
    return ch;
  };

  const createMockQuery = () => {
    const q = {};
    q.select = jest.fn(() => q);
    q.order = jest.fn(() => q);
    q.delete = jest.fn(() => q);
    q.upsert = jest.fn(() => q);
    q.ilike = jest.fn(() => q);
    q.in = jest.fn(() => q);
    q.eq = jest.fn(() => q);
    q.or = jest.fn(() => q);
    q.single = jest.fn().mockResolvedValue({ data: null, error: null });
    q.then = (resolve) => resolve({ data: [], error: null });
    return q;
  };

  return {
    createClient: jest.fn(() => ({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signUp: jest.fn().mockResolvedValue({ error: null }),
      },
      from: jest.fn(() => createMockQuery()),
      channel: jest.fn(() => createMockChannel()),
      removeChannel: jest.fn(),
    })),
  };
});

describe('RoomsSection Component', () => {
  const initialRooms = ['Room 101', 'Room 102', 'Lab 007'];

  test('renders initial rooms and active venues count', () => {
    render(
      <AcademicProvider>
        <RoomsSection rooms={initialRooms} onChange={jest.fn()} />
      </AcademicProvider>
    );

    expect(screen.getByText('3 Active Venues')).toBeInTheDocument();
    expect(screen.getByText('Room 101')).toBeInTheDocument();
    expect(screen.getByText('Room 102')).toBeInTheDocument();
    expect(screen.getByText('Lab 007')).toBeInTheDocument();
  });

  test('shows inline warning when typing duplicate room name and disables add button', () => {
    render(
      <AcademicProvider>
        <RoomsSection rooms={initialRooms} onChange={jest.fn()} />
      </AcademicProvider>
    );

    const input = screen.getByPlaceholderText(/e\.g\. Room 308\/MCA/i);
    fireEvent.change(input, { target: { value: 'Room 101' } });

    expect(screen.getByText(/Already Exists/i)).toBeInTheDocument();
    expect(screen.getByText(/A venue named.*is already in the matrix/i)).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /\+ Add Venue/i });
    expect(addBtn).toBeDisabled();
  });

  test('selects and deselects all rooms via Select All toggle', () => {
    render(
      <AcademicProvider>
        <RoomsSection rooms={initialRooms} onChange={jest.fn()} />
      </AcademicProvider>
    );

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select All Filtered/i });
    fireEvent.click(selectAllCheckbox);

    // After select all, selection counter should appear
    expect(screen.getAllByText(/Venues Selected/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Delete Selected \(3\)/i).length).toBeGreaterThan(0);

    // Clicking clear selection
    const clearBtn = screen.getByText('Clear Selection');
    fireEvent.click(clearBtn);
    expect(screen.queryByText(/Delete Selected \(3\)/i)).not.toBeInTheDocument();
  });

  test('calls confirmation and removes selected rooms upon batch delete', () => {
    window.confirm = jest.fn(() => true);
    const mockOnChange = jest.fn();

    render(
      <AcademicProvider>
        <RoomsSection rooms={initialRooms} onChange={mockOnChange} />
      </AcademicProvider>
    );

    // Select Room 101 and Room 102 checkboxes
    const room101Checkbox = screen.getByTitle('Select Room 101');
    const room102Checkbox = screen.getByTitle('Select Room 102');
    fireEvent.click(room101Checkbox);
    fireEvent.click(room102Checkbox);

    const deleteSelectedBtns = screen.getAllByText(/Delete Selected \(2\)/i);
    expect(deleteSelectedBtns.length).toBeGreaterThan(0);
    fireEvent.click(deleteSelectedBtns[0]);

    expect(window.confirm).toHaveBeenCalled();
  });
});
