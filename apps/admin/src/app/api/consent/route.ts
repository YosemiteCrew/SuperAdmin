import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '@/app/config/env.server';
import { parseConsentSubmission } from '@/app/features/consent/intake';
import { recordConsent } from '@/app/features/consent/store';
import { guardIntake } from '@/app/lib/intakeGuard';

/**
 * Consent intake. The mobile/web apps report each banner/preference decision
 * here with the shared consent key. Append-only: every call adds immutable
 * events to the ledger (the GDPR audit trail). Hardened as a public endpoint:
 * required shared secret, per-IP rate limit, strict validation.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const guard = await guardIntake(request, {
    bucket: 'consent',
    header: 'x-consent-key',
    expectedKey: serverEnv.consentIntakeKey,
    unconfiguredMessage: 'Consent intake is not configured',
  });
  if (!guard.ok) return guard.response;

  const submission = parseConsentSubmission(
    guard.body,
    request.headers.get('user-agent') ?? undefined
  );
  if (!submission) {
    return NextResponse.json(
      { message: 'A consentId, a valid source, and at least one category decision are required' },
      { status: 400 }
    );
  }

  await recordConsent(submission);
  return NextResponse.json({ ok: true });
}
