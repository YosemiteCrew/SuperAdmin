import { describeContactRequestStatus } from '../contact/labels';
import { describeDataRequestStatus, describeDataRequestType } from '../dataRequests/types';
import { AUDIT_TARGET_TYPES } from './types';
import type { AuditAction, AuditEvent, AuditEventInput } from './types';

/** How many events the audit screen renders at once (most-recent-first). */
export const AUDIT_LOG_LIMIT = 250;

export type AuditSeverity = 'info' | 'warning' | 'danger';

/**
 * Severity in words, for the readers the coloured dot never reached: assistive
 * technology, and anyone who cannot separate grey, amber and red. One map, so
 * the table and the timeline cannot drift into saying different things about
 * the same event.
 */
export const AUDIT_SEVERITY_LABELS: Readonly<Record<AuditSeverity, string>> = {
  info: 'Info',
  warning: 'Warning',
  danger: 'High risk',
};

/** Display metadata per action: a short verb-phrase label and a severity. */
export const AUDIT_META: Record<AuditAction, { label: string; severity: AuditSeverity }> = {
  'user.delete': { label: 'Deleted user', severity: 'danger' },
  'user.disable': { label: 'Disabled account', severity: 'warning' },
  'user.enable': { label: 'Re-enabled account', severity: 'info' },
  'user.email_verify': { label: 'Marked email verified for', severity: 'info' },
  'user.email_unverify': { label: 'Marked email unverified for', severity: 'warning' },
  'user.email_change': { label: 'Changed own email to', severity: 'warning' },
  'user.mfa_reset': { label: 'Reset two-factor for', severity: 'warning' },
  'user.session_revoke': { label: 'Revoked a session for', severity: 'info' },
  'user.session_revoke_all': { label: 'Revoked all sessions for', severity: 'warning' },
  'role.grant': { label: 'Granted super-admin to', severity: 'warning' },
  'role.revoke': { label: 'Revoked super-admin from', severity: 'warning' },
  'org.verify': { label: 'Verified business', severity: 'info' },
  'org.suspend': { label: 'Suspended business', severity: 'warning' },
  'org.reactivate': { label: 'Reactivated business', severity: 'info' },
  'user.data_export': { label: 'Exported account data for', severity: 'warning' },
  'user.approve': { label: 'Approved account', severity: 'info' },
  'user.reject': { label: 'Rejected account', severity: 'warning' },
  'crm.contact_sync': { label: 'Synced contacts to', severity: 'info' },
  'crm.contact_backfill': { label: 'Backfilled contacts from', severity: 'info' },
  'ap_token.issue': { label: 'Issued AP license token for', severity: 'info' },
  'ap_token.revoke': { label: 'Revoked AP license token for', severity: 'warning' },
  'contact.status_change': { label: 'Changed contact request status to', severity: 'info' },
  // Phrased to be completed by the request type/status rather than the subject:
  // a data-subject's email must not be denormalised into the audit log, since
  // the log has no erasure workflow. See the call sites in privacy/requests.
  'privacy.request_create': { label: 'Logged a data-subject request for', severity: 'info' },
  'privacy.request_update': { label: 'Updated a data-subject request to', severity: 'info' },
  'privacy.subject_export': {
    label: 'Exported the panel record for a data-subject request',
    severity: 'warning',
  },
  'privacy.subject_erase_authorize': {
    label: 'Authorized erasure for a data-subject request',
    severity: 'danger',
  },
  'privacy.subject_erase': {
    label: 'Erased the panel record for a data-subject request',
    severity: 'danger',
  },
  'invite.create': { label: 'Created invite for', severity: 'info' },
  'invite.use': { label: 'Accepted super-admin invite', severity: 'warning' },
  'invite.revoke': { label: 'Revoked invite for', severity: 'info' },
  'org.flag_on': { label: 'Enabled feature flag on', severity: 'info' },
  'org.flag_off': { label: 'Disabled feature flag on', severity: 'info' },
  'org.note_add': { label: 'Added internal note to', severity: 'info' },
  'social.connect': { label: 'Connected social account', severity: 'warning' },
  'social.disconnect': { label: 'Disconnected social account', severity: 'warning' },
  'social.post': { label: 'Published a post to', severity: 'warning' },
};

// Both derived from the declarations above rather than hand-listed, so a new
// action or target kind is registered for readback by construction. A kind the
// reader does not know is dropped from the display path and fails the integrity
// check (see verifyAuditChain), which is why these must never be maintained as a
// second, separate list.
const KNOWN_ACTIONS = new Set<string>(Object.keys(AUDIT_META));
const KNOWN_TARGET_TYPES = new Set<string>(AUDIT_TARGET_TYPES);

function generateId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  // CSPRNG fallback (no Math.random) — the id is only a render/dedup key, but
  // using getRandomValues keeps it collision-resistant and avoids weak-PRNG use.
  const bytes = new Uint8Array(8);
  cryptoApi.getRandomValues(bytes);
  const rand = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${Date.now().toString(36)}-${rand}`;
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
export function prependCapped<T>(log: T[], event: T, limit = AUDIT_LOG_LIMIT): T[] {
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
    typeof e.targetType === 'string' &&
    KNOWN_TARGET_TYPES.has(e.targetType) &&
    typeof e.targetId === 'string' &&
    typeof e.at === 'number'
  );
}

/**
 * What an event points at, in words.
 *
 * Six actions complete their phrase with an enum value recorded as the
 * `targetLabel`, and the words for those enums live with the enums. Resolved
 * HERE, at display time, rather than at the point of writing: events recorded
 * before this existed already hold the raw value, and a hash-chained log with
 * no erasure workflow is not a thing to migrate.
 */
const TARGET_LABEL_RESOLVERS: Partial<Record<AuditAction, (raw: string) => string>> = {
  'contact.status_change': describeContactRequestStatus,
  'privacy.request_update': describeDataRequestStatus,
  // These four complete the phrase with the request TYPE, not its status: see
  // the labels above. `access` and `erasure` are single lowercase words, so
  // they read as ordinary prose in a sentence and were the last raw enum values
  // left on this screen.
  'privacy.request_create': describeDataRequestType,
  'privacy.subject_export': describeDataRequestType,
  'privacy.subject_erase_authorize': describeDataRequestType,
  'privacy.subject_erase': describeDataRequestType,
};

export function auditTargetLabel(event: AuditEvent): string {
  const raw = event.targetLabel?.trim() || event.targetId;
  return TARGET_LABEL_RESOLVERS[event.action]?.(raw) ?? raw;
}

/** Human-readable phrase for an event, e.g. "Deleted user alice@x.com". */
export function describeAuditEvent(event: AuditEvent): string {
  const label = AUDIT_META[event.action]?.label ?? event.action;
  return `${label} ${auditTargetLabel(event)}`;
}
