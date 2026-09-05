import 'server-only';

import { prisma } from '@superadmin/database';
import SuperTokens from 'supertokens-node';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { ensureSuperTokensInit } from '@/app/config/backend';
import { logger } from '@/app/lib/logger';

import { buildAuditEvent, isValidAuditEvent } from './audit';
import { GENESIS_HASH, hashAuditEvent, verifyChain } from './chain';
import type {
  AuditAction,
  AuditChainStatus,
  AuditEvent,
  AuditTargetType,
  StoredAuditEvent,
} from './types';

const WRITE_LOCK_ID = 140;
const LEGACY_STORE_ID = 'superadmin:audit-log';

type AuditRow = {
  id: string;
  action: string;
  actorId: string;
  actorEmail: string;
  targetType: string;
  targetId: string;
  targetLabel: string | null;
  at: Date;
  prevHash: string;
  hash: string;
};

function fromRow(row: AuditRow): StoredAuditEvent {
  return {
    id: row.id,
    action: row.action as AuditAction,
    actorId: row.actorId,
    actorEmail: row.actorEmail,
    targetType: row.targetType as AuditTargetType,
    targetId: row.targetId,
    ...(row.targetLabel ? { targetLabel: row.targetLabel } : {}),
    at: row.at.getTime(),
    prevHash: row.prevHash,
    hash: row.hash,
  };
}

function toPublicEvent(event: StoredAuditEvent): AuditEvent {
  return {
    id: event.id,
    action: event.action,
    actorId: event.actorId,
    actorEmail: event.actorEmail,
    targetType: event.targetType,
    targetId: event.targetId,
    ...(event.targetLabel ? { targetLabel: event.targetLabel } : {}),
    at: event.at,
  };
}

async function readLog(where?: { actorId?: string; targetId?: string }, limit?: number) {
  const rows = await prisma.auditEvent.findMany({
    ...(where ? { where } : {}),
    orderBy: { seq: 'desc' },
    ...(limit === undefined ? {} : { take: limit }),
  });
  if (rows.length > 0) return rows.map(fromRow);
  if (where && (await prisma.auditEvent.findFirst({ select: { id: true } }))) return [];

  const legacy = await readLegacyLog();
  const filtered = legacy.filter(
    (event) =>
      (!where?.actorId || event.actorId === where.actorId) &&
      (!where?.targetId || event.targetId === where.targetId)
  );
  return filtered.slice(0, limit);
}

async function readLegacyLog(): Promise<StoredAuditEvent[]> {
  return (await readLegacyEvents()).filter(isValidAuditEvent);
}

async function readLegacyEvents(): Promise<unknown[]> {
  ensureSuperTokensInit();
  const { metadata } = await UserMetadataNode.getUserMetadata(LEGACY_STORE_ID);
  const events = metadata.events;
  return Array.isArray(events) ? events : [];
}

function verifyStoredEvents(events: unknown[]): AuditChainStatus {
  const invalidAt = events.findIndex((event) => !isValidAuditEvent(event));
  if (invalidAt !== -1) {
    const invalid = events[invalidAt];
    return {
      ok: false,
      length: 0,
      total: events.length,
      ...(typeof invalid === 'object' && invalid !== null && 'id' in invalid
        ? { brokenAtId: String(invalid.id) }
        : {}),
      reason: 'invalid-record',
    };
  }
  return verifyChain(events as StoredAuditEvent[]);
}

function rechainLegacy(events: StoredAuditEvent[]) {
  let prevHash = GENESIS_HASH;
  return [...events].reverse().map((event) => {
    const stored = { ...event, prevHash, hash: hashAuditEvent(prevHash, event) };
    prevHash = stored.hash;
    return { ...stored, at: new Date(stored.at) };
  });
}

async function readVerifiedLegacy() {
  const events = await readLegacyEvents();
  const status = verifyStoredEvents(events);
  if (!status.ok) throw new Error(`Legacy audit chain failed verification: ${status.reason}`);
  return rechainLegacy(events as StoredAuditEvent[]);
}

async function resolveEmail(userId: string): Promise<string> {
  try {
    const user = await SuperTokens.getUser(userId);
    return user?.emails[0] ?? userId;
  } catch {
    return userId;
  }
}

export async function recordAuditEvent(params: {
  action: AuditAction;
  actorId: string;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel?: string;
}): Promise<void> {
  try {
    const actorEmail = await resolveEmail(params.actorId);
    let targetLabel = params.targetLabel;
    if (!targetLabel && params.targetType === 'user') {
      targetLabel = await resolveEmail(params.targetId);
    }
    const event = buildAuditEvent({ ...params, actorEmail, targetLabel });

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${WRITE_LOCK_ID})`;
      const previous = await tx.auditEvent.findFirst({ orderBy: { seq: 'desc' } });
      let prevHash = previous?.hash;
      if (!prevHash) {
        const imported = await readVerifiedLegacy();
        if (imported.length > 0) {
          await tx.auditEvent.createMany({ data: imported });
          prevHash = imported.at(-1)?.hash;
        }
      }
      prevHash ??= GENESIS_HASH;
      await tx.auditEvent.create({
        data: {
          ...event,
          at: new Date(event.at),
          prevHash,
          hash: hashAuditEvent(prevHash, event),
        },
      });
    });
  } catch (error) {
    logger.error('Audit write failed; privileged action was not recorded', {
      action: params.action,
      actorId: params.actorId,
      targetId: params.targetId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function verifyAuditChain(): Promise<AuditChainStatus> {
  try {
    const rows = await prisma.auditEvent.findMany({ orderBy: { seq: 'desc' } });
    return verifyStoredEvents(rows.length > 0 ? rows.map(fromRow) : await readLegacyEvents());
  } catch {
    return { ok: false, length: 0, total: 0, reason: 'read-failed' };
  }
}

export async function getRecentAuditEvents(limit = 20): Promise<AuditEvent[]> {
  try {
    return (await readLog(undefined, limit)).map(toPublicEvent);
  } catch {
    return [];
  }
}

export async function getAuditEventsForActor(actorId: string, limit = 20): Promise<AuditEvent[]> {
  try {
    return (await readLog({ actorId }, limit)).map(toPublicEvent);
  } catch {
    return [];
  }
}

export async function getAuditEventsForTarget(targetId: string, limit = 20): Promise<AuditEvent[]> {
  try {
    return (await readLog({ targetId }, limit)).map(toPublicEvent);
  } catch {
    return [];
  }
}

export async function readAuditEventsInvolving(
  userId: string,
  limit: number
): Promise<{ asTarget: AuditEvent[]; asActor: AuditEvent[] }> {
  const [asTarget, asActor] = await Promise.all([
    readLog({ targetId: userId }, limit),
    readLog({ actorId: userId }, limit),
  ]);
  return { asTarget: asTarget.map(toPublicEvent), asActor: asActor.map(toPublicEvent) };
}
