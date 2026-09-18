/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}));

jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: {
    getUsersNewestFirst: jest.fn(),
  },
}));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
}));

import type { NextRequest } from 'next/server';
import supertokens from 'supertokens-node';

import { ensureSuperTokensInit } from '@/app/config/backend';
import { __resetForTest as resetRateLimit } from '@/app/lib/rateLimit';
import { GET } from '@/app/api/cloud-users/route';
import { getCachedStats, __resetCacheForTest, type CloudUsersStats } from '@/app/lib/cloudUsers';

const mockGetUsersNewestFirst = supertokens.getUsersNewestFirst as jest.Mock;

/** A core user whose login methods carry the given `verified` flags, in order. */
function fakeUser(timeJoined: number, ...verified: boolean[]) {
  return { timeJoined, loginMethods: verified.map((v) => ({ verified: v })) };
}

function fakeRequest(ip = '203.0.113.10'): NextRequest {
  return {
    headers: {
      get: (name: string) => (name === 'x-forwarded-for' ? ip : null),
    },
  } as unknown as NextRequest;
}

const NOW = new Date('2026-09-12T12:00:00.000Z').getTime();

beforeEach(() => {
  jest.clearAllMocks();
  resetRateLimit();
  __resetCacheForTest();
  // clearAllMocks keeps queued mockResolvedValueOnce pages; drop them so none leak across tests.
  mockGetUsersNewestFirst.mockReset();
  mockGetUsersNewestFirst.mockResolvedValue({
    users: [fakeUser(NOW - 14 * 60_000, true), fakeUser(NOW - 20 * 60_000, true)],
  });
});

