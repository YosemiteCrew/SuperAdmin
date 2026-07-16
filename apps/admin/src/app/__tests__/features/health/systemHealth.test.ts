jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUserCount: jest.fn() },
}));

jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: { getUsersThatHaveRole: jest.fn() },
}));

jest.mock('@/app/constants', () => ({
  DEFAULT_TENANT_ID: 'public',
  SUPERADMIN_ROLE: 'superadmin',
}));

import supertokens from 'supertokens-node';
import UserRolesNode from 'supertokens-node/recipe/userroles';
import { collectSystemHealth, formatUptime } from '@/app/features/health';

const mockGetUserCount = supertokens.getUserCount as jest.MockedFunction<
  typeof supertokens.getUserCount
>;
const mockGetRole = UserRolesNode.getUsersThatHaveRole as jest.MockedFunction<
  typeof UserRolesNode.getUsersThatHaveRole
>;

beforeEach(() => jest.clearAllMocks());

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

  it('reports latency in milliseconds', async () => {
    mockGetUserCount.mockResolvedValue(1);
    mockGetRole.mockResolvedValue({ status: 'OK', users: [] } as never);

    const h = await collectSystemHealth();
    expect(h.supertokens.latencyMs).toBeGreaterThanOrEqual(0);
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
