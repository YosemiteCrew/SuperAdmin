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
  subject: string | null;
  message: string;
  sourceUrl: string | null;
  status: RequestStatus;
  newsletterConsent: boolean;
  consentAt: Date | null;
  createdAt: Date;
}

const PAGE_SIZE = 25;

export async function listContactRequests(params: {
  status?: RequestStatus;
  cursor?: string;
}): Promise<{ requests: ContactRequestView[]; nextCursor: string | null }> {
  const where = params.status ? { status: params.status } : {};
  const rows = await prisma.contactRequest.findMany({
    where,
    include: { lead: true },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE + 1,
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  return {
    requests: page.map((r) => ({
      id: r.id,
      email: r.lead.email,
      name: r.lead.name,
      company: r.lead.company,
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
