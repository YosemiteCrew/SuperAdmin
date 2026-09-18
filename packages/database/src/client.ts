import * as fs from 'node:fs';
import * as path from 'node:path';

import { PrismaClient } from './generated/client';

/**
 * Point Prisma at the query engine that the build copied into `.next`.
 *
 * Prisma looks for the engine next to its generated client, which lives in
 * `packages/database/src/generated/client`. Amplify's compute bundle ships
 * `.next` and `node_modules` and nothing else, so at runtime that directory
 * does not exist and every query fails with:
 *
 *   Prisma Client could not locate the Query Engine for runtime
 *   "rhel-openssl-3.0.x"
 *
 * `outputFileTracingIncludes` correctly lists the binary in the route's
 * `.nft.json` - verified in the build log - but a trace file is a manifest,
 * not a copy, and Amplify does not follow entries that escape the app
 * directory. So amplify.yml copies the engine into `.next/prisma/` (which is
 * the deployed artifact) and this resolves it.
 *
 * The runtime root is not knowable ahead of time - both `/var/task/.next` and
 * `/tmp/app/.next` appear in Lambda stack traces - so probe instead of
 * hardcoding, and only set the variable when a file is actually there. That
 * keeps local development untouched, where the Linux engine does not exist and
 * Prisma's own resolution already works.
 */
function locateQueryEngine(): void {
  if (process.env.PRISMA_QUERY_ENGINE_LIBRARY) return;

  const engine = 'libquery_engine-rhel-openssl-3.0.x.so.node';
  const roots = [process.cwd(), '/var/task', '/tmp/app'];

  for (const root of roots) {
    const candidate = path.join(root, '.next', 'prisma', engine);
    try {
      if (fs.existsSync(candidate)) {
        process.env.PRISMA_QUERY_ENGINE_LIBRARY = candidate;
        return;
      }
    } catch {
      // An unreadable root is not fatal; try the next one.
    }
  }
}

locateQueryEngine();

// Singleton pattern: reuse the same client across hot-reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
