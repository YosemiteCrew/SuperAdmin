import type { IssueResult } from '@/app/(routes)/(dashboard)/ap/actions';

// --- mocks -----------------------------------------------------------

jest.mock('@superadmin/database', () => ({
  prisma: {
    aPLicenseToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: jest.fn(),
}));

jest.mock('@/app/config/env.server', () => ({
  serverEnv: {
    apSigningKey: null, // default: signing key absent
    apSigningKeyId: 'yc-ap-2026-01',
  },
}));

jest.mock('@/app/features/ap/sign', () => ({
  signAPToken: jest.fn().mockReturnValue('signed.jwt.token'),
}));

jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// -------------------------------------------------------------------

import { generateKeyPairSync } from 'node:crypto';
import { prisma } from '@superadmin/database';
import { requireSuperAdmin } from '@/app/config/backend';
import { serverEnv } from '@/app/config/env.server';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const TEST_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockCreate = prisma.aPLicenseToken.create as jest.MockedFunction<
  typeof prisma.aPLicenseToken.create
>;
const mockFindUnique = prisma.aPLicenseToken.findUnique as jest.MockedFunction<
  typeof prisma.aPLicenseToken.findUnique
>;
const mockUpdateMany = prisma.aPLicenseToken.updateMany as jest.MockedFunction<
  typeof prisma.aPLicenseToken.updateMany
>;

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

function withSigningKey() {
  (serverEnv as { apSigningKey: string | null }).apSigningKey = TEST_PRIVATE_KEY;
}

function withoutSigningKey() {
  (serverEnv as { apSigningKey: string | null }).apSigningKey = null;
}

beforeEach(() => {
  jest.clearAllMocks();
  withoutSigningKey();
  mockRequireSuperAdmin.mockResolvedValue({ userId: 'admin_1' } as never);
});

describe('issueLicenseTokenAction', () => {
  async function issue(fields: Record<string, string>): Promise<IssueResult> {
    const { issueLicenseTokenAction } = await import('@/app/(routes)/(dashboard)/ap/actions');
    return issueLicenseTokenAction(makeFormData(fields));
  }

  it('returns error when signing key is not configured', async () => {
    withoutSigningKey();
    const result = await issue({ orgId: 'org_1', instanceDomain: 'pims.example.com', tier: 'pro' });
    expect(result).toEqual({ ok: false, error: 'AP signing key not configured' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns error when orgId is empty', async () => {
    withSigningKey();
    const result = await issue({ orgId: '', instanceDomain: 'pims.example.com', tier: 'pro' });
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid instanceDomain (has scheme)', async () => {
    withSigningKey();
    const result = await issue({
      orgId: 'org_1',
      instanceDomain: 'https://pims.example.com',
      tier: 'pro',
    });
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid tier', async () => {
    withSigningKey();
    const result = await issue({
      orgId: 'org_1',
      instanceDomain: 'pims.example.com',
      tier: 'platinum',
    });
    expect(result.ok).toBe(false);
  });

  it('creates DB record and returns ok with token on success', async () => {
    withSigningKey();
    mockCreate.mockResolvedValue({} as never);
    const result = await issue({ orgId: 'org_1', instanceDomain: 'pims.example.com', tier: 'pro' });
    expect(result).toEqual({ ok: true, token: 'signed.jwt.token' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId: 'org_1',
          instanceDomain: 'pims.example.com',
          tier: 'pro',
          token: 'signed.jwt.token',
          keyId: 'yc-ap-2026-01',
        }),
      })
    );
  });

  it('returns error when caller is not super-admin', async () => {
    mockRequireSuperAdmin.mockRejectedValueOnce(new Error('forbidden'));
    await expect(
      issue({ orgId: 'org_1', instanceDomain: 'pims.example.com', tier: 'pro' })
    ).rejects.toThrow('forbidden');
  });
});

describe('revokeLicenseTokenAction', () => {
  async function revoke(fields: Record<string, string>): Promise<void> {
    const { revokeLicenseTokenAction } = await import('@/app/(routes)/(dashboard)/ap/actions');
    return revokeLicenseTokenAction(makeFormData(fields));
  }

  it('does nothing when tokenId is empty', async () => {
    await revoke({ tokenId: '' });
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('performs the transition as a single conditional update scoped to active tokens', async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue({
      id: 'tok_1',
      orgId: 'org_1',
      instanceDomain: 'pims.example.com',
    } as never);
    await revoke({ tokenId: 'tok_1' });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: 'tok_1', revokedAt: null },
      data: { revokedAt: expect.any(Date), revokedBy: 'admin_1' },
    });
  });

  it('does not audit or revalidate when the token was already revoked (count 0)', async () => {
    const { recordAuditEvent } = await import('@/app/features/audit/store');
    const { revalidatePath } = await import('next/cache');
    mockUpdateMany.mockResolvedValue({ count: 0 });
    await revoke({ tokenId: 'tok_already' });
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(recordAuditEvent).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('does not audit or revalidate when the token does not exist (count 0)', async () => {
    const { recordAuditEvent } = await import('@/app/features/audit/store');
    mockUpdateMany.mockResolvedValue({ count: 0 });
    await revoke({ tokenId: 'tok_missing' });
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it('records exactly one audit event when two concurrent revokes race the same token', async () => {
    const { recordAuditEvent } = await import('@/app/features/audit/store');
    // Simulates the DB serialising two concurrent `updateMany` calls: only the first
    // request's WHERE clause (`revokedAt: null`) still matches, so it alone gets count 1.
    mockUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    mockFindUnique.mockResolvedValue({
      id: 'tok_1',
      orgId: 'org_1',
      instanceDomain: 'pims.example.com',
    } as never);

    await Promise.all([revoke({ tokenId: 'tok_1' }), revoke({ tokenId: 'tok_1' })]);

    expect(recordAuditEvent).toHaveBeenCalledTimes(1);
  });

  it('updates revokedAt and revokedBy, and audits with the token label, on success', async () => {
    const { recordAuditEvent } = await import('@/app/features/audit/store');
    const { revalidatePath } = await import('next/cache');
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue({
      id: 'tok_1',
      orgId: 'org_1',
      instanceDomain: 'pims.example.com',
    } as never);

    await revoke({ tokenId: 'tok_1' });

    expect(recordAuditEvent).toHaveBeenCalledWith({
      action: 'ap_token.revoke',
      actorId: 'admin_1',
      targetType: 'ap_token',
      targetId: 'tok_1',
      targetLabel: 'pims.example.com (org_1)',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/ap');
  });

  it('does nothing when the row vanished between the atomic update and the label read', async () => {
    const { recordAuditEvent } = await import('@/app/features/audit/store');
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue(null);
    await revoke({ tokenId: 'tok_1' });
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });
});
