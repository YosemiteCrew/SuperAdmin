import type { IssueResult } from '@/app/(routes)/(dashboard)/ap/actions';

// --- mocks -----------------------------------------------------------

jest.mock('@superadmin/database', () => ({
  prisma: {
    aPLicenseToken: {
      create: jest.fn(),
      updateManyAndReturn: jest.fn(),
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
import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/app/config/backend';
import { serverEnv } from '@/app/config/env.server';
import { recordAuditEvent } from '@/app/features/audit/store';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const TEST_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockCreate = prisma.aPLicenseToken.create as jest.MockedFunction<
  typeof prisma.aPLicenseToken.create
>;
const mockUpdateManyAndReturn = prisma.aPLicenseToken.updateManyAndReturn as jest.MockedFunction<
  typeof prisma.aPLicenseToken.updateManyAndReturn
>;
const mockRecordAuditEvent = recordAuditEvent as jest.MockedFunction<typeof recordAuditEvent>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

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
  const tokenId = '00000000-0000-4000-8000-000000000001';
  const cuidTokenId = 'c'.padEnd(25, 'a');

  async function revoke(fields: Record<string, string>): Promise<void> {
    const { revokeLicenseTokenAction } = await import('@/app/(routes)/(dashboard)/ap/actions');
    return revokeLicenseTokenAction(makeFormData(fields));
  }

  it('does nothing when tokenId is missing', async () => {
    await revoke({});
    expect(mockUpdateManyAndReturn).not.toHaveBeenCalled();
  });

  it('does nothing when tokenId is not a string', async () => {
    const file = new File(['token'], 'token.txt');
    file.toString = () => tokenId;
    const formData = new FormData();
    formData.append('tokenId', file);
    const { revokeLicenseTokenAction } = await import('@/app/(routes)/(dashboard)/ap/actions');

    await revokeLicenseTokenAction(formData);

    expect(mockUpdateManyAndReturn).not.toHaveBeenCalled();
  });

  it('does nothing when tokenId has an invalid format', async () => {
    await revoke({ tokenId: 'tok_invalid' });
    expect(mockUpdateManyAndReturn).not.toHaveBeenCalled();
  });

  it('does nothing when token not found', async () => {
    mockUpdateManyAndReturn.mockResolvedValue([]);
    await revoke({ tokenId: cuidTokenId });
    expect(mockUpdateManyAndReturn).toHaveBeenCalledWith({
      where: { id: cuidTokenId, revokedAt: null },
      data: { revokedAt: expect.any(Date), revokedBy: 'admin_1' },
    });
  });

  it('does nothing when token already revoked', async () => {
    mockUpdateManyAndReturn.mockResolvedValue([]);
    await revoke({ tokenId });
    expect(mockRecordAuditEvent).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('does not audit when another request revokes the token first', async () => {
    mockUpdateManyAndReturn.mockResolvedValue([]);

    await revoke({ tokenId });

    expect(mockUpdateManyAndReturn).toHaveBeenCalledWith({
      where: { id: tokenId, revokedAt: null },
      data: { revokedAt: expect.any(Date), revokedBy: 'admin_1' },
    });
    expect(mockRecordAuditEvent).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('updates revokedAt and revokedBy on success', async () => {
    mockUpdateManyAndReturn.mockResolvedValue([
      {
        id: tokenId,
        orgId: 'org_1',
        instanceDomain: 'pims.example.com',
      } as never,
    ]);
    await revoke({ tokenId });
    expect(mockUpdateManyAndReturn).toHaveBeenCalledWith({
      where: { id: tokenId, revokedAt: null },
      data: { revokedAt: expect.any(Date), revokedBy: 'admin_1' },
    });
    expect(mockRecordAuditEvent).toHaveBeenCalledWith({
      action: 'ap_token.revoke',
      actorId: 'admin_1',
      targetType: 'ap_token',
      targetId: tokenId,
      targetLabel: 'pims.example.com (org_1)',
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/ap');
  });
});
