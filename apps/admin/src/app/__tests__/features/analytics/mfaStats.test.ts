// getMFAStats uses unstable_cache which is hard to unit-test directly.
// This suite tests the underlying logic via the module internals by mocking
// the supertokens and totp imports.

jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUsersNewestFirst: jest.fn() },
}));

jest.mock('supertokens-node/recipe/totp', () => ({
  __esModule: true,
  default: { listDevices: jest.fn() },
}));

jest.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown) => fn,
}));

import supertokens from 'supertokens-node';
import TotpNode from 'supertokens-node/recipe/totp';
import { getMFAStats } from '@/app/features/analytics';

const mockGetUsers = supertokens.getUsersNewestFirst as jest.MockedFunction<
  typeof supertokens.getUsersNewestFirst
>;
const mockListDevices = TotpNode.listDevices as jest.MockedFunction<typeof TotpNode.listDevices>;

function makeUser(id: string) {
  return {
    id,
    timeJoined: Date.now(),
    loginMethods: [],
    emails: [],
    phoneNumbers: [],
    thirdParty: [],
  };
}

beforeEach(() => jest.clearAllMocks());

describe('getMFAStats', () => {
  it('returns zero stats when no users exist', async () => {
    mockGetUsers.mockResolvedValue({ users: [], nextPaginationToken: undefined } as never);
    const stats = await getMFAStats();
    expect(stats).toEqual({ mfaEnabled: 0, total: 0, adoptionPct: 0 });
    expect(mockListDevices).not.toHaveBeenCalled();
  });

  it('counts users with at least one verified TOTP device', async () => {
    const users = [makeUser('u1'), makeUser('u2'), makeUser('u3')];
    mockGetUsers.mockResolvedValue({ users, nextPaginationToken: undefined } as never);
    mockListDevices
      .mockResolvedValueOnce({
        status: 'OK',
        devices: [{ name: 'phone', verified: true, period: 30, skew: 1 }],
      } as never)
      .mockResolvedValueOnce({
        status: 'OK',
        devices: [{ name: 'tablet', verified: false, period: 30, skew: 1 }],
      } as never)
      .mockResolvedValueOnce({ status: 'OK', devices: [] } as never);

    const stats = await getMFAStats();
    expect(stats.mfaEnabled).toBe(1);
    expect(stats.total).toBe(3);
    expect(stats.adoptionPct).toBe(33);
  });

  it('handles listDevices failures gracefully (settled)', async () => {
    const users = [makeUser('u1'), makeUser('u2')];
    mockGetUsers.mockResolvedValue({ users, nextPaginationToken: undefined } as never);
    mockListDevices
      .mockResolvedValueOnce({
        status: 'OK',
        devices: [{ name: 'phone', verified: true, period: 30, skew: 1 }],
      } as never)
      .mockRejectedValueOnce(new Error('network'));

    const stats = await getMFAStats();
    expect(stats.mfaEnabled).toBe(1);
    expect(stats.total).toBe(2);
  });

  it('rounds adoptionPct to nearest integer', async () => {
    const users = [makeUser('u1'), makeUser('u2'), makeUser('u3')];
    mockGetUsers.mockResolvedValue({ users, nextPaginationToken: undefined } as never);
    mockListDevices
      .mockResolvedValueOnce({
        status: 'OK',
        devices: [{ name: 'p', verified: true, period: 30, skew: 1 }],
      } as never)
      .mockResolvedValueOnce({ status: 'OK', devices: [] } as never)
      .mockResolvedValueOnce({ status: 'OK', devices: [] } as never);

    const stats = await getMFAStats();
    // 1/3 = 33.3... => rounds to 33
    expect(stats.adoptionPct).toBe(33);
  });

  it('does not count unverified devices', async () => {
    const users = [makeUser('u1')];
    mockGetUsers.mockResolvedValue({ users, nextPaginationToken: undefined } as never);
    mockListDevices.mockResolvedValue({
      status: 'OK',
      devices: [{ name: 'p', verified: false, period: 30, skew: 1 }],
    } as never);

    const stats = await getMFAStats();
    expect(stats.mfaEnabled).toBe(0);
    expect(stats.adoptionPct).toBe(0);
  });
});
