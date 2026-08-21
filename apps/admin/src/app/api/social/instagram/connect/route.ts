import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getInstagramConfig, missingInstagramEnv } from '@/app/features/social/config';
import { withSuperAdmin } from '@/app/features/social/guard';
import { buildAuthorizeUrl } from '@/app/features/social/instagram';
import { INSTAGRAM_OAUTH_COOKIE, OAUTH_COOKIE_MAX_AGE } from '@/app/features/social/oauthCookie';
import { createOAuthState } from '@/app/features/social/pkce';
import { seal } from '@/app/features/social/secrets';

/** Starts the Instagram business-login flow. */
export function GET(request: NextRequest): Promise<Response> {
  return withSuperAdmin(request, async () => {
    const config = getInstagramConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'Instagram posting is not configured', missing: missingInstagramEnv() },
        { status: 503 }
      );
    }

    const state = createOAuthState();
    const response = NextResponse.redirect(
      buildAuthorizeUrl({ appId: config.appId, redirectUri: config.redirectUri, state })
    );
    response.cookies.set(INSTAGRAM_OAUTH_COOKIE, seal(JSON.stringify({ state }), config.tokenKey), {
      httpOnly: true,
      secure: true,
      // Lax, not Strict: the callback is a top-level navigation from instagram.com.
      sameSite: 'lax',
      path: '/api/social/instagram',
      maxAge: OAUTH_COOKIE_MAX_AGE,
    });
    return response;
  });
}
