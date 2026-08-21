/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('server-only', () => ({}));

jest.mock('@/app/features/social/guard', () => ({
  // The guard has its own test; here it stands in as "an authenticated super
  // admin", so these tests exercise the OAuth logic rather than re-testing auth.
  withSuperAdmin: (_req: unknown, handler: (actor: unknown) => Promise<Response>) =>
    handler({ userId: 'user-1', email: 'admin@example.com' }),
}));

jest.mock('@/app/features/social/config', () => ({
  getTikTokConfig: jest.fn(),
  missingTikTokEnv: jest.fn(() => ['TIKTOK_CLIENT_KEY']),
}));
jest.mock('@/app/features/social/store', () => ({ writeConnection: jest.fn() }));
jest.mock('@/app/features/audit/store', () => ({ recordAuditEvent: jest.fn() }));
jest.mock('@/app/features/social/tiktok', () => ({
  buildAuthorizeUrl: jest.requireActual('@/app/features/social/tiktok').buildAuthorizeUrl,
  exchangeCode: jest.fn(),
  fetchDisplayName: jest.fn(),
}));

import { recordAuditEvent } from '@/app/features/audit/store';
import { getTikTokConfig } from '@/app/features/social/config';
import { OAUTH_COOKIE } from '@/app/features/social/oauthCookie';
import { parseKey, seal } from '@/app/features/social/secrets';
import { writeConnection } from '@/app/features/social/store';
import { exchangeCode, fetchDisplayName } from '@/app/features/social/tiktok';

import { GET as connect } from '@/app/api/social/tiktok/connect/route';
import { GET as callback } from '@/app/api/social/tiktok/callback/route';

const getTikTokConfigMock = getTikTokConfig as jest.Mock;
const exchangeCodeMock = exchangeCode as jest.Mock;
const fetchDisplayNameMock = fetchDisplayName as jest.Mock;
const writeConnectionMock = writeConnection as jest.Mock;
const recordAuditEventMock = recordAuditEvent as jest.Mock;

const TOKEN_KEY = parseKey('a'.repeat(64));
const CONFIG = {
  clientKey: 'ck',
  clientSecret: 'cs',
  redirectUri: 'https://admin.example.com/api/social/tiktok/callback',
  tokenKey: TOKEN_KEY,
};

function callbackRequest(query: Record<string, string>, cookie?: string): NextRequest {
  const url = new URL('https://admin.example.com/api/social/tiktok/callback');
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  const request = new NextRequest(url);
  if (cookie) request.cookies.set(OAUTH_COOKIE, cookie);
  return request;
}

function sealedState(state: string, verifier = 'verifier-1'): string {
  return seal(JSON.stringify({ state, verifier }), TOKEN_KEY);
}

/** The Location a redirect response points at. */
function location(response: Response): URL {
  return new URL(response.headers.get('location') ?? '');
}

beforeEach(() => {
  jest.clearAllMocks();
  getTikTokConfigMock.mockReturnValue(CONFIG);
});

describe('GET /api/social/tiktok/connect', () => {
  it('redirects to TikTok and stashes the sealed verifier in an httpOnly cookie', async () => {
    const response = await connect(
      new NextRequest('https://admin.example.com/api/social/tiktok/connect')
    );
    expect(response.status).toBe(307);

    const target = location(response);
    expect(target.origin).toBe('https://www.tiktok.com');
    expect(target.searchParams.get('code_challenge_method')).toBe('S256');
    expect(target.searchParams.get('redirect_uri')).toBe(CONFIG.redirectUri);

    const cookie = (
      response as unknown as {
        cookies: {
          get: (
            n: string
          ) => { value: string; httpOnly: boolean; sameSite: string; path: string } | undefined;
        };
      }
    ).cookies.get(OAUTH_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    // Lax, not Strict: the callback is a top-level navigation from tiktok.com.
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.path).toBe('/api/social/tiktok');
    expect(cookie?.value).toMatch(/^v1\./);
  });

  it('returns 503 listing what is missing when unconfigured', async () => {
    getTikTokConfigMock.mockReturnValue(null);
    const response = await connect(
      new NextRequest('https://admin.example.com/api/social/tiktok/connect')
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ missing: ['TIKTOK_CLIENT_KEY'] });
  });
});

