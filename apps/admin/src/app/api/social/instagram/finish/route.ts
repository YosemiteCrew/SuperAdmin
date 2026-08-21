import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { instagramFailure, instagramOutcomeResponse } from '@/app/features/social/apiResult';
import { getInstagramConfig, missingInstagramEnv } from '@/app/features/social/config';
import { isSameOrigin, withSuperAdmin } from '@/app/features/social/guard';
import { finishReel } from '@/app/features/social/instagramPublisher';

/**
 * Publishes a container whose transcoding outran the POST that created it.
 *
 * This is a POST, not a GET, and it lives on its own path: finishing a Reel
 * PUBLISHES it, so it is a state-changing action and must not be reachable by
 * anything that follows links - a prefetch, a crawler or a cross-site image tag
 * pointed at a GET would otherwise post to the company account. Same-origin is
 * checked for the same reason.
 */
export function POST(request: NextRequest): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Promise.resolve(
      NextResponse.json({ error: 'Cross-origin request refused' }, { status: 403 })
    );
  }

  return withSuperAdmin(request, async (actor) => {
    const config = getInstagramConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'Instagram posting is not configured', missing: missingInstagramEnv() },
        { status: 503 }
      );
    }

    let containerId: string;
    try {
      const body: unknown = await request.json();
      const value = (body as { containerId?: unknown })?.containerId;
      containerId = typeof value === 'string' ? value.trim() : '';
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!containerId) {
      return NextResponse.json({ error: 'containerId is required' }, { status: 400 });
    }

    try {
      return instagramOutcomeResponse(
        await finishReel(config, { actorId: actor.userId }, containerId)
      );
    } catch (error) {
      return instagramFailure(error);
    }
  });
}
