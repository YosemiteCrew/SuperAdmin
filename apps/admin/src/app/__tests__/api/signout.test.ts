/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const isSameOriginMock = jest.fn();
jest.mock('@/app/features/social/guard', () => ({
  isSameOrigin: (...args: unknown[]) => isSameOriginMock(...args),
}));

import { POST } from '@/app/api/signout/route';

function makeRequest(origin?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/signout', {
    method: 'POST',
    headers: origin ? { origin } : undefined,
  });
}

function getAllSetCookieHeaders(res: Response): string[] {
  return res.headers.getSetCookie?.() ?? [];
}

describe('POST /api/signout', () => {
  beforeEach(() => {
    isSameOriginMock.mockReset().mockReturnValue(true);
  });

  it('returns a 307 redirect to /auth', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('/auth');
  });

  it('allows a same-origin browser logout', async () => {
    const res = await POST(makeRequest('http://localhost:3000'));

    expect(res.status).toBe(307);
    expect(getAllSetCookieHeaders(res)).toHaveLength(5);
  });

  it('clears every SuperTokens session cookie', async () => {
    const res = await POST(makeRequest());
    const cookies = getAllSetCookieHeaders(res).join('\n');
    for (const name of [
      'sAccessToken',
      'sRefreshToken',
      'sFrontToken',
      'sAntiCsrf',
      'st-last-access-token-update',
    ]) {
      expect(cookies).toContain(`${name}=;`);
    }
  });

  it('every clear cookie is HttpOnly + SameSite=Lax', async () => {
    const res = await POST(makeRequest());
    for (const c of getAllSetCookieHeaders(res)) {
      expect(c).toMatch(/HttpOnly/);
      expect(c).toMatch(/SameSite=Lax/);
    }
  });

  it('uses the correct per-cookie Path values', async () => {
    const res = await POST(makeRequest());
    const cookies = getAllSetCookieHeaders(res).join('\n');
    expect(cookies).toMatch(/sRefreshToken=.*Path=\/api\/auth\/session\/refresh/);
    expect(cookies).toMatch(/sAntiCsrf=.*Path=\/api\/auth/);
  });

  it('refuses a cross-origin logout without clearing cookies', async () => {
    const request = makeRequest('https://attacker.example');
    isSameOriginMock.mockReturnValueOnce(false);
    const res = await POST(request);

    expect(res.status).toBe(403);
    expect(getAllSetCookieHeaders(res)).toHaveLength(0);
    expect(isSameOriginMock).toHaveBeenCalledWith(request);
  });

  it('marks cleared cookies Secure in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
    jest.resetModules();

    try {
      const { POST: productionPost } = await import('@/app/api/signout/route');
      const res = await productionPost(makeRequest());

      for (const cookie of getAllSetCookieHeaders(res)) {
        expect(cookie).toContain('Secure');
      }
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        configurable: true,
      });
      jest.resetModules();
    }
  });
});
