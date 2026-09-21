import type { RequestStatus } from './store';

/**
 * Operator-facing words for a contact request's status.
 *
 * Deliberately a sibling of `store.ts` rather than part of it: the store is
 * `server-only`, and these words are needed in client components and in the
 * audit display path. A value import of the store from either would pull the
 * Prisma client into a bundle that must not have it.
 */
export const CONTACT_REQUEST_STATUS_LABELS: Readonly<Record<RequestStatus, string>> = {
  new: 'New',
  in_progress: 'In progress',
  closed: 'Closed',
};

/** The status in words, or the raw value if it is one this panel does not know. */
export function describeContactRequestStatus(status: string): string {
  return (CONTACT_REQUEST_STATUS_LABELS as Record<string, string | undefined>)[status] ?? status;
}
