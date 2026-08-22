/**
 * @jest-environment node
 */
const keyState: { pem: string | null } = { pem: null };

jest.mock('@/app/config/env.server', () => ({
  serverEnv: {
    // A getter, not a value: the key is generated in beforeAll, which runs long
    // after this factory is hoisted and evaluated.
    get apSigningKey() {
      return keyState.pem;
    },
    apSigningKeyId: 'yc-ap-2026-01',
  },
}));

jest.mock('@superadmin/database', () => ({
  prisma: { aPLicenseToken: { findUnique: jest.fn() } },
}));

import { generateKeyPairSync } from 'node:crypto';
import { prisma } from '@superadmin/database';
import { signAPToken } from '@/app/features/ap/sign';
import { authenticateLicenseToken } from '@/app/features/ap/authenticate';
import type { APTokenClaims } from '@/app/features/ap/types';

const findUnique = prisma.aPLicenseToken.findUnique as jest.MockedFunction<
  typeof prisma.aPLicenseToken.findUnique
>;

const KEY_ID = 'yc-ap-2026-01';
let privateKeyPem: string;

beforeAll(() => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  keyState.pem = privateKeyPem;
});

beforeEach(() => {
  jest.clearAllMocks();
  keyState.pem = privateKeyPem;
});

function makeClaims(overrides: Partial<APTokenClaims> = {}): APTokenClaims {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: 'yosemitecrew.com',
    sub: 'org_test',
    aud: 'activitypub',
    jti: 'tok_abc',
    iat: now,
    exp: now + 7776000,
    orgId: 'org_test',
    instanceDomain: 'pims.example.com',
    tier: 'pro',
    keyId: KEY_ID,
    ...overrides,
  };
}

const bearer = (claims: APTokenClaims = makeClaims()) =>
  `Bearer ${signAPToken(claims, privateKeyPem)}`;

const liveRow = { orgId: 'org_test', instanceDomain: 'pims.example.com', revokedAt: null };

describe('authenticateLicenseToken', () => {
  it('accepts a valid token backed by a live row', async () => {
    findUnique.mockResolvedValue(liveRow as never);
    const result = await authenticateLicenseToken(bearer());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.claims.orgId).toBe('org_test');
  });

  it('looks the row up by the token jti', async () => {
    findUnique.mockResolvedValue(liveRow as never);
    await authenticateLicenseToken(bearer(makeClaims({ jti: 'tok_xyz' })));
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'tok_xyz' } }));
  });

  it('reports 503 when the signing key is not configured', async () => {
    keyState.pem = null;
    const result = await authenticateLicenseToken(bearer());
    expect(result).toEqual({ ok: false, status: 503, error: 'AP signing not configured' });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a missing Authorization header without touching the database', async () => {
    const result = await authenticateLicenseToken(null);
    expect(result).toEqual({ ok: false, status: 401, error: 'Unauthorized' });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a token that fails signature verification', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const foreign = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    const result = await authenticateLicenseToken(`Bearer ${signAPToken(makeClaims(), foreign)}`);
    expect(result).toEqual({ ok: false, status: 401, error: 'Unauthorized' });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a cryptographically valid token whose row was revoked', async () => {
    findUnique.mockResolvedValue({ ...liveRow, revokedAt: new Date() } as never);
    const result = await authenticateLicenseToken(bearer());
    expect(result).toEqual({ ok: false, status: 401, error: 'Unauthorized' });
  });

  it('rejects a token whose row no longer exists', async () => {
    findUnique.mockResolvedValue(null as never);
    const result = await authenticateLicenseToken(bearer());
    expect(result).toEqual({ ok: false, status: 401, error: 'Unauthorized' });
  });

  it('rejects when the stored orgId disagrees with the signed claim', async () => {
    findUnique.mockResolvedValue({ ...liveRow, orgId: 'org_other' } as never);
    const result = await authenticateLicenseToken(bearer());
    expect(result).toEqual({ ok: false, status: 401, error: 'Unauthorized' });
  });

  it('rejects when the stored instanceDomain disagrees with the signed claim', async () => {
    findUnique.mockResolvedValue({ ...liveRow, instanceDomain: 'other.example.com' } as never);
    const result = await authenticateLicenseToken(bearer());
    expect(result).toEqual({ ok: false, status: 401, error: 'Unauthorized' });
  });
});
