/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST } from '@/app/api/signout/route';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/signout');
}

function getAllSetCookieHeaders(res: Response): string[] {
  return res.headers.getSetCookie?.() ?? [];
}

describe('POST /api/signout', () => {
  it('returns a 307 redirect to /auth', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('/auth');
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
});
