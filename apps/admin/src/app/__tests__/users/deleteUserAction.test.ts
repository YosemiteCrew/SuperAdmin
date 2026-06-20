jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const deleteUserMock = jest.fn();
const getUserMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: {
    deleteUser: (...args: unknown[]) => deleteUserMock(...args),
    getUser: (...args: unknown[]) => getUserMock(...args),
  },
}));

const recordAuditEventMock = jest.fn();
jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
}));

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: (...args: unknown[]) => requireSuperAdminMock(...args),
  ensureSuperTokensInit: jest.fn(),
}));

function makeForm(entries: Record<string, string | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (v !== undefined) fd.append(k, v);
  }
  return fd;
}

describe('deleteUserAction', () => {
  beforeEach(() => {
    deleteUserMock.mockReset();
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ emails: ['victim@x.com'] });
    recordAuditEventMock.mockReset();
    requireSuperAdminMock.mockReset();
    requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
  });

  it('does nothing when userId is missing', async () => {
    const { deleteUserAction } = await import('@/app/(routes)/(dashboard)/users/actions');
    await deleteUserAction(makeForm({}));
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('does not delete when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    const { deleteUserAction } = await import('@/app/(routes)/(dashboard)/users/actions');
    await expect(deleteUserAction(makeForm({ userId: 'victim' }))).rejects.toThrow('NEXT_REDIRECT');
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('calls supertokens.deleteUser then revalidates + redirects', async () => {
    const { deleteUserAction } = await import('@/app/(routes)/(dashboard)/users/actions');
    const { revalidatePath } = jest.requireMock('next/cache') as {
      revalidatePath: jest.Mock;
    };
    const { redirect } = jest.requireMock('next/navigation') as {
      redirect: jest.Mock;
    };
    deleteUserMock.mockResolvedValueOnce(undefined);
    await expect(deleteUserAction(makeForm({ userId: 'user-1' }))).rejects.toThrow('NEXT_REDIRECT');
    expect(deleteUserMock).toHaveBeenCalledWith('user-1');
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.delete',
        targetId: 'user-1',
        targetLabel: 'victim@x.com',
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/users');
    expect(redirect).toHaveBeenCalledWith('/users');
  });
});
