/**
 * @jest-environment node
 */
import {
  buildAuthorizeUrl,
  createResumableReel,
  exchangeCode,
  exchangeForLongLived,
  fetchContainerStatus,
  fetchProfile,
  fetchPublishingLimit,
  INSTAGRAM_SCOPES,
  InstagramApiError,
  publishContainer,
  refreshLongLived,
  uploadReelBytes,
} from '@/app/features/social/instagram';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response;
}

beforeEach(() => fetchMock.mockReset());

describe('buildAuthorizeUrl', () => {
  it('requests only the basic and publish scopes', () => {
    const url = new URL(
      buildAuthorizeUrl({ appId: '123', redirectUri: 'https://admin/cb', state: 'st' })
    );
    expect(url.origin + url.pathname).toBe('https://www.instagram.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('123');
    expect(url.searchParams.get('scope')).toBe(
      'instagram_business_basic,instagram_business_content_publish'
    );
    expect(url.searchParams.get('state')).toBe('st');
  });

  it('does not ask for inbox or comment access it never uses', () => {
    expect(INSTAGRAM_SCOPES).not.toContain('instagram_business_manage_messages');
    expect(INSTAGRAM_SCOPES).not.toContain('instagram_business_manage_comments');
  });
});

describe('exchangeCode', () => {
  it('posts the code and reads the short-lived token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: 'short', user_id: 17841400000 }));
    const result = await exchangeCode({
      appId: '1',
      appSecret: 's',
      code: 'abc',
      redirectUri: 'https://admin/cb',
    });
    expect(result.accessToken).toBe('short');
    // user_id arrives as a number here and a string from /me; both must work.
    expect(result.userId).toBe('17841400000');
  });

  it('strips the trailing #_ Instagram appends to the redirect', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: 'short' }));
    await exchangeCode({ appId: '1', appSecret: 's', code: 'abc#_', redirectUri: 'r' });
    expect((fetchMock.mock.calls[0][1].body as URLSearchParams).get('code')).toBe('abc');
  });

  it('raises the embedded error object', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { type: 'OAuthException', message: 'bad code' } })
    );
    await expect(
      exchangeCode({ appId: '1', appSecret: 's', code: 'x', redirectUri: 'r' })
    ).rejects.toMatchObject({ code: 'OAuthException' });
  });

  it('raises on a non-ok status with no error body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500));
    await expect(
      exchangeCode({ appId: '1', appSecret: 's', code: 'x', redirectUri: 'r' })
    ).rejects.toBeInstanceOf(InstagramApiError);
  });
});

describe('long-lived tokens', () => {
  it('exchanges a short-lived token for a 60-day one', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: 'long', expires_in: 5_184_000 }));
    const result = await exchangeForLongLived({ appSecret: 's', accessToken: 'short' });
    expect(result.accessToken).toBe('long');
    expect(result.expiresIn).toBe(5_184_000);
    expect(String(fetchMock.mock.calls[0][0])).toContain('grant_type=ig_exchange_token');
  });

  it('refreshes an existing long-lived token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: 'renewed', expires_in: 100 }));
    expect((await refreshLongLived('long')).accessToken).toBe('renewed');
    expect(String(fetchMock.mock.calls[0][0])).toContain('grant_type=ig_refresh_token');
  });
});

describe('fetchProfile', () => {
  it('reads the account id and handle', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ user_id: '178414', username: 'yosemite_crew' }));
    expect(await fetchProfile('t')).toEqual({ userId: '178414', username: 'yosemite_crew' });
  });
});

describe('createResumableReel', () => {
  it('opens a resumable REELS container and returns the upload target', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'container-1', uri: 'https://rupload/x' }));
    const target = await createResumableReel({
      accessToken: 't',
      igUserId: '178414',
      caption: 'vet humour',
      shareToFeed: true,
    });
    expect(target).toEqual({ containerId: 'container-1', uploadUri: 'https://rupload/x' });

    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get('media_type')).toBe('REELS');
    // resumable is what allows raw bytes; the default mode needs a public URL.
    expect(body.get('upload_type')).toBe('resumable');
    expect(body.get('caption')).toBe('vet humour');
    expect(body.get('share_to_feed')).toBe('true');
  });
});

describe('uploadReelBytes', () => {
  it('posts the bytes with the OAuth scheme and a file_size header', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as unknown as Response);
    await uploadReelBytes({
      uploadUri: 'https://rupload/x',
      accessToken: 'tok',
      bytes: new Uint8Array(1234),
    });
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    // Instagram wants OAuth here, not Bearer.
    expect(init.headers.Authorization).toBe('OAuth tok');
    expect(init.headers.offset).toBe('0');
    expect(init.headers.file_size).toBe('1234');
  });

  it('throws when the upload is rejected', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 413 } as unknown as Response);
    await expect(
      uploadReelBytes({ uploadUri: 'u', accessToken: 't', bytes: new Uint8Array(1) })
    ).rejects.toThrow('Upload failed with status 413');
  });
});

describe('fetchContainerStatus', () => {
  it('reads the status code', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status_code: 'FINISHED', status: '' }));
    expect(await fetchContainerStatus({ accessToken: 't', containerId: 'c' })).toEqual({
      statusCode: 'FINISHED',
      error: '',
    });
  });
});

describe('publishContainer', () => {
  it('publishes the container and returns the media id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'media-9' }));
    expect(await publishContainer({ accessToken: 't', igUserId: '1', containerId: 'c' })).toBe(
      'media-9'
    );
    expect((fetchMock.mock.calls[0][1].body as URLSearchParams).get('creation_id')).toBe('c');
  });
});

describe('fetchPublishingLimit', () => {
  it('reads usage against the cap', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [{ quota_usage: 3, config: { quota_total: 50 } }] })
    );
    expect(await fetchPublishingLimit({ accessToken: 't', igUserId: '1' })).toEqual({
      used: 3,
      cap: 50,
    });
  });

  it('defaults the cap when the payload is empty', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    expect(await fetchPublishingLimit({ accessToken: 't', igUserId: '1' })).toEqual({
      used: 0,
      cap: 50,
    });
  });
});

describe('account id validation', () => {
  it('refuses a non-numeric account id rather than interpolating it into the URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'c', uri: 'u' }));
    await expect(
      createResumableReel({
        accessToken: 't',
        igUserId: '../../evil',
        caption: '',
        shareToFeed: true,
      })
    ).rejects.toMatchObject({ code: 'invalid_account_id' });
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(
      publishContainer({ accessToken: 't', igUserId: 'not-numeric', containerId: 'c' })
    ).rejects.toMatchObject({ code: 'invalid_account_id' });

    await expect(fetchPublishingLimit({ accessToken: 't', igUserId: 'x/y' })).rejects.toMatchObject(
      { code: 'invalid_account_id' }
    );
  });
});
