import 'server-only';

import { prisma } from '@superadmin/database';

import { isValidEmail } from '@/app/features/settings/email';

export interface ContactSubmission {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  subject?: string;
  message: string;
  newsletterConsent: boolean;
  sourceUrl?: string;
  sourceRequestId?: string;
  submittedAt?: Date;
}

export const LIMITS = {
  email: 254,
  name: 200,
  company: 200,
  phone: 50,
  subject: 300,
  message: 5000,
  sourceUrl: 500,
  sourceRequestId: 100,
} as const;

const DEFAULT_CONSENT_SOURCE = 'contact-us';

const TYPE_SUBJECTS = new Map<string, string>([
  ['GENERAL_ENQUIRY', 'General Enquiry'],
  ['FEATURE_REQUEST', 'Feature Request'],
  ['DSAR', 'Data Subject Access Request'],
  ['COMPLAINT', 'Complaint'],
]);

function subjectFromType(value: unknown): string | undefined {
  return typeof value === 'string' ? TYPE_SUBJECTS.get(value) : undefined;
}

function optionalString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return undefined;
  return trimmed;
}

/**
 * How far ahead of our clock a caller's `submittedAt` may sit before we treat
 * it as wrong rather than skewed. The backfill replays historical rows, so the
 * past is unbounded; only the future is capped.
 */
export const MAX_SUBMITTED_AT_SKEW_MS = 5 * 60 * 1000;

/**
 * `undefined` when absent, a Date when valid, `null` when present but unusable.
 * The three cases are distinct on purpose: a bad timestamp must fail the whole
 * submission rather than silently fall back to now(), which would stamp a
 * replayed historical request with the time of its import.
 */
function optionalDate(value: unknown, now: number): Date | null | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  const time = parsed.getTime();
  if (Number.isNaN(time)) return null;
  if (time > now + MAX_SUBMITTED_AT_SKEW_MS) return null;
  return parsed;
}

/**
 * Parses and validates an untrusted intake payload from the public endpoint.
 * Returns null on anything invalid; the caller responds 400 without echoing
 * the reason back to an anonymous client.
 *
 * Accepts two shapes so the marketing-site backend can forward the contact-us
 * form body VERBATIM (no field mapping on its side): the panel's own shape
 * (`name`/`subject`) and the site's shape (`fullName`/`type`/`phone`). When
 * both are present the explicit `name`/`subject` win.
 */
export function parseSubmission(body: Record<string, unknown>): ContactSubmission | null {
  const rawEmail = body.email;
  if (typeof rawEmail !== 'string') return null;
  const email = rawEmail.trim().toLowerCase();
  if (!isValidEmail(email)) return null;

  const rawMessage = body.message;
  if (typeof rawMessage !== 'string') return null;
  const message = rawMessage.trim();
  if (message.length === 0 || message.length > LIMITS.message) return null;

  const submittedAt = optionalDate(body.submittedAt, Date.now());
  if (submittedAt === null) return null;

  // Present-but-unusable is rejected rather than dropped: this is the
  // idempotency key, so silently continuing without it would turn a redelivery
  // into a second stored request.
  const rawSourceRequestId = body.sourceRequestId;
  const sourceRequestId = optionalString(rawSourceRequestId, LIMITS.sourceRequestId);
  if (rawSourceRequestId !== undefined && rawSourceRequestId !== null && !sourceRequestId) {
    return null;
  }

  return {
    email,
    name: optionalString(body.name, LIMITS.name) ?? optionalString(body.fullName, LIMITS.name),
    company: optionalString(body.company, LIMITS.company),
    phone: optionalString(body.phone, LIMITS.phone),
    subject: optionalString(body.subject, LIMITS.subject) ?? subjectFromType(body.type),
    message,
    newsletterConsent: body.newsletterConsent === true,
    sourceUrl: optionalString(body.sourceUrl, LIMITS.sourceUrl),
    sourceRequestId,
    submittedAt,
  };
}

/**
 * A hidden honeypot field is empty for humans; any value means a bot filled a
 * field it could not see. The caller returns a normal 200 so the bot gets no
 * signal, but nothing is stored.
 */
