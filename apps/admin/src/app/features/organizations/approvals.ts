import { filterOrganizations } from './filter';
import type { SuperAdminOrganization } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** An unreadable date sorts last rather than jumping the queue. */
function createdMs(org: SuperAdminOrganization): number {
  const ms = Date.parse(org.createdAt);
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms;
}

/**
 * Businesses waiting for a verification decision, the longest-waiting first.
 * Approval is a decision about a business, never about a person: accounts sign
 * in without one, and a business stays hidden from pet parents until verified.
 */
export function approvalQueue(organizations: SuperAdminOrganization[]): SuperAdminOrganization[] {
  return filterOrganizations(organizations, { state: 'pending' }).sort(
    (a, b) => createdMs(a) - createdMs(b)
  );
}

export function waitingLabel(createdAt: string, now: number): string {
  const ms = Date.parse(createdAt);
  if (Number.isNaN(ms)) return 'Waiting';
  const days = Math.max(0, Math.floor((now - ms) / DAY_MS));
  if (days === 0) return 'Waiting since today';
  return `Waiting ${days} ${days === 1 ? 'day' : 'days'}`;
}
