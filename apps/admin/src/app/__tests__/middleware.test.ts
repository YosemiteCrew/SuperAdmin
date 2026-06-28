/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { middleware } from '@/middleware';

function makeRequest(path: string, token?: string): NextRequest {
  const url = `http://localhost:3000${path}`;
  const headers = new Headers();
  if (token) headers.set('cookie', `sAccessToken=${token}`);
  return new NextRequest(url, { headers });
}

function makeJwt(expMs: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: expMs / 1000 })).toString('base64url');
  return `${header}.${payload}.signature`;
}

describe('middleware', () => {
  it('redirects unauthenticated request to a private path to /auth', () => {
    const res = middleware(makeRequest('/dashboard'));
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('/auth');
  });

  it('lets unauthenticated /auth requests through', () => {
    const res = middleware(makeRequest('/auth'));
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('lets /api/* requests through (public)', () => {
    const res = middleware(makeRequest('/api/health'));
    expect(res.headers.get('Location')).toBeNull();
  });

  it('redirects authenticated visitor at /auth to /dashboard', () => {
    const validToken = makeJwt(Date.now() + 60 * 60 * 1000);
    const res = middleware(makeRequest('/auth', validToken));
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('/dashboard');
  });

  it('lets an authenticated (MFA-incomplete) visitor reach /auth/mfa', () => {
    const validToken = makeJwt(Date.now() + 60 * 60 * 1000);
    const res = middleware(makeRequest('/auth/mfa/totp', validToken));
    expect(res.headers.get('Location')).toBeNull();
  });

  it('lets an authenticated admin reach /auth/reset-password (linked from Settings)', () => {
    const validToken = makeJwt(Date.now() + 60 * 60 * 1000);
    const res = middleware(makeRequest('/auth/reset-password', validToken));
    expect(res.headers.get('Location')).toBeNull();
  });

  it('redirects authenticated visitor at / to /dashboard', () => {
    const validToken = makeJwt(Date.now() + 60 * 60 * 1000);
    const res = middleware(makeRequest('/', validToken));
    expect(res.headers.get('Location')).toContain('/dashboard');
  });

  it('redirects unauthenticated visitor at / to /auth', () => {
    const res = middleware(makeRequest('/'));
    expect(res.headers.get('Location')).toContain('/auth');
  });

  it('treats an expired token as unauthenticated', () => {
    const expiredToken = makeJwt(Date.now() - 60 * 1000);
    const res = middleware(makeRequest('/dashboard', expiredToken));
    expect(res.headers.get('Location')).toContain('/auth');
  });

  it('treats a malformed token as unauthenticated', () => {
    const res = middleware(makeRequest('/dashboard', 'not.a.jwt'));
    expect(res.headers.get('Location')).toContain('/auth');
  });

  it('sets the enforced CSP and a strict Report-Only CSP on pass-through responses', () => {
    const res = middleware(makeRequest('/auth'));
    const enforced = res.headers.get('Content-Security-Policy');
    const reportOnly = res.headers.get('Content-Security-Policy-Report-Only');
    expect(enforced).toContain("script-src 'self' 'unsafe-inline'");
    expect(reportOnly).toContain("'strict-dynamic'");
    expect(reportOnly).toContain("'nonce-");
    expect(reportOnly).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('also sets CSP headers on redirect responses', () => {
    const res = middleware(makeRequest('/dashboard'));
    expect(res.status).toBe(307);
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(res.headers.get('Content-Security-Policy-Report-Only')).toContain("'strict-dynamic'");
  });

  it('issues a unique nonce per request', () => {
    const first = middleware(makeRequest('/auth')).headers.get(
      'Content-Security-Policy-Report-Only'
    );
    const second = middleware(makeRequest('/auth')).headers.get(
      'Content-Security-Policy-Report-Only'
    );
    expect(first).not.toBe(second);
  });
});
