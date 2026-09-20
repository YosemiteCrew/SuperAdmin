import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ExportAccountDataButton } from '@/app/(routes)/(dashboard)/users/[id]/ExportAccountDataButton';

const exportMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/users/[id]/actions', () => ({
  exportAccountDataAction: (...args: unknown[]) => exportMock(...args),
}));

describe('ExportAccountDataButton', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    jest.clearAllMocks();
    exportMock.mockResolvedValue('{"ok":true}');
    URL.createObjectURL = jest.fn(() => 'blob:mock');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('renders the export button', () => {
    render(<ExportAccountDataButton userId="u1" />);
    expect(screen.getByRole('button', { name: /Export account data/i })).toBeInTheDocument();
  });

  it('passes the userId to the action and downloads the JSON blob', async () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ExportAccountDataButton userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Export account data/i }));

    await waitFor(() => {
      expect(exportMock).toHaveBeenCalled();
    });
    const fd = exportMock.mock.calls[0][0] as FormData;
    expect(fd.get('userId')).toBe('u1');
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    });
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it('does not attempt a download when the action returns null, and says so', async () => {
    exportMock.mockResolvedValue(null);
    render(<ExportAccountDataButton userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Export account data/i }));

    await waitFor(() => {
      expect(exportMock).toHaveBeenCalled();
    });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /account data could not be produced/i
    );
  });

  it('reports a rejected export in the page instead of throwing to the boundary', async () => {
    exportMock.mockRejectedValue(new Error('core unreachable'));
    render(<ExportAccountDataButton userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Export account data/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /account data could not be produced/i
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('clears an earlier failure once an export succeeds', async () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    exportMock.mockResolvedValue(null);
    render(<ExportAccountDataButton userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Export account data/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    exportMock.mockResolvedValue('{"ok":true}');
    fireEvent.click(screen.getByRole('button', { name: /Export account data/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    clickSpy.mockRestore();
  });
});
