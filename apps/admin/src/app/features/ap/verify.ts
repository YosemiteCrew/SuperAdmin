import 'server-only';
import { createVerify, createPublicKey } from 'node:crypto';
import type { APTokenClaims } from './types';

/**
 * Verifies an RS256 AP license JWT against the public half of `privateKeyPem`
 * and returns its claims. Pure crypto plus claim assertions - it deliberately
 * knows nothing about revocation, which needs a database read. Callers must not
 * use this directly; go through `authenticateLicenseToken` so the revocation
 * check cannot be forgotten.
 *
 * Mirrors, in reverse, the steps `features/ap/types.ts` documents as the locked
 * contract between this issuer and every PIMS verifier.
 *
 * @throws if the token is malformed, wrongly signed, or fails a claim check.
 */
export function verifyAPToken(token: string, privateKeyPem: string, keyId: string): APTokenClaims {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token: expected three segments');
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = decodeSegment(headerB64, 'header') as {
    alg?: unknown;
    kid?: unknown;
  };

  // Checked BEFORE any signature work: accepting the token's own `alg` is the
  // classic JWT confusion bug ("none", or HS256 verified with the RSA public key
  // as an HMAC secret). We only ever issue RS256, so anything else is a forgery.
  if (header.alg !== 'RS256') throw new Error('Unsupported token algorithm');

  // `kid` selects among OUR keys; it must never be a lookup the caller controls.
  // There is exactly one signing key, so a mismatch means the token is not ours.
  if (header.kid !== keyId) throw new Error('Unknown signing key id');

  const publicKey = createPublicKey(privateKeyPem);
  const verifier = createVerify('SHA256');
  verifier.update(`${headerB64}.${payloadB64}`, 'utf8');
  if (!verifier.verify(publicKey, Buffer.from(signatureB64, 'base64url'))) {
    throw new Error('Invalid token signature');
  }

  const claims = decodeSegment(payloadB64, 'payload') as Partial<APTokenClaims>;

  if (claims.iss !== 'yosemitecrew.com') throw new Error('Unexpected token issuer');
  if (claims.aud !== 'activitypub') throw new Error('Unexpected token audience');
  // `claims.keyId` is deliberately not re-checked: the header `kid` is covered by
  // the signature and already asserted above, and our signer derives one from the
  // other, so a disagreement is not reachable.

  if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  if (typeof claims.jti !== 'string' || claims.jti.length === 0) {
    throw new Error('Token is missing a jti');
  }
  if (typeof claims.orgId !== 'string' || claims.orgId.length === 0) {
    throw new Error('Token is missing an orgId');
  }
  if (typeof claims.instanceDomain !== 'string' || claims.instanceDomain.length === 0) {
    throw new Error('Token is missing an instanceDomain');
  }

  return claims as APTokenClaims;
}

function decodeSegment(segment: string, label: string): unknown {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch {
    throw new Error(`Malformed token ${label}`);
  }
}

/**
 * Pulls the bearer token out of an Authorization header. Returns null rather
 * than throwing so callers can answer 401 uniformly for "absent" and "malformed".
 */
export function readBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer (\S+)$/.exec(authorization.trim());
  return match ? match[1] : null;
}
