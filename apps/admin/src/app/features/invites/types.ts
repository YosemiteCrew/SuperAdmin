export interface InviteRecord {
  id: string;
  token: string;
  email: string;
  createdBy: string;
  createdByEmail: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
  usedBy?: string;
  usedByEmail?: string;
  revokedAt?: number;
  revokedBy?: string;
}

export type InviteStatus = 'pending' | 'used' | 'expired' | 'revoked';

export function inviteStatus(invite: InviteRecord): InviteStatus {
  if (invite.revokedAt) return 'revoked';
  if (invite.usedAt) return 'used';
  if (Date.now() > invite.expiresAt) return 'expired';
  return 'pending';
}
