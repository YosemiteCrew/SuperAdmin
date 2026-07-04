import { prisma } from '@superadmin/database';

import {
  isOpenStatus,
  RESPONSE_WINDOW_DAYS,
  type DataRequestStatus,
  type RequestType,
} from './types';

const DAY_MS = 1000 * 60 * 60 * 24;

/** The statutory deadline: receivedAt + the one-month response window. */
export function computeDueAt(receivedAt: Date): Date {
  return new Date(receivedAt.getTime() + RESPONSE_WINDOW_DAYS * DAY_MS);
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
