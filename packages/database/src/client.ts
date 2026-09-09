import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

const adapter = new PrismaPg(
  {
    connectionString: process.env.DATABASE_URL,
    // Prisma 6 timed out connection attempts after five seconds. node-postgres
    // otherwise waits indefinitely, which can pin a serverless invocation.
    connectionTimeoutMillis: 5_000,
  },
  // The adapter does not infer Prisma's schema query parameter. Keep model
  // queries in the schema enforced by scripts/assert-schema.js.
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