describe('GET /api/social/tiktok/callback', () => {
  const TOKENS = {
    accessToken: 'at',
    refreshToken: 'rt',
    expiresIn: 86_400,
    refreshExpiresIn: 31_536_000,
    openId: 'oid',
    scope: 'video.publish',
  };

  it('stores the connection and records an audit entry', async () => {
    exchangeCodeMock.mockResolvedValue(TOKENS);
    fetchDisplayNameMock.mockResolvedValue('yosemite_crew');

    const response = await callback(callbackRequest({ code: 'c', state: 'st' }, sealedState('st')));

    expect(location(response).searchParams.get('connected')).toBe('1');
    expect(exchangeCodeMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'c', codeVerifier: 'verifier-1' })
    );
    const stored = writeConnectionMock.mock.calls[0][1];
    expect(stored).toMatchObject({
      openId: 'oid',
      displayName: 'yosemite_crew',
      connectedByEmail: 'admin@example.com',
    });
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'social.connect', targetId: 'tiktok:oid' })
    );
  });

  it('still connects when the display name cannot be read', async () => {
    exchangeCodeMock.mockResolvedValue(TOKENS);
    fetchDisplayNameMock.mockRejectedValue(new Error('scope'));
    const response = await callback(callbackRequest({ code: 'c', state: 'st' }, sealedState('st')));
    expect(location(response).searchParams.get('connected')).toBe('1');
    expect(writeConnectionMock.mock.calls[0][1].displayName).toBe('');
  });

  it('refuses a state that does not match the cookie, without exchanging the code', async () => {
    const response = await callback(
      callbackRequest({ code: 'c', state: 'forged' }, sealedState('real'))
    );
    expect(location(response).searchParams.get('error')).toBe('state_mismatch');
    expect(exchangeCodeMock).not.toHaveBeenCalled();
  });

  it('refuses when the cookie is absent', async () => {
    const response = await callback(callbackRequest({ code: 'c', state: 'st' }));
    expect(location(response).searchParams.get('error')).toBe('state_mismatch');
    expect(exchangeCodeMock).not.toHaveBeenCalled();
  });

  it('refuses a cookie sealed with a different key', async () => {
    const foreign = seal(JSON.stringify({ state: 'st', verifier: 'v' }), parseKey('b'.repeat(64)));
    const response = await callback(callbackRequest({ code: 'c', state: 'st' }, foreign));
    expect(location(response).searchParams.get('error')).toBe('state_mismatch');
  });

  it('passes a TikTok-side denial straight back to the page', async () => {
    const response = await callback(callbackRequest({ error: 'access_denied' }));
    expect(location(response).searchParams.get('error')).toBe('access_denied');
  });

  it('reports a missing code', async () => {
    const response = await callback(callbackRequest({ state: 'st' }, sealedState('st')));
    expect(location(response).searchParams.get('error')).toBe('missing_code');
  });

  it('reports a failed code exchange without storing anything', async () => {
    exchangeCodeMock.mockRejectedValue(new Error('invalid_grant'));
    const response = await callback(callbackRequest({ code: 'c', state: 'st' }, sealedState('st')));
    expect(location(response).searchParams.get('error')).toBe('exchange_failed');
    expect(writeConnectionMock).not.toHaveBeenCalled();
  });

  it('reports an unconfigured host', async () => {
    getTikTokConfigMock.mockReturnValue(null);
    const response = await callback(callbackRequest({ code: 'c', state: 'st' }));
    expect(location(response).searchParams.get('error')).toBe('unconfigured');
  });

  it('always clears the one-shot PKCE cookie, even on failure', async () => {
    const response = await callback(callbackRequest({ error: 'access_denied' }, sealedState('st')));
    const cookie = (
      response as unknown as { cookies: { get: (n: string) => { value: string } | undefined } }
    ).cookies.get(OAUTH_COOKIE);
    expect(cookie?.value).toBe('');
  });
});