describe('getCachedStats', () => {
  it('THE CASE THIS GATE EXISTS FOR: fetches once and reuses the value inside the TTL window', async () => {
    const fetcher = jest.fn().mockResolvedValue({ totalUsers: 1, latestSignupAt: null });
    await getCachedStats(NOW, fetcher);
    await getCachedStats(NOW + 30_000, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches once the TTL has elapsed', async () => {
    const fetcher = jest.fn().mockResolvedValue({ totalUsers: 1, latestSignupAt: null });
    await getCachedStats(NOW, fetcher);
    await getCachedStats(NOW + 60_001, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('calls ensureSuperTokensInit and reads the shared platform tenant', async () => {
    await getCachedStats(NOW);
    expect(ensureSuperTokensInit).toHaveBeenCalledTimes(1);
    expect(mockGetUsersNewestFirst).toHaveBeenCalledWith({
      tenantId: 'public',
      limit: 500,
      paginationToken: undefined,
    });
  });

  it('converts the newest user timeJoined epoch to an ISO string', async () => {
    const stats = await getCachedStats(NOW);
    expect(stats.latestSignupAt).toBe(new Date(NOW - 14 * 60_000).toISOString());
  });

  it('reports null latestSignupAt when nobody has signed up yet', async () => {
    mockGetUsersNewestFirst.mockResolvedValue({ users: [] });
    const stats = await getCachedStats(NOW);
    expect(stats.latestSignupAt).toBeNull();
  });

  it('excludes an account whose login methods are all unverified', async () => {
    mockGetUsersNewestFirst.mockResolvedValue({
      users: [fakeUser(NOW - 60_000, false, false), fakeUser(NOW - 120_000, true)],
    });
    const stats = await getCachedStats(NOW);
    expect(stats.totalUsers).toBe(1);
  });

  it('counts only the verified accounts in a mix', async () => {
    mockGetUsersNewestFirst.mockResolvedValue({
      users: [
        fakeUser(NOW - 1_000, false),
        fakeUser(NOW - 2_000, true),
        fakeUser(NOW - 3_000, false),
        fakeUser(NOW - 4_000, false),
        fakeUser(NOW - 5_000, true),
      ],
    });
    const stats = await getCachedStats(NOW);
    expect(stats.totalUsers).toBe(2);
  });

  it('counts a linked account once when any one of its login methods is verified', async () => {
    mockGetUsersNewestFirst.mockResolvedValue({
      users: [
        fakeUser(NOW - 1_000, true, false),
        fakeUser(NOW - 2_000, false, true),
        fakeUser(NOW - 3_000, true, true),
      ],
    });
    const stats = await getCachedStats(NOW);
    expect(stats.totalUsers).toBe(3);
  });

  it('pages through the whole core and counts every page', async () => {
    mockGetUsersNewestFirst
      .mockResolvedValueOnce({
        users: [fakeUser(NOW - 1_000, true), fakeUser(NOW - 2_000, false)],
        nextPaginationToken: 'page-2',
      })
      .mockResolvedValueOnce({
        users: [fakeUser(NOW - 3_000, true), fakeUser(NOW - 4_000, true)],
        nextPaginationToken: 'page-3',
      })
      .mockResolvedValueOnce({
        users: [fakeUser(NOW - 5_000, false), fakeUser(NOW - 6_000, true)],
      });
    const stats = await getCachedStats(NOW);
    expect(stats.totalUsers).toBe(4);
    expect(mockGetUsersNewestFirst).toHaveBeenCalledTimes(3);
    expect(mockGetUsersNewestFirst.mock.calls.map(([args]) => args.paginationToken)).toEqual([
      undefined,
      'page-2',
      'page-3',
    ]);
  });

  it('takes latestSignupAt from the newest verified account, skipping newer unverified ones', async () => {
    mockGetUsersNewestFirst.mockResolvedValue({
      users: [
        fakeUser(NOW - 60_000, false),
        fakeUser(NOW - 5 * 60_000, true),
        fakeUser(NOW - 10 * 60_000, true),
      ],
    });
    const stats = await getCachedStats(NOW);
    expect(stats.latestSignupAt).toBe(new Date(NOW - 5 * 60_000).toISOString());
  });

  it('finds latestSignupAt on a later page when the whole first page is unverified', async () => {
    mockGetUsersNewestFirst
      .mockResolvedValueOnce({
        users: [fakeUser(NOW - 1_000, false), fakeUser(NOW - 2_000, false)],
        nextPaginationToken: 'page-2',
      })
      .mockResolvedValueOnce({ users: [fakeUser(NOW - 7_000, true), fakeUser(NOW - 8_000, true)] });
    const stats = await getCachedStats(NOW);
    expect(stats.latestSignupAt).toBe(new Date(NOW - 7_000).toISOString());
    expect(stats.totalUsers).toBe(2);
  });

  it('reports 0 and null when no account has verified', async () => {
    mockGetUsersNewestFirst
      .mockResolvedValueOnce({ users: [fakeUser(NOW - 1_000, false)], nextPaginationToken: 'p2' })
      .mockResolvedValueOnce({ users: [fakeUser(NOW - 2_000, false, false)] });
    const stats = await getCachedStats(NOW);
    expect(stats).toEqual({ totalUsers: 0, latestSignupAt: null });
  });

  it('throws rather than publish a partial count once the page cap is hit', async () => {
    // A core that keeps handing out tokens for 60 pages, past the 50-page cap.
    mockGetUsersNewestFirst.mockImplementation(
      async ({ paginationToken }: { paginationToken?: string }) => {
        const next = Number(paginationToken ?? 0) + 1;
        return {
          users: [fakeUser(NOW - next * 1_000, true)],
          nextPaginationToken: next < 60 ? String(next) : undefined,
        };
      }
    );
    await expect(getCachedStats(NOW)).rejects.toThrow('more than 50 pages');
    expect(mockGetUsersNewestFirst).toHaveBeenCalledTimes(50);
  });

  it('does not cache a failed fetch - the next call retries rather than repeating an error', async () => {
    const fetcher = jest
      .fn()
      .mockRejectedValueOnce(new Error('core unreachable'))
      .mockResolvedValueOnce({ totalUsers: 5, latestSignupAt: null });
    await expect(getCachedStats(NOW, fetcher)).rejects.toThrow('core unreachable');
    const stats = await getCachedStats(NOW, fetcher);
    expect(stats.totalUsers).toBe(5);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('GET /api/cloud-users', () => {
  it('returns 200 with the platform totals', async () => {
    const res = await GET(fakeRequest());
    expect(res.status).toBe(200);
    const json = (await res.json()) as CloudUsersStats;
    expect(json.totalUsers).toBe(2);
    expect(json.latestSignupAt).toBe(new Date(NOW - 14 * 60_000).toISOString());
  });

  it('emits a short public cache header, not no-store', async () => {
    const res = await GET(fakeRequest());
    expect(res.headers.get('Cache-Control')).toMatch(/public/);
    expect(res.headers.get('Cache-Control')).toMatch(/max-age=30/);
  });

  it('THE CASE THIS GATE EXISTS FOR: never leaks the underlying error on a SuperTokens failure', async () => {
    __resetCacheForTest();
    mockGetUsersNewestFirst.mockRejectedValue(
      new Error('connect ECONNREFUSED 10.0.4.12:3567 (supertokens-core internal)')
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(fakeRequest());
    expect(res.status).toBe(503);
    const body = await res.text();
    expect(body).not.toContain('10.0.4.12');
    expect(body).not.toContain('ECONNREFUSED');
    expect(body).toBe(JSON.stringify({ error: 'unavailable' }));
    expect(errorSpy).toHaveBeenCalledWith('[cloud-users] failed to load stats', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('rate-limits a caller past the shared per-IP bucket', async () => {
    let last;
    for (let i = 0; i < 25; i++) {
      last = await GET(fakeRequest('198.51.100.7'));
    }
    expect(last?.status).toBe(429);
  });

  it('keys the rate limit per caller, so one IP cannot exhaust another', async () => {
    for (let i = 0; i < 25; i++) await GET(fakeRequest('198.51.100.8'));
    const res = await GET(fakeRequest('198.51.100.9'));
    expect(res.status).toBe(200);
  });
});
