import { NextResponse } from 'next/server';
import { serverEnv } from '@/app/config/env.server';
import { buildSigningKeyJwks } from '@/app/features/ap/sign';

// Public key changes only on key rotation — cache aggressively.
const CACHE_MAX_AGE = 60 * 60 * 24; // 86400 seconds

/**
 * Returns the RSA public key(s) used to verify AP license JWTs, as a JWK Set.
 * Instances should fetch this once per day and pick the key by `kid`.
 *
 * GET /ap/signing-key.json
 */
export async function GET(): Promise<NextResponse> {
  const privateKey = serverEnv.apSigningKey;
  if (!privateKey) {
    return NextResponse.json({ error: 'AP signing not configured' }, { status: 503 });
  }

  const jwks = buildSigningKeyJwks(privateKey, serverEnv.apSigningKeyId);

  return NextResponse.json(jwks, {
    headers: {
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=3600`,
    },
  });
}
