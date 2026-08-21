import type { PostMode } from './limits';
import type { TikTokPrivacyLevel } from './types';

const POST_ENDPOINT = '/api/social/tiktok/post';

export interface SubmitPostInput {
  video: File;
  title: string;
  privacy: TikTokPrivacyLevel;
  mode: PostMode;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
}

export type SubmitPostResult =
  { ok: true; publishId: string; mode: string } | { ok: false; error: string };

function toFormData(input: SubmitPostInput): FormData {
  const form = new FormData();
  form.set('video', input.video);
  form.set('title', input.title);
  form.set('privacy', input.privacy);
  form.set('mode', input.mode);
  form.set('disableComment', String(input.disableComment));
  form.set('disableDuet', String(input.disableDuet));
  form.set('disableStitch', String(input.disableStitch));
  return form;
}

function readError(payload: Record<string, unknown>, status: number): string {
  const message = typeof payload.error === 'string' ? payload.error : `Request failed (${status})`;
  const allowed = payload.allowed;
  if (Array.isArray(allowed) && allowed.length > 0) {
    return `${message}. Allowed right now: ${allowed.join(', ')}.`;
  }
  return message;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await response.json();
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function submitPost(input: SubmitPostInput): Promise<SubmitPostResult> {
  const response = await fetch(POST_ENDPOINT, { method: 'POST', body: toFormData(input) });
  const payload = await readJson(response);
  if (!response.ok) {
    return { ok: false, error: readError(payload, response.status) };
  }
  return {
    ok: true,
    publishId: typeof payload.publishId === 'string' ? payload.publishId : '',
    mode: typeof payload.mode === 'string' ? payload.mode : input.mode,
  };
}

export interface PublishStatusResult {
  status: string;
  failReason: string;
}

export async function fetchStatus(publishId: string): Promise<PublishStatusResult | null> {
  const response = await fetch(`${POST_ENDPOINT}?publishId=${encodeURIComponent(publishId)}`);
  if (!response.ok) return null;
  const payload = await readJson(response);
  return {
    status: typeof payload.status === 'string' ? payload.status : '',
    failReason: typeof payload.failReason === 'string' ? payload.failReason : '',
  };
}