export function isHoneypotTripped(body: Record<string, unknown>): boolean {
  const trap = body.website;
  return typeof trap === 'string' && trap.trim().length > 0;
}

function consentSource(input: ContactSubmission): string {
  return input.sourceUrl ?? DEFAULT_CONSENT_SOURCE;
}

function consentPatch(input: ContactSubmission): Record<string, unknown> {
  if (!input.newsletterConsent) return {};
  return {
    newsletterConsent: true,
    consentAt: new Date(),
    consentSource: consentSource(input),
  };
}

function requestData(input: ContactSubmission): {
  subject: string | null;
  message: string;
  sourceUrl: string | null;
} {
  return {
    subject: input.subject ?? null,
    message: input.message,
    sourceUrl: input.sourceUrl ?? null,
  };
}

async function backfillLeadFields(
  email: string,
  name?: string,
  company?: string,
  phone?: string
): Promise<void> {
  if (name) {
    await prisma.contactLead.updateMany({
      where: { email: { equals: email }, name: null },
      data: { name },
    });
  }
  if (company) {
    await prisma.contactLead.updateMany({
      where: { email: { equals: email }, company: null },
      data: { company },
    });
  }
  if (phone) {
    await prisma.contactLead.updateMany({
      where: { email: { equals: email }, phone: null },
      data: { phone },
    });
  }
}

/**
 * A sourceRequestId already recorded against DIFFERENT content. The caller
 * answers 409: acknowledging this as stored would silently drop the corrected
 * content the redelivery was carrying.
 */
export class ContactIntakeConflictError extends Error {
  constructor(public readonly sourceRequestId: string) {
    super('sourceRequestId already recorded with different content');
    this.name = 'ContactIntakeConflictError';
  }
}

/**
 * A stored request is the same submission when it belongs to the same lead and
 * carries the same subject and message. The lead's EMAIL is part of the
 * identity, not just the content: one product id arriving under two addresses
 * is a sender error, and acknowledging it would file one visitor's message
 * against another's record. Mirrors the deleted importer's sameImportedRequest,
 * minus createdAt - a retry may legitimately carry a different submittedAt.
 */
function isSameSubmission(
  stored: { subject: string | null; message: string; lead: { email: string } },
  input: ContactSubmission,
  email: string
): boolean {
  return (
    stored.lead.email === email &&
    stored.subject === (input.subject ?? null) &&
    stored.message === input.message
  );
}

/**
 * The sourced path runs as ONE transaction, which is what makes "a conflict
 * writes nothing" true: the lead upsert below happens before a conflict can be
 * detected, so the rollback - not the ordering - is what guarantees it.
 * Structure follows the importer this replaces: upsert, backdate, claim or
 * insert-if-absent, then re-read and compare.
 */
