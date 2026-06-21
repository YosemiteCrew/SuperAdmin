jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const revokeAllSessionsForUserMock = jest.fn();
jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: {
    revokeSession: jest.fn(),
    revokeAllSessionsForUser: (...args: unknown[]) => revokeAllSessionsForUserMock(...args),
  },
}));

const listDevicesMock = jest.fn();
const removeDeviceMock = jest.fn();
jest.mock('supertokens-node/recipe/totp', () => ({
  __esModule: true,
  default: {
    listDevices: (...args: unknown[]) => listDevicesMock(...args),
    removeDevice: (...args: unknown[]) => removeDeviceMock(...args),
  },
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
  revokeAllSessionsForUserMock.mockReset();
  listDevicesMock.mockReset();
  removeDeviceMock.mockReset();
  listDevicesMock.mockResolvedValue({ status: 'OK', devices: [] });
  removeDeviceMock.mockResolvedValue({ status: 'OK', didDeviceExist: true });
  revokeAllSessionsForUserMock.mockResolvedValue([]);
});

describe('resetMfaAction', () => {
  it('skips entirely when userId is missing', async () => {
    const { resetMfaAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await resetMfaAction(makeForm({}));
    expect(listDevicesMock).not.toHaveBeenCalled();
    expect(revokeAllSessionsForUserMock).not.toHaveBeenCalled();
  });

  it('does not touch devices when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    const { resetMfaAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await expect(resetMfaAction(makeForm({ userId: 'u-1' }))).rejects.toThrow('NEXT_REDIRECT');
    expect(listDevicesMock).not.toHaveBeenCalled();
    expect(revokeAllSessionsForUserMock).not.toHaveBeenCalled();
  });

  it('removes every TOTP device, revokes sessions, and revalidates', async () => {
    listDevicesMock.mockResolvedValueOnce({
      status: 'OK',
      devices: [
        { name: 'device-a', verified: true },
        { name: 'device-b', verified: false },
      ],
    });
    const { resetMfaAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };

    await resetMfaAction(makeForm({ userId: 'u-7' }));

    expect(removeDeviceMock).toHaveBeenCalledWith('u-7', 'device-a');
    expect(removeDeviceMock).toHaveBeenCalledWith('u-7', 'device-b');
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('u-7');
    expect(revalidatePath).toHaveBeenCalledWith('/users/u-7');
  });

  it('still revokes sessions when the user has no devices', async () => {
    const { resetMfaAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await resetMfaAction(makeForm({ userId: 'u-9' }));
    expect(removeDeviceMock).not.toHaveBeenCalled();
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('u-9');
  });
});
