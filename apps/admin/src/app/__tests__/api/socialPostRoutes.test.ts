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
  getSocialConfig: jest.fn(),
  missingSocialEnv: jest.fn(() => ['TIKTOK_CLIENT_KEY']),
}));
jest.mock('@/app/features/social/publisher', () => ({ publishVideo: jest.fn() }));
jest.mock('@/app/features/social/store', () => ({ getUsableConnection: jest.fn() }));
// Spread the real module: postRequest.ts also imports isPrivacyLevel from here,
// and a bare replacement would silently strip it.
jest.mock('@/app/features/social/tiktok', () => ({
  ...jest.requireActual('@/app/features/social/tiktok'),
  fetchPublishStatus: jest.fn(),
}));

const env: { socialSchedulerKey: string | null } = { socialSchedulerKey: null };
jest.mock('@/app/config/env.server', () => ({
  serverEnv: {
    get socialSchedulerKey() {
      return env.socialSchedulerKey;
    },
  },
}));

import { getSocialConfig } from '@/app/features/social/config';
import { isSameOrigin } from '@/app/features/social/guard';
import { publishVideo } from '@/app/features/social/publisher';
import { getUsableConnection } from '@/app/features/social/store';
import { fetchPublishStatus } from '@/app/features/social/tiktok';

import { GET as status, POST as post } from '@/app/api/social/tiktok/post/route';
import { POST as scheduled } from '@/app/api/social/tiktok/scheduled/route';

const getSocialConfigMock = getSocialConfig as jest.Mock;
const isSameOriginMock = isSameOrigin as jest.Mock;
const publishVideoMock = publishVideo as jest.Mock;
const getUsableConnectionMock = getUsableConnection as jest.Mock;
const fetchPublishStatusMock = fetchPublishStatus as jest.Mock;

const CONFIG = { clientKey: 'ck' };

function form(overrides: Record<string, string> = {}, withVideo = true): FormData {
  const data = new FormData();
  if (withVideo) {
    data.set('video', new File([new Uint8Array(2048)], 'clip.mp4', { type: 'video/mp4' }));
  }
  data.set('mode', 'direct');
  data.set('title', 'caption');
  data.set('privacy', 'SELF_ONLY');
  Object.entries(overrides).forEach(([key, value]) => data.set(key, value));
  return data;
}

function postRequest(body: BodyInit, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://admin.example.com/api/social/tiktok/post', {
    method: 'POST',
    body,
    headers,
  });
}

function scheduledRequest(body: BodyInit, key?: string): NextRequest {
  return new NextRequest('https://admin.example.com/api/social/tiktok/scheduled', {
    method: 'POST',
    body,
    headers: key === undefined ? {} : { 'x-scheduler-key': key },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  env.socialSchedulerKey = null;
  getSocialConfigMock.mockReturnValue(CONFIG);
  isSameOriginMock.mockReturnValue(true);
  publishVideoMock.mockResolvedValue({ ok: true, publishId: 'pid', mode: 'direct' });
});

describe('POST /api/social/tiktok/post', () => {
  it('publishes an admin-composed post', async () => {
    const response = await post(postRequest(form()));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ publishId: 'pid', mode: 'direct' });
    expect(publishVideoMock).toHaveBeenCalledWith(
      CONFIG,
      { actorId: 'user-1' },
      expect.objectContaining({ mode: 'direct' })
    );
  });

  it('refuses a cross-origin request before doing any work', async () => {
    isSameOriginMock.mockReturnValue(false);
    const response = await post(postRequest(form()));
    expect(response.status).toBe(403);
    expect(publishVideoMock).not.toHaveBeenCalled();
  });

  it('returns 503 when the host is not configured', async () => {
    getSocialConfigMock.mockReturnValue(null);
    expect((await post(postRequest(form()))).status).toBe(503);
  });

  it('rejects a non-multipart body', async () => {
    const response = await post(
      postRequest('{"not":"multipart"}', { 'content-type': 'application/json' })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Expected a multipart form body' });
  });

  it('surfaces a validation failure with its own status', async () => {
    const response = await post(postRequest(form({}, false)));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'A video file is required' });
  });

  it('maps a missing connection to 409', async () => {
    publishVideoMock.mockResolvedValue({ ok: false, reason: 'not_connected' });
    expect((await post(postRequest(form()))).status).toBe(409);
  });

  it('maps an upstream refusal to 502 with the TikTok code', async () => {
    const { TikTokApiError } = jest.requireActual('@/app/features/social/tiktok');
    publishVideoMock.mockRejectedValue(
      new TikTokApiError('unaudited_client_can_only_post_to_private_accounts', 'blocked')
    );
    const response = await post(postRequest(form()));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      code: 'unaudited_client_can_only_post_to_private_accounts',
    });
  });
});

