import 'server-only';

import supertokens from 'supertokens-node';

import { ensureSuperTokensInit } from '@/app/config/backend';

const CACHE_TTL_MS = 60_000;

export interface CloudUsersStats {
  totalUsers: number;
  latestSignupAt: string | null;
}

/** Reads the platform-wide signup ledger from the shared SuperTokens core. */
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
 * Keep public pageviews from opening a fresh core connection while retaining a
 * short enough TTL for the latest-signup value to remain useful.
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
