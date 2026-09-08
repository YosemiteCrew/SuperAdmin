import 'server-only';

import { prisma } from '@superadmin/database';

import { section } from '@/app/lib/exportSection';

/**
 * A contact-form submission as disclosed to the data subject. `handledBy` is
 * deliberately absent: it identifies the super-admin who actioned the message,
 * who is a third party under GDPR Art. 15(4) — the same redaction the account
 * export already applies to audit entries.
 */
export interface SubjectContactRequest {
  id: string;
  subject: string | null;
  message: string;
  sourceUrl: string | null;
  status: string;
  createdAt: string;
}

/** The marketing-lead record for the address, with every submission under it. */
export interface SubjectLead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  newsletterConsent: boolean;
  consentAt: string | null;
  consentSource: string | null;
  createdAt: string;
  requests: SubjectContactRequest[];
}

/** One consent decision from the ledger. `userAgent` is the subject's own. */
export interface SubjectConsentEvent {
  category: string;
  granted: boolean;
  source: string;
  policyVersion: string | null;
  userAgent: string | null;
  at: string;
}

/**
 * A consent subject linked to this address. There can be several: the ledger is
 * anonymous-first and keyed by the id captured at the cookie banner, so one
 * person acquires a new subject row per browser or device that later
 * authenticates.
 */
export interface SubjectConsentRecord {
  id: string;
  consentId: string;
  userId: string | null;
  createdAt: string;
  events: SubjectConsentEvent[];
}

/**
 * An earlier rights request from the same address. `notes` is the controller's
 * own record about this person and is disclosable; `handledBy` is omitted for
 * the Art. 15(4) reason given above.
 */
export interface SubjectDataRequest {
  id: string;
  type: string;
  status: string;
  notes: string | null;
  receivedAt: string;
  dueAt: string;
  fulfilledAt: string | null;
}

/**
 * Everything the panel durably holds about one email address, assembled to
 * answer a data-subject request. Mirrors `collectAccountData`, which covers the
 * account-keyed side of the register; this covers the email-keyed side — leads,
 * contact submissions and the consent ledger — where the people who actually
 * file these requests live.
 *
 * Each section degrades independently: a failed read reports an error string
 * for that section rather than sinking the whole dossier, because a partial
 * answer inside the statutory month beats no answer at all.
 */
export interface SubjectDataExport {
  exportedAt: string;
  subjectEmail: string;
  lead: SubjectLead | null | { error: string };
  consent: SubjectConsentRecord[] | { error: string };
  dataRequests: SubjectDataRequest[] | { error: string };
}

/** Cap on rows read per section, so one prolific address cannot exhaust memory. */
const SECTION_LIMIT = 500;

/**
 * Every writer into these tables lowercases the address before storing it
 * (`parseContactSubmission`, `parseConsentSubmission`, `createDataRequest`), so
 * an exact match on the normalized value hits the existing indexes. A
 * case-insensitive comparison would read the same rows via a sequential scan.
 */
export function normalizeSubjectEmail(email: string): string {
  // A runtime type check, not a redundant one. `string` is erased at runtime,
  // and everything downstream of this puts the result straight into a Prisma
  // `where`. An object arriving here would be read as query operators rather
  // than as a value — `{ not: '' }` turns a lookup for one person into a
  // lookup for everyone, and on the erasure path into a mass delete.
  if (typeof email !== 'string') throw new TypeError('Subject email must be a string.');
  return email.trim().toLowerCase();
}

function iso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

export async function collectSubjectData(rawEmail: string): Promise<SubjectDataExport> {
  const subjectEmail = normalizeSubjectEmail(rawEmail);

  const [lead, consent, dataRequests] = await Promise.all([
    section(async (): Promise<SubjectLead | null> => {
      const row = await prisma.contactLead.findUnique({
        where: { email: subjectEmail },
        include: { requests: { orderBy: { createdAt: 'desc' }, take: SECTION_LIMIT } },
      });
      if (!row) return null;
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        company: row.company,
        phone: row.phone,
        newsletterConsent: row.newsletterConsent,
        consentAt: iso(row.consentAt),
        consentSource: row.consentSource,
        createdAt: row.createdAt.toISOString(),
        requests: row.requests.map((r) => ({
          id: r.id,
          subject: r.subject,
          message: r.message,
          sourceUrl: r.sourceUrl,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    }),
    section(async (): Promise<SubjectConsentRecord[]> => {
      const rows = await prisma.consentSubject.findMany({
        where: { email: subjectEmail },
        orderBy: { createdAt: 'desc' },
        take: SECTION_LIMIT,
        include: { events: { orderBy: { seq: 'desc' }, take: SECTION_LIMIT } },
      });
      return rows.map((s) => ({
        id: s.id,
        consentId: s.consentId,
        userId: s.userId,
        createdAt: s.createdAt.toISOString(),
        events: s.events.map((e) => ({
          category: e.category,
          granted: e.granted,
          source: e.source,
          policyVersion: e.policyVersion,
          userAgent: e.userAgent,
          at: e.createdAt.toISOString(),
        })),
      }));
    }),
    section(async (): Promise<SubjectDataRequest[]> => {
      const rows = await prisma.dataRequest.findMany({
        where: { subjectEmail },
        orderBy: { receivedAt: 'desc' },
        take: SECTION_LIMIT,
      });
      return rows.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        notes: r.notes,
        receivedAt: r.receivedAt.toISOString(),
        dueAt: r.dueAt.toISOString(),
        fulfilledAt: iso(r.fulfilledAt),
      }));
    }),
  ]);

  return { exportedAt: new Date().toISOString(), subjectEmail, lead, consent, dataRequests };
}
