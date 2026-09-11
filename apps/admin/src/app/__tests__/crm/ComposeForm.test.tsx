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
    fireEvent.change(screen.getByLabelText(/Audience/i), { target: { value: 'admins' } });
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
    expect(screen.getByLabelText(/Audience/i)).toHaveValue('all');
    expect(screen.getByLabelText(/Subject/i)).toHaveValue('');
    expect(screen.getByLabelText(/Body/i)).toHaveValue('');
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
    expect(screen.getByRole('status')).toHaveTextContent('Campaign delivered');
  });

  it('shows the error returned by the action', async () => {
    sendMock.mockResolvedValue({ error: 'Subject must be at least 3 characters.' });
    render(<ComposeForm />);
    fireEvent.change(screen.getByLabelText(/Audience/i), { target: { value: 'admins' } });
    fireEvent.change(screen.getByLabelText(/Subject/i), { target: { value: 'Big news' } });
    fireEvent.change(screen.getByLabelText(/Body/i), {
      target: { value: 'A body long enough to retry.' },
    });
    expect(screen.getByLabelText(/Audience/i)).toHaveValue('admins');
    fireEvent.submit(
      screen.getByRole('button', { name: /Send campaign/i }).closest('form') as HTMLFormElement
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Subject must be at least 3 characters.'
    );
    await waitFor(() => expect(screen.getByLabelText(/Audience/i)).toHaveValue('admins'));
    expect(screen.getByLabelText(/Subject/i)).toHaveValue('Big news');
    expect(screen.getByLabelText(/Body/i)).toHaveValue('A body long enough to retry.');
  });

  it('reports a total delivery failure as an error and preserves the draft', async () => {
    sendMock.mockResolvedValue({ sent: 0, failed: 2 });
    render(<ComposeForm />);
    fireEvent.change(screen.getByLabelText(/Subject/i), { target: { value: 'Big news' } });
    fireEvent.change(screen.getByLabelText(/Body/i), {
      target: { value: 'A body long enough to pass validation.' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: /Send campaign/i }).closest('form') as HTMLFormElement
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Campaign delivery failedSent to 0 recipients (2 failed).'
    );
    expect(screen.getByLabelText(/Subject/i)).toHaveValue('Big news');
    expect(screen.getByLabelText(/Body/i)).toHaveValue('A body long enough to pass validation.');
  });
});
