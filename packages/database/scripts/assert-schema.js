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
 *
 * DATABASE_URL has to be resolved the way Prisma resolves it. Prisma loads a
 * .env itself, from the working directory and from beside the schema, and
 * dotenv does not overwrite a variable already in the environment - so reading
 * only process.env would let the same wrong value pass unnoticed when it came
 * from a file, in exactly the hand-driven local case where someone points a
 * .env at another database to check something. The automated path on Amplify
 * uses real environment variables, so a guard that only read those would hold
 * where it is least needed and no-op where it is most.
 *
 * The loading is dotenv's rather than a hand-written parser: it is the library
 * Prisma itself uses, so the semantics agree by construction instead of by my
 * reimplementation of quoting, `export` and comment rules.
 */

const path = require('node:path');

const dotenv = require('dotenv');

const REQUIRED_SCHEMA = 'superadmin';

// Absolute and derived from this module's own location rather than from the
// working directory, so the guard reads the panel's own .env however it is
// invoked. `pnpm --filter @superadmin/database run migrate:deploy` runs with the
// package root as its working directory, so these are the same two files Prisma
// reads there.
const ENV_FILES = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', 'prisma', '.env'),
];

/**
 * Load both .env files into process.env, without overwriting anything already
 * set - dotenv's own rule, and Prisma's.
 *
 * A missing file is the ordinary case and contributes nothing. Any other read
 * failure is fatal: "cannot read it" and "it is not there" lead to opposite
 * conclusions here, and treating an unreadable file as absent would let a wrong
 * schema through while the guard reported nothing to say.
 */
function loadEnvFiles() {
  for (const file of ENV_FILES) {
    const { error } = dotenv.config({ path: file });
    if (error && error.code !== 'ENOENT') throw error;
  }
}

/**
 * DATABASE_URL as Prisma will see it.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | undefined}
 */
function resolveDatabaseUrl(env = process.env) {
  return env.DATABASE_URL;
}

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

module.exports = { ENV_FILES, REQUIRED_SCHEMA, resolveDatabaseUrl, schemaProblem };

if (require.main === module) {
  let problem;
  try {
    loadEnvFiles();
    problem = schemaProblem(resolveDatabaseUrl());
  } catch (error) {
    // Fail closed and say only the error code. The message from a failed read
    // carries the path, and this goes to a build log.
    const code = typeof error === 'object' && error !== null ? error.code : undefined;
    console.error(
      `Could not read the .env files to check DATABASE_URL (${code ?? 'unknown error'}).\n` +
        'Refusing to migrate rather than assume the value is correct.'
    );
    process.exit(1);
  }
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
}
