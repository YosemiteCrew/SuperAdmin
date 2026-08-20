import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@superadmin/database';
import { authenticateLicenseToken } from '@/app/features/ap/authenticate';

const MAX_ORG_NAME = 120;
const MAX_HANDLE = 120;
const MAX_ACTOR_URI = 512;

interface ListingBody {
  listed?: unknown;
  actorUri?: unknown;
  orgName?: unknown;
  handle?: unknown;
}

/**
 * Opts this organisation's instance into, or out of, the federation directory.
 *
 * PUT /api/directory/listing
 * Body: { listed: boolean, actorUri?: string, orgName?: string, handle?: string }
 *
 * The display fields are required to list, optional to unlist. `instanceHost` is
 * never read from the body - it comes from the token's `instanceDomain` claim,
 * and `actorUri` must resolve to that same host. Without that binding any
 * licensed clinic could publish a directory entry pointing at another practice's
 * server, which is directory poisoning with a side of impersonation.
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticateLicenseToken(request.headers.get('authorization'));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { orgId, instanceDomain } = auth.claims;

  let body: ListingBody;
  try {
    body = (await request.json()) as ListingBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.listed !== 'boolean') {
    return NextResponse.json({ error: '`listed` must be a boolean' }, { status: 400 });
  }

  if (!body.listed) {
    // Unlisting must work even for a clinic whose row predates a schema change
    // or was never created, so this is a no-op when there is nothing to hide.
    await prisma.aPDirectoryListing.updateMany({ where: { orgId }, data: { listed: false } });
    return NextResponse.json({ listed: false });
  }

  const orgName = cleanString(body.orgName, MAX_ORG_NAME);
  const handle = cleanString(body.handle, MAX_HANDLE);
  const actorUri = cleanString(body.actorUri, MAX_ACTOR_URI);

  if (!orgName) {
    return NextResponse.json({ error: '`orgName` is required to list' }, { status: 400 });
  }
  if (!handle) {
    return NextResponse.json({ error: '`handle` is required to list' }, { status: 400 });
  }
  if (!actorUri) {
    return NextResponse.json({ error: '`actorUri` is required to list' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(actorUri);
  } catch {
    return NextResponse.json({ error: '`actorUri` is not a valid URL' }, { status: 400 });
  }
  if (parsed.protocol !== 'https:') {
    return NextResponse.json({ error: '`actorUri` must be https' }, { status: 400 });
  }
  // Compare hostname, not host: a port in the URI must not let
  // "clinic.example.com:8443" pass as a different authority than the claim.
  if (parsed.hostname.toLowerCase() !== instanceDomain.toLowerCase()) {
    return NextResponse.json(
      { error: '`actorUri` must be hosted on this instance domain' },
      { status: 403 }
    );
  }

  // actorUri is globally unique, so a clinic re-pointing at a URI another org
  // already published must fail rather than silently steal the row.
  const clash = await prisma.aPDirectoryListing.findUnique({
    where: { actorUri },
    select: { orgId: true },
  });
  if (clash && clash.orgId !== orgId) {
    return NextResponse.json(
      { error: '`actorUri` is already registered to another organisation' },
      { status: 409 }
    );
  }

  await prisma.aPDirectoryListing.upsert({
    where: { orgId },
    create: { orgId, instanceHost: instanceDomain, actorUri, orgName, handle, listed: true },
    update: { instanceHost: instanceDomain, actorUri, orgName, handle, listed: true },
  });

  return NextResponse.json({ listed: true });
}

/**
 * Trims, rejects non-strings, and strips control characters - a directory entry
 * is rendered in other clinics' UIs, so newlines and terminal escapes have no
 * business surviving into it. Returns null when nothing usable is left.
 *
 * Done by codepoint rather than a regex: a control-character class trips
 * `no-control-regex`, and suppressing a lint rule to keep a one-liner is a worse
 * trade than the explicit filter.
 */
function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const stripped = Array.from(value)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code > 0x1f && code !== 0x7f;
    })
    .join('')
    .trim();
  if (!stripped || stripped.length > maxLength) return null;
  return stripped;
}
