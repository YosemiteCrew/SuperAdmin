import 'server-only';
import { createPublicKey, createVerify } from 'node:crypto';

import { prisma } from '@superadmin/database';

import { serverEnv } from '@/app/config/env.server';

import type { APTokenClaims } from './types';

/**
 * Verifies a federation license token presented as a bearer credential.
 * Returns the claims when - and only when - ALL of the following hold:
 * signature valid under the SuperAdmin signing key, iss/aud match the locked
 * format, not expired, and the jti row exists in the token table and is not
 * revoked. Anything else returns null; callers must treat null as 401.
 */
export async function verifyAPToken(token: string): Promise<APTokenClaims | null> {
  const privateKeyPem = serverEnv.apSigningKey;
  if (!privateKeyPem) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string };
  let claims: APTokenClaims;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  // alg is pinned: anything but RS256 (e.g. "none", HS256 key-confusion) fails
  // before any cryptographic work happens.
  if (header.alg !== 'RS256') return null;

  let signatureValid = false;
  try {
    const publicKey = createPublicKey(privateKeyPem);
    const verifier = createVerify('SHA256');
    verifier.update(`${headerB64}.${payloadB64}`, 'utf8');
    signatureValid = verifier.verify(publicKey, Buffer.from(signatureB64, 'base64url'));
  } catch {
    return null;
  }
  if (!signatureValid) return null;

  if (claims.iss !== 'yosemitecrew.com' || claims.aud !== 'activitypub') return null;
  if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) return null;
  if (typeof claims.jti !== 'string' || typeof claims.orgId !== 'string') return null;
  if (typeof claims.instanceDomain !== 'string' || claims.instanceDomain.length === 0) return null;

  // Revocation + existence check against the issuing record. The row's own
  // orgId is authoritative - a mismatch means the token does not belong to
  // the org it claims and is rejected outright.
  const row = await prisma.aPLicenseToken.findUnique({ where: { id: claims.jti } });
  if (!row || row.revokedAt !== null) return null;
  if (row.orgId !== claims.orgId || row.instanceDomain !== claims.instanceDomain) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;

  return claims;
}
