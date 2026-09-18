import 'server-only';

import supertokens from 'supertokens-node';

import { ensureSuperTokensInit } from '@/app/config/backend';

const CACHE_TTL_MS = 60_000;
// Largest page the core accepts: its /users API rejects limit > USER_PAGINATION_LIMIT (500).
const PAGE_SIZE = 500;
// Ceiling: 50 x 500 = 25,000 accounts. Past that the stat 503s until this is raised.
const MAX_PAGES = 50;

export interface CloudUsersStats {
  totalUsers: number;
  latestSignupAt: string | null;
}

/**
 * Counts accounts with at least one verified login method. A bot wave (Yosemite-Crew#2644)
 * signs up with email and password to relay verification mail and never verifies, so the raw
 * core count mostly measured bots. Passwordless and social sign-ins arrive verified.
 */
async function loadStats(): Promise<CloudUsersStats> {
  ensureSuperTokensInit();
  let totalUsers = 0;
  let latest: number | undefined;
  let paginationToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await supertokens.getUsersNewestFirst({
      tenantId: 'public',
      limit: PAGE_SIZE,
      paginationToken,
    });
    for (const user of result.users) {
      if (!user.loginMethods.some((method) => method.verified)) continue;
      totalUsers++;
      latest ??= user.timeJoined;
    }
    paginationToken = result.nextPaginationToken;
    if (!paginationToken) {
      return {
        totalUsers,
        latestSignupAt: latest === undefined ? null : new Date(latest).toISOString(),
      };
    }
  }
  // A partial count would be published as the real one; fail into the route's 503 instead.
  throw new Error(`cloud-users: more than ${MAX_PAGES} pages of users`);
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
