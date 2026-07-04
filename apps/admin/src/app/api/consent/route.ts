import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '@/app/config/env.server';
import { parseConsentSubmission } from '@/app/features/consent/intake';
import { recordConsent } from '@/app/features/consent/store';
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
 * Consent intake. The mobile/web apps report each banner/preference decision
 * here with the shared consent key. Append-only: every call adds immutable
 * events to the ledger (the GDPR audit trail). Hardened as a public endpoint:
 * required shared secret, per-IP rate limit, strict validation.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { allowed, resetMs } = checkRateLimit(`consent:${clientIp(request)}`);
  if (!allowed) {
    return NextResponse.json(
      { message: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((resetMs - Date.now()) / 1000)) } }
    );
  }

  const expectedKey = serverEnv.consentIntakeKey;
  if (!expectedKey) {
    return NextResponse.json({ message: 'Consent intake is not configured' }, { status: 503 });
  }
  const presentedKey = request.headers.get('x-consent-key');
  if (!presentedKey || !keyMatches(presentedKey, expectedKey)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const submission = parseConsentSubmission(body, request.headers.get('user-agent') ?? undefined);
  if (!submission) {
    return NextResponse.json(
      { message: 'A consentId, a valid source, and at least one category decision are required' },
      { status: 400 }
    );
  }

  await recordConsent(submission);
  return NextResponse.json({ ok: true });
}
