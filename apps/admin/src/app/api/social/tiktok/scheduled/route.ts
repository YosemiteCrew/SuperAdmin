import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { serverEnv } from '@/app/config/env.server';
import { outcomeResponse, upstreamFailure } from '@/app/features/social/apiResult';
import { getTikTokConfig, missingTikTokEnv } from '@/app/features/social/config';
import { parsePostForm } from '@/app/features/social/postRequest';
import { publishVideo } from '@/app/features/social/publisher';
import { constantTimeEquals } from '@/app/features/social/secrets';

/** Header the cron presents. Kept out of the query string so it never lands in logs. */
const KEY_HEADER = 'x-scheduler-key';

/**
 * Audit actor for an unattended post. It is deliberately not a real user id: a
 * scheduled post was nobody's individual action, and attributing it to whichever
 * admin last connected the account would misrepresent the trail.
 */
const SCHEDULER_ACTOR_ID = 'scheduler:social-poster';

/**
 * The unattended posting path. A super-admin session cannot be used here — the
 * panel requires TOTP, which nothing running on a timer can complete — so this
 * endpoint stands alongside it with its own shared-secret credential, exactly as
 * /api/consent and /api/contact do for their machine callers.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const expected = serverEnv.socialSchedulerKey;
  if (!expected) {
    // Refuse rather than fall open: an unset key must never widen access.
    return NextResponse.json({ error: 'Scheduled posting is not enabled' }, { status: 503 });
  }

  const presented = request.headers.get(KEY_HEADER) ?? '';
  if (!constantTimeEquals(expected, presented)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getTikTokConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'TikTok posting is not configured', missing: missingTikTokEnv() },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected a multipart form body' }, { status: 400 });
  }

  const parsed = parsePostForm(form);
  if ('message' in parsed) {
    return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  }

  try {
    const outcome = await publishVideo(
      config,
      { actorId: SCHEDULER_ACTOR_ID },
      {
        bytes: new Uint8Array(await parsed.video.arrayBuffer()),
        mode: parsed.mode,
        options: parsed.options,
      }
    );
    return outcomeResponse(outcome);
  } catch (error) {
    return upstreamFailure(error);
  }
}
