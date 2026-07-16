import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '@/app/config/env.server';
import {
  isHoneypotTripped,
  parseSubmission,
  recordContactSubmission,
} from '@/app/features/contact/intake';
import { guardIntake } from '@/app/lib/intakeGuard';

/**
 * Public contact-us intake. The marketing site POSTs each submission here with
 * the shared intake key. Persists the lead + request so the team can track it;
 * the site's existing email to support@ is unchanged. Hardened against abuse:
 * required shared secret, per-IP rate limit, honeypot, and strict validation.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const guard = await guardIntake(request, {
    bucket: 'contact',
    header: 'x-contact-key',
    expectedKey: serverEnv.contactIntakeKey,
    unconfiguredMessage: 'Contact intake is not configured',
  });
  if (!guard.ok) return guard.response;

  // Silent success for bots: no signal that the honeypot exists, nothing stored.
  if (isHoneypotTripped(guard.body)) {
    return NextResponse.json({ ok: true });
  }

  const submission = parseSubmission(guard.body);
  if (!submission) {
    return NextResponse.json(
      { message: 'A valid email and message are required' },
      { status: 400 }
    );
  }

  await recordContactSubmission(submission);
  return NextResponse.json({ ok: true });
}
