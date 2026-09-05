/**
 * @jest-environment node
 */
import {
  REQUIRED_SCHEMA,
  schemaProblem,
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

// The userinfo here is prose, not a credential shape, on purpose: this repo's
// secret scanners read a string assigned to anything named like a password as a
// finding, and a fixture is not worth teaching them to ignore.
const NAME_PART = 'example-operator';
const SECRET_PART = 'prose-standing-in-for-a-value';
const url = (query: string) =>
  `postgresql://${NAME_PART}:${SECRET_PART}@db.example.invalid:5432/postgres${query}`;

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
    const problem = schemaProblem(url('?schema=public'));
    expect(problem).not.toContain(SECRET_PART);
    expect(problem).not.toContain(NAME_PART);
    expect(problem).not.toContain('db.example.invalid');
  });
});
