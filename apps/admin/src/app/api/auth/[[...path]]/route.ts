import { getAppDirRequestHandler } from 'supertokens-node/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { ensureSuperTokensInit } from '../../../config/backend';
import { checkRateLimit } from '../../../lib/rateLimit';

ensureSuperTokensInit();

const handleCall = getAppDirRequestHandler();

const CLEARED = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; HttpOnly';
const SESSION_COOKIES = [
  'sAccessToken',
  'sRefreshToken',
  'sFrontToken',
  'sAntiCsrf',
  'st-last-access-token-update',
];

export async function GET(request: NextRequest) {
  const res = await handleCall(request);
  if (!res.headers.has('Cache-Control')) {
    // This is needed for production deployments with Vercel
    res.headers.set('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
  }
  return res;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  const { allowed, resetMs } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { message: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((resetMs - Date.now()) / 1000)) },
      }
    );
  }
  return handleCall(request);
}

export async function DELETE(request: NextRequest) {
  const res = await handleCall(request);
  const { pathname } = new URL(request.url);

  if (pathname === '/api/auth/signout') {
    const next = new NextResponse(res.body, {
      status: res.status,
      headers: res.headers,
    });
    SESSION_COOKIES.forEach((name) => next.headers.append('Set-Cookie', `${name}=; ${CLEARED}`));
    return next;
  }

  return res;
}

export async function PUT(request: NextRequest) {
  return handleCall(request);
}

export async function PATCH(request: NextRequest) {
  return handleCall(request);
}

export async function HEAD(request: NextRequest) {
  return handleCall(request);
}
