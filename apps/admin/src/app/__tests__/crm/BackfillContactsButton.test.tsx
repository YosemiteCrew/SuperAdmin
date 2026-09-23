import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BackfillContactsButton } from '@/app/(routes)/(dashboard)/crm/BackfillContactsButton';

const backfillMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/crm/actions', () => ({
  backfillContactsAction: (...args: unknown[]) => backfillMock(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  backfillMock.mockResolvedValue({ forwarded: 5, skipped: 0, failed: 0 });
});

function submitBackfill() {
  fireEvent.submit(
    screen.getByRole('button', { name: /Backfill contacts/i }).closest('form') as HTMLFormElement
  );
}

describe('BackfillContactsButton', () => {
  it('renders the backfill button', () => {
    render(<BackfillContactsButton />);
    expect(
      screen.getByRole('button', { name: /Backfill contacts from Yosemite-Crew/i })
    ).toBeInTheDocument();
  });

  it('shows forwarded, skipped, and failed counts', async () => {
    backfillMock.mockResolvedValue({ forwarded: 3, skipped: 2, failed: 1 });
    render(<BackfillContactsButton />);
    submitBackfill();

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('3 forwarded, 2 skipped, 1 failed');
    });
    expect(backfillMock).toHaveBeenCalled();
  });

  it('omits zero skipped and failed counts', async () => {
    render(<BackfillContactsButton />);
    submitBackfill();

    expect(await screen.findByRole('status')).toHaveTextContent('5 forwarded');
  });

  it('shows the error returned by the action', async () => {
    backfillMock.mockResolvedValue({ error: 'Backfill is not configured.' });
    render(<BackfillContactsButton />);
    submitBackfill();

    expect(await screen.findByRole('alert')).toHaveTextContent('Backfill is not configured.');
  });

  it('reports a total backfill failure as an error', async () => {
    backfillMock.mockResolvedValue({ forwarded: 0, skipped: 0, failed: 2 });
    render(<BackfillContactsButton />);
    submitBackfill();

    expect(await screen.findByRole('alert')).toHaveTextContent('No contacts forwarded; 2 failed.');
  });
});
