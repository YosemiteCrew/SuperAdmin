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
  const where = params.status ? { status: params.status } : {};
  const query = {
    where,
    include: { lead: true },
    orderBy: { createdAt: 'desc' as const },
    take: PAGE_SIZE + 1,
  };

  let rows = await prisma.contactRequest.findMany({
    ...query,
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
  });

  // A cursor that no longer resolves to a row - a stale bookmark, or a request
  // deleted since the link was shared - is not an error to Prisma: it quietly
  // matches nothing. Left alone that renders "No contact requests here yet"
  // over a table that is not empty, so fall back to the first page. Normal
  // pagination never lands here, since a nextCursor is only emitted when a
  // further row exists.
  if (rows.length === 0 && params.cursor) {
    rows = await prisma.contactRequest.findMany(query);
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

export async function setRequestStatus(params: {
  requestId: string;
  status: RequestStatus;
  actorId: string;
}): Promise<void> {
  await prisma.contactRequest.update({
    where: { id: params.requestId },
    data: { status: params.status, handledBy: params.actorId },
  });
}
