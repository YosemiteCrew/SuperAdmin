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

// The yosemitecrew.com contact form sends a `type` enum instead of a free-text
// subject. Mapped back to a readable label so the panel shows "Complaint", not
// an API constant. DSAR deliberately uses the correct GDPR term ("data
// subject") rather than the form's current "Data Service" wording — this is
// the compliance-facing side. A Map (not an object literal) so an untrusted
// string like '__proto__' can never resolve to anything but undefined.
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

/**
 * Upserts the lead (one per email) and appends the submission. Newsletter
 * consent is only ever promoted, never revoked here: an explicit opt-in on
 * this form records when/where it happened; unsubscribing is owned by Plunk.
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
  const safeEmail = String(email);
  const safeName = name === undefined ? undefined : String(name);
  const safeCompany = company === undefined ? undefined : String(company);
  const safePhone = phone === undefined ? undefined : String(phone);

  const consentPatch = input.newsletterConsent
    ? {
        newsletterConsent: true,
        consentAt: new Date(),
        consentSource: input.sourceUrl ?? 'contact-us',
      }
    : {};

  const requestData = {
    subject: input.subject ?? null,
    message: input.message,
    sourceUrl: input.sourceUrl ?? null,
  };

  await prisma.contactLead.upsert({
    where: { email: safeEmail },
    create: {
      email: safeEmail,
      name: safeName ?? null,
      company: safeCompany ?? null,
      phone: safePhone ?? null,
      newsletterConsent: input.newsletterConsent,
      consentAt: input.newsletterConsent ? new Date() : null,
      consentSource: input.newsletterConsent ? (input.sourceUrl ?? 'contact-us') : null,
      requests: { create: requestData },
    },
    // The update branch never overwrites an existing name/company/phone (a
    // returning contact must not clobber the better value we already hold) and
    // never downgrades consent — it only appends the new request and promotes
    // consent.
    update: { ...consentPatch, requests: { create: requestData } },
  });

  // Backfill name/company/phone only when we don't already have them. Filtering
  // on the null column keeps this atomic — no read-modify-write race.
  //
  // `email: { equals }` rather than a bare email value: updateMany's
  // where accepts FILTERS, so a value that turned out to be an object at runtime
  // would be read as one — `{ not: 'x' }` would stop identifying this lead and
  // start matching every other one, backfilling onto strangers' rows. `equals`
  // forces the value to be compared rather than interpreted. parseSubmission
  // already rejects a non-string email and is the only path here today, but that
  // makes this function's safety a property of its caller; this makes it a
  // property of the query.
  if (safeName) {
    await prisma.contactLead.updateMany({
      where: { email: { equals: safeEmail }, name: null },
      data: { name: safeName },
    });
  }
  if (safeCompany) {
    await prisma.contactLead.updateMany({
      where: { email: { equals: safeEmail }, company: null },
      data: { company: safeCompany },
    });
  }
  if (safePhone) {
    await prisma.contactLead.updateMany({
      where: { email: { equals: safeEmail }, phone: null },
      data: { phone: safePhone },
    });
  }
}
