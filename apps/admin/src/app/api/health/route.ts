import { NextResponse } from 'next/server';
import { prisma } from '@superadmin/database';

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
 *   PrismaClientInitializationError with no code   -> query engine binary
 *                                                     missing from the bundle
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
    // endpoint reported "down" with no way to tell a missing query engine from
    // an unreachable host without redeploying instrumentation.
    console.error('[health] database probe failed', error);
  }

  const healthy = database === 'up';

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      database,
      ...(reason ? { reason } : {}),
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV ?? 'development',
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
