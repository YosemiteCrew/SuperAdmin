/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const handleCallMock = jest.fn();
jest.mock('supertokens-node/nextjs', () => ({
  getAppDirRequestHandler: jest.fn(() => handleCallMock),
}));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
}));

const checkRateLimitMock = jest.fn();
jest.mock('@/app/lib/rateLimit', () => ({
  checkRateLimit: checkRateLimitMock,
}));

function mockResponse(init: ResponseInit = {}): Response {
  return new Response('ok', init);
}

function makeRequest(path = '/api/auth/signin'): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

describe('/api/auth/[[...path]] route', () => {
  beforeEach(() => {
    handleCallMock.mockReset();
    checkRateLimitMock.mockReset();
    // Default: allow all requests
    checkRateLimitMock.mockReturnValue({
      allowed: true,
      remaining: 19,
      resetMs: Date.now() + 60_000,
    });
  });

  it('GET adds Cache-Control: no-store when missing', async () => {
    const { GET } = await import('@/app/api/auth/[[...path]]/route');
    handleCallMock.mockResolvedValueOnce(mockResponse());
    const res = await GET(makeRequest());
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('GET keeps an existing Cache-Control header untouched', async () => {
    const { GET } = await import('@/app/api/auth/[[...path]]/route');
    handleCallMock.mockResolvedValueOnce(
      mockResponse({ headers: { 'Cache-Control': 'public, max-age=60' } })
    );
    const res = await GET(makeRequest());
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60');
  });

  it('POST/PUT/PATCH/HEAD just forward to handleCall', async () => {
    const route = await import('@/app/api/auth/[[...path]]/route');
    handleCallMock.mockResolvedValue(mockResponse());
    for (const method of [route.POST, route.PUT, route.PATCH, route.HEAD]) {
      await method(makeRequest());
    }
    expect(handleCallMock).toHaveBeenCalledTimes(4);
  });

  it('POST returns 429 with Retry-After when rate-limited', async () => {
    const now = Date.now();
    checkRateLimitMock.mockReturnValue({ allowed: false, remaining: 0, resetMs: now + 30_000 });
    const { POST } = await import('@/app/api/auth/[[...path]]/route');
    const req = new NextRequest('http://localhost:3000/api/auth/signin', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const retryAfter = res.headers.get('Retry-After');
    expect(retryAfter).toBeDefined();
    expect(Number(retryAfter)).toBeGreaterThan(0);
    expect(handleCallMock).not.toHaveBeenCalled();
  });

  it('GET requests are not rate-limited', async () => {
    checkRateLimitMock.mockReturnValue({
      allowed: false,
      remaining: 0,
      resetMs: Date.now() + 30_000,
    });
    const { GET } = await import('@/app/api/auth/[[...path]]/route');
    handleCallMock.mockResolvedValueOnce(mockResponse());
    const res = await GET(makeRequest());
    expect(res.status).not.toBe(429);
    expect(handleCallMock).toHaveBeenCalled();
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it('DELETE forwards by default', async () => {
    const { DELETE } = await import('@/app/api/auth/[[...path]]/route');
    handleCallMock.mockResolvedValueOnce(mockResponse());
    await DELETE(makeRequest('/api/auth/signin'));
    expect(handleCallMock).toHaveBeenCalled();
  });

  it('DELETE on /api/auth/signout appends cleared session cookies', async () => {
    const { DELETE } = await import('@/app/api/auth/[[...path]]/route');
    handleCallMock.mockResolvedValueOnce(mockResponse({ status: 200 }));
    const res = await DELETE(makeRequest('/api/auth/signout'));
    const cookies = res.headers.getSetCookie?.() ?? [];
    expect(cookies.length).toBeGreaterThanOrEqual(5);
    expect(cookies.join('\n')).toContain('sAccessToken=;');
  });
});
