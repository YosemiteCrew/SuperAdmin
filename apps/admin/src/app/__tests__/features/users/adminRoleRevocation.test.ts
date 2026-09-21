const getUsersThatHaveRoleMock = jest.fn();
const isBootstrapAdminMock = jest.fn();
const isConfirmedBootstrapAdminMock = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: {
    getUsersThatHaveRole: (...args: unknown[]) => getUsersThatHaveRoleMock(...args),
  },
}));
jest.mock('@/app/features/users/bootstrap', () => ({
  isBootstrapAdmin: (...args: unknown[]) => isBootstrapAdminMock(...args),
  isConfirmedBootstrapAdmin: (...args: unknown[]) => isConfirmedBootstrapAdminMock(...args),
}));

import { canRevokeSuperAdminRole } from '@/app/features/users/adminRoleRevocation';

describe('admin role revocation policy', () => {
  beforeEach(() => {
    getUsersThatHaveRoleMock
      .mockReset()
      .mockResolvedValue({ status: 'OK', users: ['admin-a', 'admin-b', 'bootstrap-1'] });
    isBootstrapAdminMock.mockReset().mockResolvedValue(false);
    isConfirmedBootstrapAdminMock
      .mockReset()
      .mockImplementation(async (userId: string) => userId === 'bootstrap-1');
  });

  it('permits revocation only when a confirmed bootstrap role holder survives', async () => {
    await expect(canRevokeSuperAdminRole('admin-a', 'admin-b')).resolves.toBe(true);
    expect(getUsersThatHaveRoleMock).toHaveBeenCalledWith('public', 'superadmin');
    expect(isConfirmedBootstrapAdminMock).toHaveBeenCalledWith('bootstrap-1');
  });

  it('refuses self and configuration-owned bootstrap revocations', async () => {
    await expect(canRevokeSuperAdminRole('admin-a', 'admin-a')).resolves.toBe(false);
    expect(getUsersThatHaveRoleMock).not.toHaveBeenCalled();

    isBootstrapAdminMock.mockResolvedValueOnce(true);
    await expect(canRevokeSuperAdminRole('admin-a', 'bootstrap-1')).resolves.toBe(false);
    expect(getUsersThatHaveRoleMock).not.toHaveBeenCalled();
  });

  it('refuses final-holder, unknown-role, and anchorless revocations', async () => {
    getUsersThatHaveRoleMock.mockResolvedValueOnce({ status: 'OK', users: ['admin-b'] });
    await expect(canRevokeSuperAdminRole('admin-a', 'admin-b')).resolves.toBe(false);

    getUsersThatHaveRoleMock.mockResolvedValueOnce({ status: 'UNKNOWN_ROLE_ERROR' });
    await expect(canRevokeSuperAdminRole('admin-a', 'admin-b')).resolves.toBe(false);

    getUsersThatHaveRoleMock.mockResolvedValueOnce({ status: 'OK', users: ['admin-a', 'admin-b'] });
    isConfirmedBootstrapAdminMock.mockResolvedValue(false);
    await expect(canRevokeSuperAdminRole('admin-a', 'admin-b')).resolves.toBe(false);
  });
});
