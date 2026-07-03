/**
 * @jest-environment node
 */
import { generateKeyPairSync } from 'node:crypto';

jest.mock('server-only', () => ({}));

jest.mock('@/app/config/env.server', () => {
  // Keygen inside the factory: jest hoists mock factories above module consts.
  const { generateKeyPairSync: gen } = jest.requireActual('node:crypto');
  const pem = gen('rsa', { modulusLength: 2048 }).privateKey.export({
    type: 'pkcs8',
    format: 'pem',
  });
  return { serverEnv: { apSigningKey: pem, apSigningKeyId: 'yc-ap-test' } };
});

jest.mock('@superadmin/database', () => ({
  prisma: { aPLicenseToken: { findUnique: jest.fn() } },
}));

import { prisma } from '@superadmin/database';
import { serverEnv } from '@/app/config/env.server';
import { signAPToken } from '@/app/features/ap/sign';
import type { APTokenClaims } from '@/app/features/ap/types';
import { verifyAPToken } from '@/app/features/ap/verify';

const mockPrivatePem = serverEnv.apSigningKey as string;
const mockOtherPem = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({
  type: 'pkcs8',
  format: 'pem',
}) as string;

const mockFindUnique = prisma.aPLicenseToken.findUnique as jest.MockedFunction<
  typeof prisma.aPLicenseToken.findUnique
>;

type TokenRow = Awaited<ReturnType<typeof prisma.aPLicenseToken.findUnique>>;

const NOW_S = Math.floor(Date.now() / 1000);

function claims(over: Partial<APTokenClaims> = {}): APTokenClaims {
  return {
    iss: 'yosemitecrew.com',
    sub: 'org-1',
    aud: 'activitypub',
    jti: 'tok-1',
    iat: NOW_S,
    exp: NOW_S + 3600,
    orgId: 'org-1',
    instanceDomain: 'pims.clinic.com',
    tier: 'pro',
    keyId: 'yc-ap-test',
    ...over,
  };
}

function dbRow(over: Record<string, unknown> = {}): TokenRow {
  return {
    id: 'tok-1',
    orgId: 'org-1',
    instanceDomain: 'pims.clinic.com',
    token: 'stored',
    keyId: 'yc-ap-test',
    tier: 'pro',
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 3_600_000),
    revokedAt: null,
    revokedBy: null,
    ...over,
  } as TokenRow;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFindUnique.mockResolvedValue(dbRow());
});

describe('verifyAPToken', () => {
  it('returns the claims for a valid, live token', async () => {
    const result = await verifyAPToken(signAPToken(claims(), mockPrivatePem));
    expect(result?.orgId).toBe('org-1');
    expect(result?.instanceDomain).toBe('pims.clinic.com');
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'tok-1' } });
  });

  it('rejects a token signed with a different key', async () => {
    expect(await verifyAPToken(signAPToken(claims(), mockOtherPem))).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const [h, , s] = signAPToken(claims(), mockPrivatePem).split('.');
    const forged = Buffer.from(JSON.stringify(claims({ orgId: 'org-evil' }))).toString('base64url');
    expect(await verifyAPToken(`${h}.${forged}.${s}`)).toBeNull();
  });

  it('rejects non-RS256 algorithms before any crypto work', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(claims())).toString('base64url');
    expect(await verifyAPToken(`${header}.${payload}.`)).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('rejects an expired token', async () => {
    expect(
      await verifyAPToken(signAPToken(claims({ exp: NOW_S - 10 }), mockPrivatePem))
    ).toBeNull();
  });

  it.each([
    ['wrong issuer', { iss: 'evil.example' as APTokenClaims['iss'] }],
    ['wrong audience', { aud: 'web' as APTokenClaims['aud'] }],
  ])('rejects %s', async (_label, over) => {
    expect(await verifyAPToken(signAPToken(claims(over), mockPrivatePem))).toBeNull();
  });

  it('rejects a revoked token', async () => {
    mockFindUnique.mockResolvedValue(dbRow({ revokedAt: new Date() }));
    expect(await verifyAPToken(signAPToken(claims(), mockPrivatePem))).toBeNull();
  });

  it('rejects a token with no issuing record', async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await verifyAPToken(signAPToken(claims(), mockPrivatePem))).toBeNull();
  });

  it('rejects a token whose claims disagree with the issuing record', async () => {
    mockFindUnique.mockResolvedValue(dbRow({ orgId: 'org-other' }));
    expect(await verifyAPToken(signAPToken(claims(), mockPrivatePem))).toBeNull();
  });

  it('rejects a token whose issuing record has lapsed', async () => {
    mockFindUnique.mockResolvedValue(dbRow({ expiresAt: new Date(Date.now() - 1000) }));
    expect(await verifyAPToken(signAPToken(claims(), mockPrivatePem))).toBeNull();
  });

  it('rejects garbage tokens without throwing', async () => {
    expect(await verifyAPToken('not-a-jwt')).toBeNull();
    expect(await verifyAPToken('a.b')).toBeNull();
    expect(await verifyAPToken('a.b.c')).toBeNull();
  });
});
