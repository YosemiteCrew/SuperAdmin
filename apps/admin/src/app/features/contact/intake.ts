import 'server-only';

import { prisma } from '@superadmin/database';

export interface ContactSubmission {
  email: string;
  name?: string;
  company?: string;
  subject?: string;
  message: string;
  newsletterConsent: boolean;
  sourceUrl?: string;
}

export const LIMITS = {
  email: 254,
  name: 200,
  company: 200,
  subject: 300,
  message: 5000,
  sourceUrl: 500,
} as const;

/** Regex-free email sanity check (avoids ReDoS); Plunk/verification is the real gate. */
function looksLikeEmail(value: string): boolean {
  const at = value.indexOf('@');
  if (at < 1) return false;
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1 && !value.includes(' ');
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
 */
export function parseSubmission(body: Record<string, unknown>): ContactSubmission | null {
  const rawEmail = body.email;
  if (typeof rawEmail !== 'string') return null;
  const email = rawEmail.trim().toLowerCase();
  if (email.length === 0 || email.length > LIMITS.email || !looksLikeEmail(email)) return null;

  const rawMessage = body.message;
  if (typeof rawMessage !== 'string') return null;
  const message = rawMessage.trim();
  if (message.length === 0 || message.length > LIMITS.message) return null;

  return {
    email,
    name: optionalString(body.name, LIMITS.name),
    company: optionalString(body.company, LIMITS.company),
    subject: optionalString(body.subject, LIMITS.subject),
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
  const consentPatch = input.newsletterConsent
    ? { newsletterConsent: true, consentAt: new Date(), consentSource: input.sourceUrl ?? 'contact-us' }
    : {};

  const requestData = {
    subject: input.subject ?? null,
    message: input.message,
    sourceUrl: input.sourceUrl ?? null,
  };

  await prisma.contactLead.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      name: input.name ?? null,
      company: input.company ?? null,
      newsletterConsent: input.newsletterConsent,
      consentAt: input.newsletterConsent ? new Date() : null,
      consentSource: input.newsletterConsent ? (input.sourceUrl ?? 'contact-us') : null,
      requests: { create: requestData },
    },
    // The update branch never overwrites an existing name/company (a returning
    // contact must not clobber the better value we already hold) and never
    // downgrades consent — it only appends the new request and promotes consent.
    update: { ...consentPatch, requests: { create: requestData } },
  });

  // Backfill name/company only when we don't already have them. Filtering on
  // the null column keeps this atomic — no read-modify-write race.
  if (input.name) {
    await prisma.contactLead.updateMany({
      where: { email: { equals: input.email }, name: null },
      data: { name: input.name },
    });
  }
  if (input.company) {
    await prisma.contactLead.updateMany({
      where: { email: { equals: input.email }, company: null },
      data: { company: input.company },
    });
  }
}
