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

  it('restores the persisted status when the action returns an error', async () => {
    updateMock.mockResolvedValue({ error: 'Invalid status.' });
    render(<StatusControl requestId="request-1" status="new" />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'closed' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid status.');
    expect(screen.getByRole('combobox')).toHaveValue('new');
    expect(screen.getByRole('combobox')).toBeEnabled();
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
