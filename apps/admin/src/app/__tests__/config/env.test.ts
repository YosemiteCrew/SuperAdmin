function setEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe('publicEnv', () => {
  const originalOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  afterEach(() => {
    setEnv('NEXT_PUBLIC_APP_ORIGIN', originalOrigin);
  });

  it('throws when NEXT_PUBLIC_APP_ORIGIN is missing', () => {
    setEnv('NEXT_PUBLIC_APP_ORIGIN', undefined);
    jest.isolateModules(() => {
      expect(() => jest.requireActual('@/app/config/env.public')).toThrow(/NEXT_PUBLIC_APP_ORIGIN/);
    });
  });

  it('exposes appOrigin when set', () => {
    setEnv('NEXT_PUBLIC_APP_ORIGIN', 'https://admin.example.com');
    jest.isolateModules(() => {
      const { publicEnv } =
        jest.requireActual<typeof import('@/app/config/env.public')>('@/app/config/env.public');
      expect(publicEnv.appOrigin).toBe('https://admin.example.com');
    });
  });
});

describe('serverEnv', () => {
  const originals = {
    SUPERTOKENS_CONNECTION_URI: process.env.SUPERTOKENS_CONNECTION_URI,
    SUPERTOKENS_API_KEY: process.env.SUPERTOKENS_API_KEY,
  };
  afterEach(() => {
    setEnv('SUPERTOKENS_CONNECTION_URI', originals.SUPERTOKENS_CONNECTION_URI);
    setEnv('SUPERTOKENS_API_KEY', originals.SUPERTOKENS_API_KEY);
  });

  it('throws when SUPERTOKENS_CONNECTION_URI is missing', () => {
    setEnv('SUPERTOKENS_CONNECTION_URI', undefined);
    setEnv('SUPERTOKENS_API_KEY', 'k');
    jest.isolateModules(() => {
      expect(() => jest.requireActual('@/app/config/env.server')).toThrow(
        /SUPERTOKENS_CONNECTION_URI/
      );
    });
  });

  it('throws when SUPERTOKENS_API_KEY is missing', () => {
    setEnv('SUPERTOKENS_CONNECTION_URI', 'https://s.example.com');
    setEnv('SUPERTOKENS_API_KEY', undefined);
    jest.isolateModules(() => {
      expect(() => jest.requireActual('@/app/config/env.server')).toThrow(/SUPERTOKENS_API_KEY/);
    });
  });

  it('returns both values when set', () => {
    setEnv('SUPERTOKENS_CONNECTION_URI', 'https://s.example.com');
    setEnv('SUPERTOKENS_API_KEY', 'secret');
    jest.isolateModules(() => {
      const { serverEnv } =
        jest.requireActual<typeof import('@/app/config/env.server')>('@/app/config/env.server');
      expect(serverEnv.supertokensConnectionUri).toBe('https://s.example.com');
      expect(serverEnv.supertokensApiKey).toBe('secret');
    });
  });
});
