import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '@/app/config/env.server';
import {
  isHoneypotTripped,
  parseSubmission,
  recordContactSubmission,
} from '@/app/features/contact/intake';
import { checkRateLimit } from '@/app/lib/rateLimit';

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

/** Constant-time shared-secret check; length mismatch short-circuits safely. */
function keyMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Public contact-us intake. The marketing site POSTs each submission here with
 * the shared intake key. Persists the lead + request so the team can track it;
 * the site's existing email to support@ is unchanged. Hardened against abuse:
 * required shared secret, per-IP rate limit, honeypot, and strict validation.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { allowed, resetMs } = checkRateLimit(`contact:${clientIp(request)}`);
  if (!allowed) {
    return NextResponse.json(
      { message: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((resetMs - Date.now()) / 1000)) } }
    );
  }

  const expectedKey = serverEnv.contactIntakeKey;
  // Fail closed: with no key configured the endpoint refuses everything rather
  // than silently accepting unauthenticated writes.
  if (!expectedKey) {
    return NextResponse.json({ message: 'Contact intake is not configured' }, { status: 503 });
  }
  const presentedKey = request.headers.get('x-contact-key');
  if (!presentedKey || !keyMatches(presentedKey, expectedKey)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  // Silent success for bots: no signal that the honeypot exists, nothing stored.
  if (isHoneypotTripped(body)) {
    return NextResponse.json({ ok: true });
  }

  const submission = parseSubmission(body);
  if (!submission) {
    return NextResponse.json({ message: 'A valid email and message are required' }, { status: 400 });
  }

  await recordContactSubmission(submission);
  return NextResponse.json({ ok: true });
}
