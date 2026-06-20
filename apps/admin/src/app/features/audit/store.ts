import SuperTokens from 'supertokens-node';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import type { JSONObject } from 'supertokens-node/types';

import { ensureSuperTokensInit } from '@/app/config/backend';

import { buildAuditEvent, isValidAuditEvent, prependCapped } from './audit';
import type { AuditAction, AuditEvent, AuditTargetType } from './types';

// The audit log is a single append-only record kept in SuperTokens UserMetadata
// under a reserved, non-user key (UserMetadata does not require the id to be a
// real user). This avoids needing a separate datastore for the panel.
const AUDIT_STORE_ID = 'superadmin:audit-log';
const AUDIT_KEY = 'events';

async function readLog(): Promise<AuditEvent[]> {
  const { metadata } = await UserMetadataNode.getUserMetadata(AUDIT_STORE_ID);
  const raw = metadata[AUDIT_KEY];
  return Array.isArray(raw) ? raw.filter(isValidAuditEvent) : [];
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
    const log = await readLog();
    // Events are plain JSON-serialisable objects; cast to satisfy the metadata
    // JSONObject signature (AuditEvent lacks a structural index signature).
    await UserMetadataNode.updateUserMetadata(AUDIT_STORE_ID, {
      [AUDIT_KEY]: prependCapped(log, event),
    } as unknown as JSONObject);
  } catch {
    /* never let audit logging break the action it is recording */
  }
}

/** Most-recent events across the whole panel (for the dashboard feed). */
export async function getRecentAuditEvents(limit = 20): Promise<AuditEvent[]> {
  try {
    ensureSuperTokensInit();
    return (await readLog()).slice(0, limit);
  } catch {
    return [];
  }
}

/** Most-recent events affecting a single target (for the detail timeline). */
export async function getAuditEventsForTarget(targetId: string, limit = 20): Promise<AuditEvent[]> {
  try {
    ensureSuperTokensInit();
    return (await readLog()).filter((event) => event.targetId === targetId).slice(0, limit);
  } catch {
    return [];
  }
}
