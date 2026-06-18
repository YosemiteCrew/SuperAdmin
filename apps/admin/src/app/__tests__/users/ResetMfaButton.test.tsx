import { fireEvent, render, screen } from '@testing-library/react';

import { ResetMfaButton } from '@/app/(routes)/(dashboard)/users/[id]/ResetMfaButton';

jest.mock('@/app/(routes)/(dashboard)/users/[id]/actions', () => ({
  resetMfaAction: jest.fn(),
}));

describe('ResetMfaButton', () => {
  const originalConfirm = globalThis.confirm;

  afterEach(() => {
    globalThis.confirm = originalConfirm;
  });

  it('labels the button "Reset 2FA device" when a device is present', () => {
    render(<ResetMfaButton userId="u-1" email="a@b.com" hasDevice />);
    expect(screen.getByRole('button', { name: /Reset 2FA device/i })).toBeInTheDocument();
  });

  it('labels the button "Force 2FA re-enrollment" when no device exists', () => {
    render(<ResetMfaButton userId="u-1" email="a@b.com" hasDevice={false} />);
    expect(screen.getByRole('button', { name: /Force 2FA re-enrollment/i })).toBeInTheDocument();
  });

  it('blocks submit when the confirm is dismissed', () => {
    globalThis.confirm = jest.fn(() => false);
    render(<ResetMfaButton userId="u-1" email="a@b.com" hasDevice />);
    const button = screen.getByRole('button', { name: /Reset 2FA device/i });
    fireEvent.submit(button.closest('form') as HTMLFormElement);
    expect(globalThis.confirm).toHaveBeenCalled();
  });

  it('carries the userId on a hidden input', () => {
    render(<ResetMfaButton userId="user-77" email="a@b.com" hasDevice />);
    const hidden = screen
      .getByRole('button', { name: /Reset 2FA device/i })
      .closest('form')
      ?.querySelector('input[name="userId"]') as HTMLInputElement | null;
    expect(hidden?.value).toBe('user-77');
  });
});
