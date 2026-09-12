import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getCachedStats } from '@/app/lib/cloudUsers';
import { rateLimitResponse } from '@/app/lib/rateLimit';
import { getServerTimestamp } from '@/app/lib/serverTime';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = rateLimitResponse(request, 'cloud-users');
  if (limited) return limited;

  try {
    const stats = await getCachedStats(getServerTimestamp());
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    // Same reasoning as /api/health's `describe()`: log the real error server-side,
    // never let a SuperTokens/network error message reach this unauthenticated response.
    console.error('[cloud-users] failed to load stats', error);
    return NextResponse.json(
      { error: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
