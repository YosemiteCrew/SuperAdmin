import { unstable_cache } from 'next/cache';
import supertokens from 'supertokens-node';
import TotpNode from 'supertokens-node/recipe/totp';

export type { DayBucket } from './types';

// Sample up to this many users for TOTP checks; kept small to limit API calls.
const MFA_SAMPLE_SIZE = 100;

export interface MFAStats {
  /** Number of users in the sample who have at least one verified TOTP device. */
  mfaEnabled: number;
  /** Total users sampled. */
  total: number;
  /** Adoption rate as a 0-100 integer. */
  adoptionPct: number;
}

/**
 * Computes MFA adoption from a sample of the newest users.
 * Result is cached for 5 minutes so each analytics page load
 * does not fire 100 TOTP API calls.
 */
export const getMFAStats = unstable_cache(
  async (): Promise<MFAStats> => {
    const { users } = await supertokens.getUsersNewestFirst({
      tenantId: 'public',
      limit: MFA_SAMPLE_SIZE,
    });
    if (users.length === 0) return { mfaEnabled: 0, total: 0, adoptionPct: 0 };

    const results = await Promise.allSettled(users.map((u) => TotpNode.listDevices(u.id)));
    const mfaEnabled = results.filter(
      (r) =>
        r.status === 'fulfilled' &&
        r.value.status === 'OK' &&
        r.value.devices.some((d) => d.verified)
    ).length;

    return {
      mfaEnabled,
      total: users.length,
      adoptionPct: Math.round((mfaEnabled / users.length) * 100),
    };
  },
  ['analytics-mfa-stats'],
  { revalidate: 300 }
);
