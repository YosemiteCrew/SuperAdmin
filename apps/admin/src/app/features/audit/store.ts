import SuperTokens from 'supertokens-node';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import type { JSONObject } from 'supertokens-node/types';

import { ensureSuperTokensInit } from '@/app/config/backend';
import { logger } from '@/app/lib/logger';

import { buildAuditEvent, isValidAuditEvent, prependCapped } from './audit';
import { GENESIS_HASH, hashAuditEvent, verifyChain } from './chain';
import type {
  AuditAction,
  AuditChainStatus,
  AuditEvent,
  AuditTargetType,
  StoredAuditEvent,
} from './types';

// The audit log is a single append-only record kept in SuperTokens UserMetadata
// under a reserved, non-user key (UserMetadata does not require the id to be a
// real user). This avoids needing a separate datastore for the panel.
const AUDIT_STORE_ID = 'superadmin:audit-log';
const AUDIT_KEY = 'events';

async function readLog(): Promise<StoredAuditEvent[]> {
  const { metadata } = await UserMetadataNode.getUserMetadata(AUDIT_STORE_ID);
  const raw = metadata[AUDIT_KEY];
  return Array.isArray(raw) ? raw.filter(isValidAuditEvent) : [];
}

// Project a stored event to the public shape. The chain fields (prevHash/hash)
// are an internal tamper-evidence detail, so they must never reach a reader's
// output — otherwise they serialise into client component payloads on pages like
// /audit. verifyAuditChain reads the raw stored log directly, not via this.
function toPublicEvent(event: StoredAuditEvent): AuditEvent {
  return {
    id: event.id,
    action: event.action,
    actorId: event.actorId,
    actorEmail: event.actorEmail,
    targetType: event.targetType,
    targetId: event.targetId,
    at: event.at,
    ...(event.targetLabel ? { targetLabel: event.targetLabel } : {}),
  };
}

// Per-process serialisation queue for audit writes. UserMetadata has no
// compare-and-set, so two concurrent read-modify-writes would last-writer-win
// and silently drop an event. Chaining writes here makes each one observe the
// previous, eliminating the lost update within an instance. This is in-process
// only — the cross-instance gap is closed by the durable store tracked in
// SECURITY-PENTEST.md #5.
let writeChain: Promise<void> = Promise.resolve();

function serializeWrite(task: () => Promise<void>): Promise<void> {
  const next = writeChain.then(task, task);
  // Keep the queue tail settled so one failed write never rejects the next.
  writeChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

// Reads the latest log, links the event into the hash chain, and writes it back.
// Must run inside serializeWrite so the read and write are not interleaved.
async function persistEvent(event: AuditEvent): Promise<void> {
  const log = await readLog();
  const prevHash = log[0]?.hash ?? GENESIS_HASH;
  const stored: StoredAuditEvent = { ...event, prevHash, hash: hashAuditEvent(prevHash, event) };
  // Events are plain JSON-serialisable objects; cast to satisfy the metadata
  // JSONObject signature (AuditEvent lacks a structural index signature).
  await UserMetadataNode.updateUserMetadata(AUDIT_STORE_ID, {
    [AUDIT_KEY]: prependCapped(log, stored),
  } as unknown as JSONObject);
}

async function resolveEmail(userId: string): Promise<string> {
  try {
    const user = await SuperTokens.getUser(userId);
    return user?.emails[0] ?? userId;
  } catch {
    return userId;
  }
}

/**
 * Records a privileged action. Best-effort: any failure is swallowed so the
 * underlying action (delete, role change, …) is never blocked by audit logging.
 */
export async function recordAuditEvent(params: {
  action: AuditAction;
  actorId: string;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel?: string;
}): Promise<void> {
  try {
    ensureSuperTokensInit();
    const actorEmail = await resolveEmail(params.actorId);
    // For user targets we can resolve a friendly email label here; callers only
    // pass an explicit label when the target won't exist afterwards (e.g. delete).
    let targetLabel = params.targetLabel;
    if (!targetLabel && params.targetType === 'user') {
      targetLabel = await resolveEmail(params.targetId);
    }
    const event = buildAuditEvent({
      action: params.action,
      actorId: params.actorId,
      actorEmail,
      targetType: params.targetType,
      targetId: params.targetId,
      targetLabel,
    });
    // resolveEmail ran outside the lock (no network I/O while serialized), so a
    // record's chain/log position reflects completion order, not action-start
    // order — acceptable for an audit trail and never loses or forks an event.
    await serializeWrite(() => persistEvent(event));
  } catch (error) {
    // Fail-open: never let audit logging break the action it records. Surface
    // the failure at error level so an external log pipeline can alert on a
    // privileged action that went unrecorded (a real alert transport is the
    // remaining step tracked in SECURITY-PENTEST.md #5).
    logger.error('Audit write failed; privileged action was not recorded', {
      action: params.action,
      actorId: params.actorId,
      targetId: params.targetId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Verifies the tamper-evidence hash chain over the stored log. Returns how many
 * events were verified from the newest, flagging the offending event id if an
 * interior entry was edited or deleted. Legacy (pre-chain) and cap-evicted tail
 * entries are tolerated. Read failures report `ok: false` rather than throwing.
 */
export async function verifyAuditChain(): Promise<AuditChainStatus> {
  try {
    ensureSuperTokensInit();
    return verifyChain(await readLog());
  } catch {
    return { ok: false, length: 0, total: 0, reason: 'read-failed' };
  }
}

/** Most-recent events across the whole panel (for the dashboard feed). */
export async function getRecentAuditEvents(limit = 20): Promise<AuditEvent[]> {
  try {
    ensureSuperTokensInit();
    return (await readLog()).slice(0, limit).map(toPublicEvent);
  } catch {
    return [];
  }
}

/** Most-recent events performed BY an actor (for the "your activity" view). */
export async function getAuditEventsForActor(actorId: string, limit = 20): Promise<AuditEvent[]> {
  try {
    ensureSuperTokensInit();
    return (await readLog())
      .filter((event) => event.actorId === actorId)
      .slice(0, limit)
      .map(toPublicEvent);
  } catch {
    return [];
  }
}

/** Most-recent events affecting a single target (for the detail timeline). */
export async function getAuditEventsForTarget(targetId: string, limit = 20): Promise<AuditEvent[]> {
  try {
    ensureSuperTokensInit();
    return (await readLog())
      .filter((event) => event.targetId === targetId)
      .slice(0, limit)
      .map(toPublicEvent);
  } catch {
    return [];
  }
}
