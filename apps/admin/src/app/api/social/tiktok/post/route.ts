import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { outcomeResponse, upstreamFailure } from '@/app/features/social/apiResult';
import { getSocialConfig, missingSocialEnv } from '@/app/features/social/config';
import { isSameOrigin, withSuperAdmin } from '@/app/features/social/guard';
import { parsePostForm } from '@/app/features/social/postRequest';
import { publishVideo } from '@/app/features/social/publisher';
import { getUsableConnection } from '@/app/features/social/store';
import { fetchPublishStatus } from '@/app/features/social/tiktok';

function notConfigured(): NextResponse {
  return NextResponse.json(
    { error: 'TikTok posting is not configured', missing: missingSocialEnv() },
    { status: 503 }
  );
}

/** Posts a video chosen by a signed-in admin in the composer. */
export function POST(request: NextRequest): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Promise.resolve(
      NextResponse.json({ error: 'Cross-origin request refused' }, { status: 403 })
    );
  }

  return withSuperAdmin(request, async (actor) => {
    const config = getSocialConfig();
    if (!config) return notConfigured();

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
        { actorId: actor.userId },
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
  });
}

/** Polls a publish that is already in flight. */
export function GET(request: NextRequest): Promise<Response> {
  return withSuperAdmin(request, async () => {
    const publishId = request.nextUrl.searchParams.get('publishId');
    if (!publishId) {
      return NextResponse.json({ error: 'publishId is required' }, { status: 400 });
    }

    const config = getSocialConfig();
    if (!config) return notConfigured();

    const connection = await getUsableConnection(config);
    if (!connection) {
      return NextResponse.json({ error: 'TikTok is not connected' }, { status: 409 });
    }

    try {
      return NextResponse.json(await fetchPublishStatus(connection.accessToken, publishId));
    } catch (error) {
      return upstreamFailure(error);
    }
  });
}
