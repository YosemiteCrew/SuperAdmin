jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const revokeAllSessionsForUserMock = jest.fn();
jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: {
    revokeSession: jest.fn(),
    revokeAllSessionsForUser: (...args: unknown[]) => revokeAllSessionsForUserMock(...args),
  },
}));

const updateUserMetadataMock = jest.fn();
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { updateUserMetadata: (...args: unknown[]) => updateUserMetadataMock(...args) },
}));

jest.mock('supertokens-node/recipe/totp', () => ({
  __esModule: true,
  default: { listDevices: jest.fn(), removeDevice: jest.fn() },
}));
jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: {
    createNewRoleOrAddPermissions: jest.fn(),
    addRoleToUser: jest.fn(),
    removeUserRole: jest.fn(),
    getUsersThatHaveRole: jest.fn(),
  },
}));

const recordAuditEventMock = jest.fn();
jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
}));
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
  requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
  revokeAllSessionsForUserMock.mockReset().mockResolvedValue([]);
  updateUserMetadataMock.mockReset().mockResolvedValue(undefined);
  recordAuditEventMock.mockReset();
});

describe('disableUserAction', () => {
  it('skips when userId is missing', async () => {
    const { disableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await disableUserAction(makeForm({}));
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
  });

  it('refuses to disable the calling admin (self-lockout guard)', async () => {
    const { disableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await disableUserAction(makeForm({ userId: 'admin-1' }));
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
    expect(revokeAllSessionsForUserMock).not.toHaveBeenCalled();
  });

  it('does nothing when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    const { disableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await expect(disableUserAction(makeForm({ userId: 'u-1' }))).rejects.toThrow('NEXT_REDIRECT');
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
  });

  it('flags the account, revokes sessions, audits, and revalidates', async () => {
    const { disableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };
    await disableUserAction(makeForm({ userId: 'u-7' }));
    expect(updateUserMetadataMock).toHaveBeenCalledWith(
      'u-7',
      expect.objectContaining({ disabledAt: expect.any(Number) })
    );
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('u-7');
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.disable', targetId: 'u-7' })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/users/u-7');
  });
});

describe('enableUserAction', () => {
  it('skips when userId is missing', async () => {
    const { enableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await enableUserAction(makeForm({}));
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
  });

  it('clears the disabled flag, audits, and revalidates', async () => {
    const { enableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };
    await enableUserAction(makeForm({ userId: 'u-9' }));
    expect(updateUserMetadataMock).toHaveBeenCalledWith('u-9', { disabledAt: null });
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.enable', targetId: 'u-9' })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/users/u-9');
  });
});
