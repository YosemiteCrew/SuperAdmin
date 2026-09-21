import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/client';
import { pgConnectionConfig } from './pgConnectionConfig';

/**
 * Prisma 7 talks to Postgres through node-postgres, so this client and the
 * approvals advisory lock are now the same kind of connection and must not
 * disagree about TLS. `pgConnectionConfig` is the one place that decides, and
 * it pins the Supabase root with `rejectUnauthorized: true`.
 *
 * That is the point the Prisma 7 revert (03218f5) turned on. The adapter's TLS
 * is node-postgres' TLS, and node-postgres verifies `sslmode=require` against
 * the public roots, which Supabase's chain does not lead to - the reasoning
 * `pgConnectionConfig` was written for. Left to the URL this either fails every
 * query or, if someone reaches for `rejectUnauthorized: false` to make it
 * connect, carries the panel's database traffic unverified.
 *
 * The URL is checked here rather than left to the adapter. Measured with pg
 * 8.16: `new Client({ connectionString: '' })` resolves to localhost:5432 with
 * the OS user, and so does `undefined`. An absent DATABASE_URL would therefore
 * start a panel that quietly points at some other database rather than one that
 * stops, and this is the register for marketing leads, the consent ledger and
 * statutory data-subject requests.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. @superadmin/database cannot open a connection.');
}

const adapter = new PrismaPg(
  {
    ...pgConnectionConfig(databaseUrl),
    // Each Amplify SSR instance holds its own pool against the Supabase session
    // pooler, and the pooler's connection budget is shared with everything else
    // on the project. Measured with pg 8.16, the default is 10 per pool, which
    // multiplies by the number of warm instances, so set it explicitly and low;
    // the panel's traffic is a handful of admins.
    max: 5,
    // Measured with pg 8.16, connectionTimeoutMillis defaults to undefined - no
    // timeout - so a pooler that accepts a socket and never completes the
    // handshake would pin a serverless invocation until the platform killed it.
    connectionTimeoutMillis: 5_000,
  },
  // This, not `?schema=` in the URL, is what puts model queries in the panel's
  // schema. Measured against a migrated database: with 'superadmin' a model
  // query succeeds, with 'public' the same query fails P2021, and the URL
  // carried `?schema=superadmin` in both runs. scripts/assert-schema.js keeps
  // the URL parameter that Migrate reads in step with this value.
  { schema: 'superadmin' }
);

// Singleton pattern: reuse the same client across hot-reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
