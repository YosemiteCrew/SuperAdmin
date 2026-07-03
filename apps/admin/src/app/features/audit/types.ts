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
  | 'ap_token.issue'
  | 'ap_token.revoke'
  | 'contact.status_change';

export type AuditTargetType = 'user' | 'organization' | 'ap_token' | 'contact_request';

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
