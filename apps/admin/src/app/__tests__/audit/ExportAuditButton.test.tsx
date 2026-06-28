import { fireEvent, render, screen } from '@testing-library/react';

import { ExportAuditButton } from '@/app/(routes)/(dashboard)/audit/ExportAuditButton';
import type { AuditEvent } from '@/app/features/audit/types';

const EVENTS: AuditEvent[] = [
  {
    id: 'a',
    action: 'user.delete',
    actorId: 'admin-1',
    actorEmail: 'admin@x.com',
    targetType: 'user',
    targetId: 'u-1',
    targetLabel: 'victim@x.com',
    at: 1_700_000_000_000,
  },
];

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
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
  });

  it('is disabled when there are no events', () => {
    render(<ExportAuditButton events={[]} />);
    expect(screen.getByRole('button', { name: /export csv/i })).toBeDisabled();
  });

  it('builds a CSV blob and triggers a download on click', () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ExportAuditButton events={EVENTS} />);
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(capturedBlob).toBeInstanceOf(Blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:audit');
    clickSpy.mockRestore();
  });
});
