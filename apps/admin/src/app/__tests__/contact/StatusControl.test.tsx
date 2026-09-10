import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/app/(routes)/(dashboard)/crm/requests/actions', () => ({
  updateRequestStatusAction: jest.fn(),
}));

import { StatusControl } from '@/app/(routes)/(dashboard)/crm/requests/StatusControl';
import { updateRequestStatusAction } from '@/app/(routes)/(dashboard)/crm/requests/actions';

const mockUpdate = updateRequestStatusAction as jest.MockedFunction<
  typeof updateRequestStatusAction
>;

it('keeps the control mounted and announces a failed update', async () => {
  mockUpdate.mockRejectedValue(new Error('database unavailable'));
  render(<StatusControl requestId="request_1" status="new" />);

  const status = screen.getByLabelText('Update status');
  fireEvent.change(status, { target: { value: 'closed' } });

  expect(await screen.findByRole('alert')).toHaveTextContent('Status could not be updated.');
  expect(status).toBeInTheDocument();
  expect(status).toHaveValue('new');
});
