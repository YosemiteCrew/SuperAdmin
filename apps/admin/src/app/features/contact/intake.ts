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

  return {
    email,
    name: optionalString(body.name, LIMITS.name) ?? optionalString(body.fullName, LIMITS.name),
    company: optionalString(body.company, LIMITS.company),
    phone: optionalString(body.phone, LIMITS.phone),
    subject: optionalString(body.subject, LIMITS.subject) ?? subjectFromType(body.type),
    message,
    newsletterConsent: body.newsletterConsent === true,
    sourceUrl: optionalString(body.sourceUrl, LIMITS.sourceUrl),
    sourceRequestId:
      typeof body.sourceRequestId === 'string' && body.sourceRequestId.trim().length > 0
        ? body.sourceRequestId.trim()
        : undefined,
    submittedAt:
      body.submittedAt && typeof body.submittedAt === 'string'
        ? new Date(body.submittedAt)
        : undefined,
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

async function createLeadAndRequest(
  email: string,
  name: string | undefined,
  company: string | undefined,
  phone: string | undefined,
  input: ContactSubmission,
  createdAt: Date,
  sourceRequestId?: string
): Promise<void> {
  await prisma.contactLead.upsert({
    where: { email },
    create: {
      email,
      name: name ?? null,
      company: company ?? null,
      phone: phone ?? null,
      newsletterConsent: input.newsletterConsent,
      consentAt: input.newsletterConsent ? new Date() : null,
      consentSource: input.newsletterConsent ? consentSource(input) : null,
    },
    update: { ...consentPatch(input) },
  });

  const lead = await prisma.contactLead.findUniqueOrThrow({ where: { email } });

  await prisma.contactRequest.create({
    data: {
      sourceRequestId: sourceRequestId ?? null,
      leadId: lead.id,
      subject: input.subject ?? null,
      message: input.message,
      sourceUrl: input.sourceUrl ?? null,
      createdAt,
    },
  });
}

async function handleWithSourceRequestId(input: ContactSubmission): Promise<void> {
  const { email, name, company, phone, sourceRequestId, submittedAt } = input;
  const safeEmail = String(email);
  const safeName = name === undefined ? undefined : String(name);
  const safeCompany = company === undefined ? undefined : String(company);
  const safePhone = phone === undefined ? undefined : String(phone);
  const requestCreatedAt = submittedAt ?? new Date();

  const existingBySourceId = await prisma.contactRequest.findUnique({
    where: { sourceRequestId: sourceRequestId! },
    select: { id: true },
  });
  if (existingBySourceId) {
    return;
  }

  const lead = await prisma.contactLead.findUnique({
    where: { email: safeEmail },
    select: { id: true },
  });

  if (lead) {
    const claimable = await prisma.contactRequest.findFirst({
      where: {
        leadId: lead.id,
        sourceRequestId: null,
        subject: input.subject ?? null,
        message: input.message,
        createdAt: requestCreatedAt,
      },
      select: { id: true },
    });

    if (claimable) {
      await prisma.contactRequest.update({
        where: { id: claimable.id },
        data: { sourceRequestId },
      });
      await backfillLeadFields(safeEmail, safeName, safeCompany, safePhone);
      return;
    }
  }

  await createLeadAndRequest(
    safeEmail,
    safeName,
    safeCompany,
    safePhone,
    input,
    requestCreatedAt,
    sourceRequestId
  );
  await backfillLeadFields(safeEmail, safeName, safeCompany, safePhone);
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
