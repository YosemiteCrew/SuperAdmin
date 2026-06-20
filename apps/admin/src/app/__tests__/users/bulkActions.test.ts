jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const getUserMock = jest.fn();
const deleteUserMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: {
    getUser: (...a: unknown[]) => getUserMock(...a),
    deleteUser: (...a: unknown[]) => deleteUserMock(...a),
  },
}));

const revokeAllSessionsForUserMock = jest.fn();
jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: { revokeAllSessionsForUser: (...a: unknown[]) => revokeAllSessionsForUserMock(...a) },
}));

const updateUserMetadataMock = jest.fn();
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { updateUserMetadata: (...a: unknown[]) => updateUserMetadataMock(...a) },
}));

const recordAuditEventMock = jest.fn();
jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: (...a: unknown[]) => recordAuditEventMock(...a),
}));

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: (...a: unknown[]) => requireSuperAdminMock(...a),
}));

import {
  bulkDeleteUsersAction,
  bulkDisableUsersAction,
  bulkEnableUsersAction,
} from '@/app/(routes)/(dashboard)/users/bulkActions';

beforeEach(() => {
  requireSuperAdminMock.mockReset().mockResolvedValue({ userId: 'admin-1' });
  getUserMock.mockReset().mockResolvedValue({ emails: ['victim@x.com'] });
  deleteUserMock.mockReset().mockResolvedValue(undefined);
  revokeAllSessionsForUserMock.mockReset().mockResolvedValue([]);
  updateUserMetadataMock.mockReset().mockResolvedValue(undefined);
  recordAuditEventMock.mockReset();
});

describe('bulkDisableUsersAction', () => {
  it('disables each id (except the caller) and audits', async () => {
    await bulkDisableUsersAction(['u-1', 'admin-1', 'u-2']);
    expect(updateUserMetadataMock).toHaveBeenCalledTimes(2);
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('u-1');
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('u-2');
    expect(revokeAllSessionsForUserMock).not.toHaveBeenCalledWith('admin-1');
    expect(recordAuditEventMock).toHaveBeenCalledTimes(2);
  });

  it('ignores non-string and empty ids', async () => {
    await bulkDisableUsersAction([
      'u-1',
      '',
      undefined as unknown as string,
      5 as unknown as string,
    ]);
    expect(updateUserMetadataMock).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(bulkDisableUsersAction(['u-1'])).rejects.toThrow('NEXT_REDIRECT');
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
  });
});

describe('bulkEnableUsersAction', () => {
  it('clears the disabled flag for each id and audits', async () => {
    await bulkEnableUsersAction(['u-1', 'u-2']);
    expect(updateUserMetadataMock).toHaveBeenCalledWith('u-1', { disabledAt: null });
    expect(updateUserMetadataMock).toHaveBeenCalledWith('u-2', { disabledAt: null });
    expect(recordAuditEventMock).toHaveBeenCalledTimes(2);
  });
});

describe('bulkDeleteUsersAction', () => {
  it('deletes each id (except the caller), labelling from the user record', async () => {
    await bulkDeleteUsersAction(['u-1', 'admin-1']);
    expect(deleteUserMock).toHaveBeenCalledWith('u-1');
    expect(deleteUserMock).not.toHaveBeenCalledWith('admin-1');
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.delete',
        targetId: 'u-1',
        targetLabel: 'victim@x.com',
      })
    );
  });

  it('still deletes when the label lookup throws', async () => {
    getUserMock.mockRejectedValueOnce(new Error('down'));
    await bulkDeleteUsersAction(['u-9']);
    expect(deleteUserMock).toHaveBeenCalledWith('u-9');
  });
});
