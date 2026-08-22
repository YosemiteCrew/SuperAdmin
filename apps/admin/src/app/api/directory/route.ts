import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@superadmin/database';
import { authenticateLicenseToken } from '@/app/features/ap/authenticate';

// The directory changes when a clinic toggles its listing, which is rare, but a
// stale entry is more annoying than a slightly slower read. Instances also keep
// their own ~60s cache, so this is belt-and-braces rather than the main defence.
const CACHE_MAX_AGE = 60;

/**
 * Returns every clinic that has opted into the federation directory.
 *
 * Gated on a valid, unrevoked license token: the directory is a membership
 * benefit of the federation, not public data, and publishing the full list of
 * participating practices to anyone who asks would hand out a ready-made
 * target list.
 *
 * GET /api/directory -> { clinics: [{ actorUri, orgName, instanceHost, handle }] }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticateLicenseToken(request.headers.get('authorization'));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rows = await prisma.aPDirectoryListing.findMany({
    where: { listed: true },
    select: { actorUri: true, orgName: true, instanceHost: true, handle: true },
    orderBy: { orgName: 'asc' },
  });

  return NextResponse.json(
    { clinics: rows },
    {
      headers: {
        // Private: the response is scoped to authenticated callers, so it must
        // never land in a shared cache.
        'Cache-Control': `private, max-age=${CACHE_MAX_AGE}`,
      },
    }
  );
}
