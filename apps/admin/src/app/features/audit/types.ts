/** Privileged super-admin actions worth recording in the audit trail. */
export type AuditAction =
  | 'user.delete'
  | 'user.disable'
  | 'user.enable'
  | 'user.email_verify'
  | 'user.email_unverify'
  | 'user.email_change'
  | 'user.mfa_reset'
  | 'user.session_revoke'
  | 'user.session_revoke_all'
  | 'role.grant'
  | 'role.revoke'
  | 'org.verify'
  | 'org.suspend'
  | 'org.reactivate'
  | 'user.data_export'
  | 'invite.create'
  | 'invite.use'
  | 'invite.revoke'
  | 'org.flag_on'
  | 'org.flag_off'
  | 'org.note_add';

/**
 * Every kind of thing an audit event can point at, and the single source of
 * truth for it: {@link AuditTargetType} is derived from this list, and the
 * reader's validator checks against this same list. Adding a target kind to one
 * place and not the other is what silently drops events on readback, so the two
 * cannot be allowed to drift apart. A feature adding a target kind adds it HERE
 * and nowhere else.
 */
export const AUDIT_TARGET_TYPES = ['user', 'organization', 'invite'] as const;

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

/** A single recorded action: who did what, to whom, and when. */
export interface AuditEvent {
  id: string;
  action: AuditAction;
  actorId: string;
  actorEmail: string;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel?: string;
  at: number;
}

/** The fields a caller supplies; id/at/actorEmail are resolved when recording. */
export interface AuditEventInput {
  action: AuditAction;
  actorId: string;
  actorEmail: string;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel?: string;
}

/**
 * The persisted shape of an event: a public {@link AuditEvent} plus its
 * tamper-evidence hash-chain link. `prevHash`/`hash` are optional so events
 * written before the chain existed (and the public type) still validate.
 */
export interface StoredAuditEvent extends AuditEvent {
  /** Hash of the immediately-older event when this one was written. */
  prevHash?: string;
  /** SHA-256 over this event's canonical fields plus `prevHash`. */
  hash?: string;
}

/**
 * Outcome of verifying the audit hash chain (newest-first, tail-tolerant).
 * `ok` means no tampering was detected in the chained region; full integrity is
 * `ok && length === total`. A log with `length < total` has unverified entries
 * (legitimate pre-chain legacy entries, or — if every hash is stripped — an
 * attempt to evade verification), so callers must not treat `ok` alone as proof.
 */
export interface AuditChainStatus {
  /** True when no tampering was detected in the verified (chained) region. */
  ok: boolean;
  /** Number of events verified from the newest before the chain ends/breaks. */
  length: number;
  /** Total stored events; `length < total` means some entries were unverified. */
  total: number;
  /** Id of the event where the chain broke, when `ok` is false. */
  brokenAtId?: string;
  /**
   * Why verification failed: an entry's fields were edited (`content-altered`),
   * an entry is missing or out of order (`link-broken`), the newest entry carries
   * no chain link while older ones do (`head-unchained`), a stored entry is not a
   * well-formed audit record (`invalid-record`), or the log could not be read
   * (`read-failed`).
   */
  reason?: 'content-altered' | 'link-broken' | 'head-unchained' | 'invalid-record' | 'read-failed';
}
