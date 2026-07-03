import 'server-only';

import { prisma } from '@superadmin/database';

/** Public actor-profile fields only - the GET payload must never grow PII. */
export interface DirectoryClinic {
  actorUri: string;
  orgName: string;
  instanceHost: string;
  handle: string;
}

export interface ListingProfile {
  actorUri: string;
  orgName: string;
  handle: string;
}

const MAX_ORG_NAME = 200;
const MAX_FIELD = 500;

/**
 * Validates the caller-supplied public profile against the token's
 * instanceDomain claim. The actor URI and handle must live on the domain the
 * license was issued for, so a clinic can never advertise another instance's
 * actor. Returns null when anything is off; callers respond 400.
 */
export function validateListingProfile(
  body: Record<string, unknown>,
  instanceDomain: string
): ListingProfile | null {
  const { actorUri, orgName, handle } = body;
  if (typeof actorUri !== 'string' || typeof orgName !== 'string' || typeof handle !== 'string') {
    return null;
  }
  if (actorUri.length > MAX_FIELD || handle.length > MAX_FIELD) return null;

  const trimmedName = orgName.trim();
  if (trimmedName.length === 0 || trimmedName.length > MAX_ORG_NAME) return null;

  let parsed: URL;
  try {
    parsed = new URL(actorUri);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.host !== instanceDomain) return null;

  // Handle format: @name@host, host pinned to the licensed instance domain.
  const handleParts = handle.split('@');
  if (handleParts.length !== 3 || handleParts[0] !== '') return null;
  if (handleParts[1].length === 0 || handleParts[2] !== instanceDomain) return null;

  return { actorUri, orgName: trimmedName, handle };
}

export async function setListing(params: {
  orgId: string;
  instanceDomain: string;
  listed: boolean;
  profile: ListingProfile | null;
}): Promise<void> {
  const { orgId, instanceDomain, listed, profile } = params;

  if (listed) {
    // Listing always carries a validated profile (route enforces it).
    if (!profile) throw new Error('profile is required when listing');
    await prisma.directoryListing.upsert({
      where: { orgId },
      create: {
        orgId,
        listed: true,
        actorUri: profile.actorUri,
        orgName: profile.orgName,
        instanceHost: instanceDomain,
        handle: profile.handle,
      },
      update: {
        listed: true,
        actorUri: profile.actorUri,
        orgName: profile.orgName,
        instanceHost: instanceDomain,
        handle: profile.handle,
      },
    });
    return;
  }

  // Unlisting an org that never listed is a no-op, not an error.
  await prisma.directoryListing.updateMany({
    where: { orgId },
    data: { listed: false },
  });
}

/**
 * Every clinic that opted in AND still holds a currently-valid license
 * (non-revoked, non-expired). Revoked or lapsed clinics drop out of the
 * directory automatically without touching their listing row.
 */
export async function getListedClinics(): Promise<DirectoryClinic[]> {
  const now = new Date();
  const [listings, validTokens] = await Promise.all([
    prisma.directoryListing.findMany({ where: { listed: true }, orderBy: { orgName: 'asc' } }),
    prisma.aPLicenseToken.findMany({
      where: { revokedAt: null, expiresAt: { gt: now } },
      select: { orgId: true },
    }),
  ]);

  const validOrgIds = new Set(validTokens.map((t) => t.orgId));
  return listings
    .filter((l) => validOrgIds.has(l.orgId))
    .map((l) => ({
      actorUri: l.actorUri,
      orgName: l.orgName,
      instanceHost: l.instanceHost,
      handle: l.handle,
    }));
}
