jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const revokeSessionMock = jest.fn();
const revokeAllSessionsForUserMock = jest.fn();
jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: {
    revokeSession: (...args: unknown[]) => revokeSessionMock(...args),
    revokeAllSessionsForUser: (...args: unknown[]) => revokeAllSessionsForUserMock(...args),
  },
}));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireAuth: jest.fn(),
}));

function makeForm(entries: Record<string, string | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (v !== undefined) fd.append(k, v);
  }
  return fd;
}

describe('revokeSessionAction', () => {
  beforeEach(() => {
    revokeSessionMock.mockReset();
  });

  it('skips when sessionHandle missing', async () => {
    const { revokeSessionAction } = await import('@/app/(routes)/(dashboard)/users/[id]/actions');
    await revokeSessionAction(makeForm({ userId: 'u' }));
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
