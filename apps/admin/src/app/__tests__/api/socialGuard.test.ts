/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';

jest.mock('server-only', () => ({}));

jest.mock('supertokens-node/nextjs', () => ({
  withSession: jest.fn(),
}));
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: jest.fn() },
}));
jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  isSuperAdminUser: jest.fn(),
}));

import SuperTokens from 'supertokens-node';
import { withSession } from 'supertokens-node/nextjs';

import { isSuperAdminUser } from '@/app/config/backend';
import { isSameOrigin, withSuperAdmin } from '@/app/features/social/guard';

const withSessionMock = withSession as jest.Mock;
const isSuperAdminUserMock = isSuperAdminUser as jest.Mock;
const getUserMock = SuperTokens.getUser as jest.Mock;

/** Drives the real handler with a fake session, the way withSession would. */
function session(overrides: { mfa?: boolean; userId?: string } = {}) {
  return {
    getUserId: () => overrides.userId ?? 'user-1',
    getAccessTokenPayload: () => ({ 'st-mfa': { v: overrides.mfa ?? true } }),
  };
}

function request(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://admin.example.com/api/social/tiktok/post', {
    method: 'POST',
    headers,
  });
}

const handler = jest.fn(async () => NextResponse.json({ reached: true }));

beforeEach(() => {
  jest.clearAllMocks();
  isSuperAdminUserMock.mockResolvedValue(true);
  getUserMock.mockResolvedValue({ emails: ['admin@example.com'] });
  withSessionMock.mockImplementation((_req, cb) => cb(undefined, session()));
});

describe('withSuperAdmin', () => {
  it('passes the actor through when every check passes', async () => {
    const response = await withSuperAdmin(request(), handler);
    expect(await response.json()).toEqual({ reached: true });
    expect(handler).toHaveBeenCalledWith({ userId: 'user-1', email: 'admin@example.com' });
  });

  it('returns 500 on a session error', async () => {
    withSessionMock.mockImplementation((_req, cb) => cb(new Error('bad'), undefined));
    expect((await withSuperAdmin(request(), handler)).status).toBe(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 when there is no session', async () => {
    withSessionMock.mockImplementation((_req, cb) => cb(undefined, undefined));
    expect((await withSuperAdmin(request(), handler)).status).toBe(401);
  });

  it('returns 403 when the second factor is incomplete', async () => {
    withSessionMock.mockImplementation((_req, cb) => cb(undefined, session({ mfa: false })));
    const response = await withSuperAdmin(request(), handler);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Second factor required' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 403 for a signed-in user who is not a super admin', async () => {
    isSuperAdminUserMock.mockResolvedValue(false);
    expect((await withSuperAdmin(request(), handler)).status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('falls back to the user id when no email is resolvable', async () => {
    getUserMock.mockResolvedValue(undefined);
    await withSuperAdmin(request(), handler);
    expect(handler).toHaveBeenCalledWith({ userId: 'user-1', email: 'user-1' });
  });
});

describe('isSameOrigin', () => {
  it('accepts a matching origin', () => {
    expect(isSameOrigin(request({ origin: 'https://admin.example.com' }))).toBe(true);
  });

  it('rejects a different origin', () => {
    expect(isSameOrigin(request({ origin: 'https://evil.example.com' }))).toBe(false);
  });

  it('rejects an unparseable origin', () => {
    expect(isSameOrigin(request({ origin: 'not a url' }))).toBe(false);
  });

  it('allows a request with no Origin header, which cannot be a browser CSRF', () => {
    expect(isSameOrigin(request())).toBe(true);
  });
});
