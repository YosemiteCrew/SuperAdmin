jest.mock('server-only', () => ({}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: jest.fn(),
}));

jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('supertokens-node/recipe/totp', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock('@/app/features/users/emailVerification', () => ({
  setEmailVerified: jest.fn(),
}));

jest.mock('@/app/features/users/dataExport', () => ({
  collectAccountData: jest.fn(),
}));

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { collectAccountData } from '@/app/features/users/dataExport';
import { exportAccountDataAction } from '@/app/(routes)/(dashboard)/users/[id]/actions';

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockCollect = collectAccountData as jest.MockedFunction<typeof collectAccountData>;
const mockAudit = recordAuditEvent as jest.MockedFunction<typeof recordAuditEvent>;

type Bundle = Awaited<ReturnType<typeof collectAccountData>>;

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const BUNDLE = {
  exportedAt: '2026-01-01T00:00:00.000Z',
  account: { id: 'u1', emails: [], timeJoined: '', loginMethods: [], tenantIds: [] },
  metadata: {},
  roles: [],
  activeSessionCount: 0,
  auditTrail: { asTarget: [], asActor: [] },
} as unknown as Bundle;

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireSuperAdmin.mockResolvedValue({ userId: 'admin-1' });
  mockCollect.mockResolvedValue(BUNDLE);
  mockAudit.mockResolvedValue(undefined);
});

describe('exportAccountDataAction', () => {
  it('returns null for a missing userId without collecting anything', async () => {
    expect(await exportAccountDataAction(fd({ userId: '' }))).toBeNull();
    expect(mockCollect).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it('returns null for an unknown account without recording an audit event', async () => {
    mockCollect.mockResolvedValue(null);
    expect(await exportAccountDataAction(fd({ userId: 'ghost' }))).toBeNull();
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it('returns pretty-printed JSON and audits the export', async () => {
    const json = await exportAccountDataAction(fd({ userId: 'u1' }));

    expect(json).not.toBeNull();
    expect(JSON.parse(json as string).exportedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.data_export', targetId: 'u1', actorId: 'admin-1' })
    );
  });
});
