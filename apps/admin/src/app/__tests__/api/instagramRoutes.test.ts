/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('server-only', () => ({}));

jest.mock('@/app/features/social/guard', () => ({
  withSuperAdmin: (_req: unknown, handler: (actor: unknown) => Promise<Response>) =>
    handler({ userId: 'user-1', email: 'admin@example.com' }),
  isSameOrigin: jest.fn(() => true),
}));
jest.mock('@/app/features/social/config', () => ({
  getInstagramConfig: jest.fn(),
  missingInstagramEnv: jest.fn(() => ['INSTAGRAM_APP_ID']),
}));
jest.mock('@/app/features/social/store', () => ({ writeInstagramConnection: jest.fn() }));
jest.mock('@/app/features/audit/store', () => ({ recordAuditEvent: jest.fn() }));
jest.mock('@/app/features/social/instagramPublisher', () => ({
  publishReel: jest.fn(),
  finishReel: jest.fn(),
}));
jest.mock('@/app/features/social/instagram', () => ({
  ...jest.requireActual('@/app/features/social/instagram'),
  exchangeCode: jest.fn(),
  exchangeForLongLived: jest.fn(),
  fetchProfile: jest.fn(),
}));

const env: { socialSchedulerKey: string | null } = { socialSchedulerKey: null };
jest.mock('@/app/config/env.server', () => ({
  serverEnv: {
    get socialSchedulerKey() {
      return env.socialSchedulerKey;
    },
  },
}));

import { recordAuditEvent } from '@/app/features/audit/store';
import { getInstagramConfig } from '@/app/features/social/config';
import { isSameOrigin } from '@/app/features/social/guard';
import { exchangeCode, exchangeForLongLived, fetchProfile } from '@/app/features/social/instagram';
import { finishReel, publishReel } from '@/app/features/social/instagramPublisher';
import { INSTAGRAM_OAUTH_COOKIE } from '@/app/features/social/oauthCookie';
import { parseKey, seal } from '@/app/features/social/secrets';
import { writeInstagramConnection } from '@/app/features/social/store';

import { GET as callback } from '@/app/api/social/instagram/callback/route';
import { GET as connect } from '@/app/api/social/instagram/connect/route';
import { GET as finish, POST as post } from '@/app/api/social/instagram/post/route';
import { POST as scheduled } from '@/app/api/social/instagram/scheduled/route';

const getInstagramConfigMock = getInstagramConfig as jest.Mock;
const isSameOriginMock = isSameOrigin as jest.Mock;
const exchangeCodeMock = exchangeCode as jest.Mock;
const exchangeForLongLivedMock = exchangeForLongLived as jest.Mock;
const fetchProfileMock = fetchProfile as jest.Mock;
const writeInstagramConnectionMock = writeInstagramConnection as jest.Mock;
const recordAuditEventMock = recordAuditEvent as jest.Mock;
const publishReelMock = publishReel as jest.Mock;
const finishReelMock = finishReel as jest.Mock;

const TOKEN_KEY = parseKey('a'.repeat(64));
const CONFIG = {
  appId: '1358253356025116',
  appSecret: 'secret',
  redirectUri: 'https://admin.example.com/api/social/instagram/callback',
  tokenKey: TOKEN_KEY,
};

function location(response: Response): URL {
  return new URL(response.headers.get('location') ?? '');
}

function callbackRequest(query: Record<string, string>, cookie?: string): NextRequest {
  const url = new URL('https://admin.example.com/api/social/instagram/callback');
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  const request = new NextRequest(url);
  if (cookie) request.cookies.set(INSTAGRAM_OAUTH_COOKIE, cookie);
  return request;
}

function form(overrides: Record<string, string> = {}, withVideo = true): FormData {
  const data = new FormData();
  if (withVideo) {
    data.set('video', new File([new Uint8Array(2048)], 'reel.mp4', { type: 'video/mp4' }));
  }
  data.set('caption', 'vet humour');
  Object.entries(overrides).forEach(([k, v]) => data.set(k, v));
  return data;
}

beforeEach(() => {
  jest.clearAllMocks();
  env.socialSchedulerKey = null;
  getInstagramConfigMock.mockReturnValue(CONFIG);
  isSameOriginMock.mockReturnValue(true);
  publishReelMock.mockResolvedValue({ ok: true, state: 'published', mediaId: 'm1' });
  finishReelMock.mockResolvedValue({ ok: true, state: 'published', mediaId: 'm1' });
});

