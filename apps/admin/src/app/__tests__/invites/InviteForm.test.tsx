import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { InviteForm } from '@/app/(routes)/(dashboard)/invites/InviteForm';

const createInviteActionMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/invites/actions', () => ({
  createInviteAction: (...a: unknown[]) => createInviteActionMock(...a),
}));

const writeTextMock = jest.fn();

beforeEach(() => {
  createInviteActionMock.mockReset().mockResolvedValue({});
  writeTextMock.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    configurable: true,
  });
});

function emailInput() {
  return screen.getByLabelText(/recipient email/i) as HTMLInputElement;
}

function submit(email: string) {
  fireEvent.change(emailInput(), { target: { value: email } });
  fireEvent.submit(screen.getByRole('button', { name: /generate link/i }).closest('form')!);
}

describe('InviteForm', () => {
  it('submits the entered email to the action', async () => {
    render(<InviteForm />);
    submit('new@x.com');

    await waitFor(() => expect(createInviteActionMock).toHaveBeenCalledTimes(1));
    const fd = createInviteActionMock.mock.calls[0][0] as FormData;
    expect(fd.get('email')).toBe('new@x.com');
  });

  it('shows no invite link until one is generated', () => {
    render(<InviteForm />);
    expect(screen.queryByText(/invite link ready/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^copy$/i })).not.toBeInTheDocument();
  });

  it('shows the generated link and clears the field on success', async () => {
    createInviteActionMock.mockResolvedValue({ inviteUrl: 'https://admin.test/accept?t=1' });
    render(<InviteForm />);
    submit('new@x.com');

    expect(await screen.findByText('Invite link ready')).toBeInTheDocument();
    expect(screen.getByText('https://admin.test/accept?t=1')).toBeInTheDocument();
    await waitFor(() => expect(emailInput().value).toBe(''));
  });

  it('copies the generated link to the clipboard', async () => {
    createInviteActionMock.mockResolvedValue({ inviteUrl: 'https://admin.test/accept?t=1' });
    render(<InviteForm />);
    submit('new@x.com');

    fireEvent.click(await screen.findByRole('button', { name: /^copy$/i }));
    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalledWith('https://admin.test/accept?t=1')
    );
  });

  it('shows the error and produces no link on failure', async () => {
    createInviteActionMock.mockResolvedValue({ error: 'That user is already a super-admin.' });
    render(<InviteForm />);
    submit('taken@x.com');

    expect(await screen.findByText('That user is already a super-admin.')).toBeInTheDocument();
    expect(screen.queryByText(/invite link ready/i)).not.toBeInTheDocument();
  });

  it('clears the field even when the action fails', async () => {
    // Documents current behaviour, not intended behaviour. The component guards
    // its reset with `if (!result.error)`, but the input is uncontrolled inside a
    // `<form action={...}>`, and React resets such a form once the action settles.
    // So the guard cannot preserve the input and a failed attempt has to be
    // retyped. Compare ChangeEmailForm, which keeps its value by controlling it.
    createInviteActionMock.mockResolvedValue({ error: 'That user is already a super-admin.' });
    render(<InviteForm />);
    submit('taken@x.com');

    await screen.findByText('That user is already a super-admin.');
    await waitFor(() => expect(emailInput().value).toBe(''));
  });
});
