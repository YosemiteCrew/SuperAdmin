/**
 * @jest-environment node
 */
import {
  buildAuthorizeUrl,
  exchangeCode,
  fetchCreatorInfo,
  fetchDisplayName,
  fetchPublishStatus,
  initDirectPost,
  initInboxDraft,
  isPrivacyLevel,
  refreshAccessToken,
  TikTokApiError,
  TIKTOK_SCOPES,
  uploadVideoBytes,
} from '@/app/features/social/tiktok';
import type { TikTokPostOptions } from '@/app/features/social/types';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response;
}

const OPTIONS: TikTokPostOptions = {
  title: 'caption',
  privacy: 'SELF_ONLY',
  disableComment: true,
  disableDuet: false,
  disableStitch: true,
  coverMs: 1000,
};

beforeEach(() => fetchMock.mockReset());

describe('buildAuthorizeUrl', () => {
  it('includes PKCE, the registered scopes and the state', () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientKey: 'key',
        redirectUri: 'https://admin.example.com/cb',
        state: 'st',
        codeChallenge: 'ch',
      })
    );
    expect(url.origin + url.pathname).toBe('https://www.tiktok.com/v2/auth/authorize/');
    expect(url.searchParams.get('client_key')).toBe('key');
    expect(url.searchParams.get('scope')).toBe(TIKTOK_SCOPES.join(','));
    expect(url.searchParams.get('code_challenge')).toBe('ch');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('st');
    expect(url.searchParams.get('redirect_uri')).toBe('https://admin.example.com/cb');
  });

  it('forces the authorization page so a re-approved session cannot skip consent', () => {
    // TikTok's silent re-approval returns a token with zero lifetimes and no
    // profile scope, which the panel would store as a live-looking connection.
    const url = new URL(
      buildAuthorizeUrl({
        clientKey: 'key',
        redirectUri: 'https://admin.example.com/cb',
        state: 'st',
        codeChallenge: 'ch',
      })
    );
    expect(url.searchParams.get('disable_auto_auth')).toBe('1');
  });

  it('does not request scopes the app has not registered', () => {
    expect(TIKTOK_SCOPES).not.toContain('user.info.stats');
    expect(TIKTOK_SCOPES).not.toContain('video.list');
  });
});

describe('token endpoints', () => {
  it('exchanges an authorization code with the verifier', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 86400,
        refresh_expires_in: 31536000,
        open_id: 'oid',
        scope: 'video.publish',
      })
    );
    const result = await exchangeCode({
      clientKey: 'k',
      clientSecret: 's',
      code: 'c',
      redirectUri: 'https://x/cb',
      codeVerifier: 'v',
    });
    expect(result.accessToken).toBe('at');
    expect(result.openId).toBe('oid');
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get('code_verifier')).toBe('v');
    expect(body.get('grant_type')).toBe('authorization_code');
  });

  it('refreshes with a refresh_token grant', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: 'new', expires_in: 100 }));
    const result = await refreshAccessToken({
      clientKey: 'k',
      clientSecret: 's',
      refreshToken: 'rt',
    });
    expect(result.accessToken).toBe('new');
    expect((fetchMock.mock.calls[0][1].body as URLSearchParams).get('grant_type')).toBe(
      'refresh_token'
    );
  });

  it('raises the top-level OAuth error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'invalid_grant', error_description: 'expired' })
    );
    await expect(
      exchangeCode({
        clientKey: 'k',
        clientSecret: 's',
        code: 'c',
        redirectUri: 'r',
        codeVerifier: 'v',
      })
    ).rejects.toThrow('expired');
  });

  it('survives a non-JSON token response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);
    const result = await refreshAccessToken({
      clientKey: 'k',
      clientSecret: 's',
      refreshToken: 'r',
    });
    expect(result.accessToken).toBe('');
  });
});

describe('api error handling', () => {
  it('throws on the embedded error object even with HTTP 200', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'scope_not_authorized', message: 'nope', log_id: 'lg' } })
    );
    await expect(fetchDisplayName('t')).rejects.toMatchObject({
      code: 'scope_not_authorized',
      logId: 'lg',
    });
  });

  it('treats error.code "ok" as success', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { user: { display_name: 'yosemite' } }, error: { code: 'ok' } })
    );
    expect(await fetchDisplayName('t')).toBe('yosemite');
  });

  it('throws on a non-ok HTTP status with no error object', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500));
    await expect(fetchDisplayName('t')).rejects.toBeInstanceOf(TikTokApiError);
  });
});

describe('fetchCreatorInfo', () => {
  it('maps the response and filters unknown privacy levels', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          creator_nickname: 'Yosemite',
          privacy_level_options: ['SELF_ONLY', 'BOGUS', 'PUBLIC_TO_EVERYONE'],
          max_video_post_duration_sec: 600,
          comment_disabled: true,
          duet_disabled: false,
          stitch_disabled: true,
        },
      })
    );
    const info = await fetchCreatorInfo('t');
    expect(info).toEqual({
      nickname: 'Yosemite',
      privacyOptions: ['SELF_ONLY', 'PUBLIC_TO_EVERYONE'],
      maxVideoSeconds: 600,
      commentDisabled: true,
      duetDisabled: false,
      stitchDisabled: true,
    });
  });

  it('falls back safely when the payload is empty', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const info = await fetchCreatorInfo('t');
    expect(info.privacyOptions).toEqual([]);
    expect(info.maxVideoSeconds).toBe(0);
    expect(info.nickname).toBe('');
  });
});

