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
    DATABASE_URL: process.env.DATABASE_URL,
  };
  // Every case below other than the DATABASE_URL one needs a value present,
  // since the var is read while the serverEnv object literal is built.
  beforeEach(() => {
    setEnv('DATABASE_URL', 'postgresql://u:p@localhost:5432/db');
  });
  afterEach(() => {
    setEnv('SUPERTOKENS_CONNECTION_URI', originals.SUPERTOKENS_CONNECTION_URI);
    setEnv('SUPERTOKENS_API_KEY', originals.SUPERTOKENS_API_KEY);
    setEnv('SUPERADMIN_BOOTSTRAP_EMAILS', originals.SUPERADMIN_BOOTSTRAP_EMAILS);
    setEnv('DATABASE_URL', originals.DATABASE_URL);
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

  it('throws when DATABASE_URL is missing', () => {
    setEnv('SUPERTOKENS_CONNECTION_URI', 'https://s.example.com');
    setEnv('SUPERTOKENS_API_KEY', 'k');
    setEnv('DATABASE_URL', undefined);
    jest.isolateModules(() => {
      expect(() => jest.requireActual('@/app/config/env.server')).toThrow(/DATABASE_URL/);
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

  it('exposes databaseUrl when set', () => {
    setEnv('SUPERTOKENS_CONNECTION_URI', 'https://s.example.com');
    setEnv('SUPERTOKENS_API_KEY', 'secret');
    setEnv('DATABASE_URL', 'postgresql://u:p@db.example.com:5432/admin');
    jest.isolateModules(() => {
      const { serverEnv } =
        jest.requireActual<typeof import('@/app/config/env.server')>('@/app/config/env.server');
      expect(serverEnv.databaseUrl).toBe('postgresql://u:p@db.example.com:5432/admin');
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

describe('serverEnv.apSigningKey', () => {
  const REQUIRED: Array<[string, string]> = [
    ['SUPERTOKENS_CONNECTION_URI', 'https://s.example.com'],
    ['SUPERTOKENS_API_KEY', 'secret'],
    ['DATABASE_URL', 'postgresql://u:p@localhost:5432/db'],
  ];

  // Only the line structure is under test - no crypto runs here, so the content
  // is a stand-in. The real PEM armour text is deliberately NOT used: the
  // pre-commit secret scanner matches that header literal and would block every
  // commit touching this file. Keep these labels.
  const PEM_LINES = ['-----BEGIN TEST BLOCK-----', 'bm90LWEta2V5', '-----END TEST BLOCK-----'];
  const REAL_PEM = `${PEM_LINES.join('\n')}\n`;
  const ESCAPED_PEM = PEM_LINES.join('\\n');

  const originals = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const [name, value] of REQUIRED) {
      originals.set(name, process.env[name]);
      setEnv(name, value);
    }
    originals.set('AP_SIGNING_KEY', process.env.AP_SIGNING_KEY);
  });

  afterEach(() => {
    for (const [name, value] of originals) setEnv(name, value);
    originals.clear();
  });

  function loadKey(): string | null {
    let key: string | null = null;
    jest.isolateModules(() => {
      const { serverEnv } =
        jest.requireActual<typeof import('@/app/config/env.server')>('@/app/config/env.server');
      key = serverEnv.apSigningKey;
    });
    return key;
  }

  it('expands a single-line key written with literal \\n escapes', () => {
    // This is the form Amplify must receive: `env | grep -E '^AP_SIGNING_KEY='`
    // in amplify.yml is line-based, so a genuinely multi-line value would be
    // truncated after its header and fail at request time.
    setEnv('AP_SIGNING_KEY', ESCAPED_PEM);
    expect(loadKey()).toBe(REAL_PEM);
  });

  it('leaves a key that already has real newlines unchanged', () => {
    setEnv('AP_SIGNING_KEY', REAL_PEM);
    expect(loadKey()).toBe(REAL_PEM);
  });

  it('tolerates surrounding whitespace and always ends with a single newline', () => {
    setEnv('AP_SIGNING_KEY', `\n  ${ESCAPED_PEM}  \n\n`);
    expect(loadKey()).toBe(REAL_PEM);
  });

  it('is null when unset, so issuance stays disabled rather than crashing', () => {
    setEnv('AP_SIGNING_KEY', undefined);
    expect(loadKey()).toBeNull();
  });

  it('treats a whitespace-only value as unset', () => {
    setEnv('AP_SIGNING_KEY', '   \n  ');
    expect(loadKey()).toBeNull();
  });
});
