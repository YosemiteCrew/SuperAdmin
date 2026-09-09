/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { config, proxy } from '@/proxy';

function makeRequest(
  path: string,
  token?: string,
  init: { method?: string; authorization?: string } = {}
): NextRequest {
  const url = `http://localhost:3000${path}`;
  const headers = new Headers();
  if (token) headers.set('cookie', `sAccessToken=${token}`);
  if (init.authorization) headers.set('authorization', init.authorization);
  return new NextRequest(url, { headers, method: init.method });
}

function makeJwt(expMs: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: expMs / 1000 })).toString('base64url');
  return `${header}.${payload}.signature`;
}

function setNodeEnv(value: string | undefined): void {
  Object.defineProperty(process.env, 'NODE_ENV', {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

describe('proxy', () => {
  const originalCredentials = process.env.PANEL_BASIC_AUTH_CREDENTIALS;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.PANEL_BASIC_AUTH_CREDENTIALS = originalCredentials;
    setNodeEnv(originalNodeEnv);
  });

  it('challenges private pages and APIs when Basic Auth is configured', () => {
    process.env.PANEL_BASIC_AUTH_CREDENTIALS = 'operator:test-password';

    for (const path of ['/dashboard', '/auth', '/api/profile']) {
      const res = proxy(makeRequest(path));
      expect(res.status).toBe(401);
      expect(res.headers.get('WWW-Authenticate')).toBe('Basic realm="Login"');
    }
  });

  it('accepts the configured Basic Auth credential', () => {
    process.env.PANEL_BASIC_AUTH_CREDENTIALS = 'operator:test-password';
    const authorization = `Basic ${Buffer.from('operator:test-password').toString('base64')}`;

    const res = proxy(makeRequest('/auth', undefined, { authorization }));

    expect(res.status).toBe(200);
    expect(res.headers.get('WWW-Authenticate')).toBeNull();
  });

  it.each([
    ['GET', '/api/ap/signing-key.json'],
    ['GET', '/api/ap/revoked.json'],
    ['GET', '/api/directory'],
    ['PUT', '/api/directory/listing'],
    ['GET', '/api/health'],
    ['POST', '/api/contact'],
    ['POST', '/api/consent'],
    ['POST', '/api/social/tiktok/scheduled'],
    ['POST', '/api/social/instagram/scheduled'],
  ])('exempts the machine route %s %s from Basic Auth', (method, path) => {
    process.env.PANEL_BASIC_AUTH_CREDENTIALS = 'operator:test-password';

    const res = proxy(makeRequest(path, undefined, { method }));

    expect(res.status).toBe(200);
    expect(res.headers.get('WWW-Authenticate')).toBeNull();
  });

  it('matches dotted API routes so the gate can evaluate them', () => {
    expect(config.matcher).toContain('/api/:path*');
  });

  it('matches exemptions by exact method and path', () => {
    process.env.PANEL_BASIC_AUTH_CREDENTIALS = 'operator:test-password';

    expect(proxy(makeRequest('/api/directory/listing')).status).toBe(401);
    expect(proxy(makeRequest('/api/health/private')).status).toBe(401);
  });

  it.each([undefined, '', 'operator', ':password', 'operator:', 'operator:pass\nword'])(
    'fails closed in production for a missing or malformed credential (%p)',
    (credentials) => {
      setNodeEnv('production');
      process.env.PANEL_BASIC_AUTH_CREDENTIALS = credentials;

      expect(proxy(makeRequest('/dashboard')).status).toBe(503);
    }
  );

  it('redirects unauthenticated request to a private path to /auth', () => {
    const res = proxy(makeRequest('/dashboard'));
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('/auth');
  });

  it('lets unauthenticated /auth requests through', () => {
    const res = proxy(makeRequest('/auth'));
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('preserves the invitation URL while sending an unauthenticated recipient to sign in', () => {
    const res = proxy(makeRequest('/accept-invite?token=tok-1'));
    const location = new URL(res.headers.get('Location')!);
    expect(location.pathname).toBe('/auth');
    expect(location.searchParams.get('returnTo')).toBe('/accept-invite?token=tok-1');
  });

  it('lets an authenticated non-admin account reach the invitation page', () => {
    const validToken = makeJwt(Date.now() + 60 * 60 * 1000);
    const res = proxy(makeRequest('/accept-invite?token=tok-1', validToken));
    expect(res.headers.get('Location')).toBeNull();
  });

  it('lets /api/* requests through (public)', () => {
    const res = proxy(makeRequest('/api/health'));
    expect(res.headers.get('Location')).toBeNull();
  });

  it('redirects authenticated visitor at /auth to /dashboard', () => {
    const validToken = makeJwt(Date.now() + 60 * 60 * 1000);
    const res = proxy(makeRequest('/auth', validToken));
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('/dashboard');
  });

  it('lets an authenticated (MFA-incomplete) visitor reach /auth/mfa', () => {
    const validToken = makeJwt(Date.now() + 60 * 60 * 1000);
    const res = proxy(makeRequest('/auth/mfa/totp', validToken));
    expect(res.headers.get('Location')).toBeNull();
  });

  it('lets an authenticated admin reach /auth/reset-password (linked from Settings)', () => {
    const validToken = makeJwt(Date.now() + 60 * 60 * 1000);
    const res = proxy(makeRequest('/auth/reset-password', validToken));
    expect(res.headers.get('Location')).toBeNull();
  });

  it('redirects authenticated visitor at / to /dashboard', () => {
    const validToken = makeJwt(Date.now() + 60 * 60 * 1000);
    const res = proxy(makeRequest('/', validToken));
    expect(res.headers.get('Location')).toContain('/dashboard');
  });

  it('redirects unauthenticated visitor at / to /auth', () => {
    const res = proxy(makeRequest('/'));
    expect(res.headers.get('Location')).toContain('/auth');
  });

  it('treats an expired token as unauthenticated', () => {
    const expiredToken = makeJwt(Date.now() - 60 * 1000);
    const res = proxy(makeRequest('/dashboard', expiredToken));
    expect(res.headers.get('Location')).toContain('/auth');
  });

  it('treats a malformed token as unauthenticated', () => {
    const res = proxy(makeRequest('/dashboard', 'not.a.jwt'));
    expect(res.headers.get('Location')).toContain('/auth');
  });

  it('sets the enforced strict nonce CSP on pass-through responses (no Report-Only)', () => {
    const res = proxy(makeRequest('/auth'));
    const enforced = res.headers.get('Content-Security-Policy') ?? '';
    const reportOnly = res.headers.get('Content-Security-Policy-Report-Only');
    expect(enforced).toContain("'strict-dynamic'");
    expect(enforced).toContain("'nonce-");
    // script-src must not carry unsafe-inline (style-src retaining it for Tailwind is fine)
    const scriptSrc = enforced.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(reportOnly).toBeNull();
  });

  it('also sets the enforced CSP on redirect responses', () => {
    const res = proxy(makeRequest('/dashboard'));
    expect(res.status).toBe(307);
    expect(res.headers.get('Content-Security-Policy')).toContain("'strict-dynamic'");
    expect(res.headers.get('Content-Security-Policy')).toContain("'nonce-");
    expect(res.headers.get('Content-Security-Policy-Report-Only')).toBeNull();
  });

  it('issues a unique nonce per request', () => {
    const first = proxy(makeRequest('/auth')).headers.get('Content-Security-Policy');
    const second = proxy(makeRequest('/auth')).headers.get('Content-Security-Policy');
    expect(first).not.toBe(second);
  });
});
