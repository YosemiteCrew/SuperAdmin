import { NextResponse } from 'next/server';

import { logger } from '@/app/lib/logger';

import { InstagramApiError } from './instagram';
import type { InstagramPublishOutcome } from './instagramPublisher';
import type { PublishOutcome } from './publisher';
import { TikTokApiError } from './tiktok';

/** Maps a completed publish attempt onto the HTTP status it deserves. */
export function outcomeResponse(outcome: PublishOutcome): NextResponse {
  if (outcome.ok) {
    return NextResponse.json({ publishId: outcome.publishId, mode: outcome.mode });
  }
  if (outcome.reason === 'not_connected') {
    return NextResponse.json({ error: 'TikTok is not connected' }, { status: 409 });
  }
  return NextResponse.json(
    { error: 'This account cannot post at that privacy level right now', allowed: outcome.allowed },
    { status: 422 }
  );
}

export function upstreamFailure(error: unknown): NextResponse {
  logger.error('TikTok publish failed', {
    error: error instanceof Error ? error.message : String(error),
  });
  if (error instanceof TikTokApiError) {
    // 502: the request was well-formed and TikTok refused it. The code is passed
    // through because it is the only actionable detail — most importantly
    // `unaudited_client_can_only_post_to_private_accounts`.
    return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
  }
  return NextResponse.json({ error: 'Publishing failed' }, { status: 500 });
}

/** Maps a completed Instagram publish attempt onto the HTTP status it deserves. */
export function instagramOutcomeResponse(outcome: InstagramPublishOutcome): NextResponse {
  if (outcome.ok) {
    return outcome.state === 'published'
      ? NextResponse.json({ state: 'published', mediaId: outcome.mediaId })
      : // 202: the upload succeeded and Instagram is still transcoding. The
        // container id is what finishes it, so it must reach the caller.
        NextResponse.json(
          { state: 'processing', containerId: outcome.containerId },
          { status: 202 }
        );
  }
  if (outcome.reason === 'not_connected') {
    return NextResponse.json({ error: 'Instagram is not connected' }, { status: 409 });
  }
  return NextResponse.json(
    { error: 'Instagram could not process the video', detail: outcome.detail },
    { status: 502 }
  );
}

export function instagramFailure(error: unknown): NextResponse {
  logger.error('Instagram publish failed', {
    error: error instanceof Error ? error.message : String(error),
  });
  if (error instanceof InstagramApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
  }
  return NextResponse.json({ error: 'Publishing failed' }, { status: 500 });
}
