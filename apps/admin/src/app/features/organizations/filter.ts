import type { SuperAdminOrganization } from './types';
import { type VerificationState, verificationState } from './verification';

export type OrgFilter = VerificationState | 'all';

const VALID_FILTERS: ReadonlySet<OrgFilter> = new Set(['all', 'pending', 'verified', 'suspended']);

/** Coerces an untrusted query-param value into a known filter (defaults to `all`). */
export function parseOrgFilter(value: string | undefined): OrgFilter {
  return VALID_FILTERS.has(value as OrgFilter) ? (value as OrgFilter) : 'all';
}

/** Filters businesses by verification state and a case-insensitive name search. */
export function filterOrganizations(
  organizations: SuperAdminOrganization[],
  options: { state?: OrgFilter; search?: string }
): SuperAdminOrganization[] {
  const state = options.state ?? 'all';
  const search = (options.search ?? '').trim().toLowerCase();
  return organizations.filter((org) => {
    if (state !== 'all' && verificationState(org) !== state) return false;
    if (search && !org.name.toLowerCase().includes(search)) return false;
    return true;
  });
}

/** Counts businesses per verification state (plus a total under `all`). */
export function organizationCounts(
  organizations: SuperAdminOrganization[]
): Record<OrgFilter, number> {
  const counts: Record<OrgFilter, number> = { all: 0, pending: 0, verified: 0, suspended: 0 };
  for (const org of organizations) {
    counts.all += 1;
    counts[verificationState(org)] += 1;
  }
  return counts;
}
