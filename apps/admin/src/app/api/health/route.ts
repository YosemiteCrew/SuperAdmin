import { NextResponse } from 'next/server';
import { prisma } from '@superadmin/database';

const startedAt = Date.now();

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'down';
  }

  const healthy = database === 'up';

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      database,
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
