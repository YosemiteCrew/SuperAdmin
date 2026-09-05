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

/**
 * Warm-bone badge tokens per state. Verified reads as completed/success,
 * pending as warn, suspended as danger. All three resolve through theme-aware
 * CSS variables, so the badges follow light and dark unchanged.
 */
export const VERIFICATION_META: Record<VerificationState, { label: string; badgeClass: string }> = {
  pending: {
    label: 'Pending verification',
    badgeClass:
      'bg-[var(--warn-bg)] text-[color:var(--warn-text)] border border-[var(--warn-border)]',
  },
  verified: {
    label: 'Verified',
    badgeClass:
      'bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)] border border-[var(--success)]/40',
  },
  suspended: {
    label: 'Suspended',
    badgeClass:
      'bg-[var(--danger-bg)] text-[color:var(--danger-text)] border border-[var(--danger-border)]',
  },
};
