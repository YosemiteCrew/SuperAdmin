import 'server-only';

import { prisma } from '@superadmin/database';

import {
  CONSENT_CATEGORIES,
  type ConsentCategory,
  type ConsentSource,
  type ConsentSubmission,
} from './types';

/**
 * Records a consent submission: upserts the subject and appends one immutable
 * event per decision. Events are never updated - the append-only log IS the
 * audit trail.
 *
 * Identity linkage (userId/email) is only ever filled when currently absent,
 * never overwritten: an anonymous subject that later authenticates gets
 * linked, but a subject already bound to an identity cannot be repointed to a
 * different one. This bounds the trust placed in the shared-key caller.
 *
 * TRUST BOUNDARY: the caller is a holder of the shared consent key (the
 * first-party mobile/web apps). The consentId, and the userId/email on the
 * FIRST submission for a new consentId, are caller-asserted - SuperAdmin
 * cannot cryptographically prove ownership from a shared-key POST. The durable
 * hardening (per-app-instance keys and signed identity assertions) is tracked
 * as a follow-up; today the control is key secrecy plus never-overwrite.
 */
export async function recordConsent(input: ConsentSubmission): Promise<void> {
  const subject = await prisma.consentSubject.upsert({
    where: { consentId: input.consentId },
    create: {
      consentId: input.consentId,
      userId: input.userId ?? null,
      email: input.email ?? null,
    },
    // Never touch identity on update — see the fill-only-if-absent writes below.
    update: {},
  });

  // Fill identity only when the column is still null. Filtering on null keeps
  // this atomic (no read-modify-write race) and makes overwriting an existing
  // identity impossible.
  //
  // `consentId: { equals }` for the same reason as the contact intake: updateMany's
  // where accepts FILTERS, so a value that turned out to be an object at runtime
  // would be read as one — `{ not: 'x' }` would stop identifying this subject and
  // start matching every other one, writing an identity onto strangers' rows.
  // parseConsentSubmission already rejects a non-string consentId and is the only
  // path here today, but that makes this function's safety a property of its
  // caller; this makes it a property of the query.
  if (input.userId) {
    await prisma.consentSubject.updateMany({
      where: { consentId: { equals: input.consentId }, userId: null },
      data: { userId: input.userId },
    });
  }
  if (input.email) {
    await prisma.consentSubject.updateMany({
      where: { consentId: { equals: input.consentId }, email: null },
      data: { email: input.email },
    });
  }

  await prisma.consentEvent.createMany({
    data: input.decisions.map((d) => ({
      subjectId: subject.id,
      category: d.category,
      granted: d.granted,
      source: input.source,
      policyVersion: input.policyVersion ?? null,
      userAgent: input.userAgent ?? null,
    })),
  });
}

export type CategoryState = 'granted' | 'withdrawn' | 'unset';

export interface SubjectSummary {
  id: string;
  consentId: string;
  userId: string | null;
  email: string | null;
  updatedAt: Date;
  state: Record<ConsentCategory, CategoryState>;
}

/**
 * Projects a subject row plus its resolved category states into the shape the
 * pages render. Shared by the list and the detail view so the two cannot drift:
 * a column added here shows up in both, rather than in whichever mapping the
 * next change happens to touch.
 */
function toSubjectSummary(
  row: {
    id: string;
    consentId: string;
    userId: string | null;
    email: string | null;
    updatedAt: Date;
  },
  states: Map<string, Record<ConsentCategory, CategoryState>>
): SubjectSummary {
  return {
    id: row.id,
    consentId: row.consentId,
    userId: row.userId,
    email: row.email,
    updatedAt: row.updatedAt,
    state: states.get(row.id) ?? emptyState(),
  };
}

function emptyState(): Record<ConsentCategory, CategoryState> {
  return { analytics: 'unset', marketing: 'unset' };
}

/**
 * Current consent state per category for a set of subjects, derived from the
 * highest-`seq` event in each (subject, category). Because `seq` is a unique,
 * monotonic sequence, each grouped max maps to exactly one event - the true
 * latest decision, with no timestamp-tie ambiguity. Two queries total.
 */
async function currentStateFor(
  subjectIds: string[]
): Promise<Map<string, Record<ConsentCategory, CategoryState>>> {
  const result = new Map<string, Record<ConsentCategory, CategoryState>>();
  if (subjectIds.length === 0) return result;

  const latest = await prisma.consentEvent.groupBy({
    by: ['subjectId', 'category'],
    where: { subjectId: { in: subjectIds } },
    _max: { seq: true },
  });

  const maxSeqs = latest
    .map((l) => l._max.seq)
    .filter((s): s is bigint => s !== null && s !== undefined);
  if (maxSeqs.length === 0) return result;

  const events = await prisma.consentEvent.findMany({ where: { seq: { in: maxSeqs } } });

  for (const ev of events) {
    const state = result.get(ev.subjectId) ?? emptyState();
    if ((CONSENT_CATEGORIES as readonly string[]).includes(ev.category)) {
      state[ev.category as ConsentCategory] = ev.granted ? 'granted' : 'withdrawn';
    }
    result.set(ev.subjectId, state);
  }
  return result;
}

const PAGE_SIZE = 25;

export async function listConsentSubjects(params: {
  search?: string;
  cursor?: string;
}): Promise<{ subjects: SubjectSummary[]; nextCursor: string | null }> {
  const search = params.search?.trim();
  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { consentId: { contains: search } },
        ],
      }
    : {};

  const rows = await prisma.consentSubject.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: PAGE_SIZE + 1,
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const states = await currentStateFor(page.map((r) => r.id));

  return {
    subjects: page.map((r) => toSubjectSummary(r, states)),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export interface ConsentHistoryEntry {
  id: string;
  category: ConsentCategory;
  granted: boolean;
  source: ConsentSource;
  policyVersion: string | null;
  createdAt: Date;
}

export interface SubjectDetail {
  subject: SubjectSummary;
  history: ConsentHistoryEntry[];
}

const HISTORY_LIMIT = 500;

export async function getSubjectDetail(subjectId: string): Promise<SubjectDetail | null> {
  const row = await prisma.consentSubject.findUnique({ where: { id: subjectId } });
  if (!row) return null;

  const [states, events] = await Promise.all([
    currentStateFor([row.id]),
    prisma.consentEvent.findMany({
      where: { subjectId: row.id },
      // seq desc is true reverse-chronological even within a millisecond.
      orderBy: { seq: 'desc' },
      take: HISTORY_LIMIT,
    }),
  ]);

  return {
    subject: toSubjectSummary(row, states),
    history: events.map((e) => ({
      id: e.id,
      category: e.category as ConsentCategory,
      granted: e.granted,
      source: e.source as ConsentSource,
      policyVersion: e.policyVersion,
      createdAt: e.createdAt,
    })),
  };
}
