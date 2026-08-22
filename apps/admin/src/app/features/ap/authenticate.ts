import 'server-only';
import { prisma } from '@superadmin/database';
import { serverEnv } from '@/app/config/env.server';
import type { APTokenClaims } from './types';
import { verifyAPToken, readBearerToken } from './verify';

export type AuthOutcome =
  { ok: true; claims: APTokenClaims } | { ok: false; status: 401 | 503; error: string };

/**
 * The single entry point every license-token-authenticated endpoint must use.
 *
 * Signature verification alone is not enough: a token stays cryptographically
 * valid for its full 90-day life after a super-admin revokes it, so the
 * revocation row is the authoritative check and is done here rather than left
 * to each caller. Returns a discriminated result instead of throwing so routes
 * answer with a uniform 401 and never leak which check failed.
 */
export async function authenticateLicenseToken(authorization: string | null): Promise<AuthOutcome> {
  const privateKey = serverEnv.apSigningKey;
  if (!privateKey) {
    // Misconfiguration, not a caller error - say so distinctly so a deploy that
    // forgot AP_SIGNING_KEY is diagnosable instead of looking like bad tokens.
    return { ok: false, status: 503, error: 'AP signing not configured' };
  }

  const token = readBearerToken(authorization);
  if (!token) return { ok: false, status: 401, error: 'Unauthorized' };

  let claims: APTokenClaims;
  try {
    claims = verifyAPToken(token, privateKey, serverEnv.apSigningKeyId);
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  // `jti` is the APLicenseToken row id by construction (see features/ap/types.ts).
  const row = await prisma.aPLicenseToken.findUnique({
    where: { id: claims.jti },
    select: { orgId: true, instanceDomain: true, revokedAt: true },
  });

  // An unknown jti means the token was signed by us but its row is gone - treat
  // it as revoked rather than trusting the self-contained claims.
  if (!row || row.revokedAt !== null) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  // Defence in depth: the signed claims and the stored row must agree. A
  // mismatch would mean our own issuance path is inconsistent, so fail closed.
  if (row.orgId !== claims.orgId || row.instanceDomain !== claims.instanceDomain) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true, claims };
}
