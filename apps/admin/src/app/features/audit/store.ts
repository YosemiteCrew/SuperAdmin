import 'server-only';

import { prisma } from '@superadmin/database';
import SuperTokens from 'supertokens-node';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { ensureSuperTokensInit } from '@/app/config/backend';
import { logger } from '@/app/lib/logger';

import { buildAuditEvent, isValidAuditEvent } from './audit';
import { GENESIS_HASH, hashAuditEvent, verifyChain } from './chain';
import {
  AUDIT_PAGE_SIZE,
  filterAuditEvents,
  paginate,
  type AuditFilterOptions,
  type Paginated,
} from './filter';
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

type AuditWhere = {
  action?: string;
  at?: { gte?: Date; lte?: Date };
  OR?: Array<{
    actorEmail?: { contains: string; mode: 'insensitive' };
    targetLabel?: { contains: string; mode: 'insensitive' };
    targetId?: { contains: string; mode: 'insensitive' };
  }>;
};

export interface AuditPage extends Paginated<AuditEvent> {
  hasEvents: boolean;
}

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

function buildAuditWhere(options: AuditFilterOptions): AuditWhere {
  const search = (options.search ?? '').trim();
  return {
    ...(options.action && options.action !== 'all' ? { action: options.action } : {}),
    ...(typeof options.from === 'number' || typeof options.to === 'number'
      ? {
          at: {
            ...(typeof options.from === 'number' ? { gte: new Date(options.from) } : {}),
            ...(typeof options.to === 'number' ? { lte: new Date(options.to) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { actorEmail: { contains: search, mode: 'insensitive' as const } },
            { targetLabel: { contains: search, mode: 'insensitive' as const } },
            { targetId: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
}

function emptyAuditPage(hasEvents: boolean): AuditPage {
  return { items: [], page: 1, totalPages: 1, total: 0, hasEvents };
}

async function readLegacyPage(
  options: AuditFilterOptions,
  requestedPage: number
): Promise<AuditPage> {
  const legacy = (await readLegacyLog()).map(toPublicEvent);
  return {
    ...paginate(filterAuditEvents(legacy, options), requestedPage),
    hasEvents: legacy.length > 0,
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

type AuditEventParams = {
  action: AuditAction;
  actorId: string;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel?: string;
};

async function appendAuditEvent(params: AuditEventParams): Promise<void> {
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
}

function reportAuditFailure(params: AuditEventParams, error: unknown) {
  logger.error('Audit write failed; privileged action was not recorded', {
    action: params.action,
    actorId: params.actorId,
    targetId: params.targetId,
    error: error instanceof Error ? error.message : String(error),
  });
}

export async function tryRecordAuditEvent(params: AuditEventParams): Promise<boolean> {
  try {
    await appendAuditEvent(params);
    return true;
  } catch (error) {
    reportAuditFailure(params, error);
    return false;
  }
}

export async function recordAuditEvent(params: AuditEventParams): Promise<void> {
  await tryRecordAuditEvent(params);
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

/** Reads one filtered page from the durable audit table, falling back to legacy metadata only
 * while the table is entirely empty. */
export async function getAuditEventPage(
  options: AuditFilterOptions,
  requestedPage: number
): Promise<AuditPage> {
  try {
    const where = buildAuditWhere(options);
    const total = await prisma.auditEvent.count({ where });
    if (total === 0) {
      const hasDatabaseEvents = Boolean(
        await prisma.auditEvent.findFirst({ select: { id: true } })
      );
      return hasDatabaseEvents ? emptyAuditPage(true) : readLegacyPage(options, requestedPage);
    }

    const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
    const page = Math.min(Math.max(requestedPage, 1), totalPages);
    const rows = await prisma.auditEvent.findMany({
      where,
      orderBy: { seq: 'desc' },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    });
    return {
      items: rows.map(fromRow).map(toPublicEvent),
      page,
      totalPages,
      total,
      hasEvents: true,
    };
  } catch {
    return emptyAuditPage(false);
  }
}

/** Reads every event matching the supplied filters for a complete CSV export. */
export async function getFilteredAuditEvents(options: AuditFilterOptions): Promise<AuditEvent[]> {
  const where = buildAuditWhere(options);
  const rows = await prisma.auditEvent.findMany({ where, orderBy: { seq: 'desc' } });
  if (rows.length > 0) return rows.map(fromRow).map(toPublicEvent);
  if (await prisma.auditEvent.findFirst({ select: { id: true } })) return [];
  return filterAuditEvents((await readLegacyLog()).map(toPublicEvent), options);
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
