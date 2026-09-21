import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

import { prisma } from '@superadmin/database';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import type { InviteRecord } from './types';

const LEGACY_STORE_ID = 'superadmin:invites';
const LEGACY_INVITES_KEY = 'invites';
const IMPORT_MARKER_ID = 'invites';
const MAX_INVITES = 50;
const WRITE_LOCK_ID = 141;
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

type InviteRow = {
  id: string;
  token: string;
  email: string;
  createdBy: string;
  createdByEmail: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  usedBy: string | null;
  usedByEmail: string | null;
  revokedAt: Date | null;
  revokedBy: string | null;
};

function generateId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function isInviteRecord(v: unknown): v is InviteRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.token === 'string' &&
    typeof r.email === 'string' &&
    typeof r.createdBy === 'string' &&
    typeof r.createdByEmail === 'string' &&
    typeof r.createdAt === 'number' &&
    typeof r.expiresAt === 'number'
  );
}

function toInviteRecord(row: InviteRow): InviteRecord {
  return {
    id: row.id,
    token: row.token,
    email: row.email,
    createdBy: row.createdBy,
    createdByEmail: row.createdByEmail,
    createdAt: row.createdAt.getTime(),
    expiresAt: row.expiresAt.getTime(),
    ...(row.usedAt ? { usedAt: row.usedAt.getTime() } : {}),
    ...(row.usedBy ? { usedBy: row.usedBy } : {}),
    ...(row.usedByEmail ? { usedByEmail: row.usedByEmail } : {}),
    ...(row.revokedAt ? { revokedAt: row.revokedAt.getTime() } : {}),
    ...(row.revokedBy ? { revokedBy: row.revokedBy } : {}),
  };
}

/**
 * One-time import of invites that still live only in the legacy UserMetadata
 * JSON array, into the `Invite` table. Idempotent and safe under concurrency:
 * `createMany` + `skipDuplicates` means a row already imported (same id) is
 * skipped rather than duplicated or overwritten, and the marker upsert is a
 * no-op the second time it runs. Mirrors the OrgNote/OrgNoteImport pattern
 * one-for-one; invites were never partitioned by org, so the marker is a
 * single fixed row instead of one per key.
 */
async function importLegacyInvites(): Promise<void> {
  if (
    await prisma.inviteImport.findUnique({ where: { id: IMPORT_MARKER_ID }, select: { id: true } })
  ) {
    return;
  }

  const { metadata } = await UserMetadataNode.getUserMetadata(LEGACY_STORE_ID);
  const raw = metadata[LEGACY_INVITES_KEY];
  const legacy = Array.isArray(raw) ? raw.filter(isInviteRecord) : [];

  if (legacy.length > 0) {
    await prisma.invite.createMany({
      data: legacy.map((inv) => ({
        id: inv.id,
        token: inv.token,
        email: inv.email,
        createdBy: inv.createdBy,
        createdByEmail: inv.createdByEmail,
        createdAt: new Date(inv.createdAt),
        expiresAt: new Date(inv.expiresAt),
        usedAt: inv.usedAt ? new Date(inv.usedAt) : null,
        usedBy: inv.usedBy ?? null,
        usedByEmail: inv.usedByEmail ?? null,
        revokedAt: inv.revokedAt ? new Date(inv.revokedAt) : null,
        revokedBy: inv.revokedBy ?? null,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.inviteImport.upsert({
    where: { id: IMPORT_MARKER_ID },
    create: { id: IMPORT_MARKER_ID },
    update: {},
  });
}

export async function getInvites(): Promise<InviteRecord[]> {
  await importLegacyInvites();
  const rows = await prisma.invite.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: MAX_INVITES,
  });
  return rows.map(toInviteRecord);
}

/**
 * Constant-time token equality. `===` on strings returns at the first differing
 * byte, which leaks how much of a candidate token was correct. Hashing first
 * gives both sides a fixed 32-byte length (timingSafeEqual throws on a length
 * mismatch, and comparing raw tokens would leak length anyway), then the compare
 * itself is constant-time.
 */
function tokenMatches(candidate: string, stored: string): boolean {
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(stored).digest();
  return timingSafeEqual(a, b);
}

export async function getInviteByToken(token: string): Promise<InviteRecord | null> {
  await importLegacyInvites();
  const rows = await prisma.invite.findMany();
  const match = rows.find((row) => tokenMatches(token, row.token));
  return match ? toInviteRecord(match) : null;
}

export async function createInvite(params: {
  email: string;
  createdBy: string;
  createdByEmail: string;
}): Promise<InviteRecord> {
  await importLegacyInvites();
  const row = await prisma.$transaction(async (tx) => {
    // Serialize create + retention as one operation. Without the lock, two
    // creates can both observe no stale tail and commit 51 rows.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${WRITE_LOCK_ID})`;
    const now = Date.now();
    const created = await tx.invite.create({
      data: {
        id: generateId(),
        token: generateId(),
        email: params.email,
        createdBy: params.createdBy,
        createdByEmail: params.createdByEmail,
        createdAt: new Date(now),
        expiresAt: new Date(now + INVITE_TTL_MS),
      },
    });

    const stale = await tx.invite.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: MAX_INVITES,
      select: { id: true },
    });
    if (stale.length > 0) {
      await tx.invite.deleteMany({ where: { id: { in: stale.map(({ id }) => id) } } });
    }
    return created;
  });

  return toInviteRecord(row);
}

/**
 * Marks an invite used. Conditioned on `usedAt`/`revokedAt` both still being
 * null in the same statement that sets them, so a concurrent revoke and a
 * concurrent use cannot overwrite each other: whichever transition's WHERE
 * clause still matches when it reaches Postgres wins, and the other becomes a
 * no-op update (0 rows) instead of a second writer clobbering the first.
 */
export async function markInviteUsed(params: {
  token: string;
  usedBy: string;
  usedByEmail: string;
}): Promise<void> {
  await importLegacyInvites();
  await prisma.invite.updateMany({
    where: { token: { equals: params.token }, usedAt: null, revokedAt: null },
    data: { usedAt: new Date(), usedBy: params.usedBy, usedByEmail: params.usedByEmail },
  });
}

export async function revokeInvite(params: {
  inviteId: string;
  revokedBy: string;
}): Promise<boolean> {
  await importLegacyInvites();
  const result = await prisma.invite.updateMany({
    where: {
      id: { equals: params.inviteId },
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { revokedAt: new Date(), revokedBy: params.revokedBy },
  });
  return result.count > 0;
}
