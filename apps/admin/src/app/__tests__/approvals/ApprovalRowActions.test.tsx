import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ApprovalRowActions } from '@/app/(routes)/(dashboard)/approvals/ApprovalRowActions';

const approveMock = jest.fn();
const rejectMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/approvals/actions', () => ({
  approveAccountAction: (...args: unknown[]) => approveMock(...args),
  rejectAccountAction: (...args: unknown[]) => rejectMock(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  approveMock.mockResolvedValue({ emailSent: true });
  rejectMock.mockResolvedValue({});
});

describe('ApprovalRowActions', () => {
  it('renders Approve and Reject buttons labelled with the account email', () => {
    render(<ApprovalRowActions userId="u1" email="pet@owner.com" />);
    expect(screen.getByRole('button', { name: 'Approve pet@owner.com' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject pet@owner.com' })).toBeInTheDocument();
  });

  it('carries the userId and expectedStatus=pending in both forms', () => {
    render(<ApprovalRowActions userId="u1" email="a@b.com" />);
    const forms = screen.getAllByRole('button').map((b) => b.closest('form') as HTMLFormElement);
    for (const form of forms) {
      expect(form.querySelector('input[name="userId"]')).toHaveValue('u1');
      expect(form.querySelector('input[name="expectedStatus"]')).toHaveValue('pending');
    }
  });

  it('shows the welcome-email confirmation after approving', async () => {
    render(<ApprovalRowActions userId="u1" email="a@b.com" />);
    fireEvent.submit(
      screen.getByRole('button', { name: /Approve/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(screen.getByText(/Welcome email sent/i)).toBeInTheDocument();
    });
    expect(approveMock).toHaveBeenCalled();
  });

  it('shows the stale-state error returned by the action', async () => {
    approveMock.mockResolvedValue({
      error: 'This account changed state since the page loaded. Refresh and review again.',
    });
    render(<ApprovalRowActions userId="u1" email="a@b.com" />);
    fireEvent.submit(
      screen.getByRole('button', { name: /Approve/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(screen.getByText(/changed state since the page loaded/i)).toBeInTheDocument();
    });
  });

  it('shows the still-disabled warning after approving a disabled account', async () => {
    approveMock.mockResolvedValue({
      emailSent: false,
      warning:
        'Approved, but the account is still disabled from a separate admin action. No welcome email was sent.',
    });
    render(<ApprovalRowActions userId="u1" email="a@b.com" />);
    fireEvent.submit(
      screen.getByRole('button', { name: /Approve/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(screen.getByText(/still disabled/i)).toBeInTheDocument();
    });
  });

  it('invokes the reject action from the Reject form', async () => {
    render(<ApprovalRowActions userId="u1" email="a@b.com" />);
    fireEvent.submit(
      screen.getByRole('button', { name: /Reject/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(rejectMock).toHaveBeenCalled();
    });
  });

  it('shows the revocation warning returned by a reject', async () => {
    rejectMock.mockResolvedValue({
      warning:
        'Rejected and sign-in blocked, but revoking live sessions failed. Use the user page to revoke sessions.',
    });
    render(<ApprovalRowActions userId="u1" email="a@b.com" />);
    fireEvent.submit(
      screen.getByRole('button', { name: /Reject/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(screen.getByText(/revoking live sessions failed/i)).toBeInTheDocument();
    });
  });
});