describe('GET /api/social/instagram/connect', () => {
  it('redirects to Instagram and stashes the sealed state', async () => {
    const response = await connect(
      new NextRequest('https://admin.example.com/api/social/instagram/connect')
    );
    const target = location(response);
    expect(target.origin).toBe('https://www.instagram.com');
    expect(target.searchParams.get('client_id')).toBe(CONFIG.appId);

    const cookie = (
      response as unknown as {
        cookies: {
          get: (n: string) => { value: string; httpOnly: boolean; sameSite: string } | undefined;
        };
      }
    ).cookies.get(INSTAGRAM_OAUTH_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.value).toMatch(/^v1\./);
  });

  it('returns 503 when unconfigured', async () => {
    getInstagramConfigMock.mockReturnValue(null);
    const response = await connect(
      new NextRequest('https://admin.example.com/api/social/instagram/connect')
    );
    expect(response.status).toBe(503);
  });
});

describe('GET /api/social/instagram/callback', () => {
  const sealedState = (state: string) => seal(JSON.stringify({ state }), TOKEN_KEY);

  beforeEach(() => {
    exchangeCodeMock.mockResolvedValue({ accessToken: 'short', userId: '178414', expiresIn: 3600 });
    exchangeForLongLivedMock.mockResolvedValue({ accessToken: 'long', expiresIn: 5_184_000 });
    fetchProfileMock.mockResolvedValue({ userId: '178414', username: 'yosemite_crew' });
  });

  it('stores the LONG-lived token, never the short-lived one', async () => {
    const response = await callback(callbackRequest({ code: 'c', state: 'st' }, sealedState('st')));
    expect(location(response).searchParams.get('connected')).toBe('instagram');

    const stored = writeInstagramConnectionMock.mock.calls[0][1];
    expect(stored.accessToken).toBe('long');
    expect(stored.username).toBe('yosemite_crew');
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'social.connect', targetId: 'instagram:178414' })
    );
  });

  it('still connects when the profile lookup fails', async () => {
    fetchProfileMock.mockRejectedValue(new Error('nope'));
    const response = await callback(callbackRequest({ code: 'c', state: 'st' }, sealedState('st')));
    expect(location(response).searchParams.get('connected')).toBe('instagram');
    expect(writeInstagramConnectionMock.mock.calls[0][1].userId).toBe('178414');
  });

  it('refuses a forged or absent state without exchanging the code', async () => {
    const forged = await callback(
      callbackRequest({ code: 'c', state: 'evil' }, sealedState('real'))
    );
    expect(location(forged).searchParams.get('error')).toBe('state_mismatch');

    const absent = await callback(callbackRequest({ code: 'c', state: 'st' }));
    expect(location(absent).searchParams.get('error')).toBe('state_mismatch');
    expect(exchangeCodeMock).not.toHaveBeenCalled();
  });

  it('reports denial, a missing code, a failed exchange and an unconfigured host', async () => {
    expect(
      location(await callback(callbackRequest({ error: 'access_denied' }))).searchParams.get(
        'error'
      )
    ).toBe('access_denied');

    expect(
      location(
        await callback(callbackRequest({ state: 'st' }, sealedState('st')))
      ).searchParams.get('error')
    ).toBe('missing_code');

    exchangeCodeMock.mockRejectedValue(new Error('bad code'));
    expect(
      location(
        await callback(callbackRequest({ code: 'c', state: 'st' }, sealedState('st')))
      ).searchParams.get('error')
    ).toBe('exchange_failed');
    expect(writeInstagramConnectionMock).not.toHaveBeenCalled();

    getInstagramConfigMock.mockReturnValue(null);
    expect(
      location(await callback(callbackRequest({ code: 'c', state: 'st' }))).searchParams.get(
        'error'
      )
    ).toBe('unconfigured');
  });
});