describe('GET /api/social/tiktok/post', () => {
  function statusRequest(query = '?publishId=pid'): NextRequest {
    return new NextRequest(`https://admin.example.com/api/social/tiktok/post${query}`);
  }

  it('returns the publish status', async () => {
    getUsableConnectionMock.mockResolvedValue({ accessToken: 'at' });
    fetchPublishStatusMock.mockResolvedValue({ status: 'PUBLISH_COMPLETE', postIds: ['1'] });
    const response = await status(statusRequest());
    expect(await response.json()).toMatchObject({ status: 'PUBLISH_COMPLETE' });
    expect(fetchPublishStatusMock).toHaveBeenCalledWith('at', 'pid');
  });

  it('requires a publishId', async () => {
    expect((await status(statusRequest(''))).status).toBe(400);
  });

  it('returns 503 when unconfigured and 409 when disconnected', async () => {
    getSocialConfigMock.mockReturnValue(null);
    expect((await status(statusRequest())).status).toBe(503);

    getSocialConfigMock.mockReturnValue(CONFIG);
    getUsableConnectionMock.mockResolvedValue(null);
    expect((await status(statusRequest())).status).toBe(409);
  });

  it('maps an upstream error to 502', async () => {
    const { TikTokApiError } = jest.requireActual('@/app/features/social/tiktok');
    getUsableConnectionMock.mockResolvedValue({ accessToken: 'at' });
    fetchPublishStatusMock.mockRejectedValue(new TikTokApiError('rate_limit', 'slow down'));
    expect((await status(statusRequest())).status).toBe(502);
  });
});

describe('POST /api/social/tiktok/scheduled', () => {
  it('refuses every request when no scheduler key is configured', async () => {
    env.socialSchedulerKey = null;
    const response = await scheduled(scheduledRequest(form(), 'anything'));
    expect(response.status).toBe(503);
    expect(publishVideoMock).not.toHaveBeenCalled();
  });

  it('rejects a wrong or absent key', async () => {
    env.socialSchedulerKey = 'correct-horse';
    expect((await scheduled(scheduledRequest(form(), 'wrong'))).status).toBe(401);
    expect((await scheduled(scheduledRequest(form()))).status).toBe(401);
    expect(publishVideoMock).not.toHaveBeenCalled();
  });

  it('publishes with the scheduler actor, not a real admin', async () => {
    env.socialSchedulerKey = 'correct-horse';
    const response = await scheduled(scheduledRequest(form(), 'correct-horse'));
    expect(response.status).toBe(200);
    expect(publishVideoMock).toHaveBeenCalledWith(
      CONFIG,
      { actorId: 'scheduler:social-poster' },
      expect.objectContaining({ mode: 'direct' })
    );
  });

  it('returns 503 when the host is not configured', async () => {
    env.socialSchedulerKey = 'correct-horse';
    getSocialConfigMock.mockReturnValue(null);
    expect((await scheduled(scheduledRequest(form(), 'correct-horse'))).status).toBe(503);
  });

  it('validates the body exactly as the composer path does', async () => {
    env.socialSchedulerKey = 'correct-horse';
    const response = await scheduled(scheduledRequest(form({}, false), 'correct-horse'));
    expect(response.status).toBe(400);
  });

  it('rejects a non-multipart body', async () => {
    env.socialSchedulerKey = 'correct-horse';
    const response = await scheduled(
      new NextRequest('https://admin.example.com/api/social/tiktok/scheduled', {
        method: 'POST',
        body: 'nope',
        headers: { 'content-type': 'application/json', 'x-scheduler-key': 'correct-horse' },
      })
    );
    expect(response.status).toBe(400);
  });

  it('maps an upstream refusal to 502', async () => {
    const { TikTokApiError } = jest.requireActual('@/app/features/social/tiktok');
    env.socialSchedulerKey = 'correct-horse';
    publishVideoMock.mockRejectedValue(new TikTokApiError('spam_risk', 'too many'));
    expect((await scheduled(scheduledRequest(form(), 'correct-horse'))).status).toBe(502);
  });
});
