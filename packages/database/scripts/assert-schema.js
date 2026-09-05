'use strict';

/**
 * Refuse to migrate a database that DATABASE_URL does not point into the
 * panel's own schema.
 *
 * `?schema=superadmin` was added to stop a migration collision on a database
 * shared with the main API. That reason is gone - the panel has its own project
 * now - but the parameter became load bearing for a different one: the tables
 * and every row in them live in that schema, and `public` holds nothing. So
 * dropping it does not restore a default. `migrate deploy` re-applies every
 * migration into an empty `public`, reports success, and the panel comes up
 * looking freshly installed with every lead, consent record and data-subject
 * request invisible. Nothing errors, at any point.
 *
 * That is why this runs BEFORE `prisma migrate deploy` rather than at app
 * startup: on Amplify the migration runs first in the build, so a check in the
 * app would fail after the parallel schema had already been created.
 *
 * Never print DATABASE_URL or any part of it but the schema name - it carries
 * the password, and this output goes to a build log.
 */

const REQUIRED_SCHEMA = 'superadmin';

/**
 * @param {string | undefined} databaseUrl
 * @returns {string | null} an operator-facing problem description, or null when
 *   there is nothing to complain about.
 */
function schemaProblem(databaseUrl) {
  // A missing or unparseable URL is Prisma's to report, and it does so clearly.
  // Answering here as well would put a second, less accurate diagnosis first.
  if (!databaseUrl) return null;

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return null;
  }

  const schema = parsed.searchParams.get('schema');
  if (schema === REQUIRED_SCHEMA) return null;

  const found = schema ? `sets schema=${schema}` : 'has no schema parameter';
  return (
    `DATABASE_URL ${found}; this project's tables live in "${REQUIRED_SCHEMA}".\n` +
    `Migrating without it would create a second, empty set of tables and the panel\n` +
    `would come up with no leads, no consent records and no privacy requests, without\n` +
    `reporting an error. Append ?schema=${REQUIRED_SCHEMA} and run this again.\n` +
    `See docs/deploy.md, "The panel must own its database".`
  );
}

module.exports = { REQUIRED_SCHEMA, schemaProblem };

if (require.main === module) {
  const problem = schemaProblem(process.env.DATABASE_URL);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
}
