jest.mock('supertokens-auth-react/recipe/emailpassword', () => ({
  __esModule: true,
  default: { init: jest.fn(() => 'ep') },
}));

jest.mock('supertokens-auth-react/recipe/session', () => ({
  __esModule: true,
  default: { init: jest.fn(() => 'sess') },
}));

jest.mock('@/app/config/appInfo', () => ({
  appInfo: { appName: 'Test' },
}));

describe('frontend config', () => {
  it('builds a config with appInfo, recipe list, redirection, and windowHandler', async () => {
    const { frontendConfig } = await import('@/app/config/frontend');
    const cfg = frontendConfig();
    expect(cfg.appInfo).toEqual({ appName: 'Test' });
    expect(cfg.recipeList).toHaveLength(2);
    expect(typeof cfg.getRedirectionURL).toBe('function');
    expect(typeof cfg.windowHandler).toBe('function');
  });

  it('getRedirectionURL → /dashboard for SUCCESS+newSessionCreated', async () => {
    const { frontendConfig } = await import('@/app/config/frontend');
    const cfg = frontendConfig();
    const result = await (
      cfg.getRedirectionURL as unknown as (
        ctx: unknown,
        userCtx?: unknown
      ) => Promise<string | undefined>
    )({ action: 'SUCCESS', newSessionCreated: true }, {});
    expect(result).toBe('/dashboard');
  });

  it('getRedirectionURL → undefined for other actions', async () => {
    const { frontendConfig } = await import('@/app/config/frontend');
    const cfg = frontendConfig();
    const result = await (
      cfg.getRedirectionURL as unknown as (
        ctx: unknown,
        userCtx?: unknown
      ) => Promise<string | undefined>
    )({ action: 'TO_SIGN_IN', newSessionCreated: false }, {});
    expect(result).toBeUndefined();
  });

  it('setRouter wires up router + pathName for the windowHandler', async () => {
    const { setRouter, frontendConfig } = await import('@/app/config/frontend');
    const push = jest.fn();
    setRouter({ push } as never, '/dashboard');

    const cfg = frontendConfig();
    const handler = cfg.windowHandler!({
      location: {
        getHostName: () => 'localhost',
        getOrigin: () => 'http://localhost',
        getPathName: () => '/orig',
        getProtocol: () => 'http:',
        getSearch: () => '',
        assign: jest.fn(),
        setHref: jest.fn(),
        getHash: () => '',
        getHref: () => 'http://localhost/',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(handler.location.getPathName()).toBe('/dashboard');
    handler.location.assign('/x');
    expect(push).toHaveBeenCalledWith('/x');
    handler.location.setHref('/y');
    expect(push).toHaveBeenCalledWith('/y');
  });
});
