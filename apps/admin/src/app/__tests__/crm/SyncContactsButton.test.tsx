import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SyncContactsButton } from '@/app/(routes)/(dashboard)/crm/SyncContactsButton';

const syncMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/crm/actions', () => ({
  syncContactsAction: (...args: unknown[]) => syncMock(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  syncMock.mockResolvedValue({ synced: 5, failed: 0 });
});

describe('SyncContactsButton', () => {
  it('renders the sync button', () => {
    render(<SyncContactsButton />);
    expect(screen.getByRole('button', { name: /Sync contacts to Plunk/i })).toBeInTheDocument();
  });

  it('shows the synced count after a successful sync', async () => {
    render(<SyncContactsButton />);
    fireEvent.submit(
      screen.getByRole('button', { name: /Sync contacts/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(screen.getByText(/5 synced/i)).toBeInTheDocument();
    });
    expect(syncMock).toHaveBeenCalled();
  });

  it('includes the failed count when some contacts fail', async () => {
    syncMock.mockResolvedValue({ synced: 3, failed: 2 });
    render(<SyncContactsButton />);
    fireEvent.submit(
      screen.getByRole('button', { name: /Sync contacts/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(screen.getByText(/3 synced, 2 failed/i)).toBeInTheDocument();
    });
  });

  it('shows the error returned by the action', async () => {
    syncMock.mockResolvedValue({
      error: 'Plunk is not configured. Set PLUNK_API_KEY and PLUNK_API_ENDPOINT.',
    });
    render(<SyncContactsButton />);
    fireEvent.submit(
      screen.getByRole('button', { name: /Sync contacts/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(screen.getByText(/not configured/i)).toBeInTheDocument();
    });
  });
});
