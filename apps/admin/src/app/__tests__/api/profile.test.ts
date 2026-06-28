/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const updateUserMetadataMock = jest.fn();
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: {
    updateUserMetadata: (...args: unknown[]) => updateUserMetadataMock(...args),
  },
}));

const withSessionMock = jest.fn();
jest.mock('supertokens-node/nextjs', () => ({
  withSession: (
    req: NextRequest,
    handler: (error: Error | undefined, session: unknown) => Promise<Response>
  ) => withSessionMock(req, handler),
}));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
}));

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/profile', () => {
  beforeEach(() => {
    updateUserMetadataMock.mockReset();
    withSessionMock.mockReset();
  });

  it('returns 400 on missing firstName', async () => {
    const { POST } = await import('@/app/api/profile/route');
    const res = await POST(makeRequest({ lastName: 'Smith' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid JSON body', async () => {
    const { POST } = await import('@/app/api/profile/route');
    const req = new NextRequest('http://localhost:3000/api/profile', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 when no session', async () => {
    const { POST } = await import('@/app/api/profile/route');
    withSessionMock.mockImplementationOnce(async (_req, handler) => {
      return handler(undefined, undefined);
    });
    const res = await POST(makeRequest({ firstName: 'Jane' }));
    expect(res.status).toBe(401);
  });

  it('returns 500 when session-resolver errors', async () => {
    const { POST } = await import('@/app/api/profile/route');
    withSessionMock.mockImplementationOnce(async (_req, handler) => {
      return handler(new Error('boom'), undefined);
    });
    const res = await POST(makeRequest({ firstName: 'Jane' }));
    expect(res.status).toBe(500);
  });

  it('updates metadata and returns OK when authenticated', async () => {
    const { POST } = await import('@/app/api/profile/route');
    withSessionMock.mockImplementationOnce(async (_req, handler) => {
      return handler(undefined, { getUserId: () => 'user-123' });
    });
    updateUserMetadataMock.mockResolvedValueOnce({ status: 'OK' });
    const res = await POST(makeRequest({ firstName: 'Jane', lastName: 'Doe' }));
    expect(res.status).toBe(200);
    expect(updateUserMetadataMock).toHaveBeenCalledWith('user-123', {
      firstName: 'Jane',
      lastName: 'Doe',
    });
  });

  it('caps over-long names at 100 characters', async () => {
    const { POST } = await import('@/app/api/profile/route');
    withSessionMock.mockImplementationOnce(async (_req, handler) => {
      return handler(undefined, { getUserId: () => 'user-123' });
    });
    updateUserMetadataMock.mockResolvedValueOnce({ status: 'OK' });
    const res = await POST(makeRequest({ firstName: 'a'.repeat(250), lastName: 'b'.repeat(250) }));
    expect(res.status).toBe(200);
    expect(updateUserMetadataMock).toHaveBeenCalledWith('user-123', {
      firstName: 'a'.repeat(100),
      lastName: 'b'.repeat(100),
    });
  });
});
