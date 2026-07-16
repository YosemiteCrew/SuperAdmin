import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DataRequest } from '@superadmin/database';

jest.mock('@superadmin/database', () => ({
  prisma: {},
}));

jest.mock('@/app/(routes)/(dashboard)/privacy/requests/actions', () => ({
  logDataRequestAction: jest.fn(),
  updateDataRequestStatusAction: jest.fn(),
}));

import { RequestsTable } from '@/app/(routes)/(dashboard)/privacy/requests/RequestsTable';
import {
  logDataRequestAction,
  updateDataRequestStatusAction,
} from '@/app/(routes)/(dashboard)/privacy/requests/actions';

const mockLog = logDataRequestAction as jest.MockedFunction<typeof logDataRequestAction>;
const mockUpdate = updateDataRequestStatusAction as jest.MockedFunction<
  typeof updateDataRequestStatusAction
>;

// Fixed reference instant used for every deadline computation in these tests.
const NOW = new Date('2026-07-04T12:00:00.000Z');
const NOW_MS = NOW.getTime();

function makeRequest(overrides: Partial<DataRequest> = {}): DataRequest {
  return {
    id: 'dr_1',
    subjectEmail: 'person@example.com',
    type: 'access',
    status: 'received',
    notes: null,
    receivedAt: new Date('2026-07-01T00:00:00.000Z'),
    dueAt: new Date('2026-07-31T00:00:00.000Z'),
    fulfilledAt: null,
    handledBy: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RequestsTable', () => {
  it('shows empty state when there are no requests', () => {
    render(<RequestsTable requests={[]} nowMs={NOW_MS} />);
    expect(screen.getByText(/No data-subject requests logged yet/)).toBeInTheDocument();
  });

  it('renders subject email and type label', () => {
    render(<RequestsTable requests={[makeRequest()]} nowMs={NOW_MS} />);
    expect(screen.getByText('person@example.com')).toBeInTheDocument();
    // "Access" also appears as an <option> in the log form's type select, so
    // scope the assertion to the row cell.
    const typeCells = screen.getAllByText('Access').filter((el) => el.tagName === 'TD');
    expect(typeCells).toHaveLength(1);
  });

  it('shows a "Due in N days" badge for an open request before its deadline', () => {
    // dueAt is 2026-07-31, now is 2026-07-04 -> 27 days.
    render(<RequestsTable requests={[makeRequest()]} nowMs={NOW_MS} />);
    expect(screen.getByText(/Due in 27 days/)).toBeInTheDocument();
  });

  it('shows an "Overdue by N days" badge for an open request past its deadline', () => {
    const req = makeRequest({ dueAt: new Date('2026-07-01T12:00:00.000Z') });
    render(<RequestsTable requests={[req]} nowMs={NOW_MS} />);
    expect(screen.getByText(/Overdue by 3 days/)).toBeInTheDocument();
  });

  it('uses singular "day" when exactly one day remains', () => {
    const req = makeRequest({ dueAt: new Date('2026-07-05T00:00:00.000Z') });
    render(<RequestsTable requests={[req]} nowMs={NOW_MS} />);
    expect(screen.getByText(/Due in 1 day$/)).toBeInTheDocument();
  });

  it('uses singular "day" when overdue by exactly one day', () => {
    const req = makeRequest({ dueAt: new Date('2026-07-03T12:00:00.000Z') });
    render(<RequestsTable requests={[req]} nowMs={NOW_MS} />);
    expect(screen.getByText(/Overdue by 1 day$/)).toBeInTheDocument();
  });

  it('falls back to the raw type string for an unknown type', () => {
    const req = makeRequest({ type: 'portability' });
    render(<RequestsTable requests={[req]} nowMs={NOW_MS} />);
    expect(screen.getByText('portability')).toBeInTheDocument();
  });

  it('shows "Closed" instead of a countdown for a fulfilled request', () => {
    const req = makeRequest({ status: 'fulfilled', dueAt: new Date('2026-07-01T00:00:00.000Z') });
    render(<RequestsTable requests={[req]} nowMs={NOW_MS} />);
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
  });

  it('renders the log form fields', () => {
    render(<RequestsTable requests={[]} nowMs={NOW_MS} />);
    expect(screen.getByLabelText(/Subject email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Type$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument();
  });

  it('submits the log form and shows the success message', async () => {
    mockLog.mockResolvedValue({ ok: true });
    render(<RequestsTable requests={[]} nowMs={NOW_MS} />);

    fireEvent.change(screen.getByLabelText(/Subject email/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Log request/i }));

    await waitFor(() => expect(mockLog).toHaveBeenCalled());
    expect(await screen.findByText(/30-day response clock has started/)).toBeInTheDocument();
  });

  it('shows the error message when the action reports a failure', async () => {
    mockLog.mockResolvedValue({ ok: false, error: 'A valid subject email is required' });
    render(<RequestsTable requests={[]} nowMs={NOW_MS} />);

    // Fill the field so the form actually submits; the error is what the mocked
    // server action returns, not native constraint validation.
    fireEvent.change(screen.getByLabelText(/Subject email/i), {
      target: { value: 'someone@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Log request/i }));

    expect(await screen.findByText('A valid subject email is required')).toBeInTheDocument();
  });

  it('submits a status update for a row', async () => {
    mockUpdate.mockResolvedValue({ ok: true });
    render(<RequestsTable requests={[makeRequest()]} nowMs={NOW_MS} />);

    fireEvent.change(screen.getByLabelText(/Status for person@example.com/i), {
      target: { value: 'fulfilled' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Update/i }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  });

  it('shows an inline error when a status update fails', async () => {
    mockUpdate.mockResolvedValue({ ok: false, error: 'Unknown status' });
    render(<RequestsTable requests={[makeRequest()]} nowMs={NOW_MS} />);

    fireEvent.click(screen.getByRole('button', { name: /Update/i }));

    expect(await screen.findByText('Unknown status')).toBeInTheDocument();
  });

  it('renders the current status badge for a row', () => {
    render(<RequestsTable requests={[makeRequest({ status: 'in_progress' })]} nowMs={NOW_MS} />);
    // "In progress" also appears as a <select> option, so match the badge span.
    const badges = screen.getAllByText('In progress').filter((el) => el.tagName === 'SPAN');
    expect(badges).toHaveLength(1);
  });
});
