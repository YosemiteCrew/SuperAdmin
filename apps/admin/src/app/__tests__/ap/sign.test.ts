import { generateKeyPairSync, createVerify } from 'node:crypto';
import { signAPToken, buildSigningKeyJwks } from '@/app/features/ap/sign';
import type { APTokenClaims } from '@/app/features/ap/types';

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
    keyId: 'yc-ap-2026-01',
    ...overrides,
  };
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

describe('signAPToken', () => {
  it('returns a three-part JWT string', () => {
    const jwt = signAPToken(makeClaims(), privateKeyPem);
    expect(jwt.split('.')).toHaveLength(3);
  });

  it('header encodes alg RS256 and correct kid', () => {
    const jwt = signAPToken(makeClaims(), privateKeyPem);
    const [headerB64] = jwt.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    expect(header.alg).toBe('RS256');
    expect(header.typ).toBe('JWT');
    expect(header.kid).toBe('yc-ap-2026-01');
  });

  it('payload contains all required claims', () => {
    const claims = makeClaims();
    const jwt = signAPToken(claims, privateKeyPem);
    const [, payloadB64] = jwt.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    expect(payload.iss).toBe('yosemitecrew.com');
    expect(payload.aud).toBe('activitypub');
    expect(payload.orgId).toBe('org_test');
    expect(payload.instanceDomain).toBe('pims.example.com');
    expect(payload.tier).toBe('pro');
    expect(payload.keyId).toBe('yc-ap-2026-01');
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
  });

  it('signature is valid against the RSA public key', () => {
    const jwt = signAPToken(makeClaims(), privateKeyPem);
    const parts = jwt.split('.');
    const signingInput = `${parts[0]}.${parts[1]}`;
    const sig = Buffer.from(parts[2], 'base64url');
    const verifier = createVerify('SHA256');
    verifier.update(signingInput, 'utf8');
    expect(verifier.verify(publicKeyPem, sig)).toBe(true);
  });

  it('different claims produce different tokens', () => {
    const a = signAPToken(makeClaims({ orgId: 'org_a' }), privateKeyPem);
    const b = signAPToken(makeClaims({ orgId: 'org_b' }), privateKeyPem);
    expect(a).not.toBe(b);
  });
});

describe('buildSigningKeyJwks', () => {
  it('returns a keys array with one entry', () => {
    const jwks = buildSigningKeyJwks(privateKeyPem, 'yc-ap-2026-01') as { keys: unknown[] };
    expect(jwks.keys).toHaveLength(1);
  });

  it('key entry has correct metadata', () => {
    const jwks = buildSigningKeyJwks(privateKeyPem, 'yc-ap-2026-01') as {
      keys: Record<string, unknown>[];
    };
    const key = jwks.keys[0];
    expect(key.kid).toBe('yc-ap-2026-01');
    expect(key.use).toBe('sig');
    expect(key.alg).toBe('RS256');
    expect(key.kty).toBe('RSA');
  });

  it('does not include private key fields (d, p, q)', () => {
    const jwks = buildSigningKeyJwks(privateKeyPem, 'yc-ap-2026-01') as {
      keys: Record<string, unknown>[];
    };
    const key = jwks.keys[0];
    expect(key).not.toHaveProperty('d');
    expect(key).not.toHaveProperty('p');
    expect(key).not.toHaveProperty('q');
  });
});
