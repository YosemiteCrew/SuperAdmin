import { NextResponse } from 'next/server';
import { prisma } from '@superadmin/database';

// Instances cache this list for up to 24 hours. Revocations take effect within
// one cache TTL on each remote instance.
const CACHE_MAX_AGE = 60 * 60 * 24; // 86400 seconds

/**
 * Returns a JSON array of revoked token IDs (jti values).
 * This endpoint is public — no auth required — so any federated instance can
 * validate inbound AP requests against the current revocation list.
 */
export async function GET(): Promise<NextResponse> {
  const revoked = await prisma.aPLicenseToken.findMany({
    where: { revokedAt: { not: null } },
    select: { id: true },
    orderBy: { revokedAt: 'desc' },
  });

  const ids = revoked.map((r) => r.id);

  return NextResponse.json(ids, {
    headers: {
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=3600`,
    },
  });
}
