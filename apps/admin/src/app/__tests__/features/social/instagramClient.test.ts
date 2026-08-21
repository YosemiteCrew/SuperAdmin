import {
  finishReel,
  submitReel,
  type SubmitReelInput,
} from '@/app/features/social/instagramClient';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const INPUT: SubmitReelInput = {
  video: { name: 'reel.mp4' } as unknown as File,
  caption: 'vet humour',
  shareToFeed: true,
};

beforeEach(() => fetchMock.mockReset());

describe('submitReel', () => {
  it('posts the video, caption and placement as multipart', async () => {
    fetchMock.mockResolvedValue(response({ state: 'published', mediaId: 'm1' }));
    expect(await submitReel(INPUT)).toEqual({ ok: true, state: 'published' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/social/instagram/post');
    const form = init.body as FormData;
    expect(form.get('caption')).toBe('vet humour');
    expect(form.get('shareToFeed')).toBe('true');
  });

  it('carries the container id through on a 202 so the caller can finish it', async () => {
    fetchMock.mockResolvedValue(response({ state: 'processing', containerId: 'c9' }, 202));
    expect(await submitReel(INPUT)).toEqual({
      ok: true,
      state: 'processing',
      containerId: 'c9',
    });
  });

  it('surfaces the server error', async () => {
    fetchMock.mockResolvedValue(response({ error: 'Instagram is not connected' }, 409));
    expect(await submitReel(INPUT)).toEqual({
      ok: false,
      error: 'Instagram is not connected',
    });
  });

  it('falls back to the status code and tolerates a non-JSON body', async () => {
    fetchMock.mockResolvedValue(response({}, 500));
    expect(await submitReel(INPUT)).toEqual({ ok: false, error: 'Request failed (500)' });

    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);
    expect(await submitReel(INPUT)).toEqual({ ok: false, error: 'Request failed (502)' });
  });

  it('treats a 202 without a container id as published rather than losing the result', async () => {
    fetchMock.mockResolvedValue(response({}, 202));
    expect(await submitReel(INPUT)).toEqual({ ok: true, state: 'published' });
  });
});

describe('finishReel', () => {
  it('encodes the container id into the query', async () => {
    fetchMock.mockResolvedValue(response({ state: 'published' }));
    expect(await finishReel('c 9/x')).toEqual({ ok: true, state: 'published' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/social/instagram/post?containerId=c%209%2Fx');
  });

  it('reports still-processing', async () => {
    fetchMock.mockResolvedValue(response({ state: 'processing', containerId: 'c9' }, 202));
    expect(await finishReel('c9')).toMatchObject({ state: 'processing' });
  });
});
