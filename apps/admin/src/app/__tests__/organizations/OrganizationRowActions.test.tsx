import { fireEvent, render, screen } from '@testing-library/react';

import { OrganizationRowActions } from '@/app/(routes)/(dashboard)/organizations/OrganizationRowActions';

jest.mock('@/app/(routes)/(dashboard)/organizations/actions', () => ({
  verifyOrganizationAction: jest.fn(),
  suspendOrganizationAction: jest.fn(),
  reactivateOrganizationAction: jest.fn(),
}));

describe('OrganizationRowActions', () => {
  const originalConfirm = globalThis.confirm;
  afterEach(() => {
    globalThis.confirm = originalConfirm;
  });

  it('offers Verify and Suspend for a pending business', () => {
    render(<OrganizationRowActions organizationId="o1" name="Acme Vet" state="pending" />);
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reactivate' })).not.toBeInTheDocument();
  });

  it('offers only Suspend for a verified business', () => {
    render(<OrganizationRowActions organizationId="o1" name="Acme Vet" state="verified" />);
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeInTheDocument();
  });

  it('offers only Reactivate for a suspended business', () => {
    render(<OrganizationRowActions organizationId="o1" name="Acme Vet" state="suspended" />);
    expect(screen.getByRole('button', { name: 'Reactivate' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument();
  });

  it('blocks the action when the confirmation is dismissed', () => {
    globalThis.confirm = jest.fn(() => false);
    render(<OrganizationRowActions organizationId="o1" name="Acme Vet" state="pending" />);
    const form = screen.getByRole('button', { name: 'Verify' }).closest('form') as HTMLFormElement;
    fireEvent.submit(form);
    expect(globalThis.confirm).toHaveBeenCalled();
  });

  it('disables the buttons after a confirmed action', () => {
    globalThis.confirm = jest.fn(() => true);
    render(<OrganizationRowActions organizationId="o1" name="Acme Vet" state="pending" />);
    const verify = screen.getByRole('button', { name: 'Verify' });
    fireEvent.submit(verify.closest('form') as HTMLFormElement);
    expect(verify).toBeDisabled();
  });

  it('carries the organizationId on a hidden input', () => {
    render(<OrganizationRowActions organizationId="org-42" name="Acme Vet" state="pending" />);
    const hidden = screen
      .getByRole('button', { name: 'Verify' })
      .closest('form')
      ?.querySelector('input[name="organizationId"]') as HTMLInputElement | null;
    expect(hidden?.value).toBe('org-42');
  });
});
