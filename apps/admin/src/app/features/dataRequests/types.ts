export const REQUEST_TYPES = ['access', 'erasure', 'rectification', 'objection'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_STATUSES = ['received', 'in_progress', 'fulfilled', 'rejected'] as const;
export type DataRequestStatus = (typeof REQUEST_STATUSES)[number];

/**
 * The GDPR response window, in calendar months.
 *
 * Article 12(3) gives one MONTH, not thirty days, and the two are not the same
 * deadline. Periods expressed in months are computed under Regulation (EEC,
 * Euratom) No 1182/71: the period ends on the day of the following month
 * bearing the same number as the day it started, and where no such day exists
 * it ends on that month's last day. Thirty days runs past that for anything
 * received in February or on 29-31 January - the direction that turns the
 * panel's own deadline into a missed statutory one. See computeDueAt.
 */
export const RESPONSE_WINDOW_MONTHS = 1;

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
 *
 * Rounds away from zero, in both directions. A partial day still to run counts
 * as a day left, and a partial day already lost counts as a day over: rounding
 * one way for both would report a request that blew its deadline an hour ago as
 * "Overdue by 0 days", or one due in twelve hours as "Due in 0 days". Statutory
 * deadlines are the point of this table, so neither direction may round toward
 * looking compliant.
 */
export function daysUntilDue(dueAt: Date, now: Date): number {
  const days = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return days < 0 ? Math.floor(days) : Math.ceil(days);
}

export function isOverdue(dueAt: Date, status: DataRequestStatus, now: Date): boolean {
  return isOpenStatus(status) && dueAt.getTime() < now.getTime();
}
