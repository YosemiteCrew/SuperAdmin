import 'server-only';
import type { NextRequest } from 'next/server';

/**
 * The caller's address, for rate-limit bucketing.
 *
 * `X-Forwarded-For` is a list that each hop APPENDS to, and the client controls
 * what is already in it when the request arrives. CloudFront - which fronts this
 * deployment - appends the viewer address rather than replacing what it was
 * given, so a request that arrives carrying `X-Forwarded-For: 203.0.113.9`
 * reaches the origin as `203.0.113.9, <real viewer address>`.
 *
 * That is why this reads the RIGHTMOST entry. Reading the leftmost - which both
 * call sites used to do - selects the one value the caller fully controls, so
 * rotating the header per request mints a fresh rate-limit bucket every time and
 * the limit never engages. The rightmost entry is the one the trusted proxy
 * wrote.
 *
 * Shared by the intake guard and the auth route deliberately. They previously
 * held byte-identical copies of the wrong version, which is precisely how one
 * gets fixed and its twin is left behind.
 */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Trailing empty entries ("1.2.3.4, ") must not be selected as the address;
    // an empty bucket key would collapse unrelated callers into one bucket.
    const hops = forwarded
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean);
    const nearest = hops.at(-1);
    if (nearest) return nearest;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  // Everything unattributable shares one bucket. That is the safe direction: it
  // over-limits rather than handing out an unlimited allowance per caller.
  return 'unknown';
}
