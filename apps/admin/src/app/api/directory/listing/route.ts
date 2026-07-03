import { NextResponse, type NextRequest } from 'next/server';

import { setListing, validateListingProfile } from '@/app/features/ap/directory';
import { verifyAPToken } from '@/app/features/ap/verify';
import { checkRateLimit } from '@/app/lib/rateLimit';

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
 * Directory opt-in/out. The clinic whose listing changes is derived from the
 * verified token claims ONLY - nothing in the body can select a different
 * org, so a clinic can never list or unlist anyone but itself.
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.listed !== 'boolean') {
    return NextResponse.json({ message: 'listed must be a boolean' }, { status: 400 });
  }

  let profile = null;
  if (body.listed) {
    profile = validateListingProfile(body, claims.instanceDomain);
    if (!profile) {
      return NextResponse.json(
        {
          message:
            'Listing requires actorUri, orgName and handle; actorUri and handle must be on the licensed instance domain',
        },
        { status: 400 }
      );
    }
  }

  await setListing({
    orgId: claims.orgId,
    instanceDomain: claims.instanceDomain,
    listed: body.listed,
    profile,
  });

  return NextResponse.json({ listed: body.listed });
}
