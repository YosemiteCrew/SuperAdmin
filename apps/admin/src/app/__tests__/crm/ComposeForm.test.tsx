import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ComposeForm } from '@/app/(routes)/(dashboard)/crm/compose/ComposeForm';

const sendMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/crm/compose/actions', () => ({
  sendCampaignAction: (...args: unknown[]) => sendMock(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  sendMock.mockResolvedValue({ sent: 2, failed: 0 });
});

describe('ComposeForm', () => {
  it('renders audience, subject, and body fields', () => {
    render(<ComposeForm />);
    expect(screen.getByLabelText(/Audience/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Body/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send campaign/i })).toBeInTheDocument();
  });

  it('offers all-users and admins-only audiences', () => {
    render(<ComposeForm />);
    const select = screen.getByLabelText(/Audience/i) as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(['all', 'admins']);
  });

  it('shows the sent count after a successful send', async () => {
    render(<ComposeForm />);
    fireEvent.change(screen.getByLabelText(/Subject/i), { target: { value: 'Big news' } });
    fireEvent.change(screen.getByLabelText(/Body/i), {
      target: { value: 'A body long enough to pass validation.' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: /Send campaign/i }).closest('form') as HTMLFormElement
    );

    await waitFor(() => {
      expect(screen.getByText(/Sent to 2 recipients/i)).toBeInTheDocument();
    });
    expect(sendMock).toHaveBeenCalled();
  });

  it('shows failed count when some sends fail', async () => {
    sendMock.mockResolvedValue({ sent: 3, failed: 1 });
    render(<ComposeForm />);
    fireEvent.submit(
      screen.getByRole('button', { name: /Send campaign/i }).closest('form') as HTMLFormElement
    );

    await waitFor(() => {
      expect(screen.getByText(/\(1 failed\)/i)).toBeInTheDocument();
    });
  });

  it('shows the error returned by the action', async () => {
    sendMock.mockResolvedValue({ error: 'Subject must be at least 3 characters.' });
    render(<ComposeForm />);
    fireEvent.submit(
      screen.getByRole('button', { name: /Send campaign/i }).closest('form') as HTMLFormElement
    );

    await waitFor(() => {
      expect(screen.getByText(/Subject must be at least 3 characters/)).toBeInTheDocument();
    });
  });
});
