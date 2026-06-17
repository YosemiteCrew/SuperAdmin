describe('config index', () => {
  it('exposes app + api keys with sane defaults', async () => {
    const { config } = await import('@/app/config');
    expect(config.app.name).toBeTruthy();
    expect(typeof config.app.version).toBe('string');
    expect(config.api.timeout).toBeGreaterThan(0);
    expect(typeof config.api.baseUrl).toBe('string');
  });
});

describe('appInfo', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_ORIGIN = 'http://localhost:3000';
  });

  it('mirrors origin to apiDomain + websiteDomain and uses constants for base paths', async () => {
    const { appInfo } = await import('@/app/config/appInfo');
    expect(appInfo.apiDomain).toBe(appInfo.websiteDomain);
    expect(appInfo.apiBasePath).toBe('/api/auth');
    expect(appInfo.websiteBasePath).toBe('/auth');
    expect(typeof appInfo.appName).toBe('string');
    expect(appInfo.appName.length).toBeGreaterThan(0);
  });
});
