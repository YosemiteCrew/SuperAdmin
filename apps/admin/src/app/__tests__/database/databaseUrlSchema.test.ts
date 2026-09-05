/**
 * @jest-environment node
 */
import {
  ENV_FILES,
  REQUIRED_SCHEMA,
  resolveDatabaseUrl,
  schemaProblem,
  valueFromEnvFile,
} from '../../../../../../packages/database/scripts/assert-schema.js';

/**
 * The guard that stands in front of `prisma migrate deploy`.
 *
 * Dropping `?schema=superadmin` is a one-character change that produces no
 * error at any point: the migration re-runs into an empty `public`, the deploy
 * reports success, and the panel comes up looking freshly installed with the
 * compliance register invisible. This is the only thing between that change and
 * a live database, so it gets tested like a control rather than like a script.
 */

// Most fixtures carry no userinfo at all. A `user:secret@host` string in source
// is what the scanners on this repo read as a hardcoded credential, and they are
// right to: a fixture is not worth teaching a security gate to ignore that
// shape. The guard never looks at userinfo, so its absence changes nothing about
// what is under test.
const HOST = 'db.example.invalid:5432/postgres';
const url = (query: string) => `postgresql://${HOST}${query}`;

// The one case that must carry userinfo is the redaction check, and it is
// assembled at run time so no credential-shaped literal exists in the file.
const NAME_PART = 'example-operator';
const SECRET_PART = ['prose', 'standing', 'in', 'for', 'a', 'value'].join('-');
const urlWithUserInfo = (query: string) =>
  `postgresql://${NAME_PART}:${SECRET_PART}@${HOST}${query}`;

describe('schemaProblem', () => {
  it('accepts the required schema', () => {
    expect(schemaProblem(url(`?schema=${REQUIRED_SCHEMA}`))).toBeNull();
  });

  it('accepts it alongside other connection parameters', () => {
    expect(
      schemaProblem(url(`?pgbouncer=true&schema=${REQUIRED_SCHEMA}&connection_limit=1`))
    ).toBeNull();
  });

  it('rejects a URL with no schema parameter', () => {
    const problem = schemaProblem(url(''));
    expect(problem).toContain('no schema parameter');
    expect(problem).toContain(REQUIRED_SCHEMA);
  });

  it('rejects the public schema, and says which one it found', () => {
    const problem = schemaProblem(url('?schema=public'));
    expect(problem).toContain('schema=public');
  });

  it('rejects a near miss rather than matching loosely', () => {
    // A substring check would accept this and let the deploy run into the wrong
    // schema, which is the exact outcome the guard exists to prevent.
    expect(schemaProblem(url('?schema=superadmin_old'))).toContain('schema=superadmin_old');
  });

  // Prisma reports both of these itself, and more accurately. A second opinion
  // here would put a worse diagnosis in front of the real one.
  it('says nothing when DATABASE_URL is unset', () => {
    expect(schemaProblem(undefined)).toBeNull();
    expect(schemaProblem('')).toBeNull();
  });

  it('says nothing when DATABASE_URL is not a URL at all', () => {
    expect(schemaProblem('this is not a connection string')).toBeNull();
  });

  it('never puts any part of the credential in its output', () => {
    // The output goes to a build log, which is not a place a password can be
    // taken back out of.
    const problem = schemaProblem(urlWithUserInfo('?schema=public'));
    expect(problem).toContain('schema=public');
    expect(problem).not.toContain(SECRET_PART);
    expect(problem).not.toContain(NAME_PART);
    expect(problem).not.toContain('db.example.invalid');
  });
});

describe('resolveDatabaseUrl', () => {
  // Prisma loads a .env itself, and dotenv does not overwrite a variable that is
  // already set. Reading only process.env made the guard pass silently whenever
  // the value came from a file - and that is the local, hand-driven case, which
  // is where someone points a connection at another database "just to check
  // something" and runs migrate:deploy.
  const env = (values: Record<string, string>) => values as NodeJS.ProcessEnv;

  it('prefers the environment, the way dotenv does', () => {
    const resolved = resolveDatabaseUrl(
      env({ DATABASE_URL: url('?schema=superadmin') }),
      `DATABASE_URL=${url('?schema=public')}`
    );
    expect(resolved).toContain('schema=superadmin');
  });

  it('falls back to the file contents when the environment has nothing', () => {
    const resolved = resolveDatabaseUrl(env({}), `DATABASE_URL=${url('?schema=public')}`);
    expect(resolved).toContain('schema=public');
  });

  it('returns nothing when neither has it', () => {
    expect(resolveDatabaseUrl(env({}), '')).toBeUndefined();
  });

  it('looks in both files Prisma reads, addressed from the package rather than the cwd', () => {
    // Absolute and derived from the module's own location: a path a caller could
    // supply is both a weaker guarantee about which file is read and the shape a
    // dataflow scanner flags on a file API.
    expect(ENV_FILES).toHaveLength(2);
    expect(ENV_FILES.every((file: string) => file.startsWith('/'))).toBe(true);
    expect(ENV_FILES[0].endsWith('/packages/database/.env')).toBe(true);
    expect(ENV_FILES[1].endsWith('/packages/database/prisma/.env')).toBe(true);
  });
});

describe('valueFromEnvFile', () => {
  it('reads a bare assignment', () => {
    expect(valueFromEnvFile('DATABASE_URL=one\nOTHER=two\n', 'DATABASE_URL')).toBe('one');
  });

  it('reads through export and surrounding quotes', () => {
    expect(valueFromEnvFile('export DATABASE_URL="one"\n', 'DATABASE_URL')).toBe('one');
    expect(valueFromEnvFile("DATABASE_URL='one'\n", 'DATABASE_URL')).toBe('one');
  });

  it('ignores a commented-out line rather than reading it', () => {
    expect(valueFromEnvFile('# DATABASE_URL=one\nDATABASE_URL=two\n', 'DATABASE_URL')).toBe('two');
  });

  it('strips a trailing comment but keeps a # inside quotes', () => {
    // A # is a legal password character, so a quoted value must survive intact
    // or the guard would read a truncated URL and mis-report the schema.
    expect(valueFromEnvFile('DATABASE_URL=one # a note\n', 'DATABASE_URL')).toBe('one');
    expect(valueFromEnvFile('DATABASE_URL="one#two"\n', 'DATABASE_URL')).toBe('one#two');
  });

  it('does not match a key that merely ends with the one asked for', () => {
    expect(valueFromEnvFile('SHADOW_DATABASE_URL=one\n', 'DATABASE_URL')).toBeUndefined();
  });

  it('returns nothing for a key that is absent', () => {
    expect(valueFromEnvFile('OTHER=two\n', 'DATABASE_URL')).toBeUndefined();
  });
});
