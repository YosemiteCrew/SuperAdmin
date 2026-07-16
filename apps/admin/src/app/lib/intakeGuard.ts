import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

import { checkRateLimit } from '@/app/lib/rateLimit';

/**
 * The gate every public intake endpoint sits behind: per-IP rate limit, a
 * required shared secret compared in constant time, and a JSON body.
 *
 * Shared rather than copied per route. These are the only unauthenticated write
 * paths into the panel, and the checks are the whole of their security; two
 * copies means a fix to one silently leaves the other behind, which is exactly
 * how one endpoint ends up hardened and its twin does not.
 */

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

export type IntakeGuard =
  { ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse };

export async function guardIntake(
  request: NextRequest,
  opts: {
    /** Rate-limit bucket prefix, e.g. 'consent'. */
    bucket: string;
    /** Header carrying the shared secret, e.g. 'x-consent-key'. */
    header: string;
    /** The configured secret; null/empty means the endpoint is unconfigured. */
    expectedKey: string | null;
    /** 503 message when unconfigured, e.g. 'Consent intake is not configured'. */
    unconfiguredMessage: string;
  }
): Promise<IntakeGuard> {
  const { allowed, resetMs } = checkRateLimit(`${opts.bucket}:${clientIp(request)}`);
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((resetMs - Date.now()) / 1000)) },
        }
      ),
    };
  }

  // Fail closed: with no key configured the endpoint refuses everything rather
  // than silently accepting unauthenticated writes.
  if (!opts.expectedKey) {
    return {
      ok: false,
      response: NextResponse.json({ message: opts.unconfiguredMessage }, { status: 503 }),
    };
  }

  const presentedKey = request.headers.get(opts.header);
  if (!presentedKey || !keyMatches(presentedKey, opts.expectedKey)) {
    return { ok: false, response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }

  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 }),
    };
  }
}
