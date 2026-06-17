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

function mockResponse(init: ResponseInit = {}): Response {
  return new Response('ok', init);
}

function makeRequest(path = '/api/auth/signin'): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

describe('/api/auth/[[...path]] route', () => {
  beforeEach(() => {
    handleCallMock.mockReset();
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

  it('DELETE forwards by default', async () => {
    const { DELETE } = await import('@/app/api/auth/[[...path]]/route');
    handleCallMock.mockResolvedValueOnce(mockResponse());
    await DELETE(makeRequest('/api/auth/signin'));
    expect(handleCallMock).toHaveBeenCalled();
  });

  it('DELETE on /dashboard/signout appends cleared session cookies', async () => {
    const { DELETE } = await import('@/app/api/auth/[[...path]]/route');
    handleCallMock.mockResolvedValueOnce(mockResponse({ status: 200 }));
    const res = await DELETE(makeRequest('/api/auth/dashboard/signout'));
    const cookies = res.headers.getSetCookie?.() ?? [];
    expect(cookies.length).toBeGreaterThanOrEqual(5);
    expect(cookies.join('\n')).toContain('sAccessToken=;');
  });
});
