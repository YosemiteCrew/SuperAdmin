/**
 * @jest-environment node
 */

/**
 * The Prisma client's connection settings must be the ones `pgConnectionConfig`
 * produces, and nothing else.
 *
 * This is the assertion the first Prisma 7 attempt did not have. Prisma 6 spoke
 * to Postgres through its own Rust engine; Prisma 7 speaks through
 * node-postgres, so the client and the approvals advisory lock are now the same
 * kind of connection and a disagreement between them about TLS is invisible
 * everywhere except a live deployment. `?sslmode=require` verifies against the
 * public roots, which Supabase's chain does not lead to, so left to the URL the
 * adapter either fails every query or gets "fixed" with
 * `rejectUnauthorized: false` - which is what got that attempt reverted.
 *
 * Deliberately asserted against the builder's OUTPUT rather than a literal copy
 * of it: a second expected `ssl` object here would pass while the two drifted
 * apart, which is the whole failure this is written to catch.
 */
import { pgConnectionConfig, SUPABASE_ROOT_2021_CA } from '@superadmin/database/pgConnectionConfig';

const adapterCalls: unknown[][] = [];
const clientCalls: unknown[][] = [];

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class {
    constructor(...args: unknown[]) {
      adapterCalls.push(args);
    }
  },
}));

jest.mock('../../../../../../packages/database/src/generated/client', () => ({
  PrismaClient: class {
    constructor(...args: unknown[]) {
      clientCalls.push(args);
    }
  },
}));

const CLIENT_MODULE = '../../../../../../packages/database/src/client';

const POOLER_URL =
  'postgresql://USER:PASSWORD@aws-0-example.pooler.supabase.com:5432/postgres?schema=superadmin';

const originalDatabaseUrl = process.env.DATABASE_URL;

/** Re-evaluate client.ts from scratch and return what it constructed. */
function loadClient(databaseUrl: string | undefined) {
  adapterCalls.length = 0;
  clientCalls.length = 0;
  // client.ts caches the instance on globalThis outside production, so a second
  // load would otherwise skip the constructor this test is reading.
  delete (globalThis as { prisma?: unknown }).prisma;
  if (databaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = databaseUrl;
  }
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(CLIENT_MODULE) as { prisma: unknown };
}

afterEach(() => {
  delete (globalThis as { prisma?: unknown }).prisma;
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe('@superadmin/database client', () => {
  it('hands the adapter exactly the shared builder output plus its own pool settings', () => {
    loadClient(POOLER_URL);

    expect(adapterCalls).toHaveLength(1);
    expect(adapterCalls[0][0]).toEqual({
      ...pgConnectionConfig(POOLER_URL),
      max: 5,
      connectionTimeoutMillis: 5_000,
    });
  });

  it('verifies Supabase TLS against the pinned root rather than the URL', () => {
    loadClient(POOLER_URL);

    // The failure this exists for is a connection that succeeds unverified, so
    // assert the CA and the flag rather than only that `ssl` is set.
    expect(adapterCalls[0][0]).toMatchObject({
      ssl: { ca: SUPABASE_ROOT_2021_CA, rejectUnauthorized: true },
    });
    const connectionString = (adapterCalls[0][0] as { connectionString: string }).connectionString;
    expect([...new URL(connectionString).searchParams.keys()]).not.toContain('sslmode');
  });

  it('pins model queries to the panel schema', () => {
    loadClient(POOLER_URL);

    expect(adapterCalls[0][1]).toEqual({ schema: 'superadmin' });
  });

  it('gives the adapter to the Prisma client', () => {
    loadClient(POOLER_URL);

    expect(clientCalls).toHaveLength(1);
    expect(clientCalls[0][0]).toMatchObject({ adapter: expect.any(Object) });
  });

  it('refuses to build a client with no DATABASE_URL instead of falling back to localhost', () => {
    // node-postgres does not fail on an absent URL: measured with pg 8.16, an
    // empty or undefined connection string resolves to localhost:5432 as the OS
    // user, which is a silent wrong database rather than a stopped process.
    expect(() => loadClient(undefined)).toThrow(/DATABASE_URL/);
    expect(adapterCalls).toHaveLength(0);
  });
});
