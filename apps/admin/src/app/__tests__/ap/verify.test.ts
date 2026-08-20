import { generateKeyPairSync } from 'node:crypto';
import { signAPToken } from '@/app/features/ap/sign';
import { verifyAPToken, readBearerToken } from '@/app/features/ap/verify';
import type { APTokenClaims } from '@/app/features/ap/types';

const KEY_ID = 'yc-ap-2026-01';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
const otherPrivateKeyPem = other.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

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

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

describe('verifyAPToken', () => {
  it('returns the claims for a token this issuer signed', () => {
    const claims = makeClaims();
    const token = signAPToken(claims, privateKeyPem);
    expect(verifyAPToken(token, privateKeyPem, KEY_ID)).toEqual(claims);
  });

  it('rejects a token that is not three segments', () => {
    expect(() => verifyAPToken('a.b', privateKeyPem, KEY_ID)).toThrow(/three segments/);
  });

  it('rejects an unsigned "alg: none" token even when the claims are perfect', () => {
    const header = b64({ alg: 'none', typ: 'JWT', kid: KEY_ID });
    const forged = `${header}.${b64(makeClaims())}.`;
    expect(() => verifyAPToken(forged, privateKeyPem, KEY_ID)).toThrow(
      /Unsupported token algorithm/
    );
  });

  it('rejects HS256 rather than treating the RSA key as an HMAC secret', () => {
    const header = b64({ alg: 'HS256', typ: 'JWT', kid: KEY_ID });
    const forged = `${header}.${b64(makeClaims())}.c2ln`;
    expect(() => verifyAPToken(forged, privateKeyPem, KEY_ID)).toThrow(
      /Unsupported token algorithm/
    );
  });

  it('rejects a token whose header names a key id we do not sign with', () => {
    const token = signAPToken(makeClaims({ keyId: 'yc-ap-1999-99' }), privateKeyPem);
    expect(() => verifyAPToken(token, privateKeyPem, KEY_ID)).toThrow(/Unknown signing key id/);
  });

  it('rejects a token signed by a different key', () => {
    const token = signAPToken(makeClaims(), otherPrivateKeyPem);
    expect(() => verifyAPToken(token, privateKeyPem, KEY_ID)).toThrow(/Invalid token signature/);
  });

  it('rejects a tampered payload', () => {
    const token = signAPToken(makeClaims(), privateKeyPem);
    const [header, , signature] = token.split('.');
    const swapped = `${header}.${b64(makeClaims({ orgId: 'org_attacker' }))}.${signature}`;
    expect(() => verifyAPToken(swapped, privateKeyPem, KEY_ID)).toThrow(/Invalid token signature/);
  });

  it('rejects a malformed header segment', () => {
    const forged = `not-json.${b64(makeClaims())}.sig`;
    expect(() => verifyAPToken(forged, privateKeyPem, KEY_ID)).toThrow(/Malformed token header/);
  });

  it('rejects a foreign issuer', () => {
    const token = signAPToken(
      makeClaims({ iss: 'evil.example' as 'yosemitecrew.com' }),
      privateKeyPem
    );
    expect(() => verifyAPToken(token, privateKeyPem, KEY_ID)).toThrow(/Unexpected token issuer/);
  });

  it('rejects a token minted for a different audience', () => {
    const token = signAPToken(makeClaims({ aud: 'billing' as 'activitypub' }), privateKeyPem);
    expect(() => verifyAPToken(token, privateKeyPem, KEY_ID)).toThrow(/Unexpected token audience/);
  });

  it('rejects an expired token', () => {
    const token = signAPToken(
      makeClaims({ exp: Math.floor(Date.now() / 1000) - 1 }),
      privateKeyPem
    );
    expect(() => verifyAPToken(token, privateKeyPem, KEY_ID)).toThrow(/Token expired/);
  });

  it('rejects a non-numeric exp', () => {
    const token = signAPToken(makeClaims({ exp: 'soon' as unknown as number }), privateKeyPem);
    expect(() => verifyAPToken(token, privateKeyPem, KEY_ID)).toThrow(/Token expired/);
  });

  it.each([
    ['jti', /missing a jti/],
    ['orgId', /missing an orgId/],
    ['instanceDomain', /missing an instanceDomain/],
  ])('rejects a token with no %s', (field, message) => {
    const token = signAPToken(makeClaims({ [field]: '' } as Partial<APTokenClaims>), privateKeyPem);
    expect(() => verifyAPToken(token, privateKeyPem, KEY_ID)).toThrow(message);
  });
});

describe('readBearerToken', () => {
  it('returns null when the header is absent', () => {
    expect(readBearerToken(null)).toBeNull();
  });

  it('returns null for a non-bearer scheme', () => {
    expect(readBearerToken('Basic abc123')).toBeNull();
  });

  it('returns null when the scheme has no token', () => {
    expect(readBearerToken('Bearer ')).toBeNull();
  });

  it('returns null when the value has spaces inside the token', () => {
    expect(readBearerToken('Bearer abc 123')).toBeNull();
  });

  it('extracts the token, tolerating surrounding whitespace', () => {
    expect(readBearerToken('  Bearer abc123  ')).toBe('abc123');
  });
});
