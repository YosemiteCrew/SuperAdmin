jest.mock('server-only', () => ({}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: jest.fn(),
}));

jest.mock('@/app/features/audit/store', () => ({ recordAuditEvent: jest.fn() }));

jest.mock('@superadmin/database', () => ({
  prisma: { contactRequest: { update: jest.fn() } },
}));

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { prisma } from '@superadmin/database';
import { updateRequestStatusAction } from '@/app/(routes)/(dashboard)/crm/requests/actions';

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockAudit = recordAuditEvent as jest.Mock;
const mockUpdate = prisma.contactRequest.update as jest.Mock;

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireSuperAdmin.mockResolvedValue({ userId: 'admin-1' });
  mockAudit.mockResolvedValue(undefined);
  mockUpdate.mockResolvedValue({});
});

describe('updateRequestStatusAction', () => {
  it('rejects a missing request id', async () => {
    const res = await updateRequestStatusAction(fd({ requestId: '', status: 'closed' }));
    expect(res.error).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects an unknown status', async () => {
    const res = await updateRequestStatusAction(fd({ requestId: 'r1', status: 'deleted' }));
    expect(res.error).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates the status and records an audit event', async () => {
    const res = await updateRequestStatusAction(fd({ requestId: 'r1', status: 'in_progress' }));
    expect(res.status).toBe('in_progress');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'r1' },
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
});
