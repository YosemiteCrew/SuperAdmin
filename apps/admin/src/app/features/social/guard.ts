import 'server-only';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import SuperTokens from 'supertokens-node';
import { withSession } from 'supertokens-node/nextjs';

import { ensureSuperTokensInit, isSuperAdminUser } from '@/app/config/backend';

export interface AdminActor {
  userId: string;
  email: string;
}

/**
 * The same three checks `requireSuperAdmin()` applies to a page — a verified
 * session, the super-admin role, and a completed second factor — expressed as
 * status codes instead of redirects, because an API client cannot follow a
 * redirect to a sign-in page meaningfully.
 */
export function withSuperAdmin(
  request: NextRequest,
  handler: (actor: AdminActor) => Promise<Response>
): Promise<Response> {
  ensureSuperTokensInit();
  return withSession(request, async (error, session) => {
    if (error) return NextResponse.json({ error: 'Session error' }, { status: 500 });
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = session.getAccessTokenPayload() as Record<string, unknown>;
    const mfa = payload['st-mfa'];
    const mfaComplete =
      typeof mfa === 'object' && mfa !== null && (mfa as { v?: boolean }).v === true;
    if (!mfaComplete) {
      return NextResponse.json({ error: 'Second factor required' }, { status: 403 });
    }

    const userId = session.getUserId();
    if (!(await isSuperAdminUser(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await SuperTokens.getUser(userId);
    return handler({ userId, email: user?.emails[0] ?? userId });
  });
}

/**
 * Rejects a state-changing request whose Origin is not this host. SuperTokens'
 * SameSite cookie already blocks the classic cross-site form POST; this is the
 * second, explicit layer so the protection does not rest on cookie policy alone.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  // Same-origin fetches from a browser always send Origin. Its absence means a
  // non-browser client, which cannot be riding a victim's ambient cookies.
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}
