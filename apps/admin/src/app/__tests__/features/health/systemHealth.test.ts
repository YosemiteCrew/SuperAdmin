jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUserCount: jest.fn() },
}));

jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: { getUsersThatHaveRole: jest.fn() },
}));

jest.mock('@superadmin/database', () => ({
  prisma: { contactRequest: { aggregate: jest.fn() } },
}));

jest.mock('@/app/config/env.server', () => ({
  serverEnv: { contactIntakeKey: 'a-key' },
}));

jest.mock('@/app/constants', () => ({
  DEFAULT_TENANT_ID: 'public',
  SUPERADMIN_ROLE: 'superadmin',
}));

import { prisma } from '@superadmin/database';
import supertokens from 'supertokens-node';
import UserRolesNode from 'supertokens-node/recipe/userroles';
import { serverEnv } from '@/app/config/env.server';
import { collectSystemHealth, formatUptime } from '@/app/features/health';

const mockGetUserCount = supertokens.getUserCount as jest.MockedFunction<
  typeof supertokens.getUserCount
>;
const mockGetRole = UserRolesNode.getUsersThatHaveRole as jest.MockedFunction<
  typeof UserRolesNode.getUsersThatHaveRole
>;
const mockAggregate = prisma.contactRequest.aggregate as unknown as jest.Mock;
const mutableServerEnv = serverEnv as { contactIntakeKey: string | null };

beforeEach(() => {
  jest.clearAllMocks();
  mutableServerEnv.contactIntakeKey = 'a-key';
  mockAggregate.mockResolvedValue({ _max: { createdAt: null } });
});

describe('collectSystemHealth', () => {
  it('returns ok status when SuperTokens responds', async () => {
    mockGetUserCount.mockResolvedValue(42);
    mockGetRole.mockResolvedValue({ status: 'OK', users: ['a', 'b'] } as never);

    const h = await collectSystemHealth();
    expect(h.supertokens.status).toBe('ok');
    expect(h.totalUsers).toBe(42);
    expect(h.adminCount).toBe(2);
  });

  it('returns error status when SuperTokens throws', async () => {
    mockGetUserCount.mockRejectedValue(new Error('connection refused'));
    mockGetRole.mockResolvedValue({ status: 'OK', users: [] } as never);

    const h = await collectSystemHealth();
    expect(h.supertokens.status).toBe('error');
    expect(h.supertokens.error).toContain('connection refused');
    expect(h.totalUsers).toBe(0);
  });

  it('uses a safe message when SuperTokens throws a non-Error value', async () => {
    mockGetUserCount.mockRejectedValue('offline');
    mockGetRole.mockResolvedValue({ status: 'OK', users: [] } as never);

    const h = await collectSystemHealth();

    expect(h.supertokens.error).toBe('Unknown error');
  });

  it('includes runtime info', async () => {
    mockGetUserCount.mockResolvedValue(0);
    mockGetRole.mockResolvedValue({ status: 'OK', users: [] } as never);

    const h = await collectSystemHealth();
    expect(h.nodeVersion).toMatch(/^v\d+/);
    expect(typeof h.uptimeSec).toBe('number');
    expect(h.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(typeof h.memory.rssmb).toBe('number');
    expect(typeof h.memory.heapUsedMb).toBe('number');
  });

  it('reports adminCount=0 when role lookup fails', async () => {
    mockGetUserCount.mockResolvedValue(5);
    mockGetRole.mockRejectedValue(new Error('timeout'));

    const h = await collectSystemHealth();
    expect(h.adminCount).toBe(0);
  });

  it('reports adminCount=0 when the role lookup returns a non-OK result', async () => {
    mockGetUserCount.mockResolvedValue(5);
    mockGetRole.mockResolvedValue({ status: 'UNKNOWN_ROLE_ERROR' } as never);

    const h = await collectSystemHealth();

    expect(h.adminCount).toBe(0);
  });

  it('reports latency in milliseconds', async () => {
    mockGetUserCount.mockResolvedValue(1);
    mockGetRole.mockResolvedValue({ status: 'OK', users: [] } as never);

    const h = await collectSystemHealth();
    expect(h.supertokens.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('reports the configured contact key and newest stored submission', async () => {
    const newestSubmissionAt = new Date('2026-09-18T18:00:00.000Z');
    mockGetUserCount.mockResolvedValue(1);
    mockGetRole.mockResolvedValue({ status: 'OK', users: [] } as never);
    mockAggregate.mockResolvedValue({ _max: { createdAt: newestSubmissionAt } });

    const h = await collectSystemHealth();

    expect(mockAggregate).toHaveBeenCalledWith({ _max: { createdAt: true } });
    expect(h.contactIntake).toEqual({ keyConfigured: true, newestSubmissionAt });
  });

  it('reports an empty contact table without treating it as unavailable', async () => {
    mockGetUserCount.mockResolvedValue(1);
    mockGetRole.mockResolvedValue({ status: 'OK', users: [] } as never);

    const h = await collectSystemHealth();

    expect(h.contactIntake.newestSubmissionAt).toBeNull();
  });

  it('reports the contact query as unavailable without failing the other checks', async () => {
    mockGetUserCount.mockResolvedValue(7);
    mockGetRole.mockResolvedValue({ status: 'OK', users: ['admin'] } as never);
    mockAggregate.mockRejectedValue(new Error('database unavailable'));

    const h = await collectSystemHealth();

    expect(h.contactIntake).toEqual({ keyConfigured: true, newestSubmissionAt: 'unavailable' });
    expect(h.totalUsers).toBe(7);
    expect(h.adminCount).toBe(1);
  });

  it('reports an absent contact key independently of stored submissions', async () => {
    mutableServerEnv.contactIntakeKey = null;
    mockGetUserCount.mockResolvedValue(1);
    mockGetRole.mockResolvedValue({ status: 'OK', users: [] } as never);

    const h = await collectSystemHealth();

    expect(h.contactIntake.keyConfigured).toBe(false);
  });

  it("falls back to 'development' when NODE_ENV is absent", async () => {
    const original = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: undefined, configurable: true });
    mockGetUserCount.mockResolvedValue(1);
    mockGetRole.mockResolvedValue({ status: 'OK', users: [] } as never);

    try {
      const h = await collectSystemHealth();
      expect(h.env).toBe('development');
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: original, configurable: true });
    }
  });
});

describe('formatUptime', () => {
  it('formats seconds under a minute', () => {
    expect(formatUptime(45)).toBe('0m 45s');
  });

  it('formats minutes', () => {
    expect(formatUptime(125)).toBe('2m 5s');
  });

  it('formats hours and minutes', () => {
    expect(formatUptime(3661)).toBe('1h 1m');
  });

  it('formats days, hours and minutes', () => {
    expect(formatUptime(90061)).toBe('1d 1h 1m');
  });

  it('handles zero', () => {
    expect(formatUptime(0)).toBe('0m 0s');
  });
});
