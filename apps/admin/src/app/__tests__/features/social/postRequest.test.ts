import { parsePostForm, type ParsedPost } from '@/app/features/social/postRequest';
import { MAX_VIDEO_BYTES } from '@/app/features/social/limits';

function fakeForm(entries: Record<string, unknown>): FormData {
  const map = new Map(Object.entries(entries));
  return { get: (key: string) => map.get(key) ?? null } as unknown as FormData;
}

function video(overrides: Record<string, unknown> = {}) {
  return {
    size: 1024,
    type: 'video/mp4',
    arrayBuffer: async () => new ArrayBuffer(1024),
    ...overrides,
  };
}

const VALID = {
  video: video(),
  mode: 'direct',
  title: 'when the dog eats the vet bill',
  privacy: 'SELF_ONLY',
};

describe('parsePostForm', () => {
  it('parses a complete direct post', () => {
    const parsed = parsePostForm(
      fakeForm({ ...VALID, disableComment: 'true', disableStitch: 'true' })
    ) as ParsedPost;
    expect(parsed.mode).toBe('direct');
    expect(parsed.options).toEqual({
      title: 'when the dog eats the vet bill',
      privacy: 'SELF_ONLY',
      disableComment: true,
      disableDuet: false,
      disableStitch: true,
      coverMs: 1000,
    });
  });

  it('trims the caption', () => {
    const parsed = parsePostForm(fakeForm({ ...VALID, title: '  spaced  ' })) as ParsedPost;
    expect(parsed.options.title).toBe('spaced');
  });

  it('defaults to a draft for any unrecognised mode', () => {
    const parsed = parsePostForm(fakeForm({ video: video(), mode: 'whatever' })) as ParsedPost;
    expect(parsed.mode).toBe('draft');
  });

  it('allows a draft with no caption or privacy', () => {
    const parsed = parsePostForm(fakeForm({ video: video(), mode: 'draft' })) as ParsedPost;
    expect(parsed.options.privacy).toBe('SELF_ONLY');
    expect(parsed.options.title).toBe('');
  });

  it('rejects a missing or non-file video', () => {
    expect(parsePostForm(fakeForm({}))).toEqual({
      message: 'A video file is required',
      status: 400,
    });
    expect(parsePostForm(fakeForm({ video: 'not-a-file' }))).toMatchObject({ status: 400 });
  });

  it('rejects an empty file', () => {
    expect(parsePostForm(fakeForm({ ...VALID, video: video({ size: 0 }) }))).toMatchObject({
      message: 'The video file is empty',
    });
  });

  it('rejects a file over the size limit with 413', () => {
    const oversized = video({ size: MAX_VIDEO_BYTES + 1 });
    expect(parsePostForm(fakeForm({ ...VALID, video: oversized }))).toMatchObject({ status: 413 });
  });

  it('rejects a non-MP4 content type but tolerates an absent one', () => {
    expect(
      parsePostForm(fakeForm({ ...VALID, video: video({ type: 'video/quicktime' }) }))
    ).toMatchObject({ message: 'Only MP4 video is accepted' });
    expect(parsePostForm(fakeForm({ ...VALID, video: video({ type: '' }) }))).not.toHaveProperty(
      'message'
    );
  });

  it('requires a caption for a direct post', () => {
    expect(parsePostForm(fakeForm({ ...VALID, title: '   ' }))).toMatchObject({
      message: 'A caption is required',
    });
  });

  it('rejects a caption over the TikTok limit', () => {
    expect(parsePostForm(fakeForm({ ...VALID, title: 'x'.repeat(2201) }))).toMatchObject({
      status: 400,
    });
  });

  it('requires a valid privacy level for a direct post', () => {
    expect(parsePostForm(fakeForm({ ...VALID, privacy: 'EVERYONE' }))).toMatchObject({
      message: 'A valid privacy level is required',
    });
  });
});
