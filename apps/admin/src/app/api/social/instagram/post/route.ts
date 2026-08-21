import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { instagramFailure, instagramOutcomeResponse } from '@/app/features/social/apiResult';
import { getInstagramConfig, missingInstagramEnv } from '@/app/features/social/config';
import { isSameOrigin, withSuperAdmin } from '@/app/features/social/guard';
import { finishReel, publishReel } from '@/app/features/social/instagramPublisher';
import { parseReelForm } from '@/app/features/social/postRequest';

function notConfigured(): NextResponse {
  return NextResponse.json(
    { error: 'Instagram posting is not configured', missing: missingInstagramEnv() },
    { status: 503 }
  );
}

/** Posts a Reel chosen by a signed-in admin in the composer. */
export function POST(request: NextRequest): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Promise.resolve(
      NextResponse.json({ error: 'Cross-origin request refused' }, { status: 403 })
    );
  }

  return withSuperAdmin(request, async (actor) => {
    const config = getInstagramConfig();
    if (!config) return notConfigured();

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
        { actorId: actor.userId },
        { bytes: new Uint8Array(await parsed.video.arrayBuffer()), options: parsed.options }
      );
      return instagramOutcomeResponse(outcome);
    } catch (error) {
      return instagramFailure(error);
    }
  });
}

/**
 * Finishes a publish whose container was still transcoding when POST returned.
 * Safe to call repeatedly - it publishes only once the container is FINISHED.
 */
export function GET(request: NextRequest): Promise<Response> {
  return withSuperAdmin(request, async (actor) => {
    const containerId = request.nextUrl.searchParams.get('containerId');
    if (!containerId) {
      return NextResponse.json({ error: 'containerId is required' }, { status: 400 });
    }

    const config = getInstagramConfig();
    if (!config) return notConfigured();

    try {
      return instagramOutcomeResponse(
        await finishReel(config, { actorId: actor.userId }, containerId)
      );
    } catch (error) {
      return instagramFailure(error);
    }
  });
}
