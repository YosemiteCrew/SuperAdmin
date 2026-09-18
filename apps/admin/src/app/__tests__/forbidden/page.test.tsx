import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ForbiddenPage from '@/app/(routes)/forbidden/page';

const replaceMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe('ForbiddenPage', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  it('signs out through the server and returns to auth', async () => {
    const user = userEvent.setup();
    render(<ForbiddenPage />);

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/signout', { method: 'POST' });
      expect(replaceMock).toHaveBeenCalledWith('/auth');
    });
  });

  it('returns to auth when the server sign-out request fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network failure'));
    const user = userEvent.setup();
    render(<ForbiddenPage />);

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/auth'));
  });
});
