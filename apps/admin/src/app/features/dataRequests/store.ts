import 'server-only';
import { prisma } from '@superadmin/database';

import {
  isOpenStatus,
  RESPONSE_WINDOW_MONTHS,
  type DataRequestStatus,
  type RequestType,
} from './types';

/**
 * The statutory deadline: receivedAt plus the one-month response window,
 * counted as a calendar month rather than as thirty days.
 *
 * The difference is not cosmetic and it is not symmetric. A month is 28, 29, 30
 * or 31 days depending on where it starts, so thirty days lands EARLY for most
 * of the year - harmless - and LATE for a request received in February, or on
 * 29-31 January where the deadline clamps to the end of February. Late is the
 * one direction this must never round: the table above this store exists to
 * stop a statutory breach, and a deadline computed two days after the real one
 * shows "Due in 2 days" while the month has already expired.
 *
 * Month-end clamping follows Regulation (EEC, Euratom) No 1182/71 Article
 * 3(2)(c): 31 January plus one month is 28 February (29 in a leap year), not 2
 * March. JavaScript's own date arithmetic rolls that overflow forward instead,
 * so the clamp has to be explicit.
 *
 * Computed in UTC throughout, matching how these timestamps are stored and how
 * the deployed panel runs, so the deadline does not shift with the server's
 * local zone.
 */
export function computeDueAt(receivedAt: Date): Date {
  const due = new Date(receivedAt.getTime());
  const dayOfMonth = due.getUTCDate();

  due.setUTCMonth(due.getUTCMonth() + RESPONSE_WINDOW_MONTHS);

  // The target month was shorter than the starting one, so setUTCMonth rolled
  // the surplus into the month after. Day 0 is the last day of the month before
  // the one we landed in, which is the clamped date the Regulation asks for.
  if (due.getUTCDate() !== dayOfMonth) {
    due.setUTCDate(0);
  }

  return due;
}

export interface CreateDataRequestInput {
  subjectEmail: string;
  type: RequestType;
  notes?: string;
  /** Injectable for tests; defaults to now. */
  receivedAt?: Date;
}

/**
 * Records a new data-subject request. `dueAt` is derived from `receivedAt` so
 * the statutory clock starts the moment the request was received, not when the
 * row happens to be written.
 */
export async function createDataRequest(input: CreateDataRequestInput) {
  const receivedAt = input.receivedAt ?? new Date();
  return prisma.dataRequest.create({
    data: {
      subjectEmail: input.subjectEmail.trim().toLowerCase(),
      type: input.type,
      notes: input.notes?.trim() || null,
      receivedAt,
      dueAt: computeDueAt(receivedAt),
    },
  });
}

/**
 * All requests as a compliance work-queue: open requests first (soonest
 * deadline / most overdue at the very top), then closed ones. Both groups keep
 * ascending-deadline order. Partitioned in memory so a long-closed request with
 * an old deadline never floats above a live, urgent one.
 */
export async function listDataRequests() {
  const all = await prisma.dataRequest.findMany({ orderBy: { dueAt: 'asc' } });
  const open = all.filter((r) => isOpenStatus(r.status as DataRequestStatus));
  const closed = all.filter((r) => !isOpenStatus(r.status as DataRequestStatus));
  return [...open, ...closed];
}

/** One request by id, for the dossier view. Null when the id does not resolve. */
export async function getDataRequest(id: string) {
  return prisma.dataRequest.findUnique({ where: { id } });
}

export interface UpdateStatusInput {
  id: string;
  status: DataRequestStatus;
  handledBy: string;
  /** Injectable for tests; defaults to now. */
  now?: Date;
}

/**
 * Moves a request to a new status. Fulfilling stamps `fulfilledAt`; reopening a
 * previously-fulfilled request clears it so the timeline never claims a
 * completion that was undone.
 */
export async function updateDataRequestStatus(input: UpdateStatusInput) {
  const now = input.now ?? new Date();
  const fulfilledAt = input.status === 'fulfilled' ? now : null;
  return prisma.dataRequest.update({
    where: { id: input.id },
    data: {
      status: input.status,
      handledBy: input.handledBy,
      fulfilledAt,
    },
  });
}

export interface DataRequestStats {
  total: number;
  open: number;
  overdue: number;
}

/**
 * Headline counts for the page. `overdue` counts only open requests already
 * past their deadline — the ones a controller is legally exposed on.
 */
export async function getDataRequestStats(now: Date = new Date()): Promise<DataRequestStats> {
  const [total, open, overdue] = await Promise.all([
    prisma.dataRequest.count(),
    prisma.dataRequest.count({ where: { status: { in: ['received', 'in_progress'] } } }),
    prisma.dataRequest.count({
      where: { status: { in: ['received', 'in_progress'] }, dueAt: { lt: now } },
    }),
  ]);
  return { total, open, overdue };
}
