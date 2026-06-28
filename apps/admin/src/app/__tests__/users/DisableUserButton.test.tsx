import { fireEvent, render, screen } from '@testing-library/react';

import { DisableUserButton } from '@/app/(routes)/(dashboard)/users/[id]/DisableUserButton';

jest.mock('@/app/(routes)/(dashboard)/users/[id]/actions', () => ({
  disableUserAction: jest.fn(),
  enableUserAction: jest.fn(),
}));

describe('DisableUserButton', () => {
  const originalConfirm = globalThis.confirm;
  afterEach(() => {
    globalThis.confirm = originalConfirm;
  });

  it('shows the Disable label for an active account', () => {
    render(<DisableUserButton userId="u-1" email="a@b.com" disabled={false} />);
    expect(screen.getByRole('button', { name: /disable account/i })).toBeInTheDocument();
  });

  it('shows the Enable label for a disabled account', () => {
    render(<DisableUserButton userId="u-1" email="a@b.com" disabled />);
    expect(screen.getByRole('button', { name: /enable account/i })).toBeInTheDocument();
  });

  it('blocks submission when the confirm is dismissed', () => {
    globalThis.confirm = jest.fn(() => false);
    render(<DisableUserButton userId="u-1" email="a@b.com" disabled={false} />);
    const button = screen.getByRole('button', { name: /disable account/i });
    fireEvent.submit(button.closest('form') as HTMLFormElement);
    expect(globalThis.confirm).toHaveBeenCalled();
    // Still shows the idle label since the submit was prevented.
    expect(screen.getByRole('button', { name: /disable account/i })).toBeInTheDocument();
  });

  it('proceeds and shows the pending label when confirmed', () => {
    globalThis.confirm = jest.fn(() => true);
    render(<DisableUserButton userId="u-1" email="a@b.com" disabled={false} />);
    const button = screen.getByRole('button', { name: /disable account/i });
    fireEvent.submit(button.closest('form') as HTMLFormElement);
    expect(globalThis.confirm).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /disabling…/i })).toBeDisabled();
  });

  it('shows the Enabling pending label when re-enabling a disabled account', () => {
    globalThis.confirm = jest.fn(() => true);
    render(<DisableUserButton userId="u-1" email="a@b.com" disabled />);
    const button = screen.getByRole('button', { name: /enable account/i });
    fireEvent.submit(button.closest('form') as HTMLFormElement);
    expect(screen.getByRole('button', { name: /enabling…/i })).toBeDisabled();
  });

  it('carries the userId in a hidden field', () => {
    render(<DisableUserButton userId="u-42" email="a@b.com" disabled={false} />);
    const hidden = screen
      .getByRole('button', { name: /disable account/i })
      .closest('form')
      ?.querySelector('input[name="userId"]') as HTMLInputElement | null;
    expect(hidden?.value).toBe('u-42');
  });
});
