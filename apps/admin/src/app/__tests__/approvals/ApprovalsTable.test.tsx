import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { QueueRow } from '@/app/features/approvals/queue';
import { ApprovalsTable } from '@/app/(routes)/(dashboard)/approvals/ApprovalsTable';

const bulkApproveMock = jest.fn();
const bulkRejectMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/approvals/bulkActions', () => ({
  bulkApproveAccountsAction: (...args: unknown[]) => bulkApproveMock(...args),
  bulkRejectAccountsAction: (...args: unknown[]) => bulkRejectMock(...args),
}));

jest.mock('@/app/(routes)/(dashboard)/approvals/ApprovalRowActions', () => ({
  ApprovalRowActions: () => <div data-testid="row-actions" />,
}));

const ROWS: QueueRow[] = [
  { id: 'u1', email: 'a@b.com', joinedAt: 1_700_000_000_000, status: 'pending' },
  { id: 'u2', email: 'c@d.com', joinedAt: 1_700_000_100_000, status: 'pending' },
  { id: 'u3', email: 'e@f.com', joinedAt: 1_700_000_200_000, status: 'approved', decidedAt: 1 },
];

const originalConfirm = globalThis.confirm;

beforeEach(() => {
  jest.clearAllMocks();
  bulkApproveMock.mockResolvedValue({ processed: 2, skipped: 0, emailsSent: 2 });
  bulkRejectMock.mockResolvedValue({ processed: 1, skipped: 0 });
  globalThis.confirm = jest.fn(() => true);
});

afterEach(() => {
  globalThis.confirm = originalConfirm;
});

describe('ApprovalsTable', () => {
  it('renders rows with checkboxes only for pending accounts', () => {
    render(<ApprovalsTable rows={ROWS} />);
    expect(screen.getByRole('checkbox', { name: 'Select a@b.com' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select c@d.com' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Select e@f.com' })).not.toBeInTheDocument();
  });

  it('shows the bulk bar only when rows are selected', () => {
    render(<ApprovalsTable rows={ROWS} />);
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select a@b.com' }));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject 1' })).toBeInTheDocument();
  });

  it('select-all toggles every pending row', () => {
    render(<ApprovalsTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all pending accounts' }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all pending accounts' }));
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('bulk approve is confirm-gated and reports the outcome', async () => {
    render(<ApprovalsTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all pending accounts' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve 2' }));

    expect(globalThis.confirm).toHaveBeenCalledWith(expect.stringContaining('Approve 2 accounts?'));
    await waitFor(() => {
      expect(screen.getByText(/2 approved, 2 emails sent/)).toBeInTheDocument();
    });
    expect(bulkApproveMock).toHaveBeenCalledWith(expect.arrayContaining(['u1', 'u2']));
  });

  it('does nothing when the confirm is dismissed', () => {
    globalThis.confirm = jest.fn(() => false);
    render(<ApprovalsTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select a@b.com' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject 1' }));
    expect(bulkRejectMock).not.toHaveBeenCalled();
  });

  it('bulk reject warns about the disable in the confirm text', () => {
    // Dismiss so no state update escapes the test after the assertion.
    globalThis.confirm = jest.fn(() => false);
    render(<ApprovalsTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select a@b.com' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject 1' }));
    expect(globalThis.confirm).toHaveBeenCalledWith(expect.stringContaining('disabled'));
  });

  it('shows the error returned by the bulk action', async () => {
    bulkApproveMock.mockResolvedValue({ error: 'Select at most 50 accounts per batch.' });
    render(<ApprovalsTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select a@b.com' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve 1' }));

    await waitFor(() => {
      expect(screen.getByText(/at most 50/)).toBeInTheDocument();
    });
  });

  it('reports skipped counts', async () => {
    bulkRejectMock.mockResolvedValue({ processed: 1, skipped: 1 });
    render(<ApprovalsTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all pending accounts' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject 2' }));

    await waitFor(() => {
      expect(screen.getByText(/1 rejected, 1 skipped/)).toBeInTheDocument();
    });
  });

  it('renders the empty state when there are no rows', () => {
    render(<ApprovalsTable rows={[]} />);
    expect(screen.getByText(/No accounts match/)).toBeInTheDocument();
  });

  it('renders a custom empty message', () => {
    render(<ApprovalsTable rows={[]} emptyMessage="No accounts waiting for approval." />);
    expect(screen.getByText(/No accounts waiting/)).toBeInTheDocument();
  });

  it('prunes selected ids whose rows are no longer pending', () => {
    const { rerender } = render(<ApprovalsTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select a@b.com' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select c@d.com' }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    // Server revalidation: u1 was approved elsewhere and left 'pending'.
    const refreshed: QueueRow[] = [
      { ...ROWS[0], status: 'approved', decidedAt: 2 },
      ROWS[1],
      ROWS[2],
    ];
    rerender(<ApprovalsTable rows={refreshed} />);

    // The stale id drops out of the count instead of leaving a stuck bar.
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('clears the bulk bar entirely when every selected row left pending', () => {
    const { rerender } = render(<ApprovalsTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select a@b.com' }));
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    rerender(<ApprovalsTable rows={[{ ...ROWS[0], status: 'rejected', decidedAt: 2 }, ROWS[2]]} />);
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('select-all caps the selection at the batch limit', () => {
    const many: QueueRow[] = Array.from({ length: 60 }, (_, i) => ({
      id: `u${i}`,
      email: `user${i}@test.com`,
      joinedAt: 1_700_000_000_000 + i,
      status: 'pending' as const,
    }));
    render(<ApprovalsTable rows={many} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all pending accounts' }));

    expect(screen.getByText('50 selected')).toBeInTheDocument();
    expect(screen.getByText(/max 50 per batch/)).toBeInTheDocument();
  });

  it('styles errors with the danger token in a live region', async () => {
    bulkApproveMock.mockResolvedValue({ error: 'No accounts selected.' });
    render(<ApprovalsTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select a@b.com' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve 1' }));

    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('No accounts selected.');
      expect(status.className).toContain('var(--danger-text)');
    });
  });

  it('reports failed counts in the summary', async () => {
    bulkApproveMock.mockResolvedValue({ processed: 1, skipped: 0, failed: 1, emailsSent: 1 });
    render(<ApprovalsTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all pending accounts' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve 2' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('1 approved, 1 failed, 1 emails sent');
    });
  });
});
