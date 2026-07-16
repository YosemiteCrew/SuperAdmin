function setNodeEnv(value: string): void {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    configurable: true,
  });
}

type HeadersModule = typeof import('@/securityHeaders');

function load(): HeadersModule {
  return jest.requireActual<HeadersModule>('@/securityHeaders');
}

describe('securityHeaders', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    setNodeEnv(originalEnv ?? 'test');
  });

  it('emits all baseline static headers in production', () => {
    setNodeEnv('production');
    jest.isolateModules(() => {
      const { securityHeaders } = load();
      const byKey = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
      expect(byKey['X-Frame-Options']).toBe('SAMEORIGIN');
      expect(byKey['X-Content-Type-Options']).toBe('nosniff');
      expect(byKey['Cross-Origin-Opener-Policy']).toBe('same-origin-allow-popups');
      expect(byKey['Cross-Origin-Resource-Policy']).toBe('same-origin');
      expect(byKey['Strict-Transport-Security']).toMatch(/max-age=63072000/);
      // CSP is now set per-request in middleware, not in the static array.
      expect(byKey['Content-Security-Policy']).toBeUndefined();
    });
  });

  it('includes X-Robots-Tag: noindex, nofollow to block search engine indexing', () => {
    setNodeEnv('production');
    jest.isolateModules(() => {
      const { securityHeaders } = load();
      const byKey = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
      expect(byKey['X-Robots-Tag']).toBe('noindex, nofollow');
    });
  });

  it('skips HSTS in development', () => {
    setNodeEnv('development');
    jest.isolateModules(() => {
      const { securityHeaders } = load();
      const byKey = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
      expect(byKey['Strict-Transport-Security']).toBeUndefined();
    });
  });

  it('locks down Permissions-Policy on sensitive APIs', () => {
    setNodeEnv('production');
    jest.isolateModules(() => {
      const { securityHeaders } = load();
      const byKey = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
      const pp = byKey['Permissions-Policy'] ?? '';
      for (const blocked of ['camera=()', 'microphone=()', 'geolocation=()']) {
        expect(pp).toContain(blocked);
      }
    });
  });
});

describe('buildStrictCsp', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => setNodeEnv(originalEnv ?? 'test'));

  it('uses the nonce + strict-dynamic and drops unsafe-inline for scripts', () => {
    setNodeEnv('production');
    jest.isolateModules(() => {
      const csp = load().buildStrictCsp('abc123');
      expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
      expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
      expect(csp).toContain("frame-ancestors 'self'");
    });
  });
});
