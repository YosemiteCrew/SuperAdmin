jest.mock('server-only', () => ({}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: jest.fn(),
}));

jest.mock('@/app/features/audit/store', () => ({ recordAuditEvent: jest.fn() }));

jest.mock('@superadmin/database', () => ({
  prisma: { contactRequest: { updateMany: jest.fn(), findUnique: jest.fn() } },
}));

import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { prisma } from '@superadmin/database';
import { updateRequestStatusAction } from '@/app/(routes)/(dashboard)/crm/requests/actions';

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockAudit = recordAuditEvent as jest.Mock;
const mockUpdateMany = prisma.contactRequest.updateMany as jest.Mock;
const mockFindUnique = prisma.contactRequest.findUnique as jest.Mock;
const mockRevalidate = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireSuperAdmin.mockResolvedValue({ userId: 'admin-1' });
  mockAudit.mockResolvedValue(undefined);
  mockUpdateMany.mockResolvedValue({ count: 1 });
});

describe('updateRequestStatusAction', () => {
  it('rejects a missing request id', async () => {
    const res = await updateRequestStatusAction(
      fd({ requestId: '', status: 'closed', expectedStatus: 'new' })
    );
    expect(res.error).toBeTruthy();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects an unknown status', async () => {
    const res = await updateRequestStatusAction(
      fd({ requestId: 'r1', status: 'deleted', expectedStatus: 'new' })
    );
    expect(res.error).toBeTruthy();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects an unknown expected status', async () => {
    const res = await updateRequestStatusAction(
      fd({ requestId: 'r1', status: 'closed', expectedStatus: 'deleted' })
    );
    expect(res.error).toBeTruthy();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('updates the status and records an audit event when the expected status still matches', async () => {
    const res = await updateRequestStatusAction(
      fd({ requestId: 'r1', status: 'in_progress', expectedStatus: 'new' })
    );
    expect(res.status).toBe('in_progress');
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { equals: 'r1' }, status: { equals: 'new' } },
      data: { status: 'in_progress', handledBy: 'admin-1' },
    });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'contact.status_change',
        targetType: 'contact_request',
        targetId: 'r1',
      })
    );
  });

  // Another admin already changed this request between page-load and this
  // submit, so the guarded update matches no row. No audit event may be
  // recorded for a write that never happened, and the real current status
  // must come back so the UI can show it instead of the stale selection.
  it('makes no write and records no audit event when the row already moved on', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockFindUnique.mockResolvedValue({ id: 'r1', status: 'closed' });

    const res = await updateRequestStatusAction(
      fd({ requestId: 'r1', status: 'in_progress', expectedStatus: 'new' })
    );

    expect(res.error).toMatch(/already updated/i);
    expect(res.currentStatus).toBe('closed');
    expect(mockAudit).not.toHaveBeenCalled();
    expect(mockRevalidate).toHaveBeenCalledWith('/crm/requests');
  });

  it('omits currentStatus when the row no longer exists', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockFindUnique.mockResolvedValue(null);

    const res = await updateRequestStatusAction(
      fd({ requestId: 'gone', status: 'closed', expectedStatus: 'new' })
    );

    expect(res.error).toMatch(/already updated/i);
    expect(res.currentStatus).toBeUndefined();
  });
});
