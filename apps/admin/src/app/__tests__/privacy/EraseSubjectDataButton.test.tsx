import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { EraseSubjectDataButton } from '@/app/(routes)/(dashboard)/privacy/requests/[id]/EraseSubjectDataButton';

const eraseMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/privacy/requests/[id]/actions', () => ({
  eraseSubjectDataAction: (...args: unknown[]) => eraseMock(...args),
}));

const REPORT = {
  erasedAt: '2026-09-01T00:00:00.000Z',
  subjectEmail: 'person@example.com',
  deleted: { contactLeads: 1, contactRequests: 2 },
  retained: { consentSubjects: 1, consentEvents: 4, dataRequests: 1 },
};

function openConfirm() {
  render(<EraseSubjectDataButton requestId="dr_1" />);
  fireEvent.click(screen.getByRole('button', { name: 'Erase subject data' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  eraseMock.mockResolvedValue(REPORT);
});

describe('EraseSubjectDataButton', () => {
  it('does not erase on the first click, only offers the confirmation', () => {
    openConfirm();

    expect(eraseMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Erase this subject permanently\?/i)).toBeInTheDocument();
  });

  it('names what goes and what stays before asking, not after', () => {
    openConfirm();

    expect(screen.getByText(/every contact-form submission under it are deleted/i)).toBeVisible();
    expect(screen.getByText(/consent ledger and this request are kept/i)).toBeVisible();
    expect(screen.getByText(/cannot be undone/i)).toBeVisible();
  });

  it('cancelling erases nothing and returns to the starting state', () => {
    openConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(eraseMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Erase subject data' })).toBeInTheDocument();
  });

  it('sends the request id and no address once confirmed', async () => {
    openConfirm();
    fireEvent.click(screen.getByRole('button', { name: /Yes, erase permanently/i }));

    await waitFor(() => expect(eraseMock).toHaveBeenCalledTimes(1));
    const fd = eraseMock.mock.calls[0][0] as FormData;
    expect(fd.get('id')).toBe('dr_1');
    expect(fd.get('subjectEmail')).toBeNull();
    expect(fd.get('email')).toBeNull();
  });

  it('reports the counts it was given, so the operator can quote them in the reply', async () => {
    openConfirm();
    fireEvent.click(screen.getByRole('button', { name: /Yes, erase permanently/i }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Erased person@example.com');
    expect(status).toHaveTextContent('Deleted: 1 marketing lead and 2 contact submissions');
    expect(status).toHaveTextContent('1 consent subject and 4 consent events');
    expect(status).toHaveTextContent('Kept: 1 rights request');
  });

  it('does not offer to erase again once it has, so a second click cannot re-run it', async () => {
    openConfirm();
    fireEvent.click(screen.getByRole('button', { name: /Yes, erase permanently/i }));

    await screen.findByRole('status');
    expect(screen.queryByRole('button', { name: 'Erase subject data' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Yes, erase permanently/i })
    ).not.toBeInTheDocument();
  });

  it('says nothing was erased when the action refuses, and shows no report', async () => {
    eraseMock.mockResolvedValue(null);
    openConfirm();
    fireEvent.click(screen.getByRole('button', { name: /Yes, erase permanently/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Nothing was erased/i);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
