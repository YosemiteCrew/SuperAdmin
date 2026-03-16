export type AuditAction =
  | "login"
  | "logout"
  | "mfa_verify"
  | "lead_status_update"
  | "lead_assign"
  | "business_approve"
  | "business_suspend"
  | "business_deactivate"
  | "ticket_assign"
  | "ticket_status_update"
  | "ticket_priority_update"
  | "team_member_add"
  | "team_member_remove"
  | "break_glass_grant"
  | "break_glass_revoke"
  | "data_export";

export type AuditEntry = {
  id: string;
  actor: string;
  actorName: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
};
