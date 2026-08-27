import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FacultyDirectory from '../faculty/FacultyDirectory';
import { AcademicProvider } from '../../context/AcademicContext';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: [] }),
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
  put: jest.fn().mockResolvedValue({ data: { success: true } }),
  delete: jest.fn().mockResolvedValue({ data: { success: true } }),
}));

// Mock @supabase/supabase-js directly
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
    q.then = (resolve) => resolve({
      data: [
        {
          id: 'fac_101',
          teacher_name: 'Dr. Sanjana Singh',
          name: 'Dr. Sanjana Singh',
          employee_id: 'EMP-LNCT-101',
          department_name: 'Computer Applications',
          designation: 'Professor & HOD',
          status: 'active',
        },
        {
          id: 'fac_102',
          teacher_name: 'Prof. Rajesh Verma',
          name: 'Prof. Rajesh Verma',
          employee_id: 'EMP-LNCT-102',
          department_name: 'Computer Applications',
          designation: 'Associate Professor',
          status: 'active',
        }
      ],
      error: null
    });
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

describe('FacultyDirectory Component', () => {
  jest.setTimeout(15000);
  const mockTeachers = [
    { id: 'fac_101', name: 'Dr. Sanjana Singh', employee_id: 'EMP-LNCT-101' },
    { id: 'fac_102', name: 'Prof. Rajesh Verma', employee_id: 'EMP-LNCT-102' },
  ];

  test('shows inline warning and blocks adding identical faculty name', async () => {
    render(
      <AcademicProvider>
        <FacultyDirectory teachers={mockTeachers} />
      </AcademicProvider>
    );

    // Click Add Faculty button
    const addFacultyBtn = screen.getByRole('button', { name: /Add Faculty/i });
    fireEvent.click(addFacultyBtn);

    // Form inputs should be visible
    const nameInput = screen.getByPlaceholderText(/e\.g\. Dr\. John Doe/i);
    fireEvent.change(nameInput, { target: { value: 'Dr. Sanjana Singh' } });

    // Warning text should appear
    expect(screen.getByText(/Faculty with this name already exists in the directory/i)).toBeInTheDocument();

    // Try submitting
    const submitBtn = screen.getByRole('button', { name: /Save & Provision Faculty Account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/A faculty member named "Dr. Sanjana Singh" already exists/i)).toBeInTheDocument();
    });
  });

  test('shows inline warning and blocks adding duplicate employee ID', async () => {
    render(
      <AcademicProvider>
        <FacultyDirectory teachers={mockTeachers} />
      </AcademicProvider>
    );

    const addFacultyBtn = screen.getByRole('button', { name: /Add Faculty/i });
    fireEvent.click(addFacultyBtn);

    const nameInput = screen.getByPlaceholderText(/e\.g\. Dr\. John Doe/i);
    fireEvent.change(nameInput, { target: { value: 'Dr. New Professor' } });

    const empIdInput = screen.getByPlaceholderText(/EMP-LNCT-1001/i);
    fireEvent.change(empIdInput, { target: { value: 'EMP-LNCT-101' } });

    // Warning for emp id should appear
    expect(screen.getByText(/Employee ID is already assigned to another faculty member/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Save & Provision Faculty Account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Employee ID "EMP-LNCT-101" is already assigned/i)).toBeInTheDocument();
    });
  });
});
