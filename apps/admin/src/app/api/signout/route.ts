import { NextRequest, NextResponse } from 'next/server';

import { isSameOrigin } from '@/app/features/social/guard';

const isProd = process.env.NODE_ENV === 'production';

type CookieSpec = { name: string; path: string };

const SESSION_COOKIES: CookieSpec[] = [
  { name: 'sAccessToken', path: '/' },
  { name: 'sRefreshToken', path: '/api/auth/session/refresh' },
  { name: 'sFrontToken', path: '/' },
  { name: 'sAntiCsrf', path: '/api/auth' },
  { name: 'st-last-access-token-update', path: '/' },
];

function buildClearedAttrs(path: string): string {
  const parts = [
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    `Path=${path}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}

function buildSignedOutResponse(request: NextRequest): NextResponse {
  const res = NextResponse.redirect(new URL('/auth', request.url));
  for (const cookie of SESSION_COOKIES) {
    res.headers.append('Set-Cookie', `${cookie.name}=; ${buildClearedAttrs(cookie.path)}`);
  }
  return res;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request refused' }, { status: 403 });
  }
  return buildSignedOutResponse(request);
}
