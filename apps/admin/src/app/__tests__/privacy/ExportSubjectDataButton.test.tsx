import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ExportSubjectDataButton } from '@/app/(routes)/(dashboard)/privacy/requests/[id]/ExportSubjectDataButton';

const exportMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/privacy/requests/[id]/actions', () => ({
  exportSubjectDataAction: (...args: unknown[]) => exportMock(...args),
}));

describe('ExportSubjectDataButton', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    jest.clearAllMocks();
    exportMock.mockResolvedValue('{"subjectEmail":"person@example.com"}');
    URL.createObjectURL = jest.fn(() => 'blob:mock');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('renders the export button', () => {
    render(<ExportSubjectDataButton requestId="dr_1" />);
    expect(screen.getByRole('button', { name: /Export subject data/i })).toBeInTheDocument();
  });

  it('sends the request id, not an address, and downloads the JSON blob', async () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ExportSubjectDataButton requestId="dr_1" />);
    fireEvent.click(screen.getByRole('button', { name: /Export subject data/i }));

    await waitFor(() => {
      expect(exportMock).toHaveBeenCalled();
    });
    const fd = exportMock.mock.calls[0][0] as FormData;
    expect(fd.get('id')).toBe('dr_1');
    expect(fd.get('subjectEmail')).toBeNull();

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    });
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it('tells the operator when no export could be produced, and downloads nothing', async () => {
    exportMock.mockResolvedValue(null);
    render(<ExportSubjectDataButton requestId="dr_1" />);
    fireEvent.click(screen.getByRole('button', { name: /Export subject data/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/export could not be produced/i);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('clears a previous failure once an export succeeds', async () => {
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    exportMock.mockResolvedValueOnce(null);
    render(<ExportSubjectDataButton requestId="dr_1" />);

    fireEvent.click(screen.getByRole('button', { name: /Export subject data/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Export subject data/i }));
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
