'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { prisma } from '@superadmin/database';

import { requireSuperAdmin } from '@/app/config/backend';
import { serverEnv } from '@/app/config/env.server';
import { recordAuditEvent } from '@/app/features/audit/store';
import { signAPToken } from '@/app/features/ap/sign';
import type { APTokenClaims, APTokenTier } from '@/app/features/ap/types';
import { TOKEN_TTL_SECONDS } from '@/app/features/ap/types';

const VALID_TIERS: APTokenTier[] = ['free', 'pro', 'enterprise'];

function isValidTier(value: unknown): value is APTokenTier {
  return typeof value === 'string' && (VALID_TIERS as string[]).includes(value);
}

function isValidDomain(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 253) return false;
  // Simple hostname check: no scheme, no path, no port.
  return /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/.test(
    value
  );
}

export type IssueResult = { ok: true; token: string } | { ok: false; error: string };

type IssueInput = { orgId: string; instanceDomain: string; tier: APTokenTier };

/**
 * Validates and normalises the issue form. Split out so the action below reads
 * as its four steps (validate, sign, persist, audit) rather than opening with a
 * wall of field checks, and so the rules can be exercised without signing a JWT.
 */
function parseIssueInput(
  formData: FormData
): { ok: true; input: IssueInput } | { ok: false; error: string } {
  const orgId = formData.get('orgId');
  const instanceDomain = formData.get('instanceDomain');
  const tier = formData.get('tier');

  if (typeof orgId !== 'string' || orgId.trim().length === 0) {
    return { ok: false, error: 'orgId is required' };
  }
  if (!isValidDomain(instanceDomain)) {
    return { ok: false, error: 'instanceDomain must be a valid hostname (no scheme, no path)' };
  }
  if (!isValidTier(tier)) {
    return { ok: false, error: 'tier must be one of: free, pro, enterprise' };
  }

  return { ok: true, input: { orgId: orgId.trim(), instanceDomain, tier } };
}

/**
 * Issues a signed RS256 ActivityPub license JWT for `orgId` and persists it.
 * Returns the raw JWT string on success so it can be displayed once to the caller.
 */
export async function issueLicenseTokenAction(formData: FormData): Promise<IssueResult> {
  const { userId: callerId } = await requireSuperAdmin();

  const parsed = parseIssueInput(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { orgId, instanceDomain, tier } = parsed.input;

  const privateKey = serverEnv.apSigningKey;
  if (!privateKey) {
    return { ok: false, error: 'AP signing key not configured' };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const id = randomUUID();
  const keyId = serverEnv.apSigningKeyId;

  const claims: APTokenClaims = {
    iss: 'yosemitecrew.com',
    sub: orgId,
    aud: 'activitypub',
    jti: id,
    iat: nowSec,
    exp: nowSec + TOKEN_TTL_SECONDS,
    orgId,
    instanceDomain: instanceDomain,
    tier,
    keyId,
  };

  const jwt = signAPToken(claims, privateKey);

  await prisma.aPLicenseToken.create({
    data: {
      id,
      orgId: claims.orgId,
      instanceDomain: claims.instanceDomain,
      token: jwt,
      keyId,
      tier,
      issuedAt: new Date(nowSec * 1000),
      expiresAt: new Date(claims.exp * 1000),
    },
  });

  await recordAuditEvent({
    action: 'ap_token.issue',
    actorId: callerId,
    targetType: 'ap_token',
    targetId: id,
    targetLabel: `${instanceDomain} (${orgId})`,
  });

  revalidatePath('/ap');

  return { ok: true, token: jwt };
}

/**
 * Revokes an active AP license token by setting `revokedAt` and `revokedBy`.
 * The revocation is reflected in GET /ap/revoked.json on the next request.
 */
export async function revokeLicenseTokenAction(formData: FormData): Promise<void> {
  const { userId: callerId } = await requireSuperAdmin();

  const tokenId = formData.get('tokenId');
  if (typeof tokenId !== 'string' || tokenId.length === 0) return;

  const existing = await prisma.aPLicenseToken.findUnique({ where: { id: tokenId } });
  if (!existing || existing.revokedAt) return;

  await prisma.aPLicenseToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date(), revokedBy: callerId },
  });

  await recordAuditEvent({
    action: 'ap_token.revoke',
    actorId: callerId,
    targetType: 'ap_token',
    targetId: tokenId,
    targetLabel: `${existing.instanceDomain} (${existing.orgId})`,
  });

  revalidatePath('/ap');
}
