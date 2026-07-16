import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import type { JSONObject } from 'supertokens-node/types';

import type { InviteRecord } from './types';

const STORE_ID = 'superadmin:invites';
const INVITES_KEY = 'invites';
const MAX_INVITES = 50;
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

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

async function readInvites(): Promise<InviteRecord[]> {
  const { metadata } = await UserMetadataNode.getUserMetadata(STORE_ID);
  const raw = metadata[INVITES_KEY];
  return Array.isArray(raw) ? raw.filter(isInviteRecord) : [];
}

async function writeInvites(invites: InviteRecord[]): Promise<void> {
  await UserMetadataNode.updateUserMetadata(STORE_ID, {
    [INVITES_KEY]: invites,
  } as unknown as JSONObject);
}

export async function getInvites(): Promise<InviteRecord[]> {
  return readInvites();
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
  const invites = await readInvites();
  return invites.find((inv) => tokenMatches(token, inv.token)) ?? null;
}

export async function createInvite(params: {
  email: string;
  createdBy: string;
  createdByEmail: string;
}): Promise<InviteRecord> {
  const existing = await readInvites();
  const now = Date.now();
  const invite: InviteRecord = {
    id: generateId(),
    token: generateId(),
    email: params.email,
    createdBy: params.createdBy,
    createdByEmail: params.createdByEmail,
    createdAt: now,
    expiresAt: now + INVITE_TTL_MS,
  };
  await writeInvites([invite, ...existing].slice(0, MAX_INVITES));
  return invite;
}

export async function markInviteUsed(params: {
  token: string;
  usedBy: string;
  usedByEmail: string;
}): Promise<void> {
  const invites = await readInvites();
  const updated = invites.map((inv) =>
    inv.token === params.token
      ? { ...inv, usedAt: Date.now(), usedBy: params.usedBy, usedByEmail: params.usedByEmail }
      : inv
  );
  await writeInvites(updated);
}

export async function revokeInvite(params: { inviteId: string; revokedBy: string }): Promise<void> {
  const invites = await readInvites();
  const updated = invites.map((inv) =>
    inv.id === params.inviteId
      ? { ...inv, revokedAt: Date.now(), revokedBy: params.revokedBy }
      : inv
  );
  await writeInvites(updated);
}
