import { fireEvent, render, screen } from '@testing-library/react';

import { DeleteUserButton } from '@/app/(routes)/(dashboard)/users/DeleteUserButton';

jest.mock('@/app/(routes)/(dashboard)/users/actions', () => ({
  deleteUserAction: jest.fn(),
}));

describe('DeleteUserButton', () => {
  const originalConfirm = globalThis.confirm;

  afterEach(() => {
    globalThis.confirm = originalConfirm;
  });

  it('renders the danger-zone variant with full label', () => {
    render(<DeleteUserButton userId="user-1" email="a@b.com" variant="danger-zone" />);
    expect(screen.getByRole('button', { name: /Delete user/i })).toBeInTheDocument();
  });

  it('renders the menu-item variant', () => {
    render(<DeleteUserButton userId="user-1" email="a@b.com" variant="menu-item" />);
    expect(screen.getByRole('button', { name: /Delete user/i })).toBeInTheDocument();
  });

  it('blocks submit if user dismisses the confirm', () => {
    globalThis.confirm = jest.fn(() => false);
    render(<DeleteUserButton userId="user-1" email="a@b.com" variant="danger-zone" />);
    const button = screen.getByRole('button', { name: /Delete user/i });
    fireEvent.submit(button.closest('form') as HTMLFormElement);
    expect(globalThis.confirm).toHaveBeenCalled();
  });

  it('proceeds with submit and shows pending state when the confirm is accepted', () => {
    globalThis.confirm = jest.fn(() => true);
    render(<DeleteUserButton userId="user-1" email="a@b.com" variant="danger-zone" />);
    const button = screen.getByRole('button', { name: /Delete user/i });
    fireEvent.submit(button.closest('form') as HTMLFormElement);
    expect(globalThis.confirm).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Deleting…/i })).toBeDisabled();
  });

  it('includes a hidden userId input on the form', () => {
    render(<DeleteUserButton userId="user-42" email="a@b.com" variant="danger-zone" />);
    const hidden = screen
      .getByRole('button', { name: /Delete user/i })
      .closest('form')
      ?.querySelector('input[name="userId"]') as HTMLInputElement | null;
    expect(hidden?.value).toBe('user-42');
  });
});
