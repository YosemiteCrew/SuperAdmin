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
const getUserMetadataMock = jest.fn();
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: {
    getUserMetadata: (...args: unknown[]) => getUserMetadataMock(...args),
    updateUserMetadata: (...args: unknown[]) => updateUserMetadataMock(...args),
  },
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

const isBootstrapAdminMock = jest.fn();
jest.mock('@/app/features/users/bootstrap', () => ({
  isBootstrapAdmin: (...args: unknown[]) => isBootstrapAdminMock(...args),
}));

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
  const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };
  revalidatePath.mockClear();
  requireSuperAdminMock.mockReset();
  requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
  revokeAllSessionsForUserMock.mockReset().mockResolvedValue([]);
  getUserMetadataMock.mockReset().mockResolvedValue({ metadata: { disabledAt: 1 } });
  updateUserMetadataMock.mockReset().mockResolvedValue(undefined);
  recordAuditEventMock.mockReset();
  isBootstrapAdminMock.mockReset().mockResolvedValue(false);
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

  it('refuses to disable a bootstrap admin', async () => {
    isBootstrapAdminMock.mockResolvedValue(true);
    const { disableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await disableUserAction(makeForm({ userId: 'bootstrap-1' }));
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
    getUserMetadataMock.mockResolvedValueOnce({ metadata: {} });
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

  it('audits the durable disablement even when session revocation fails', async () => {
    revokeAllSessionsForUserMock.mockRejectedValueOnce(new Error('session store down'));
    getUserMetadataMock.mockResolvedValueOnce({ metadata: {} });
    const { disableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');

    await expect(disableUserAction(makeForm({ userId: 'u-7' }))).rejects.toThrow(
      'session store down'
    );

    expect(updateUserMetadataMock).toHaveBeenCalledWith(
      'u-7',
      expect.objectContaining({ disabledAt: expect.any(Number) })
    );
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.disable', targetId: 'u-7' })
    );
  });

  it('neither rewrites nor audits an account that is already disabled, but still revokes and revalidates', async () => {
    getUserMetadataMock.mockResolvedValueOnce({ metadata: { disabledAt: 1 } });
    const { disableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };

    await disableUserAction(makeForm({ userId: 'u-7' }));

    expect(updateUserMetadataMock).not.toHaveBeenCalled();
    expect(recordAuditEventMock).not.toHaveBeenCalled();
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('u-7');
    expect(revalidatePath).toHaveBeenCalledWith('/users/u-7');
  });

  it('treats a stale detail page (another admin disabled it since) as a no-op', async () => {
    getUserMetadataMock.mockResolvedValueOnce({
      metadata: { disabledAt: 1_700_000_000_000, rejectionDisabled: null },
    });
    const { disableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');

    await disableUserAction(makeForm({ userId: 'u-7' }));

    expect(updateUserMetadataMock).not.toHaveBeenCalled();
    expect(recordAuditEventMock).not.toHaveBeenCalled();
  });

  it('takes over a rejection-owned disable: clears the flag, keeps disabledAt, audits once', async () => {
    getUserMetadataMock.mockResolvedValueOnce({
      metadata: { disabledAt: 1_700_000_000_000, rejectionDisabled: true },
    });
    const { disableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');

    await disableUserAction(makeForm({ userId: 'u-7' }));

    expect(updateUserMetadataMock).toHaveBeenCalledTimes(1);
    expect(updateUserMetadataMock).toHaveBeenCalledWith('u-7', { rejectionDisabled: null });
    expect(recordAuditEventMock).toHaveBeenCalledTimes(1);
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.disable', targetId: 'u-7' })
    );
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('u-7');
  });
});

describe('enableUserAction', () => {
  it('does not read, update, or audit when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    const { enableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');

    await expect(enableUserAction(makeForm({ userId: 'u-9' }))).rejects.toThrow('NEXT_REDIRECT');

    expect(getUserMetadataMock).not.toHaveBeenCalled();
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
    expect(recordAuditEventMock).not.toHaveBeenCalled();
  });

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

  it('does not update or audit an account that is already enabled, but revalidates', async () => {
    getUserMetadataMock.mockResolvedValueOnce({ metadata: {} });
    const { enableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };

    await enableUserAction(makeForm({ userId: 'u-9' }));

    expect(updateUserMetadataMock).not.toHaveBeenCalled();
    expect(recordAuditEventMock).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/users/u-9');
  });

  it('does not update or audit when disabled state cannot be read', async () => {
    getUserMetadataMock.mockRejectedValueOnce(new Error('metadata unavailable'));
    const { enableUserAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');

    await expect(enableUserAction(makeForm({ userId: 'u-9' }))).rejects.toThrow(
      'metadata unavailable'
    );

    expect(updateUserMetadataMock).not.toHaveBeenCalled();
    expect(recordAuditEventMock).not.toHaveBeenCalled();
  });
});
