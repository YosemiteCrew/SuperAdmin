function setNodeEnv(value: string): void {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    configurable: true,
  });
}

describe('securityHeaders', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    setNodeEnv(originalEnv ?? 'test');
  });

  it('emits all baseline headers in production', () => {
    setNodeEnv('production');
    jest.isolateModules(() => {
      const { securityHeaders } =
        jest.requireActual<typeof import('@/securityHeaders')>('@/securityHeaders');
      const byKey = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
      expect(byKey['X-Frame-Options']).toBe('SAMEORIGIN');
      expect(byKey['X-Content-Type-Options']).toBe('nosniff');
      expect(byKey['Cross-Origin-Opener-Policy']).toBe('same-origin-allow-popups');
      expect(byKey['Cross-Origin-Resource-Policy']).toBe('same-origin');
      expect(byKey['Strict-Transport-Security']).toMatch(/max-age=63072000/);
      expect(byKey['Content-Security-Policy']).toContain("frame-ancestors 'self'");
      expect(byKey['Content-Security-Policy']).toContain('upgrade-insecure-requests');
      expect(byKey['Content-Security-Policy']).not.toContain("'unsafe-eval'");
    });
  });

  it('skips HSTS and adds unsafe-eval in development', () => {
    setNodeEnv('development');
    jest.isolateModules(() => {
      const { securityHeaders } =
        jest.requireActual<typeof import('@/securityHeaders')>('@/securityHeaders');
      const byKey = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
      expect(byKey['Strict-Transport-Security']).toBeUndefined();
      expect(byKey['Content-Security-Policy']).toContain("'unsafe-eval'");
      expect(byKey['Content-Security-Policy']).not.toContain('upgrade-insecure-requests');
    });
  });

  it('locks down Permissions-Policy on sensitive APIs', () => {
    setNodeEnv('production');
    jest.isolateModules(() => {
      const { securityHeaders } =
        jest.requireActual<typeof import('@/securityHeaders')>('@/securityHeaders');
      const byKey = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
      const pp = byKey['Permissions-Policy'] ?? '';
      for (const blocked of ['camera=()', 'microphone=()', 'geolocation=()']) {
        expect(pp).toContain(blocked);
      }
    });
  });
});
