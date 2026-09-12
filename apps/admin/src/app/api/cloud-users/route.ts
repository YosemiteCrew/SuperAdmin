import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import supertokens from 'supertokens-node';

import { ensureSuperTokensInit } from '@/app/config/backend';
import { rateLimitResponse } from '@/app/lib/rateLimit';
import { getServerTimestamp } from '@/app/lib/serverTime';

const CACHE_TTL_MS = 60_000;

export interface CloudUsersStats {
  totalUsers: number;
  latestSignupAt: string | null;
}

/**
 * Total signups and the newest one, straight from the shared SuperTokens core.
 *
 * This counts every account across the platform - practices, staff, pet
 * parents - not just this panel's own invited admins. `SUPERTOKENS_CONNECTION_URI`
 * names the same core here and in the main product's backend, so `tenantId:
 * 'public'` is the whole platform's signup ledger, the same one the dashboard's
 * "Total users" / "Latest signup" cards already read.
 */
async function loadStats(): Promise<CloudUsersStats> {
  ensureSuperTokensInit();
  const [totalUsers, newest] = await Promise.all([
    supertokens.getUserCount(),
    supertokens.getUsersNewestFirst({ tenantId: 'public', limit: 1 }),
  ]);
  const latest = newest.users[0]?.timeJoined;
  return {
    totalUsers,
    latestSignupAt: latest ? new Date(latest).toISOString() : null,
  };
}

let cache: { stats: CloudUsersStats; fetchedAt: number } | null = null;

/**
 * Cached read, exported separately from the route handler so a test can drive
 * the cache/TTL decision directly rather than through NextRequest/NextResponse.
 *
 * A public, unauthenticated endpoint with no cache would let every marketing-
 * site pageview open a fresh connection to the SuperTokens core; 60s is short
 * enough that "latest signup" still reads as current, long enough that normal
 * traffic never bypasses it.
 */
export async function getCachedStats(
  now: number,
  fetcher: () => Promise<CloudUsersStats> = loadStats
): Promise<CloudUsersStats> {
  if (!cache || now - cache.fetchedAt > CACHE_TTL_MS) {
    cache = { stats: await fetcher(), fetchedAt: now };
  }
  return cache.stats;
}

/** Test-only: drop the cached value so the next call re-fetches. */
export function __resetCacheForTest(): void {
  cache = null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = rateLimitResponse(request, 'cloud-users');
  if (limited) return limited;

  try {
    const stats = await getCachedStats(getServerTimestamp());
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    // Same reasoning as /api/health's `describe()`: log the real error server-side,
    // never let a SuperTokens/network error message reach this unauthenticated response.
    console.error('[cloud-users] failed to load stats', error);
    return NextResponse.json(
      { error: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
