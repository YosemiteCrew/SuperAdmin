export type GrantStatus = "active" | "expired" | "revoked";
export type GrantScope =
  | "tenant_data"
  | "financial_data"
  | "user_pii"
  | "full_access";

export type BreakGlassGrant = {
  id: string;
  grantedTo: string;
  grantedToName: string;
  grantedBy: string;
  grantedByName: string;
  reason: string;
  ticketId: string;
  scope: GrantScope;
  status: GrantStatus;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
};
