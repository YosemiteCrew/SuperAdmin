/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}));

jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: {
    getUserCount: jest.fn(),
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

const mockGetUserCount = supertokens.getUserCount as jest.Mock;
const mockGetUsersNewestFirst = supertokens.getUsersNewestFirst as jest.Mock;

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
  mockGetUserCount.mockResolvedValue(346);
  mockGetUsersNewestFirst.mockResolvedValue({ users: [{ timeJoined: NOW - 14 * 60_000 }] });
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
    expect(mockGetUsersNewestFirst).toHaveBeenCalledWith({ tenantId: 'public', limit: 1 });
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
    expect(json.totalUsers).toBe(346);
    expect(json.latestSignupAt).toBe(new Date(NOW - 14 * 60_000).toISOString());
  });

  it('emits a short public cache header, not no-store', async () => {
    const res = await GET(fakeRequest());
    expect(res.headers.get('Cache-Control')).toMatch(/public/);
    expect(res.headers.get('Cache-Control')).toMatch(/max-age=30/);
  });

  it('THE CASE THIS GATE EXISTS FOR: never leaks the underlying error on a SuperTokens failure', async () => {
    __resetCacheForTest();
    mockGetUserCount.mockRejectedValue(
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