async function handleWithSourceRequestId(input: ContactSubmission): Promise<void> {
  const { email, name, company, phone, sourceRequestId, submittedAt } = input;
  const safeEmail = String(email);
  const safeName = name === undefined ? undefined : String(name);
  const safeCompany = company === undefined ? undefined : String(company);
  const safePhone = phone === undefined ? undefined : String(phone);
  const requestCreatedAt = submittedAt ?? new Date();
  const id = sourceRequestId!;
  const storedShape = { include: { lead: { select: { email: true } } } } as const;

  await prisma.$transaction(async (tx) => {
    const lead = await tx.contactLead.upsert({
      where: { email: safeEmail },
      create: {
        email: safeEmail,
        name: safeName ?? null,
        company: safeCompany ?? null,
        phone: safePhone ?? null,
        newsletterConsent: input.newsletterConsent,
        consentAt: input.newsletterConsent ? new Date() : null,
        consentSource: input.newsletterConsent ? consentSource(input) : null,
        createdAt: requestCreatedAt,
      },
      update: { ...consentPatch(input) },
    });

    // A replayed submission can predate the lead we already hold; the lead is
    // as old as its earliest request, never younger.
    await tx.contactLead.updateMany({
      where: { id: lead.id, createdAt: { gt: requestCreatedAt } },
      data: { createdAt: requestCreatedAt },
    });

    // Fill only what is still null, so a replay never overwrites better data.
    for (const [field, value] of [
      ['name', safeName],
      ['company', safeCompany],
      ['phone', safePhone],
    ] as const) {
      if (value) {
        await tx.contactLead.updateMany({
          where: { id: lead.id, [field]: null },
          data: { [field]: value },
        });
      }
    }

    const existing = await tx.contactRequest.findUnique({
      where: { sourceRequestId: id },
      ...storedShape,
    });
    if (existing) {
      if (!isSameSubmission(existing, input, safeEmail)) {
        throw new ContactIntakeConflictError(id);
      }
      return;
    }

    // Rows the live intake already wrote carry no source id. Claim the OLDEST
    // content-matched one rather than filing a second copy of it.
    const claimable = await tx.contactRequest.findFirst({
      where: {
        leadId: lead.id,
        sourceRequestId: null,
        subject: input.subject ?? null,
        message: input.message,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (claimable) {
      await tx.contactRequest.update({
        where: { id: claimable.id },
        data: { sourceRequestId: id, createdAt: requestCreatedAt },
      });
      return;
    }

    // skipDuplicates emits INSERT ... ON CONFLICT DO NOTHING, so the unique
    // index closes the concurrent-delivery race instead of a check-then-act
    // read. The re-read below decides whether the row that now exists is ours.
    await tx.contactRequest.createMany({
      data: [
        {
          sourceRequestId: id,
          leadId: lead.id,
          subject: input.subject ?? null,
          message: input.message,
          sourceUrl: input.sourceUrl ?? null,
          createdAt: requestCreatedAt,
        },
      ],
      skipDuplicates: true,
    });

    const stored = await tx.contactRequest.findUnique({
      where: { sourceRequestId: id },
      ...storedShape,
    });
    if (!stored || !isSameSubmission(stored, input, safeEmail)) {
      throw new ContactIntakeConflictError(id);
    }
  });
}

async function handleLegacy(input: ContactSubmission): Promise<void> {
  const { email, name, company, phone } = input;
  const safeEmail = String(email);
  const safeName = name === undefined ? undefined : String(name);
  const safeCompany = company === undefined ? undefined : String(company);
  const safePhone = phone === undefined ? undefined : String(phone);

  await prisma.contactLead.upsert({
    where: { email: safeEmail },
    create: {
      email: safeEmail,
      name: safeName ?? null,
      company: safeCompany ?? null,
      phone: safePhone ?? null,
      newsletterConsent: input.newsletterConsent,
      consentAt: input.newsletterConsent ? new Date() : null,
      consentSource: input.newsletterConsent ? consentSource(input) : null,
      requests: { create: requestData(input) },
    },
    update: { ...consentPatch(input), requests: { create: requestData(input) } },
  });

  await backfillLeadFields(safeEmail, safeName, safeCompany, safePhone);
}

/**
 * Upserts the lead (one per email) and appends the submission. Newsletter
 * consent is only ever promoted, never revoked here: an explicit opt-in on
 * this form records when/where it happened; unsubscribing is owned by Plunk.
 *
 * When sourceRequestId is provided (from the product's submission id), the
 * function is idempotent: it claims an existing request with null sourceRequestId
 * that matches the lead and content, or skips if the sourceRequestId is already
 * recorded. This replaces the offline importer and allows the backfill to run
 * through the same authenticated intake as live traffic.
 */
export async function recordContactSubmission(input: ContactSubmission): Promise<void> {
  const { email, name, company, phone } = input;
  if (
    typeof email !== 'string' ||
    !isValidEmail(email) ||
    (name !== undefined && typeof name !== 'string') ||
    (company !== undefined && typeof company !== 'string') ||
    (phone !== undefined && typeof phone !== 'string')
  ) {
    throw new TypeError('Contact submission contains invalid identity fields.');
  }

  if (input.sourceRequestId) {
    await handleWithSourceRequestId(input);
  } else {
    await handleLegacy(input);
  }
}
