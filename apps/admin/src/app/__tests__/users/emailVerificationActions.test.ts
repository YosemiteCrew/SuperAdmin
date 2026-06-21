jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: { revokeSession: jest.fn(), revokeAllSessionsForUser: jest.fn() },
}));
jest.mock('supertokens-node/recipe/totp', () => ({
  __esModule: true,
  default: { listDevices: jest.fn(), removeDevice: jest.fn() },
}));
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { updateUserMetadata: jest.fn() },
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

const setEmailVerifiedMock = jest.fn();
jest.mock('@/app/features/users/emailVerification', () => ({
  setEmailVerified: (...a: unknown[]) => setEmailVerifiedMock(...a),
}));

const recordAuditEventMock = jest.fn();
jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: (...a: unknown[]) => recordAuditEventMock(...a),
}));

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: (...a: unknown[]) => requireSuperAdminMock(...a),
}));

function makeForm(entries: Record<string, string | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (v !== undefined) fd.append(k, v);
  }
  return fd;
}

beforeEach(() => {
  requireSuperAdminMock.mockReset().mockResolvedValue({ userId: 'admin-1' });
  setEmailVerifiedMock.mockReset().mockResolvedValue(undefined);
  recordAuditEventMock.mockReset();
});

describe('verifyEmailAction', () => {
  it('skips when userId is missing', async () => {
    const { verifyEmailAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await verifyEmailAction(makeForm({}));
    expect(setEmailVerifiedMock).not.toHaveBeenCalled();
  });

  it('marks verified, audits, and revalidates', async () => {
    const { verifyEmailAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };
    await verifyEmailAction(makeForm({ userId: 'u-1' }));
    expect(setEmailVerifiedMock).toHaveBeenCalledWith('u-1', true);
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.email_verify', targetId: 'u-1' })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/users/u-1');
  });

  it('does nothing when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    const { verifyEmailAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await expect(verifyEmailAction(makeForm({ userId: 'u-1' }))).rejects.toThrow('NEXT_REDIRECT');
    expect(setEmailVerifiedMock).not.toHaveBeenCalled();
  });
});

describe('unverifyEmailAction', () => {
  it('marks unverified, audits, and revalidates', async () => {
    const { unverifyEmailAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };
    await unverifyEmailAction(makeForm({ userId: 'u-2' }));
    expect(setEmailVerifiedMock).toHaveBeenCalledWith('u-2', false);
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.email_unverify', targetId: 'u-2' })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/users/u-2');
  });
});
