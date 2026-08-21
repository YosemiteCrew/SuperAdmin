import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getSocialConfig, missingSocialEnv } from '@/app/features/social/config';
import { withSuperAdmin } from '@/app/features/social/guard';
import { OAUTH_COOKIE, OAUTH_COOKIE_MAX_AGE } from '@/app/features/social/oauthCookie';
import { createOAuthState, createPkcePair } from '@/app/features/social/pkce';
import { seal } from '@/app/features/social/secrets';
import { buildAuthorizeUrl } from '@/app/features/social/tiktok';

/**
 * Starts the TikTok authorization flow. The PKCE verifier cannot live in process
 * memory — the panel runs in serverless mode, so the callback may be served by a
 * different instance — so it rides along in a sealed, httpOnly cookie instead.
 */
export function GET(request: NextRequest): Promise<Response> {
  return withSuperAdmin(request, async () => {
    const config = getSocialConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'TikTok posting is not configured', missing: missingSocialEnv() },
        { status: 503 }
      );
    }

    const { verifier, challenge } = createPkcePair();
    const state = createOAuthState();

    const response = NextResponse.redirect(
      buildAuthorizeUrl({
        clientKey: config.clientKey,
        redirectUri: config.redirectUri,
        state,
        codeChallenge: challenge,
      })
    );
    response.cookies.set(OAUTH_COOKIE, seal(JSON.stringify({ state, verifier }), config.tokenKey), {
      httpOnly: true,
      secure: true,
      // Lax, not Strict: the callback arrives as a top-level navigation FROM
      // tiktok.com, and Strict would withhold the cookie on exactly that hop.
      sameSite: 'lax',
      path: '/api/social/tiktok',
      maxAge: OAUTH_COOKIE_MAX_AGE,
    });
    return response;
  });
}
