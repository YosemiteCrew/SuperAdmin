import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AcceptButton } from '@/app/(routes)/(dashboard)/accept-invite/AcceptButton';

const acceptInviteActionMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/accept-invite/actions', () => ({
  acceptInviteAction: (...a: unknown[]) => acceptInviteActionMock(...a),
}));

beforeEach(() => {
  acceptInviteActionMock.mockReset().mockResolvedValue({});
});

function submit() {
  fireEvent.submit(screen.getByRole('button', { name: /accept invitation/i }).closest('form')!);
}

describe('AcceptButton', () => {
  it('submits the token it was given', async () => {
    render(<AcceptButton token="tok-1" />);
    submit();

    await waitFor(() => expect(acceptInviteActionMock).toHaveBeenCalledTimes(1));
    const fd = acceptInviteActionMock.mock.calls[0][0] as FormData;
    expect(fd.get('token')).toBe('tok-1');
  });

  it('renders no error before submitting', () => {
    render(<AcceptButton token="tok-1" />);
    expect(screen.queryByText(/expired/i)).not.toBeInTheDocument();
  });

  it('surfaces the error returned by the action', async () => {
    acceptInviteActionMock.mockResolvedValue({ error: 'This invite has been revoked.' });
    render(<AcceptButton token="tok-1" />);
    submit();

    expect(await screen.findByText('This invite has been revoked.')).toBeInTheDocument();
  });

  it('keeps the button usable after a failed attempt', async () => {
    acceptInviteActionMock.mockResolvedValue({ error: 'Invite not found or already used.' });
    render(<AcceptButton token="tok-1" />);
    submit();

    await screen.findByText('Invite not found or already used.');
    expect(screen.getByRole('button', { name: /accept invitation/i })).toBeEnabled();
  });
});
