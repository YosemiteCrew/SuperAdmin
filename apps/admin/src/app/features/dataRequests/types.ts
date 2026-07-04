export const REQUEST_TYPES = ['access', 'erasure', 'rectification', 'objection'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_STATUSES = ['received', 'in_progress', 'fulfilled', 'rejected'] as const;
export type DataRequestStatus = (typeof REQUEST_STATUSES)[number];

/** The GDPR one-month response window, in days. */
export const RESPONSE_WINDOW_DAYS = 30;

export function isRequestType(v: unknown): v is RequestType {
  return typeof v === 'string' && (REQUEST_TYPES as readonly string[]).includes(v);
}

export function isDataRequestStatus(v: unknown): v is DataRequestStatus {
  return typeof v === 'string' && (REQUEST_STATUSES as readonly string[]).includes(v);
}

/** A request is closed once fulfilled or rejected; only open ones can breach the deadline. */
export function isOpenStatus(status: DataRequestStatus): boolean {
  return status === 'received' || status === 'in_progress';
}

/**
 * Whole days until the deadline (negative when overdue). Open requests past
 * their dueAt are the ones compliance must chase.
 */
export function daysUntilDue(dueAt: Date, now: Date): number {
  const ms = dueAt.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueAt: Date, status: DataRequestStatus, now: Date): boolean {
  return isOpenStatus(status) && dueAt.getTime() < now.getTime();
}
