import { MAX_TITLE_LENGTH, MAX_VIDEO_BYTES, type PostMode } from './limits';
import { isPrivacyLevel } from './tiktok';
import type { TikTokPostOptions } from './types';

/** The subset of File this parser uses, so tests need no DOM File implementation. */
export interface UploadedVideo {
  size: number;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

export interface ParsedPost {
  video: UploadedVideo;
  mode: PostMode;
  options: TikTokPostOptions;
}

export interface ParseFailure {
  message: string;
  status: number;
}

function isUploadedVideo(value: unknown): value is UploadedVideo {
  if (typeof value !== 'object' || value === null) return false;
  const file = value as Record<string, unknown>;
  return (
    typeof file.size === 'number' &&
    typeof file.type === 'string' &&
    typeof file.arrayBuffer === 'function'
  );
}

function checkVideo(value: unknown): ParseFailure | UploadedVideo {
  if (!isUploadedVideo(value)) return { message: 'A video file is required', status: 400 };
  if (value.size === 0) return { message: 'The video file is empty', status: 400 };
  if (value.size > MAX_VIDEO_BYTES) {
    return {
      message: `The video exceeds the ${MAX_VIDEO_BYTES / (1024 * 1024)}MB limit`,
      status: 413,
    };
  }
  // An empty type means the client sent no Content-Type for the part; the bytes
  // are still validated upstream by TikTok, so this only rejects a wrong one.
  if (value.type && value.type !== 'video/mp4') {
    return { message: 'Only MP4 video is accepted', status: 400 };
  }
  return value;
}

/** Validates a multipart post body from either the composer or the scheduler. */
export function parsePostForm(form: FormData): ParsedPost | ParseFailure {
  const video = checkVideo(form.get('video'));
  if ('message' in video) return video;

  // Only an explicit 'direct' publishes to the profile. Anything else — absent,
  // misspelled, unexpected — falls back to the inbox draft, so a malformed
  // request can never put a video on the public feed.
  const mode: PostMode = form.get('mode') === 'direct' ? 'direct' : 'draft';
  const title = String(form.get('title') ?? '').trim();
  if (mode === 'direct' && !title) return { message: 'A caption is required', status: 400 };
  if (title.length > MAX_TITLE_LENGTH) {
    return { message: `The caption exceeds ${MAX_TITLE_LENGTH} characters`, status: 400 };
  }

  const privacy = form.get('privacy');
  if (mode === 'direct' && !isPrivacyLevel(privacy)) {
    return { message: 'A valid privacy level is required', status: 400 };
  }

  return {
    video,
    mode,
    options: {
      title,
      privacy: isPrivacyLevel(privacy) ? privacy : 'SELF_ONLY',
      disableComment: form.get('disableComment') === 'true',
      disableDuet: form.get('disableDuet') === 'true',
      disableStitch: form.get('disableStitch') === 'true',
      coverMs: 1000,
    },
  };
}
