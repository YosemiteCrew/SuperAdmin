/**
 * @jest-environment node
 */
const initSpy = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: {
    init: (cfg: unknown) => initSpy(cfg),
  },
}));

jest.mock('supertokens-node/recipe/emailpassword', () => ({
  __esModule: true,
  default: { init: jest.fn(() => 'emailpassword-recipe') },
}));

jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: { init: jest.fn(() => 'session-recipe') },
}));

const updateUserMetadataMock = jest.fn();
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: {
    init: jest.fn(() => 'usermetadata-recipe'),
    updateUserMetadata: (...args: unknown[]) => updateUserMetadataMock(...args),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ getAll: () => [] })),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

const getSSRSessionMock = jest.fn();
jest.mock('supertokens-node/nextjs', () => ({
  getSSRSession: (...args: unknown[]) => getSSRSessionMock(...args),
}));

jest.mock('@/app/config/env.server', () => ({
  serverEnv: {
    supertokensConnectionUri: 'https://test',
    supertokensApiKey: 'k',
  },
}));

jest.mock('@/app/config/appInfo', () => ({
  appInfo: { appName: 'Test Admin' },
}));

describe('backend.ts', () => {
  beforeEach(() => {
    initSpy.mockReset();
  });

  it('ensureSuperTokensInit calls SuperTokens.init exactly once across calls', () => {
    jest.isolateModules(() => {
      const mod = jest.requireActual<typeof import('@/app/config/backend')>('@/app/config/backend');
      mod.ensureSuperTokensInit();
      mod.ensureSuperTokensInit();
      expect(initSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('backendConfig wires up the three recipes', () => {
    jest.isolateModules(() => {
      const mod = jest.requireActual<typeof import('@/app/config/backend')>('@/app/config/backend');
      const cfg = mod.backendConfig();
      expect(cfg.recipeList.length).toBe(3);
    });
  });

  it('requireAuth redirects when no token', async () => {
    const { redirect } = jest.requireMock('next/navigation') as {
      redirect: jest.Mock;
    };
    getSSRSessionMock.mockResolvedValueOnce({
      accessTokenPayload: null,
      hasToken: false,
      error: null,
    });
    jest.isolateModules(async () => {
      const mod = jest.requireActual<typeof import('@/app/config/backend')>('@/app/config/backend');
      await mod.requireAuth();
      expect(redirect).toHaveBeenCalledWith('/auth');
    });
  });

  it('requireAuth passes through when session is valid', async () => {
    const { redirect } = jest.requireMock('next/navigation') as {
      redirect: jest.Mock;
    };
    redirect.mockClear();
    getSSRSessionMock.mockResolvedValueOnce({
      accessTokenPayload: { sub: 'user-1' },
      hasToken: true,
      error: null,
    });
    jest.isolateModules(async () => {
      const mod = jest.requireActual<typeof import('@/app/config/backend')>('@/app/config/backend');
      await mod.requireAuth();
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
