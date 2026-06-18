import type { SuperAdminOrganization } from './types';

export type VerificationState = 'pending' | 'verified' | 'suspended';

/**
 * Derives the super-admin-facing verification state from the raw business flags.
 * Suspension (inactive) takes precedence over verification, since a suspended
 * business should never read as "verified" regardless of its verification flag.
 */
export function verificationState(
  org: Pick<SuperAdminOrganization, 'isVerified' | 'isActive'>
): VerificationState {
  if (!org.isActive) return 'suspended';
  return org.isVerified ? 'verified' : 'pending';
}

export const VERIFICATION_META: Record<VerificationState, { label: string; badgeClass: string }> = {
  pending: { label: 'Pending verification', badgeClass: 'bg-warning-100 text-warning-800' },
  verified: { label: 'Verified', badgeClass: 'bg-success-100 text-success-700' },
  suspended: { label: 'Suspended', badgeClass: 'bg-danger-100 text-danger-600' },
};
