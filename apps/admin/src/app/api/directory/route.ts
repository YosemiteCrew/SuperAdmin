import { NextResponse, type NextRequest } from 'next/server';

import { getListedClinics } from '@/app/features/ap/directory';
import { verifyAPToken } from '@/app/features/ap/verify';
import { checkRateLimit } from '@/app/lib/rateLimit';

// PIMS instances cache the directory with a short TTL; five minutes keeps
// revocations and opt-outs reasonably fresh without hammering the registry.
const CACHE_MAX_AGE = 300;

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * The federation clinic directory. License-gated: only verified PIMS
 * instances presenting a valid, non-revoked token may read it - never
 * served unauthenticated.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { allowed, resetMs } = checkRateLimit(`dir:${clientIp(request)}`);
  if (!allowed) {
    return NextResponse.json(
      { message: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((resetMs - Date.now()) / 1000)) } }
    );
  }

  const token = bearerToken(request);
  if (!token) {
    return NextResponse.json({ message: 'License token required' }, { status: 401 });
  }
  const claims = await verifyAPToken(token);
  if (!claims) {
    return NextResponse.json({ message: 'Invalid or revoked license token' }, { status: 401 });
  }

  const clinics = await getListedClinics();
  return NextResponse.json(
    { clinics },
    { headers: { 'Cache-Control': `private, max-age=${CACHE_MAX_AGE}` } }
  );
}
