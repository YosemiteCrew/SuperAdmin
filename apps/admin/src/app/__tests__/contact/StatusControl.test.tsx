import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { StatusControl } from '@/app/(routes)/(dashboard)/crm/requests/StatusControl';

const updateMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/crm/requests/actions', () => ({
  updateRequestStatusAction: (...args: unknown[]) => updateMock(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  updateMock.mockResolvedValue({ status: 'in_progress' });
});

describe('StatusControl', () => {
  it('submits the selected status', async () => {
    render(<StatusControl requestId="request-1" status="new" />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'in_progress' } });

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const formData = updateMock.mock.calls[0][0] as FormData;
    expect(formData.get('requestId')).toBe('request-1');
    expect(formData.get('status')).toBe('in_progress');
    expect(screen.getByRole('combobox')).toHaveValue('in_progress');
  });

  it('submits the loaded status as expectedStatus, not the newly chosen one', async () => {
    render(<StatusControl requestId="request-1" status="in_progress" />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'closed' } });

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const formData = updateMock.mock.calls[0][0] as FormData;
    expect(formData.get('status')).toBe('closed');
    expect(formData.get('expectedStatus')).toBe('in_progress');
  });

  it('restores the persisted status when the action returns an error', async () => {
    updateMock.mockResolvedValue({ error: 'Invalid status.' });
    render(<StatusControl requestId="request-1" status="new" />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'closed' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid status.');
    expect(screen.getByRole('combobox')).toHaveValue('new');
    expect(screen.getByRole('combobox')).toBeEnabled();
  });

  // A stale write reports the row's real current status. The control must
  // show that, not the value it was originally loaded with, or the operator
  // could resubmit blind to what actually changed underneath them.
  it('resets to the reported current status when the write is stale', async () => {
    updateMock.mockResolvedValue({
      error:
        'Someone else already updated this request. Its current status is shown below - review it and try again.',
      currentStatus: 'closed',
    });
    render(<StatusControl requestId="request-1" status="new" />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'in_progress' } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/already updated/i);
    expect(screen.getByRole('combobox')).toHaveValue('closed');
  });

  it('keeps the control mounted and retryable when the action rejects', async () => {
    updateMock.mockRejectedValueOnce(new Error('database unavailable'));
    render(<StatusControl requestId="request-1" status="new" />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'closed' } });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Status could not be updated. Try again.'
    );
    expect(screen.getByRole('combobox')).toHaveValue('new');
    expect(screen.getByRole('combobox')).toBeEnabled();

    updateMock.mockResolvedValueOnce({ status: 'closed' });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'closed' } });

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('closed');
  });
});
