import { fireEvent, render, screen } from '@testing-library/react';

import { VerifyEmailButton } from '@/app/(routes)/(dashboard)/users/[id]/VerifyEmailButton';

jest.mock('@/app/(routes)/(dashboard)/users/[id]/actions', () => ({
  verifyEmailAction: jest.fn(),
  unverifyEmailAction: jest.fn(),
}));

describe('VerifyEmailButton', () => {
  const originalConfirm = globalThis.confirm;
  afterEach(() => {
    globalThis.confirm = originalConfirm;
  });

  it('shows "Mark verified" for an unverified account', () => {
    render(<VerifyEmailButton userId="u-1" email="a@b.com" verified={false} />);
    expect(screen.getByRole('button', { name: /mark verified/i })).toBeInTheDocument();
  });

  it('shows "Mark unverified" for a verified account', () => {
    render(<VerifyEmailButton userId="u-1" email="a@b.com" verified />);
    expect(screen.getByRole('button', { name: /mark unverified/i })).toBeInTheDocument();
  });

  it('blocks submission when the confirm is dismissed', () => {
    globalThis.confirm = jest.fn(() => false);
    render(<VerifyEmailButton userId="u-1" email="a@b.com" verified={false} />);
    fireEvent.submit(
      screen.getByRole('button', { name: /mark verified/i }).closest('form') as HTMLFormElement
    );
    expect(globalThis.confirm).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /mark verified/i })).toBeInTheDocument();
  });

  it('shows the saving label after a confirmed submit', () => {
    globalThis.confirm = jest.fn(() => true);
    render(<VerifyEmailButton userId="u-1" email="a@b.com" verified />);
    fireEvent.submit(
      screen.getByRole('button', { name: /mark unverified/i }).closest('form') as HTMLFormElement
    );
    expect(screen.getByRole('button', { name: /saving…/i })).toBeDisabled();
  });
});
