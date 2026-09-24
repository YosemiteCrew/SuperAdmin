const redirectMock = jest.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
jest.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}));

const ensureSuperTokensInitMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: () => ensureSuperTokensInitMock(),
}));

const getInviteByTokenMock = jest.fn();
jest.mock('@/app/features/invites/store', () => ({
  getInviteByToken: (...args: unknown[]) => getInviteByTokenMock(...args),
}));
jest.mock('@/app/(routes)/accept-invite/AcceptButton', () => ({ AcceptButton: () => null }));

describe('AcceptInvitePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects repeated invite tokens before reading the invite store', async () => {
    const mod = await import('@/app/(routes)/accept-invite/page');

    await expect(
      mod.default({ searchParams: Promise.resolve({ token: ['first', 'second'] }) })
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith('/dashboard');
    expect(getInviteByTokenMock).not.toHaveBeenCalled();
  });

  it('keeps the existing redirect for an empty scalar token', async () => {
    const mod = await import('@/app/(routes)/accept-invite/page');

    await expect(mod.default({ searchParams: Promise.resolve({ token: '  ' }) })).rejects.toThrow(
      'NEXT_REDIRECT'
    );

    expect(redirectMock).toHaveBeenCalledWith('/dashboard');
    expect(getInviteByTokenMock).not.toHaveBeenCalled();
  });

  it('reads the invite store for a valid scalar token', async () => {
    const mod = await import('@/app/(routes)/accept-invite/page');

    await mod.default({ searchParams: Promise.resolve({ token: 'invite-token' }) });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(getInviteByTokenMock).toHaveBeenCalledWith('invite-token');
  });
});
