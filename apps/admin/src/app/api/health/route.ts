import { NextResponse } from 'next/server';
import { prisma } from '@superadmin/database';

import { serverEnv } from '@/app/config/env.server';

const startedAt = Date.now();

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Reduce an unknown thrown value to something safe to publish.
 *
 * This endpoint is unauthenticated, so the error MESSAGE must never be
 * returned: Prisma's connection errors embed the database host, port and
 * sometimes the user. The error's class name and Prisma error code are enough
 * to tell the three failure modes apart and neither carries credentials:
 *
 *   P1001  cannot reach the database server        -> network / egress
 *   P1000  authentication failed                   -> wrong credentials
 *   PrismaClientInitializationError with no code   -> client initialization
 *                                                     failed before a query
 *
 * The full error still goes to the server log, where it is not public.
 */
function describe(error: unknown): { name: string; code: string | null } {
  if (typeof error !== 'object' || error === null) {
    return { name: 'UnknownError', code: null };
  }
  const name = error.constructor?.name ?? 'UnknownError';
  const code = 'code' in error && typeof error.code === 'string' ? error.code : null;
  return { name, code };
}

/**
 * Which public intakes hold a shared secret, and so can accept a write at all.
 *
 * Reported rather than folded into `status`, on purpose. Both keys are optional
 * by design - a deployment may legitimately never provision one - so an absent
 * key must not put the endpoint into a permanent 503 that an uptime monitor
 * learns to ignore. Naming the state here is what lets an operator, or a check
 * that reads the body, tell "no submissions have arrived" apart from "the path
 * has been refusing every submission since the day it was deployed".
 */
function intakeStatus(): Record<'contact' | 'consent', 'configured' | 'unconfigured'> {
  return {
    contact: serverEnv.contactIntakeKey ? 'configured' : 'unconfigured',
    consent: serverEnv.consentIntakeKey ? 'configured' : 'unconfigured',
  };
}

/**
 * The commit this artifact was built from, or null when the build did not
 * supply one.
 *
 * Published for the same reason `intake` is: it lets a check that reads this
 * body tell one deployment from another, so an assertion about the deployed
 * configuration can be tied to the artifact it was made against rather than
 * repeated on a timer.
 *
 * `||` rather than `??`, deliberately. The build writes NEXT_PUBLIC_BUILD_SHA
 * from its own commit id, so a build environment that does not supply one
 * yields the variable with an EMPTY value rather than no variable at all.
 * `??` passes `''` through and this field would publish an empty string as
 * though it were a sha - the same trap the intake fields avoid by treating an
 * empty key as unconfigured.
 *
 * DISCLOSURE, weighed rather than assumed - this endpoint is unauthenticated
 * (proxy.ts:42 lists it as intentionally public) and this is the panel's
 * highest-privilege surface, so a new field here is a decision and not a
 * convenience.
 *
 * Be exact about what it adds. A commit sha tells any caller which build is
 * live, and that is NOT derivable from the public repository - source says
 * which commits exist, never which one is deployed. `uptime` already discloses
 * roughly when this instance started, so the increment is timing -> identity:
 * from "something shipped recently" to "this commit is running". In the window
 * between a fix landing in a public repo and reaching production, this field
 * says which side of that window a deployment is on.
 *
 * Published because the cost is bounded and the benefit is not otherwise
 * available to a caller of this endpoint: a sha is not a secret and resolves
 * to source anyone can already read, and it is the only field in this body
 * that lets an external check tie an assertion about deployed configuration to
 * the artifact it was made against. A platform deployment API could do that
 * too - at the cost of credentials a check reading a public endpoint does not
 * need. Without either, the only available cadence is a timer, which is the
 * permanent alarm `intakeStatus` above exists to avoid.
 *
 * The standard for anything added here, which `intake` and `uptime` already
 * follow: a field may name WHAT THIS DEPLOYMENT IS or HOW IT IS BEHAVING; it
 * may never carry a credential, address infrastructure a caller could not
 * otherwise reach, or identify a person.
 *
 * Those three are SHORTCUTS, and they are not converging. Each was added
 * because someone constructed a case outside the previous set, and four more
 * arrived within one round of the third landing. The question underneath them,
 * which `intake`'s own comment already argues from rather than from category:
 *
 *   does knowing this help someone attack the system, is the operational value
 *   larger, and what does it narrow TOGETHER WITH what is already here?
 *
 * A field can pass all three clauses and fail that. Two worked examples, both
 * from review:
 *
 * - A fingerprint of an intake key, published so an operator can confirm both
 *   sides hold the same secret, is not a credential, not infrastructure and
 *   identifies nobody. It is a confirmation oracle: candidates are tested
 *   against it offline, with no rate limit and no log line. Safety there is a
 *   property of the INPUT's entropy, not of the output's category - and note
 *   that `.env.example` says "AP_SIGNING_KEY_ID is a key identifier, not a
 *   secret", which is true of that value and is exactly the sentence a later
 *   reader would generalise into this mistake.
 * - `buildSha` and `intake` are each fine. Together they say "this exact
 *   commit is live AND its public write path is refusing everything", which is
 *   narrower than either. That is not a property of any field, so no per-field
 *   list can reach it.
 *
 * So the clauses are not a closed set and must not be read as one. The test to
 * apply to a new field is the one that found all of the above: run the rule
 * against a case it was NOT written around. Checking it against the fields
 * already in this object proves it CONSISTENT with them and never COMPLETE,
 * because every one of them was in view when the sentence was written.
 *
 * It is deliberately not "discloses nothing new". `intake` publishes whether
 * this deployment's keys are configured and `uptime` when it started, neither
 * of which a reader of the repository could establish - and a novelty rule
 * would forbid all three fields while permitting anything already leaked
 * elsewhere. Nor is it "no identifiers": a commit sha is an identifier and is
 * fine. What actually separates the allowed set from `reason.message` is that
 * a Prisma connection message embeds the database host, port and sometimes the
 * user - infrastructure a caller could then reach - which is why `reason` is
 * narrowed above to an error's class and code.
 */
function buildSha(): string | null {
  return process.env.NEXT_PUBLIC_BUILD_SHA?.trim() || null;
}

/**
 * Liveness and readiness for the panel.
 *
 * The database probe is the point of this endpoint. Without it the check only
 * proved that Node was accepting connections, which it does perfectly well
 * with no database configured at all — so an unreachable Postgres reports
 * healthy here while every Prisma-backed page returns a digest-only 500.
 * A 503 is the signal an uptime monitor can act on.
 */
export async function GET() {
  let database: 'up' | 'down' = 'up';
  let reason: { name: string; code: string | null } | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    database = 'down';
    reason = describe(error);
    // Swallowing this entirely is what made the 2026-08-21 outage opaque: the
    // endpoint reported "down" with no way to distinguish initialization from
    // an unreachable host without redeploying instrumentation.
    console.error('[health] database probe failed', error);
  }

  const healthy = database === 'up';

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      database,
      ...(reason ? { reason } : {}),
      intake: intakeStatus(),
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV ?? 'development',
      buildSha: buildSha(),
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
