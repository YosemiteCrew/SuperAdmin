import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

import { pgConnectionConfig } from './pgConnectionConfig';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

// The driver adapter takes its connection settings from the single builder.
// max: 5 is set explicitly because each Amplify SSR instance holds its own
// pool against the session pooler, and the adapter's default is larger.
const adapter = new PrismaPg(
  {
    ...pgConnectionConfig(databaseUrl),
    max: 5,
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
