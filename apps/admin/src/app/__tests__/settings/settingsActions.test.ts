import { redirect } from 'next/navigation';

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: (...args: unknown[]) => requireSuperAdminMock(...args),
}));

const revokeAllSessionsForUserMock = jest.fn();
jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: {
    revokeAllSessionsForUser: (...args: unknown[]) => revokeAllSessionsForUserMock(...args),
  },
}));

const redirectMock = redirect as unknown as jest.Mock;

describe('signOutEverywhereAction', () => {
  beforeEach(() => {
    requireSuperAdminMock.mockReset();
    revokeAllSessionsForUserMock.mockReset();
  });

  it('revokes all sessions for the current user then redirects to /auth', async () => {
    requireSuperAdminMock.mockResolvedValue({ userId: 'u-1' });
    revokeAllSessionsForUserMock.mockResolvedValue(undefined);
    const { signOutEverywhereAction } = await import('@/app/(routes)/(dashboard)/settings/actions');
    await signOutEverywhereAction();
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('u-1');
    expect(redirectMock).toHaveBeenCalledWith('/auth');
  });

  it('does not revoke when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValue(new Error('NEXT_REDIRECT'));
    const { signOutEverywhereAction } = await import('@/app/(routes)/(dashboard)/settings/actions');
    await expect(signOutEverywhereAction()).rejects.toThrow('NEXT_REDIRECT');
    expect(revokeAllSessionsForUserMock).not.toHaveBeenCalled();
  });
});
