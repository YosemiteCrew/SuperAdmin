const ENDPOINT = '/api/social/instagram/post';
const FINISH_ENDPOINT = '/api/social/instagram/finish';

export interface SubmitReelInput {
  video: File;
  caption: string;
  shareToFeed: boolean;
}

export type SubmitReelResult =
  | { ok: true; state: 'published' }
  // Instagram is still transcoding; the container id finishes it.
  | { ok: true; state: 'processing'; containerId: string }
  | { ok: false; error: string };

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await response.json();
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toResult(payload: Record<string, unknown>, status: number): SubmitReelResult {
  if (status === 202 && typeof payload.containerId === 'string') {
    return { ok: true, state: 'processing', containerId: payload.containerId };
  }
  if (status >= 200 && status < 300) return { ok: true, state: 'published' };
  return {
    ok: false,
    error: typeof payload.error === 'string' ? payload.error : `Request failed (${status})`,
  };
}

export async function submitReel(input: SubmitReelInput): Promise<SubmitReelResult> {
  const form = new FormData();
  form.set('video', input.video);
  form.set('caption', input.caption);
  form.set('shareToFeed', String(input.shareToFeed));
  const response = await fetch(ENDPOINT, { method: 'POST', body: form });
  return toResult(await readJson(response), response.status);
}

/**
 * Finishes a Reel whose container was still transcoding. A POST rather than a
 * GET because it publishes: see the route for why that matters.
 */
export async function finishReel(containerId: string): Promise<SubmitReelResult> {
  const response = await fetch(FINISH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ containerId }),
  });
  return toResult(await readJson(response), response.status);
}
