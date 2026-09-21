import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ExportAuditButton } from '@/app/(routes)/(dashboard)/audit/ExportAuditButton';
const exportAuditActionMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/audit/actions', () => ({
  exportAuditAction: (...args: unknown[]) => exportAuditActionMock(...args),
}));

describe('ExportAuditButton', () => {
  let capturedBlob: Blob | undefined;
  const createObjectURL = jest.fn((blob: Blob) => {
    capturedBlob = blob;
    return 'blob:audit';
  });
  const revokeObjectURL = jest.fn();

  beforeEach(() => {
    capturedBlob = undefined;
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    exportAuditActionMock.mockReset().mockResolvedValue('Timestamp\n2026-01-01');
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
  });

  it('is disabled when there are no events', () => {
    render(<ExportAuditButton filters={{}} disabled />);
    expect(screen.getByRole('button', { name: /export csv/i })).toBeDisabled();
  });

  it('requests the complete filtered CSV and triggers a download on click', async () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const filters = { action: 'user.delete', search: 'alice', from: '2026-01-01' };
    render(<ExportAuditButton filters={filters} disabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => expect(exportAuditActionMock).toHaveBeenCalledWith(filters));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    expect(capturedBlob).toBeInstanceOf(Blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:audit');
    clickSpy.mockRestore();
  });

  it('reports a failed export and lets the admin try again', async () => {
    exportAuditActionMock.mockRejectedValue(new Error('database unavailable'));
    render(<ExportAuditButton filters={{}} disabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/export could not be produced/i)
    );
    // Without the catch the transition never settles, so the button keeps
    // saying "Exporting…" and stays disabled for the rest of the session.
    const button = screen.getByRole('button', { name: /export csv/i });
    expect(button).toBeEnabled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
