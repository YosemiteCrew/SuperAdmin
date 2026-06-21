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

  it('rejects a non-https origin in production', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
    setEnv('NEXT_PUBLIC_APP_ORIGIN', 'http://admin.example.com');
    try {
      jest.isolateModules(() => {
        expect(() => jest.requireActual('@/app/config/env.public')).toThrow(/https in production/);
      });
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        configurable: true,
      });
    }
  });

  it('allows an http origin outside production', () => {
    setEnv('NEXT_PUBLIC_APP_ORIGIN', 'http://localhost:3000');
    jest.isolateModules(() => {
      const { publicEnv } =
        jest.requireActual<typeof import('@/app/config/env.public')>('@/app/config/env.public');
      expect(publicEnv.appOrigin).toBe('http://localhost:3000');
    });
  });

  it('allows an http loopback origin even in production (next build runs as production)', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
    setEnv('NEXT_PUBLIC_APP_ORIGIN', 'http://localhost:3000');
    try {
      jest.isolateModules(() => {
        const { publicEnv } =
          jest.requireActual<typeof import('@/app/config/env.public')>('@/app/config/env.public');
        expect(publicEnv.appOrigin).toBe('http://localhost:3000');
      });
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        configurable: true,
      });
    }
  });
});

describe('serverEnv', () => {
  const originals = {
    SUPERTOKENS_CONNECTION_URI: process.env.SUPERTOKENS_CONNECTION_URI,
    SUPERTOKENS_API_KEY: process.env.SUPERTOKENS_API_KEY,
    SUPERADMIN_BOOTSTRAP_EMAILS: process.env.SUPERADMIN_BOOTSTRAP_EMAILS,
  };
  afterEach(() => {
    setEnv('SUPERTOKENS_CONNECTION_URI', originals.SUPERTOKENS_CONNECTION_URI);
    setEnv('SUPERTOKENS_API_KEY', originals.SUPERTOKENS_API_KEY);
    setEnv('SUPERADMIN_BOOTSTRAP_EMAILS', originals.SUPERADMIN_BOOTSTRAP_EMAILS);
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

  it('defaults superadminBootstrapEmails to an empty list when unset', () => {
    setEnv('SUPERTOKENS_CONNECTION_URI', 'https://s.example.com');
    setEnv('SUPERTOKENS_API_KEY', 'secret');
    setEnv('SUPERADMIN_BOOTSTRAP_EMAILS', undefined);
    jest.isolateModules(() => {
      const { serverEnv } =
        jest.requireActual<typeof import('@/app/config/env.server')>('@/app/config/env.server');
      expect(serverEnv.superadminBootstrapEmails).toEqual([]);
    });
  });

  it('parses, trims, lowercases and drops empties in superadminBootstrapEmails', () => {
    setEnv('SUPERTOKENS_CONNECTION_URI', 'https://s.example.com');
    setEnv('SUPERTOKENS_API_KEY', 'secret');
    setEnv('SUPERADMIN_BOOTSTRAP_EMAILS', ' A@x.com , b@Y.com ,, ');
    jest.isolateModules(() => {
      const { serverEnv } =
        jest.requireActual<typeof import('@/app/config/env.server')>('@/app/config/env.server');
      expect(serverEnv.superadminBootstrapEmails).toEqual(['a@x.com', 'b@y.com']);
    });
  });
});
