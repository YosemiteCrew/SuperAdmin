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

const isEmailVerifiedMock = jest.fn();
jest.mock('supertokens-node/recipe/emailverification', () => ({
  __esModule: true,
  default: { isEmailVerified: (...a: unknown[]) => isEmailVerifiedMock(...a) },
}));

const revokeAllSessionsForUserMock = jest.fn();
jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: { revokeAllSessionsForUser: (...a: unknown[]) => revokeAllSessionsForUserMock(...a) },
}));

const updateUserMetadataMock = jest.fn();
const getUserMetadataMock = jest.fn();
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: {
    getUserMetadata: (...a: unknown[]) => getUserMetadataMock(...a),
    updateUserMetadata: (...a: unknown[]) => updateUserMetadataMock(...a),
  },
}));

const recordAuditEventMock = jest.fn();
jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: (...a: unknown[]) => recordAuditEventMock(...a),
}));

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: (...a: unknown[]) => requireSuperAdminMock(...a),
}));

jest.mock('@/app/config/env.server', () => ({
  serverEnv: { superadminBootstrapEmails: ['boot@x.com'] },
}));

import {
  bulkDeleteUsersAction,
  bulkDisableUsersAction,
  bulkEnableUsersAction,
} from '@/app/(routes)/(dashboard)/users/bulkActions';

function account(email: string) {
  return { emails: [email], loginMethods: [{ email, recipeUserId: `recipe-${email}` }] };
}

beforeEach(() => {
  const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };
  revalidatePath.mockClear();
  requireSuperAdminMock.mockReset().mockResolvedValue({ userId: 'admin-1' });
  getUserMock.mockReset().mockResolvedValue({ emails: ['victim@x.com'] });
  deleteUserMock.mockReset().mockResolvedValue(undefined);
  revokeAllSessionsForUserMock.mockReset().mockResolvedValue([]);
  getUserMetadataMock.mockReset().mockResolvedValue({ metadata: { disabledAt: 1 } });
  updateUserMetadataMock.mockReset().mockResolvedValue(undefined);
  recordAuditEventMock.mockReset();
  isEmailVerifiedMock.mockReset().mockResolvedValue(true);
});

