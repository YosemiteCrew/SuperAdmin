import { redirect } from 'next/navigation';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: (...args: unknown[]) => requireSuperAdminMock(...args),
}));

const revokeAllSessionsForUserMock = jest.fn();
jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: {
    revokeAllSessionsForUser: (...args: unknown[]) => revokeAllSessionsForUserMock(...args),
  },
}));

const getUserMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: (...args: unknown[]) => getUserMock(...args) },
}));

const updateEmailOrPasswordMock = jest.fn();
jest.mock('supertokens-node/recipe/emailpassword', () => ({
  __esModule: true,
  default: { updateEmailOrPassword: (...args: unknown[]) => updateEmailOrPasswordMock(...args) },
}));

const recordAuditEventMock = jest.fn();
jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
}));

const redirectMock = redirect as unknown as jest.Mock;
const ACTIONS = '@/app/(routes)/(dashboard)/settings/actions';

beforeEach(() => {
  requireSuperAdminMock.mockReset().mockResolvedValue({ userId: 'u-1' });
  revokeAllSessionsForUserMock.mockReset().mockResolvedValue(undefined);
  recordAuditEventMock.mockReset();
  updateEmailOrPasswordMock.mockReset().mockResolvedValue({ status: 'OK' });
  getUserMock.mockReset().mockResolvedValue({
    loginMethods: [{ recipeId: 'emailpassword', email: 'old@x.com', recipeUserId: 'rid-1' }],
  });
});

describe('signOutEverywhereAction', () => {
  it('revokes all sessions for the current user then redirects to /auth', async () => {
    const { signOutEverywhereAction } = await import(ACTIONS);
    await signOutEverywhereAction();
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('u-1');
    expect(redirectMock).toHaveBeenCalledWith('/auth');
  });

  it('does not revoke when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    const { signOutEverywhereAction } = await import(ACTIONS);
    await expect(signOutEverywhereAction()).rejects.toThrow('NEXT_REDIRECT');
    expect(revokeAllSessionsForUserMock).not.toHaveBeenCalled();
  });
});

describe('changeEmailAction', () => {
  it('rejects an invalid email without touching SuperTokens', async () => {
    const { changeEmailAction } = await import(ACTIONS);
    const res = await changeEmailAction('not-an-email');
    expect(res.ok).toBe(false);
    expect(updateEmailOrPasswordMock).not.toHaveBeenCalled();
  });

  it('rejects a non-string argument', async () => {
    const { changeEmailAction } = await import(ACTIONS);
    const res = await changeEmailAction(undefined as unknown as string);
    expect(res.ok).toBe(false);
    expect(updateEmailOrPasswordMock).not.toHaveBeenCalled();
  });

  it('rejects when there is no email/password login method', async () => {
    getUserMock.mockResolvedValueOnce({ loginMethods: [{ recipeId: 'thirdparty' }] });
    const { changeEmailAction } = await import(ACTIONS);
    const res = await changeEmailAction('new@x.com');
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/no email\/password/i);
  });

  it('rejects when the new email equals the current one', async () => {
    const { changeEmailAction } = await import(ACTIONS);
    const res = await changeEmailAction('OLD@x.com');
    expect(res.ok).toBe(false);
    expect(updateEmailOrPasswordMock).not.toHaveBeenCalled();
  });

  it('updates the email, audits, and revalidates on success', async () => {
    const { changeEmailAction } = await import(ACTIONS);
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };
    const res = await changeEmailAction('  New@X.com  ');
    expect(updateEmailOrPasswordMock).toHaveBeenCalledWith({
      recipeUserId: 'rid-1',
      email: 'new@x.com',
    });
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.email_change',
        targetId: 'u-1',
        targetLabel: 'new@x.com',
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/settings');
    expect(res.ok).toBe(true);
  });

  it.each([
    ['EMAIL_ALREADY_EXISTS_ERROR', /already in use/i],
    ['EMAIL_CHANGE_NOT_ALLOWED_ERROR', /not allowed/i],
    ['SOME_OTHER_ERROR', /could not update/i],
  ])('surfaces the %s status as a friendly error', async (status, matcher) => {
    updateEmailOrPasswordMock.mockResolvedValueOnce({ status, reason: 'x' });
    const { changeEmailAction } = await import(ACTIONS);
    const res = await changeEmailAction('new@x.com');
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(matcher);
    expect(recordAuditEventMock).not.toHaveBeenCalled();
  });

  it('does not change anything when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    const { changeEmailAction } = await import(ACTIONS);
    await expect(changeEmailAction('new@x.com')).rejects.toThrow('NEXT_REDIRECT');
    expect(updateEmailOrPasswordMock).not.toHaveBeenCalled();
  });
});
