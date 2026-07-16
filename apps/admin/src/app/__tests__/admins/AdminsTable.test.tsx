import { fireEvent, render, screen } from '@testing-library/react';

import { AdminsTable, type AdminRow } from '@/app/(routes)/(dashboard)/admins/AdminsTable';

const revokeMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/admins/actions', () => ({
  revokeAdminAction: (...args: unknown[]) => revokeMock(...args),
}));

const base: AdminRow = {
  id: 'u-1',
  email: 'alice@example.com',
  displayName: 'Alice Smith',
  lastSignInAt: 1_700_000_000_000,
  disabled: false,
  totpEnrolled: true,
  isBootstrap: false,
  isSelf: false,
  isLastAdmin: false,
};

describe('AdminsTable', () => {
  const originalConfirm = globalThis.confirm;

  afterEach(() => {
    globalThis.confirm = originalConfirm;
  });

  it('renders an empty-state message when rows is empty', () => {
    render(<AdminsTable rows={[]} />);
    expect(screen.getByText(/No super-admins found/i)).toBeInTheDocument();
  });

  it('renders the admin email and display name', () => {
    render(<AdminsTable rows={[base]} />);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('shows TOTP enrolled status', () => {
    render(<AdminsTable rows={[base]} />);
    expect(screen.getByText('TOTP')).toBeInTheDocument();
  });

  it('shows Not enrolled when TOTP is not set up', () => {
    render(<AdminsTable rows={[{ ...base, totpEnrolled: false }]} />);
    expect(screen.getByText('Not enrolled')).toBeInTheDocument();
  });

  it('shows Active status for an enabled admin', () => {
    render(<AdminsTable rows={[base]} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows Disabled status for a disabled admin', () => {
    render(<AdminsTable rows={[{ ...base, disabled: true }]} />);
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it("shows the You badge for the caller's own row", () => {
    render(<AdminsTable rows={[{ ...base, isSelf: true }]} />);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it("hides the Revoke button for the caller's own account", () => {
    render(<AdminsTable rows={[{ ...base, isSelf: true }]} />);
    expect(screen.queryByRole('button', { name: /Revoke/i })).not.toBeInTheDocument();
  });

  it('hides the Revoke button for bootstrap accounts', () => {
    render(<AdminsTable rows={[{ ...base, isBootstrap: true }]} />);
    expect(screen.queryByRole('button', { name: /Revoke/i })).not.toBeInTheDocument();
  });

  it('hides the Revoke button when this is the last admin', () => {
    render(<AdminsTable rows={[{ ...base, isLastAdmin: true }]} />);
    expect(screen.queryByRole('button', { name: /Revoke/i })).not.toBeInTheDocument();
  });

  it('shows the Revoke button for a revocable admin', () => {
    render(<AdminsTable rows={[base]} />);
    expect(screen.getByRole('button', { name: /Revoke/i })).toBeInTheDocument();
  });

  it('blocks revoke when confirm is dismissed', () => {
    globalThis.confirm = jest.fn(() => false);
    render(<AdminsTable rows={[base]} />);
    const form = screen.getByRole('button', { name: /Revoke/i }).closest('form')!;
    fireEvent.submit(form);
    expect(globalThis.confirm).toHaveBeenCalled();
  });

  it('shows Removing… and disables the button after confirmed revoke', () => {
    globalThis.confirm = jest.fn(() => true);
    render(<AdminsTable rows={[base]} />);
    const form = screen.getByRole('button', { name: /Revoke/i }).closest('form')!;
    fireEvent.submit(form);
    expect(screen.getByRole('button', { name: /Removing/i })).toBeDisabled();
  });

  it('renders a Manage link pointing to /users/[id]', () => {
    render(<AdminsTable rows={[base]} />);
    const link = screen.getByRole('link', { name: /Manage/i });
    expect(link).toHaveAttribute('href', `/users/${base.id}`);
  });

  it('carries the userId on the hidden input in the revoke form', () => {
    render(<AdminsTable rows={[base]} />);
    const hidden = screen
      .getByRole('button', { name: /Revoke/i })
      .closest('form')
      ?.querySelector('input[name="userId"]') as HTMLInputElement | null;
    expect(hidden?.value).toBe(base.id);
  });
});
