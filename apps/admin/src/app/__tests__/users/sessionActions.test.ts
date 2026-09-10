jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const revokeSessionMock = jest.fn();
const revokeAllSessionsForUserMock = jest.fn();
const getSessionInformationMock = jest.fn();
jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: {
    revokeSession: (...args: unknown[]) => revokeSessionMock(...args),
    revokeAllSessionsForUser: (...args: unknown[]) => revokeAllSessionsForUserMock(...args),
    getSessionInformation: (...args: unknown[]) => getSessionInformationMock(...args),
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

jest.mock('@/app/features/audit/store', () => ({ recordAuditEvent: jest.fn() }));
jest.mock('@/app/features/users/emailVerification', () => ({ setEmailVerified: jest.fn() }));
jest.mock('@/app/features/users/bootstrap', () => ({
  isBootstrapAdmin: jest.fn().mockResolvedValue(false),
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
  requireSuperAdminMock.mockReset();
  requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
});

describe('revokeSessionAction', () => {
  beforeEach(() => {
    revokeSessionMock.mockReset().mockResolvedValue(true);
    getSessionInformationMock.mockReset().mockResolvedValue({ userId: 'u-1' });
  });

  it('skips when sessionHandle missing', async () => {
    const { revokeSessionAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await revokeSessionAction(makeForm({ userId: 'u' }));
    expect(revokeSessionMock).not.toHaveBeenCalled();
  });

  it('does not revoke when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    const { revokeSessionAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await expect(
      revokeSessionAction(makeForm({ sessionHandle: 'sh-1', userId: 'u-1' }))
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(revokeSessionMock).not.toHaveBeenCalled();
  });

  it('revokes and revalidates the user detail path', async () => {
    const { revokeSessionAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    const { revalidatePath } = jest.requireMock('next/cache') as {
      revalidatePath: jest.Mock;
    };
    revokeSessionMock.mockResolvedValueOnce(true);
    await revokeSessionAction(makeForm({ sessionHandle: 'sh-1', userId: 'u-1' }));
    expect(revokeSessionMock).toHaveBeenCalledWith('sh-1');
    expect(revalidatePath).toHaveBeenCalledWith('/users/u-1');
  });

  it('derives the audit target from the session instead of untrusted form data', async () => {
    const { revokeSessionAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    const { recordAuditEvent } = jest.requireMock('@/app/features/audit/store') as {
      recordAuditEvent: jest.Mock;
    };
    getSessionInformationMock.mockResolvedValueOnce({ userId: 'actual-user' });
    await revokeSessionAction(makeForm({ sessionHandle: 'sh-1', userId: 'forged-user' }));
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: 'actual-user' })
    );
  });

  it('does not revoke a missing session', async () => {
    const { revokeSessionAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    getSessionInformationMock.mockResolvedValueOnce(undefined);
    await revokeSessionAction(makeForm({ sessionHandle: 'missing' }));
    expect(revokeSessionMock).not.toHaveBeenCalled();
  });

  it('does not audit when the session disappears before revocation', async () => {
    const { revokeSessionAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    const { recordAuditEvent } = jest.requireMock('@/app/features/audit/store') as {
      recordAuditEvent: jest.Mock;
    };
    recordAuditEvent.mockClear();
    revokeSessionMock.mockResolvedValueOnce(false);
    await revokeSessionAction(makeForm({ sessionHandle: 'expired' }));
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });
});

describe('revokeAllSessionsAction', () => {
  beforeEach(() => {
    revokeAllSessionsForUserMock.mockReset();
  });

  it('skips when userId missing', async () => {
    const { revokeAllSessionsAction } =
      await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await revokeAllSessionsAction(makeForm({}));
    expect(revokeAllSessionsForUserMock).not.toHaveBeenCalled();
  });

  it('does not revoke all when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    const { revokeAllSessionsAction } =
      await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await expect(revokeAllSessionsAction(makeForm({ userId: 'u-9' }))).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(revokeAllSessionsForUserMock).not.toHaveBeenCalled();
  });

  it('revokes all then revalidates the user detail path', async () => {
    const { revokeAllSessionsAction } =
      await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    const { revalidatePath } = jest.requireMock('next/cache') as {
      revalidatePath: jest.Mock;
    };
    revokeAllSessionsForUserMock.mockResolvedValueOnce(['sh-a', 'sh-b']);
    await revokeAllSessionsAction(makeForm({ userId: 'u-9' }));
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('u-9');
    expect(revalidatePath).toHaveBeenCalledWith('/users/u-9');
  });
});
