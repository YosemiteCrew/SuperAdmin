jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const removeUserRoleMock = jest.fn();
const getUsersThatHaveRoleMock = jest.fn();
jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: {
    removeUserRole: (...args: unknown[]) => removeUserRoleMock(...args),
    getUsersThatHaveRole: (...args: unknown[]) => getUsersThatHaveRoleMock(...args),
  },
}));

jest.mock('@/app/features/audit/store', () => ({ recordAuditEvent: jest.fn() }));

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: (...args: unknown[]) => requireSuperAdminMock(...args),
}));

function makeForm(entries: Record<string, string | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (v !== undefined) fd.append(k, v);
  }
  return fd;
}

beforeEach(() => {
  requireSuperAdminMock.mockReset().mockResolvedValue({ userId: 'admin-self' });
  removeUserRoleMock.mockReset().mockResolvedValue({ status: 'OK' });
  getUsersThatHaveRoleMock
    .mockReset()
    .mockResolvedValue({ status: 'OK', users: ['admin-self', 'target-1'] });
});

describe('revokeAdminAction', () => {
  it('skips when userId is missing', async () => {
    const { revokeAdminAction } = await import('@/app/(routes)/(dashboard)/admins/actions');
    await revokeAdminAction(makeForm({}));
    expect(removeUserRoleMock).not.toHaveBeenCalled();
  });

  it('skips when userId is the caller (self-lockout guard)', async () => {
    const { revokeAdminAction } = await import('@/app/(routes)/(dashboard)/admins/actions');
    await revokeAdminAction(makeForm({ userId: 'admin-self' }));
    expect(removeUserRoleMock).not.toHaveBeenCalled();
  });

  it('skips when this would remove the last admin', async () => {
    getUsersThatHaveRoleMock.mockResolvedValueOnce({ status: 'OK', users: ['target-1'] });
    const { revokeAdminAction } = await import('@/app/(routes)/(dashboard)/admins/actions');
    await revokeAdminAction(makeForm({ userId: 'target-1' }));
    expect(removeUserRoleMock).not.toHaveBeenCalled();
  });

  it('skips when getUsersThatHaveRole returns UNKNOWN_ROLE_ERROR', async () => {
    getUsersThatHaveRoleMock.mockResolvedValueOnce({ status: 'UNKNOWN_ROLE_ERROR' });
    const { revokeAdminAction } = await import('@/app/(routes)/(dashboard)/admins/actions');
    await revokeAdminAction(makeForm({ userId: 'target-1' }));
    expect(removeUserRoleMock).not.toHaveBeenCalled();
  });

  it('removes the role and revalidates /admins and /users/[id]', async () => {
    const { revokeAdminAction } = await import('@/app/(routes)/(dashboard)/admins/actions');
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };
    await revokeAdminAction(makeForm({ userId: 'target-1' }));
    expect(removeUserRoleMock).toHaveBeenCalledWith('public', 'target-1', 'superadmin');
    expect(revalidatePath).toHaveBeenCalledWith('/admins');
    expect(revalidatePath).toHaveBeenCalledWith('/users/target-1');
  });

  it('throws when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    const { revokeAdminAction } = await import('@/app/(routes)/(dashboard)/admins/actions');
    await expect(revokeAdminAction(makeForm({ userId: 'target-1' }))).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(removeUserRoleMock).not.toHaveBeenCalled();
  });
});