describe('POST /api/social/instagram/post', () => {
  function postRequest(body: BodyInit, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest('https://admin.example.com/api/social/instagram/post', {
      method: 'POST',
      body,
      headers,
    });
  }

  it('publishes a Reel', async () => {
    const response = await post(postRequest(form()));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: 'published', mediaId: 'm1' });
    expect(publishReelMock).toHaveBeenCalledWith(
      CONFIG,
      { actorId: 'user-1' },
      expect.objectContaining({ options: { caption: 'vet humour', shareToFeed: true } })
    );
  });

  it('returns 202 with the container id while Instagram is still transcoding', async () => {
    publishReelMock.mockResolvedValue({ ok: true, state: 'processing', containerId: 'c9' });
    const response = await post(postRequest(form()));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ state: 'processing', containerId: 'c9' });
  });

  it('refuses a cross-origin request before doing any work', async () => {
    isSameOriginMock.mockReturnValue(false);
    expect((await post(postRequest(form()))).status).toBe(403);
    expect(publishReelMock).not.toHaveBeenCalled();
  });

  it('maps unconfigured, bad body, validation failure and no connection', async () => {
    getInstagramConfigMock.mockReturnValue(null);
    expect((await post(postRequest(form()))).status).toBe(503);

    getInstagramConfigMock.mockReturnValue(CONFIG);
    expect(
      (await post(postRequest('{"a":1}', { 'content-type': 'application/json' }))).status
    ).toBe(400);
    expect((await post(postRequest(form({}, false)))).status).toBe(400);

    publishReelMock.mockResolvedValue({ ok: false, reason: 'not_connected' });
    expect((await post(postRequest(form()))).status).toBe(409);
  });

  it('maps a failed container to 502', async () => {
    publishReelMock.mockResolvedValue({
      ok: false,
      reason: 'container_failed',
      detail: 'too short',
    });
    const response = await post(postRequest(form()));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ detail: 'too short' });
  });

  it('maps an upstream Instagram error to 502 with its code', async () => {
    const { InstagramApiError } = jest.requireActual('@/app/features/social/instagram');
    publishReelMock.mockRejectedValue(new InstagramApiError('OAuthException', 'expired'));
    const response = await post(postRequest(form()));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: 'OAuthException' });
  });
});

describe('GET /api/social/instagram/post', () => {
  const req = (q: string) =>
    new NextRequest(`https://admin.example.com/api/social/instagram/post${q}`);

  it('finishes a container that is ready', async () => {
    const response = await finish(req('?containerId=c9'));
    expect(response.status).toBe(200);
    expect(finishReelMock).toHaveBeenCalledWith(CONFIG, { actorId: 'user-1' }, 'c9');
  });

  it('requires a containerId and reports an unconfigured host', async () => {
    expect((await finish(req(''))).status).toBe(400);
    getInstagramConfigMock.mockReturnValue(null);
    expect((await finish(req('?containerId=c9'))).status).toBe(503);
  });

  it('maps a thrown error to 500', async () => {
    finishReelMock.mockRejectedValue(new Error('boom'));
    expect((await finish(req('?containerId=c9'))).status).toBe(500);
  });
});

describe('POST /api/social/instagram/scheduled', () => {
  const req = (body: BodyInit, key?: string) =>
    new NextRequest('https://admin.example.com/api/social/instagram/scheduled', {
      method: 'POST',
      body,
      headers: key === undefined ? {} : { 'x-scheduler-key': key },
    });

  it('refuses every request when no scheduler key is configured', async () => {
    expect((await scheduled(req(form(), 'anything'))).status).toBe(503);
    expect(publishReelMock).not.toHaveBeenCalled();
  });

  it('rejects a wrong or absent key', async () => {
    env.socialSchedulerKey = 'correct-horse';
    expect((await scheduled(req(form(), 'wrong'))).status).toBe(401);
    expect((await scheduled(req(form()))).status).toBe(401);
    expect(publishReelMock).not.toHaveBeenCalled();
  });

  it('publishes with the scheduler actor, not a real admin', async () => {
    env.socialSchedulerKey = 'correct-horse';
    expect((await scheduled(req(form(), 'correct-horse'))).status).toBe(200);
    expect(publishReelMock).toHaveBeenCalledWith(
      CONFIG,
      { actorId: 'scheduler:social-poster' },
      expect.anything()
    );
  });

  it('validates the body and the host exactly as the composer path does', async () => {
    env.socialSchedulerKey = 'correct-horse';
    expect((await scheduled(req(form({}, false), 'correct-horse'))).status).toBe(400);

    getInstagramConfigMock.mockReturnValue(null);
    expect((await scheduled(req(form(), 'correct-horse'))).status).toBe(503);
  });

  it('rejects a non-multipart body and maps upstream failures', async () => {
    env.socialSchedulerKey = 'correct-horse';
    const bad = new NextRequest('https://admin.example.com/api/social/instagram/scheduled', {
      method: 'POST',
      body: 'nope',
      headers: { 'content-type': 'application/json', 'x-scheduler-key': 'correct-horse' },
    });
    expect((await scheduled(bad)).status).toBe(400);

    publishReelMock.mockRejectedValue(new Error('boom'));
    expect((await scheduled(req(form(), 'correct-horse'))).status).toBe(500);
  });
});
