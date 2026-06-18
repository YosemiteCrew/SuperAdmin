import { fireEvent, render, screen } from '@testing-library/react';

import { RoleButton } from '@/app/(routes)/(dashboard)/users/[id]/RoleButton';

const grantMock = jest.fn();
const revokeMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/users/[id]/actions', () => ({
  grantSuperAdminAction: (...args: unknown[]) => grantMock(...args),
  revokeSuperAdminAction: (...args: unknown[]) => revokeMock(...args),
}));

describe('RoleButton', () => {
  const originalConfirm = globalThis.confirm;

  afterEach(() => {
    globalThis.confirm = originalConfirm;
  });

  it('labels "Make super-admin" for a standard user', () => {
    render(<RoleButton userId="u-1" email="a@b.com" isAdmin={false} />);
    expect(screen.getByRole('button', { name: /Make super-admin/i })).toBeInTheDocument();
  });

  it('labels "Remove super-admin" for an existing admin', () => {
    render(<RoleButton userId="u-1" email="a@b.com" isAdmin />);
    expect(screen.getByRole('button', { name: /Remove super-admin/i })).toBeInTheDocument();
  });

  it('blocks submit when the confirm is dismissed', () => {
    globalThis.confirm = jest.fn(() => false);
    render(<RoleButton userId="u-1" email="a@b.com" isAdmin={false} />);
    const button = screen.getByRole('button', { name: /Make super-admin/i });
    fireEvent.submit(button.closest('form') as HTMLFormElement);
    expect(globalThis.confirm).toHaveBeenCalled();
  });

  it('carries the userId on a hidden input', () => {
    render(<RoleButton userId="user-9" email="a@b.com" isAdmin />);
    const hidden = screen
      .getByRole('button', { name: /Remove super-admin/i })
      .closest('form')
      ?.querySelector('input[name="userId"]') as HTMLInputElement | null;
    expect(hidden?.value).toBe('user-9');
  });
});
