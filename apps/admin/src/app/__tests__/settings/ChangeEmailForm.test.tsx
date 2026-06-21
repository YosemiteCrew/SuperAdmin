import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ChangeEmailForm } from '@/app/(routes)/(dashboard)/settings/ChangeEmailForm';

const changeEmailActionMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/settings/actions', () => ({
  changeEmailAction: (...a: unknown[]) => changeEmailActionMock(...a),
}));

const originalConfirm = globalThis.confirm;
afterEach(() => {
  globalThis.confirm = originalConfirm;
});
beforeEach(() => {
  changeEmailActionMock.mockReset().mockResolvedValue({ ok: true, message: 'Email updated.' });
});

function typeEmail(value: string) {
  fireEvent.change(screen.getByLabelText(/new email/i), { target: { value } });
}

describe('ChangeEmailForm', () => {
  it('does not submit when the field is empty', () => {
    render(<ChangeEmailForm currentEmail="old@x.com" />);
    fireEvent.submit(screen.getByRole('button', { name: /change email/i }).closest('form')!);
    expect(changeEmailActionMock).not.toHaveBeenCalled();
  });

  it('does not call the action when the confirm is dismissed', () => {
    globalThis.confirm = jest.fn(() => false);
    render(<ChangeEmailForm currentEmail="old@x.com" />);
    typeEmail('new@x.com');
    fireEvent.submit(screen.getByRole('button', { name: /change email/i }).closest('form')!);
    expect(globalThis.confirm).toHaveBeenCalled();
    expect(changeEmailActionMock).not.toHaveBeenCalled();
  });

  it('calls the action and shows the success message, clearing the field', async () => {
    globalThis.confirm = jest.fn(() => true);
    render(<ChangeEmailForm currentEmail="old@x.com" />);
    typeEmail('new@x.com');
    fireEvent.submit(screen.getByRole('button', { name: /change email/i }).closest('form')!);
    await waitFor(() => expect(changeEmailActionMock).toHaveBeenCalledWith('new@x.com'));
    await screen.findByText('Email updated.');
    expect((screen.getByLabelText(/new email/i) as HTMLInputElement).value).toBe('');
  });

  it('shows the error message and keeps the field on failure', async () => {
    globalThis.confirm = jest.fn(() => true);
    changeEmailActionMock.mockResolvedValueOnce({
      ok: false,
      message: 'That email is already in use.',
    });
    render(<ChangeEmailForm currentEmail="old@x.com" />);
    typeEmail('taken@x.com');
    fireEvent.submit(screen.getByRole('button', { name: /change email/i }).closest('form')!);
    await screen.findByText('That email is already in use.');
    expect((screen.getByLabelText(/new email/i) as HTMLInputElement).value).toBe('taken@x.com');
  });
});
