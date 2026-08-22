import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { publicEnv } from '@/app/config/env.public';
import { recordAuditEvent } from '@/app/features/audit/store';
import { getTikTokConfig } from '@/app/features/social/config';
import { withSuperAdmin } from '@/app/features/social/guard';
import { OAUTH_COOKIE, parseOAuthCookie } from '@/app/features/social/oauthCookie';
import { statesMatch } from '@/app/features/social/pkce';
import { unseal } from '@/app/features/social/secrets';
import { writeConnection } from '@/app/features/social/store';
import { exchangeCode, fetchDisplayName } from '@/app/features/social/tiktok';
import type { TikTokConnection } from '@/app/features/social/types';
import { logger } from '@/app/lib/logger';

/** Every exit from this route is a browser navigation back to the Social page. */
function backToPanel(request: NextRequest, params: Record<string, string>): NextResponse {
  // NOT request.url: on the Amplify SSR runtime that is the internal origin
  // (http://localhost:3000), so redirecting against it sends the browser to a
  // dead local address. appOrigin is the public origin and is already validated
  // to be https in production.
  const url = new URL('/social', publicEnv.appOrigin);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = NextResponse.redirect(url);
  // The one-shot PKCE cookie is spent either way — a failed attempt must not
  // leave a replayable verifier behind.
  response.cookies.delete({ name: OAUTH_COOKIE, path: '/api/social/tiktok' });
  return response;
}

export function GET(request: NextRequest): Promise<Response> {
  return withSuperAdmin(request, async (actor) => {
    const config = getTikTokConfig();
    if (!config) return backToPanel(request, { error: 'unconfigured' });

    const query = request.nextUrl.searchParams;
    const denied = query.get('error');
    if (denied) return backToPanel(request, { error: denied });

    const code = query.get('code');
    const state = query.get('state');
    if (!code || !state) return backToPanel(request, { error: 'missing_code' });

    const sealed = request.cookies.get(OAUTH_COOKIE)?.value;
    const payload = sealed ? parseOAuthCookie(unseal(sealed, config.tokenKey) ?? '') : null;
    if (!payload || !statesMatch(payload.state, state)) {
      // A mismatch is either a stale tab or a forged callback; both are refused
      // without exchanging the code.
      return backToPanel(request, { error: 'state_mismatch' });
    }

    try {
      const tokens = await exchangeCode({
        clientKey: config.clientKey,
        clientSecret: config.clientSecret,
        code,
        redirectUri: config.redirectUri,
        codeVerifier: payload.verifier,
      });

      const now = Date.now();
      const displayName = await fetchDisplayName(tokens.accessToken).catch(() => '');
      const connection: TikTokConnection = {
        openId: tokens.openId,
        displayName,
        scope: tokens.scope,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: now + tokens.expiresIn * 1000,
        refreshExpiresAt: now + tokens.refreshExpiresIn * 1000,
        connectedAt: now,
        connectedByEmail: actor.email,
      };
      await writeConnection(config, connection);
      await recordAuditEvent({
        action: 'social.connect',
        actorId: actor.userId,
        targetType: 'social_account',
        targetId: `tiktok:${tokens.openId}`,
        targetLabel: displayName ? `TikTok @${displayName}` : 'TikTok',
      });
      return backToPanel(request, { connected: '1' });
    } catch (error) {
      logger.error('TikTok authorization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return backToPanel(request, { error: 'exchange_failed' });
    }
  });
}
