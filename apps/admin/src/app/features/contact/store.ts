import 'server-only';

import { prisma } from '@superadmin/database';

export type RequestStatus = 'new' | 'in_progress' | 'closed';

export const REQUEST_STATUSES: RequestStatus[] = ['new', 'in_progress', 'closed'];

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === 'string' && (REQUEST_STATUSES as string[]).includes(value);
}

export interface ContactRequestView {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  sourceUrl: string | null;
  status: RequestStatus;
  newsletterConsent: boolean;
  consentAt: Date | null;
  createdAt: Date;
}

const PAGE_SIZE = 25;

/**
 * Narrows an untrusted `cursor` search param to something Prisma will accept.
 *
 * Next parses a repeated query param into an array, so `?cursor=a&cursor=b`
 * yields `['a','b']`. Prisma rejects a non-string cursor with a
 * PrismaClientValidationError rather than ignoring it, and nothing on the read
 * path catches that, so the whole route falls to the error boundary - which in
 * production shows only a digest. Anything that is not a non-empty string
 * means "no cursor", i.e. the first page.
 */
export function normalizeCursor(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export async function listContactRequests(params: {
  status?: RequestStatus;
  cursor?: string;
}): Promise<{ requests: ContactRequestView[]; nextCursor: string | null }> {
  const statusFilter = params.status ? { status: params.status } : {};

  // The cursor row is looked up WITHOUT the status filter. Prisma's own
  // `cursor`/`skip: 1` pagination assumes the cursor row is the first row of
  // the filtered result, so when a second admin moves that row out of the
  // filter - which `setRequestStatus` exists to support, and which revalidates
  // this page - the filter drops it and `skip: 1` eats the first real row of
  // the next page instead. A request then disappears for the operator who is
  // already past page one. `createdAt` never changes after insert, so
  // resolving it by id is stable whatever the row's status has become.
  const cursorRow = params.cursor
    ? await prisma.contactRequest.findUnique({
        where: { id: params.cursor },
        select: { createdAt: true },
      })
    : null;
  const cursorFilter = cursorRow
    ? {
        OR: [
          { createdAt: { lt: cursorRow.createdAt } },
          { createdAt: cursorRow.createdAt, id: { lt: params.cursor } },
        ],
      }
    : {};

  const query = {
    where: { AND: [statusFilter, cursorFilter] },
    include: { lead: true },
    // `id` is the tiebreaker, and it is load bearing rather than cosmetic.
    // Ordering by a non-unique column alone leaves the order among tied rows
    // undefined, and undefined means plan-dependent: with every row sharing
    // one `createdAt`, a sequential scan and an index scan return disjoint
    // sets of "the five newest". The keyset bound above pairs with it -
    // `createdAt` strictly older, OR the same instant and a lower id - so the
    // boundary between two pages is decided by the query and not by the plan.
    // Contact requests arrive in bursts - a mirror replaying a backlog writes
    // many rows in one millisecond - so ties are the normal case, not an
    // exotic one, and a dropped lead is invisible: the page simply does not
    // contain it.
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: PAGE_SIZE + 1,
  };

  let rows = await prisma.contactRequest.findMany(query);

  // A cursor that resolved but yields nothing is a bookmark past the end of
  // the current result - a shared link, or rows re-filed since. Left alone it
  // renders "No contact requests here yet" over a table that is not empty, so
  // fall back to the first page. A cursor that resolved to no row at all does
  // not reach here: its `cursorFilter` is already empty, so the query above
  // IS the first page and re-running it would only cost a second round trip.
  if (rows.length === 0 && cursorRow) {
    rows = await prisma.contactRequest.findMany({ ...query, where: statusFilter });
  }

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  return {
    requests: page.map((r) => ({
      id: r.id,
      email: r.lead.email,
      name: r.lead.name,
      company: r.lead.company,
      phone: r.lead.phone,
      subject: r.subject,
      message: r.message,
      sourceUrl: r.sourceUrl,
      status: (isRequestStatus(r.status) ? r.status : 'new') as RequestStatus,
      newsletterConsent: r.lead.newsletterConsent,
      consentAt: r.lead.consentAt,
      createdAt: r.createdAt,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export async function countRequestsByStatus(): Promise<Record<RequestStatus, number>> {
  const grouped = await prisma.contactRequest.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const counts: Record<RequestStatus, number> = { new: 0, in_progress: 0, closed: 0 };
  for (const g of grouped) {
    if (isRequestStatus(g.status)) counts[g.status] = g._count._all;
  }
  return counts;
}

export type SetStatusResult = { ok: true } | { ok: false; currentStatus: RequestStatus | null };

/**
 * Applies a status change only when the row's persisted status still matches
 * `expectedStatus` - the value the operator's page showed before they picked a
 * new one. Both conditions live in the same `updateMany` WHERE clause, so the
 * check and the write are one statement: a second admin's change landing
 * between page-load and submit makes this a no-op instead of a silent
 * overwrite.
 */
export async function setRequestStatus(params: {
  requestId: string;
  status: RequestStatus;
  expectedStatus: RequestStatus;
  actorId: string;
}): Promise<SetStatusResult> {
  const { count } = await prisma.contactRequest.updateMany({
    where: { id: { equals: params.requestId }, status: { equals: params.expectedStatus } },
    data: { status: params.status, handledBy: params.actorId },
  });
  if (count > 0) return { ok: true };

  const current = await prisma.contactRequest.findUnique({ where: { id: params.requestId } });
  const currentStatus = current && isRequestStatus(current.status) ? current.status : null;
  return { ok: false, currentStatus };
}