describe('publish init', () => {
  it('sends post_info and a single-chunk FILE_UPLOAD source for a direct post', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { publish_id: 'pid', upload_url: 'https://upload' } })
    );
    const target = await initDirectPost('t', { size: 2048, options: OPTIONS });
    expect(target).toEqual({ publishId: 'pid', uploadUrl: 'https://upload' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.post_info).toEqual({
      title: 'caption',
      privacy_level: 'SELF_ONLY',
      disable_comment: true,
      disable_duet: false,
      disable_stitch: true,
      video_cover_timestamp_ms: 1000,
    });
    expect(body.source_info).toEqual({
      source: 'FILE_UPLOAD',
      video_size: 2048,
      chunk_size: 2048,
      total_chunk_count: 1,
    });
  });

  it('omits post_info entirely for an inbox draft', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { publish_id: 'p', upload_url: 'u' } }));
    await initInboxDraft('t', { size: 10 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/post/publish/inbox/video/init/');
    expect(JSON.parse(init.body as string).post_info).toBeUndefined();
  });
});

describe('uploadVideoBytes', () => {
  it('PUTs the whole file with a byte range', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as unknown as Response);
    await uploadVideoBytes('https://upload', new Uint8Array(5));
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('PUT');
    expect(init.headers['Content-Range']).toBe('bytes 0-4/5');
    expect(init.headers['Content-Length']).toBe('5');
  });

  it('throws when the upload is rejected', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 } as unknown as Response);
    await expect(uploadVideoBytes('https://upload', new Uint8Array(2))).rejects.toThrow(
      'Upload failed with status 403'
    );
  });
});

describe('fetchPublishStatus', () => {
  it('returns the status and any public post ids', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { status: 'PUBLISH_COMPLETE', publicaly_available_post_id: ['1', 2, '3'] },
      })
    );
    expect(await fetchPublishStatus('t', 'pid')).toEqual({
      status: 'PUBLISH_COMPLETE',
      failReason: '',
      postIds: ['1', '3'],
    });
  });

  it('handles a missing id array', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { status: 'PROCESSING' } }));
    expect((await fetchPublishStatus('t', 'p')).postIds).toEqual([]);
  });
});

describe('isPrivacyLevel', () => {
  it('accepts known levels and rejects everything else', () => {
    expect(isPrivacyLevel('SELF_ONLY')).toBe(true);
    expect(isPrivacyLevel('PUBLIC_TO_EVERYONE')).toBe(true);
    expect(isPrivacyLevel('NOPE')).toBe(false);
    expect(isPrivacyLevel(null)).toBe(false);
  });
});

describe('request deadlines', () => {
  /**
   * Without a deadline a stalled TikTok upload leaves the composer showing
   * "Uploading..." indefinitely, with nothing in the server log to distinguish
   * a slow upload from a dead one. That happened in production and misdirected
   * the diagnosis, so each call now carries an AbortSignal.
   */
  function timeoutError() {
    const e = new Error('The operation was aborted due to timeout');
    e.name = 'TimeoutError';
    return e;
  }

  it('passes an AbortSignal on the upload', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 } as unknown as Response);
    await uploadVideoBytes('https://upload.tiktok.test/x', new Uint8Array(8));
    const init = fetchMock.mock.calls[0][1];
    expect(init.signal).toBeDefined();
  });

  it('passes an AbortSignal on the JSON calls', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { publish_id: 'p1', upload_url: 'u' } }));
    await initInboxDraft('tok', { size: 10 });
    const init = fetchMock.mock.calls[0][1];
    expect(init.signal).toBeDefined();
  });

  it('reports an upload timeout as a named TikTok error, not a raw abort', async () => {
    fetchMock.mockRejectedValueOnce(timeoutError());
    await expect(
      uploadVideoBytes('https://upload.tiktok.test/x', new Uint8Array(8))
    ).rejects.toThrow(/upload timed out/i);
  });

  it('reports a JSON-call timeout with the path that ran out of time', async () => {
    fetchMock.mockRejectedValueOnce(timeoutError());
    await expect(initInboxDraft('tok', { size: 10 })).rejects.toThrow(/timed out/i);
  });

  it('surfaces the timeout under a recognisable error code', async () => {
    fetchMock.mockRejectedValueOnce(timeoutError());
    await expect(
      uploadVideoBytes('https://upload.tiktok.test/x', new Uint8Array(8))
    ).rejects.toMatchObject({
      code: 'timeout',
    });
  });

  it('still propagates a non-timeout transport error unchanged', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    await expect(
      uploadVideoBytes('https://upload.tiktok.test/x', new Uint8Array(8))
    ).rejects.toThrow('ECONNRESET');
  });
});
