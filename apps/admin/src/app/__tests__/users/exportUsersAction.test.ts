jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));

const getUsersNewestFirstMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: {
    getUser: jest.fn(),
    deleteUser: jest.fn(),
    getUsersNewestFirst: (...a: unknown[]) => getUsersNewestFirstMock(...a),
  },
}));

jest.mock('@/app/features/audit/store', () => ({ recordAuditEvent: jest.fn() }));

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: (...a: unknown[]) => requireSuperAdminMock(...a),
}));

import { exportUsersAction } from '@/app/(routes)/(dashboard)/users/actions';

function user(over: Record<string, unknown> = {}) {
  return {
    id: 'u-1',
    emails: ['a@x.com'],
    loginMethods: [{ recipeId: 'emailpassword' }],
    tenantIds: ['public'],
    timeJoined: Date.UTC(2026, 0, 2),
    ...over,
  };
}

beforeEach(() => {
  requireSuperAdminMock.mockReset().mockResolvedValue({ userId: 'admin-1' });
  getUsersNewestFirstMock.mockReset();
});

describe('exportUsersAction', () => {
  it('paginates through every page and returns a CSV of all users', async () => {
    getUsersNewestFirstMock
      .mockResolvedValueOnce({ users: [user()], nextPaginationToken: 'tok' })
      .mockResolvedValueOnce({
        users: [user({ id: 'u-2', emails: ['b@x.com'] })],
        nextPaginationToken: undefined,
      });

    const csv = await exportUsersAction();

    expect(getUsersNewestFirstMock).toHaveBeenCalledTimes(2);
    expect(getUsersNewestFirstMock.mock.calls[1][0]).toMatchObject({ paginationToken: 'tok' });
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Email,Login methods,Tenants,Joined,User ID');
    expect(lines).toHaveLength(3);
    expect(csv).toContain('a@x.com');
    expect(csv).toContain('b@x.com');
  });

  it('falls back to empty email/default tenant', async () => {
    getUsersNewestFirstMock.mockResolvedValueOnce({
      users: [user({ emails: [], tenantIds: [] })],
      nextPaginationToken: undefined,
    });
    const csv = await exportUsersAction();
    expect(csv.split('\n')[1]).toBe(',emailpassword,public,2026-01-02T00:00:00.000Z,u-1');
  });

  it('does nothing when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(exportUsersAction()).rejects.toThrow('NEXT_REDIRECT');
    expect(getUsersNewestFirstMock).not.toHaveBeenCalled();
  });
});
