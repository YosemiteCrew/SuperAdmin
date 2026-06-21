import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ExportUsersButton } from '@/app/(routes)/(dashboard)/users/ExportUsersButton';

const exportUsersActionMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/users/actions', () => ({
  exportUsersAction: () => exportUsersActionMock(),
}));

describe('ExportUsersButton', () => {
  let capturedBlob: Blob | undefined;
  const createObjectURL = jest.fn((blob: Blob) => {
    capturedBlob = blob;
    return 'blob:users';
  });
  const revokeObjectURL = jest.fn();

  beforeEach(() => {
    capturedBlob = undefined;
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    exportUsersActionMock.mockReset().mockResolvedValue('Email\na@x.com');
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
  });

  it('fetches the CSV and triggers a download on click', async () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ExportUsersButton />);
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => expect(exportUsersActionMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    expect(capturedBlob).toBeInstanceOf(Blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:users');
    clickSpy.mockRestore();
  });
});
