jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const deleteUserMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { deleteUser: (...args: unknown[]) => deleteUserMock(...args) },
}));

jest.mock('@/app/config/backend', () => ({
  requireAuth: jest.fn(),
  ensureSuperTokensInit: jest.fn(),
}));

describe('deleteUserAction', () => {
  beforeEach(() => {
    deleteUserMock.mockReset();
  });

  function makeForm(entries: Record<string, string | undefined>): FormData {
    const fd = new FormData();
    for (const [k, v] of Object.entries(entries)) {
      if (v !== undefined) fd.append(k, v);
    }
    return fd;
  }

  it('does nothing when userId is missing', async () => {
    const { deleteUserAction } = await import('@/app/(routes)/(dashboard)/users/actions');
    await deleteUserAction(makeForm({}));
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
    expect(revalidatePath).toHaveBeenCalledWith('/users');
    expect(redirect).toHaveBeenCalledWith('/users');
  });
});
