import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { serverEnv } from '@/app/config/env.server';
import { instagramFailure, instagramOutcomeResponse } from '@/app/features/social/apiResult';
import { getInstagramConfig, missingInstagramEnv } from '@/app/features/social/config';
import { publishReel } from '@/app/features/social/instagramPublisher';
import { parseReelForm } from '@/app/features/social/postRequest';
import { constantTimeEquals } from '@/app/features/social/secrets';

const KEY_HEADER = 'x-scheduler-key';

/** See the TikTok scheduler route: a timer cannot complete the panel's TOTP. */
const SCHEDULER_ACTOR_ID = 'scheduler:social-poster';

export async function POST(request: NextRequest): Promise<Response> {
  const expected = serverEnv.socialSchedulerKey;
  if (!expected) {
    return NextResponse.json({ error: 'Scheduled posting is not enabled' }, { status: 503 });
  }
  if (!constantTimeEquals(expected, request.headers.get(KEY_HEADER) ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getInstagramConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'Instagram posting is not configured', missing: missingInstagramEnv() },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected a multipart form body' }, { status: 400 });
  }

  const parsed = parseReelForm(form);
  if ('message' in parsed) {
    return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  }

  try {
    const outcome = await publishReel(
      config,
      { actorId: SCHEDULER_ACTOR_ID },
      parsed.videoUrl
        ? { videoUrl: parsed.videoUrl, options: parsed.options }
        : { bytes: new Uint8Array(await parsed.video!.arrayBuffer()), options: parsed.options }
    );
    return instagramOutcomeResponse(outcome);
  } catch (error) {
    return instagramFailure(error);
  }
}
