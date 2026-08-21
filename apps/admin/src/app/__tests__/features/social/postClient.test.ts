import { fetchStatus, submitPost, type SubmitPostInput } from '@/app/features/social/postClient';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response;
}

const INPUT: SubmitPostInput = {
  video: { name: 'clip.mp4' } as unknown as File,
  title: 'caption',
  privacy: 'SELF_ONLY',
  mode: 'draft',
  disableComment: true,
  disableDuet: false,
  disableStitch: false,
};

beforeEach(() => fetchMock.mockReset());

describe('submitPost', () => {
  it('posts every field as multipart form data', async () => {
    fetchMock.mockResolvedValue(response({ publishId: 'pid', mode: 'draft' }));
    const result = await submitPost(INPUT);
    expect(result).toEqual({ ok: true, publishId: 'pid', mode: 'draft' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/social/tiktok/post');
    expect(init.method).toBe('POST');
    const form = init.body as FormData;
    expect(form.get('title')).toBe('caption');
    expect(form.get('mode')).toBe('draft');
    expect(form.get('disableComment')).toBe('true');
    expect(form.get('disableDuet')).toBe('false');
  });

  it('surfaces the server error message', async () => {
    fetchMock.mockResolvedValue(response({ error: 'TikTok is not connected' }, false, 409));
    expect(await submitPost(INPUT)).toEqual({
      ok: false,
      error: 'TikTok is not connected',
    });
  });

  it('appends the allowed privacy levels when the server lists them', async () => {
    fetchMock.mockResolvedValue(
      response({ error: 'Cannot post that widely', allowed: ['SELF_ONLY'] }, false, 422)
    );
    const result = await submitPost(INPUT);
    expect(result).toEqual({
      ok: false,
      error: 'Cannot post that widely. Allowed right now: SELF_ONLY.',
    });
  });

  it('falls back to the status code when the body has no message', async () => {
    fetchMock.mockResolvedValue(response({}, false, 500));
    expect(await submitPost(INPUT)).toEqual({ ok: false, error: 'Request failed (500)' });
  });

  it('tolerates a non-JSON error body', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);
    expect(await submitPost(INPUT)).toEqual({ ok: false, error: 'Request failed (502)' });
  });

  it('falls back to the requested mode when the response omits it', async () => {
    fetchMock.mockResolvedValue(response({}));
    expect(await submitPost(INPUT)).toEqual({ ok: true, publishId: '', mode: 'draft' });
  });
});

describe('fetchStatus', () => {
  it('encodes the publish id into the query', async () => {
    fetchMock.mockResolvedValue(response({ status: 'PROCESSING', failReason: '' }));
    expect(await fetchStatus('a b/c')).toEqual({ status: 'PROCESSING', failReason: '' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/social/tiktok/post?publishId=a%20b%2Fc');
  });

  it('returns null when the request fails', async () => {
    fetchMock.mockResolvedValue(response({}, false, 409));
    expect(await fetchStatus('pid')).toBeNull();
  });

  it('defaults missing fields', async () => {
    fetchMock.mockResolvedValue(response({}));
    expect(await fetchStatus('pid')).toEqual({ status: '', failReason: '' });
  });
});