describe('bulkDisableUsersAction', () => {
  beforeEach(() => {
    getUserMetadataMock.mockResolvedValue({ metadata: {} });
  });

  it('writes and audits only real changes in a mixed selection, and revokes every target', async () => {
    const metadataById: Record<string, Record<string, unknown>> = {
      'u-off': { disabledAt: 1_700_000_000_000 },
      'u-on': {},
      'u-rej': { disabledAt: 1_700_000_000_000, rejectionDisabled: true },
    };
    getUserMetadataMock.mockImplementation((id: string) =>
      Promise.resolve({ metadata: metadataById[id] })
    );

    await bulkDisableUsersAction(['u-off', 'u-on', 'u-rej']);

    expect(updateUserMetadataMock).toHaveBeenCalledTimes(2);
    expect(updateUserMetadataMock).toHaveBeenCalledWith(
      'u-on',
      expect.objectContaining({ disabledAt: expect.any(Number) })
    );
    expect(updateUserMetadataMock).toHaveBeenCalledWith('u-rej', { rejectionDisabled: null });
    expect(recordAuditEventMock).toHaveBeenCalledTimes(2);
    expect(recordAuditEventMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ targetId: 'u-off' })
    );
    for (const id of ['u-off', 'u-on', 'u-rej']) {
      expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith(id);
    }
  });

  it('disables each id (except the caller) and audits', async () => {
    await bulkDisableUsersAction(['u-1', 'admin-1', 'u-2']);
    expect(updateUserMetadataMock).toHaveBeenCalledTimes(2);
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('u-1');
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('u-2');
    expect(revokeAllSessionsForUserMock).not.toHaveBeenCalledWith('admin-1');
    expect(recordAuditEventMock).toHaveBeenCalledTimes(2);
  });

  it('skips bootstrap-allowlisted admins so they cannot be locked out', async () => {
    getUserMock.mockImplementation((id: string) =>
      Promise.resolve(account(id === 'boot-1' ? 'boot@x.com' : 'victim@x.com'))
    );
    await bulkDisableUsersAction(['u-1', 'boot-1']);
    expect(updateUserMetadataMock).toHaveBeenCalledTimes(1);
    expect(updateUserMetadataMock).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({ disabledAt: expect.any(Number) })
    );
    expect(revokeAllSessionsForUserMock).not.toHaveBeenCalledWith('boot-1');
  });

  it('skips an account whose bootstrap status cannot be confirmed (fails closed)', async () => {
    getUserMock.mockRejectedValueOnce(new Error('down'));
    await bulkDisableUsersAction(['u-9']);
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
  });

  it('disables an unconfirmed account on a bootstrap email', async () => {
    getUserMock.mockResolvedValue(account('boot@x.com'));
    isEmailVerifiedMock.mockResolvedValue(false);

    const result = await bulkDisableUsersAction(['boot-1']);

    expect(result).toEqual({ done: 1, skipped: 0, failed: 0 });
    expect(updateUserMetadataMock).toHaveBeenCalledWith(
      'boot-1',
      expect.objectContaining({ disabledAt: expect.any(Number) })
    );
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('boot-1');
  });

  it('does nothing for a non-array argument', async () => {
    await bulkDisableUsersAction(undefined as unknown as string[]);
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
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

  it('does nothing when a direct caller exceeds the users-page batch size', async () => {
    await bulkDisableUsersAction(Array.from({ length: 21 }, (_, index) => `u-${index}`));
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
    expect(revokeAllSessionsForUserMock).not.toHaveBeenCalled();
    expect(recordAuditEventMock).not.toHaveBeenCalled();
  });

  it('does nothing when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(bulkDisableUsersAction(['u-1'])).rejects.toThrow('NEXT_REDIRECT');
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
  });

  it('audits a durable disablement even when session revocation fails, and counts it failed', async () => {
    revokeAllSessionsForUserMock.mockRejectedValueOnce(new Error('session store down'));

    const result = await bulkDisableUsersAction(['u-1']);

    expect(result).toEqual({ done: 0, skipped: 0, failed: 1 });
    expect(updateUserMetadataMock).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({ disabledAt: expect.any(Number) })
    );
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.disable', targetId: 'u-1' })
    );
  });

  it('counts the caller and a bootstrap admin as skipped, not done', async () => {
    getUserMock.mockImplementation((id: string) =>
      Promise.resolve(account(id === 'boot-1' ? 'boot@x.com' : 'victim@x.com'))
    );

    const result = await bulkDisableUsersAction(['u-1', 'admin-1', 'boot-1']);

    expect(result).toEqual({ done: 1, skipped: 2, failed: 0 });
  });

  it('counts one failing id and still runs the ids after it', async () => {
    revokeAllSessionsForUserMock.mockImplementation((id: string) =>
      id === 'u-1' ? Promise.reject(new Error('session store down')) : Promise.resolve([])
    );

    const result = await bulkDisableUsersAction(['u-1', 'u-2', 'u-3']);

    expect(result).toEqual({ done: 2, skipped: 0, failed: 1 });
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('u-3');
  });

  it('revalidates the users page even when every id failed', async () => {
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };
    revokeAllSessionsForUserMock.mockRejectedValue(new Error('session store down'));

    const result = await bulkDisableUsersAction(['u-1', 'u-2']);

    expect(result).toEqual({ done: 0, skipped: 0, failed: 2 });
    expect(revalidatePath).toHaveBeenCalledWith('/users');
  });
});

