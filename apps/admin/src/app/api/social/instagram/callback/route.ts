import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { publicEnv } from '@/app/config/env.public';
import { recordAuditEvent } from '@/app/features/audit/store';
import { getInstagramConfig } from '@/app/features/social/config';
import { withSuperAdmin } from '@/app/features/social/guard';
import { exchangeCode, exchangeForLongLived, fetchProfile } from '@/app/features/social/instagram';
import { INSTAGRAM_OAUTH_COOKIE, parseStateCookie } from '@/app/features/social/oauthCookie';
import { statesMatch } from '@/app/features/social/pkce';
import { unseal } from '@/app/features/social/secrets';
import { writeInstagramConnection } from '@/app/features/social/store';
import type { InstagramConnection } from '@/app/features/social/types';
import { logger } from '@/app/lib/logger';

function backToPanel(params: Record<string, string>): NextResponse {
  // NOT request.url: on the Amplify SSR runtime that is the internal origin
  // (http://localhost:3000), so redirecting against it sends the browser to a
  // dead local address. appOrigin is the public origin and is already validated
  // to be https in production.
  const url = new URL('/social', publicEnv.appOrigin);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = NextResponse.redirect(url);
  response.cookies.delete({ name: INSTAGRAM_OAUTH_COOKIE, path: '/api/social/instagram' });
  return response;
}

export function GET(request: NextRequest): Promise<Response> {
  return withSuperAdmin(request, async (actor) => {
    const config = getInstagramConfig();
    if (!config) return backToPanel({ error: 'unconfigured' });

    const query = request.nextUrl.searchParams;
    const denied = query.get('error');
    if (denied) return backToPanel({ error: denied });

    const code = query.get('code');
    const state = query.get('state');
    if (!code || !state) return backToPanel({ error: 'missing_code' });

    const sealed = request.cookies.get(INSTAGRAM_OAUTH_COOKIE)?.value;
    const expected = sealed ? parseStateCookie(unseal(sealed, config.tokenKey) ?? '') : null;
    if (!expected || !statesMatch(expected, state)) {
      return backToPanel({ error: 'state_mismatch' });
    }

    try {
      const short = await exchangeCode({
        appId: config.appId,
        appSecret: config.appSecret,
        code,
        redirectUri: config.redirectUri,
      });
      // The short-lived token expires within the hour, so it is never what gets
      // stored - swap it for the 60-day one before writing anything.
      const long = await exchangeForLongLived({
        appSecret: config.appSecret,
        accessToken: short.accessToken,
      });
      const profile = await fetchProfile(long.accessToken).catch(() => ({
        userId: short.userId,
        username: '',
      }));

      const now = Date.now();
      const connection: InstagramConnection = {
        userId: profile.userId || short.userId,
        username: profile.username,
        accessToken: long.accessToken,
        expiresAt: now + long.expiresIn * 1000,
        connectedAt: now,
        connectedByEmail: actor.email,
      };
      await writeInstagramConnection(config, connection);
      await recordAuditEvent({
        action: 'social.connect',
        actorId: actor.userId,
        targetType: 'social_account',
        targetId: `instagram:${connection.userId}`,
        targetLabel: connection.username ? `Instagram @${connection.username}` : 'Instagram',
      });
      return backToPanel({ connected: 'instagram' });
    } catch (error) {
      logger.error('Instagram authorization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return backToPanel({ error: 'exchange_failed' });
    }
  });
}
