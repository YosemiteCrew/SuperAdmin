import type { AuditAction, AuditEvent, AuditEventInput } from './types';

/** How many events the central log retains (most-recent-first). */
export const AUDIT_LOG_LIMIT = 250;

export type AuditSeverity = 'info' | 'warning' | 'danger';

/** Display metadata per action: a short verb-phrase label and a severity. */
export const AUDIT_META: Record<AuditAction, { label: string; severity: AuditSeverity }> = {
  'user.delete': { label: 'Deleted user', severity: 'danger' },
  'user.disable': { label: 'Disabled account', severity: 'warning' },
  'user.enable': { label: 'Re-enabled account', severity: 'info' },
  'user.email_verify': { label: 'Marked email verified for', severity: 'info' },
  'user.email_unverify': { label: 'Marked email unverified for', severity: 'warning' },
  'user.mfa_reset': { label: 'Reset two-factor for', severity: 'warning' },
  'user.session_revoke': { label: 'Revoked a session for', severity: 'info' },
  'user.session_revoke_all': { label: 'Revoked all sessions for', severity: 'warning' },
  'role.grant': { label: 'Granted super-admin to', severity: 'warning' },
  'role.revoke': { label: 'Revoked super-admin from', severity: 'warning' },
  'org.verify': { label: 'Verified business', severity: 'info' },
  'org.suspend': { label: 'Suspended business', severity: 'warning' },
  'org.reactivate': { label: 'Reactivated business', severity: 'info' },
};

const KNOWN_ACTIONS = new Set<string>(Object.keys(AUDIT_META));

function generateId(): string {
  const uuid = globalThis.crypto?.randomUUID;
  if (uuid) return uuid.call(globalThis.crypto);
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Builds a complete event from caller input, filling id + timestamp. */
export function buildAuditEvent(
  input: AuditEventInput,
  opts?: { id?: string; at?: number }
): AuditEvent {
  return {
    id: opts?.id ?? generateId(),
    at: opts?.at ?? Date.now(),
    action: input.action,
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    targetType: input.targetType,
    targetId: input.targetId,
    ...(input.targetLabel ? { targetLabel: input.targetLabel } : {}),
  };
}

/** Prepends the newest event and trims the log to `limit` entries. */
export function prependCapped(
  log: AuditEvent[],
  event: AuditEvent,
  limit = AUDIT_LOG_LIMIT
): AuditEvent[] {
  return [event, ...log].slice(0, limit);
}

/** Type guard for events read back from untrusted stored JSON. */
export function isValidAuditEvent(value: unknown): value is AuditEvent {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.action === 'string' &&
    KNOWN_ACTIONS.has(e.action) &&
    typeof e.actorId === 'string' &&
    typeof e.actorEmail === 'string' &&
    (e.targetType === 'user' || e.targetType === 'organization') &&
    typeof e.targetId === 'string' &&
    typeof e.at === 'number'
  );
}

/** Human-readable phrase for an event, e.g. "Deleted user alice@x.com". */
export function describeAuditEvent(event: AuditEvent): string {
  const label = AUDIT_META[event.action]?.label ?? event.action;
  const target = event.targetLabel?.trim() || event.targetId;
  return `${label} ${target}`;
}
