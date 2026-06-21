jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const createRoleMock = jest.fn();
const addRoleToUserMock = jest.fn();
const removeUserRoleMock = jest.fn();
const getUsersThatHaveRoleMock = jest.fn();
jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: {
    createNewRoleOrAddPermissions: (...args: unknown[]) => createRoleMock(...args),
    addRoleToUser: (...args: unknown[]) => addRoleToUserMock(...args),
    removeUserRole: (...args: unknown[]) => removeUserRoleMock(...args),
    getUsersThatHaveRole: (...args: unknown[]) => getUsersThatHaveRoleMock(...args),
  },
}));

jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: { revokeSession: jest.fn(), revokeAllSessionsForUser: jest.fn() },
}));
jest.mock('supertokens-node/recipe/totp', () => ({
  __esModule: true,
  default: { listDevices: jest.fn(), removeDevice: jest.fn() },
}));

jest.mock('@/app/features/audit/store', () => ({ recordAuditEvent: jest.fn() }));
jest.mock('@/app/features/users/emailVerification', () => ({ setEmailVerified: jest.fn() }));

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
  requireSuperAdminMock.mockReset();
  requireSuperAdminMock.mockResolvedValue({ userId: 'admin-self' });
  createRoleMock.mockReset().mockResolvedValue({ status: 'OK', createdNewRole: true });
  addRoleToUserMock.mockReset().mockResolvedValue({ status: 'OK', didUserAlreadyHaveRole: false });
  removeUserRoleMock.mockReset().mockResolvedValue({ status: 'OK', didUserHaveRole: true });
  getUsersThatHaveRoleMock
    .mockReset()
    .mockResolvedValue({ status: 'OK', users: ['admin-self', 'target-1'] });
});

describe('grantSuperAdminAction', () => {
  it('skips when userId is missing', async () => {
    const { grantSuperAdminAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await grantSuperAdminAction(makeForm({}));
    expect(addRoleToUserMock).not.toHaveBeenCalled();
  });

  it('does not grant when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    const { grantSuperAdminAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await expect(grantSuperAdminAction(makeForm({ userId: 'target-1' }))).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(addRoleToUserMock).not.toHaveBeenCalled();
  });

  it('ensures the role exists then assigns it and revalidates', async () => {
    const { grantSuperAdminAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };
    await grantSuperAdminAction(makeForm({ userId: 'target-1' }));
    expect(createRoleMock).toHaveBeenCalledWith('superadmin', []);
    expect(addRoleToUserMock).toHaveBeenCalledWith('public', 'target-1', 'superadmin');
    expect(revalidatePath).toHaveBeenCalledWith('/users/target-1');
  });
});

describe('revokeSuperAdminAction', () => {
  it('refuses to remove the caller’s own role (self-lockout guard)', async () => {
    const { revokeSuperAdminAction } =
      await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await revokeSuperAdminAction(makeForm({ userId: 'admin-self' }));
    expect(removeUserRoleMock).not.toHaveBeenCalled();
  });

  it('refuses to remove the last remaining super admin', async () => {
    getUsersThatHaveRoleMock.mockResolvedValueOnce({ status: 'OK', users: ['target-1'] });
    const { revokeSuperAdminAction } =
      await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await revokeSuperAdminAction(makeForm({ userId: 'target-1' }));
    expect(removeUserRoleMock).not.toHaveBeenCalled();
  });

  it('refuses to remove when the role has no holders (UNKNOWN_ROLE_ERROR)', async () => {
    getUsersThatHaveRoleMock.mockResolvedValueOnce({ status: 'UNKNOWN_ROLE_ERROR' });
    const { revokeSuperAdminAction } =
      await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await revokeSuperAdminAction(makeForm({ userId: 'target-1' }));
    expect(removeUserRoleMock).not.toHaveBeenCalled();
  });

  it('removes the role for another admin when more than one exists', async () => {
    const { revokeSuperAdminAction } =
      await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };
    await revokeSuperAdminAction(makeForm({ userId: 'target-1' }));
    expect(removeUserRoleMock).toHaveBeenCalledWith('public', 'target-1', 'superadmin');
    expect(revalidatePath).toHaveBeenCalledWith('/users/target-1');
  });

  it('does not remove when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    const { revokeSuperAdminAction } =
      await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await expect(revokeSuperAdminAction(makeForm({ userId: 'target-1' }))).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(removeUserRoleMock).not.toHaveBeenCalled();
  });
});