describe('bulkEnableUsersAction', () => {
  it('does not read, update, or audit when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));

    await expect(bulkEnableUsersAction(['u-1'])).rejects.toThrow('NEXT_REDIRECT');

    expect(getUserMetadataMock).not.toHaveBeenCalled();
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
    expect(recordAuditEventMock).not.toHaveBeenCalled();
  });

  it('clears the disabled flag for each id and audits', async () => {
    await bulkEnableUsersAction(['u-1', 'u-2']);
    expect(updateUserMetadataMock).toHaveBeenCalledWith('u-1', { disabledAt: null });
    expect(updateUserMetadataMock).toHaveBeenCalledWith('u-2', { disabledAt: null });
    expect(recordAuditEventMock).toHaveBeenCalledTimes(2);
  });

  it('processes one complete users-page batch', async () => {
    await bulkEnableUsersAction(Array.from({ length: 20 }, (_, index) => `u-${index}`));
    expect(updateUserMetadataMock).toHaveBeenCalledTimes(20);
    expect(recordAuditEventMock).toHaveBeenCalledTimes(20);
  });

  it('processes duplicate ids only once', async () => {
    await bulkEnableUsersAction(['u-1', 'u-1', 'u-2']);
    expect(updateUserMetadataMock).toHaveBeenCalledTimes(2);
    expect(recordAuditEventMock).toHaveBeenCalledTimes(2);
  });

  it('skips an already-enabled target and continues with a disabled target', async () => {
    getUserMetadataMock.mockImplementation((id: string) =>
      Promise.resolve({ metadata: id === 'u-1' ? {} : { disabledAt: 1 } })
    );
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };

    await bulkEnableUsersAction(['u-1', 'u-2']);

    expect(updateUserMetadataMock).toHaveBeenCalledTimes(1);
    expect(updateUserMetadataMock).toHaveBeenCalledWith('u-2', { disabledAt: null });
    expect(recordAuditEventMock).toHaveBeenCalledTimes(1);
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.enable', targetId: 'u-2' })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/users');
  });

  it('does not update or audit when disabled state cannot be read, and counts it failed', async () => {
    getUserMetadataMock.mockRejectedValueOnce(new Error('metadata unavailable'));

    const result = await bulkEnableUsersAction(['u-1']);

    expect(result).toEqual({ done: 0, skipped: 0, failed: 1 });
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
    expect(recordAuditEventMock).not.toHaveBeenCalled();
  });

  it('counts an account that was not disabled as skipped', async () => {
    getUserMetadataMock.mockImplementation((id: string) =>
      Promise.resolve({ metadata: id === 'u-1' ? {} : { disabledAt: 1 } })
    );

    const result = await bulkEnableUsersAction(['u-1', 'u-2']);

    expect(result).toEqual({ done: 1, skipped: 1, failed: 0 });
  });
});

describe('bulkDeleteUsersAction', () => {
  it('does not read, delete, or audit when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));

    await expect(bulkDeleteUsersAction(['u-1'])).rejects.toThrow('NEXT_REDIRECT');

    expect(getUserMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(recordAuditEventMock).not.toHaveBeenCalled();
  });

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

  it('does not delete or audit users that are already absent', async () => {
    getUserMock.mockResolvedValue(undefined);
    await bulkDeleteUsersAction(['missing-user']);
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(recordAuditEventMock).not.toHaveBeenCalled();
  });

  it('skips deletion when bootstrap status cannot be confirmed', async () => {
    getUserMock.mockRejectedValueOnce(new Error('down'));
    await bulkDeleteUsersAction(['u-9']);
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('skips bootstrap-allowlisted admins', async () => {
    getUserMock.mockResolvedValue(account('boot@x.com'));
    await bulkDeleteUsersAction(['boot-1']);
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('deletes an unconfirmed account on a bootstrap email', async () => {
    getUserMock.mockResolvedValue(account('boot@x.com'));
    isEmailVerifiedMock.mockResolvedValue(false);

    const result = await bulkDeleteUsersAction(['boot-1']);

    expect(result).toEqual({ done: 1, skipped: 0, failed: 0 });
    expect(deleteUserMock).toHaveBeenCalledWith('boot-1');
  });

  it('counts an absent account as skipped and a failing delete as failed', async () => {
    getUserMock.mockImplementation((id: string) =>
      Promise.resolve(id === 'gone' ? undefined : { emails: ['victim@x.com'] })
    );
    deleteUserMock.mockImplementation((id: string) =>
      id === 'u-bad' ? Promise.reject(new Error('core unreachable')) : Promise.resolve(undefined)
    );

    const result = await bulkDeleteUsersAction(['gone', 'u-bad', 'u-ok']);

    expect(result).toEqual({ done: 1, skipped: 1, failed: 1 });
    expect(deleteUserMock).toHaveBeenCalledWith('u-ok');
  });
});
