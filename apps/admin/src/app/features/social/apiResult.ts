import { NextResponse } from 'next/server';

import { logger } from '@/app/lib/logger';

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
