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
 * DATABASE_URL is resolved the way Prisma resolves it, environment first and
 * then the .env files Prisma reads. Checking only process.env would leave the
 * guard silently passing whenever the value came from a file.
 */

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_SCHEMA = 'superadmin';

// Prisma loads a .env file itself, from the working directory and from beside
// the schema, and dotenv does not overwrite a variable already in the
// environment. So "unset in process.env" is not "unset as far as Prisma is
// concerned": reading only process.env here would let the same wrong value pass
// unnoticed when it came from a file, and pass in exactly the hand-driven local
// case where someone points a .env at another database to check something. The
// automated path on Amplify uses real environment variables, so a guard that
// only read those would hold where it is least needed and no-op where it is
// most.
const ENV_FILES = ['.env', path.join('prisma', '.env')];

/**
 * The value of one key from `.env` text.
 *
 * Deliberately small rather than a dotenv dependency: this needs to agree with
 * dotenv on the shapes a person actually writes - `export`, surrounding quotes,
 * a trailing comment outside quotes - and nothing else.
 *
 * A `#` inside quotes is preserved rather than treated as a comment, since it is
 * a legal password character. Preserved is as far as it goes: `new URL()` then
 * rejects an unencoded `#` in the authority, so schemaProblem returns null and
 * says nothing. That is safe rather than a hole - Prisma cannot parse the same
 * string either, so no migration runs on it - but the cost is a worse error
 * message, not a bypass. Percent-encode it and both this and Prisma read it.
 *
 * @param {string} contents
 * @param {string} key
 * @returns {string | undefined}
 */
function stripTrailingComment(value) {
  const at = value.indexOf(' #');
  return at === -1 ? value : value.slice(0, at).trim();
}

function unquote(value) {
  const quote = value[0];
  if (quote !== '"' && quote !== "'") return stripTrailingComment(value);
  const end = value.indexOf(quote, 1);
  return end === -1 ? value.slice(1) : value.slice(1, end);
}

/**
 * The value this line assigns to `key`, or null when it assigns something else,
 * assigns nothing, or is a comment.
 *
 * @param {string} rawLine
 * @param {string} key
 * @returns {string | null}
 */
function assignedValue(rawLine, key) {
  const line = rawLine.trim().replace(/^export\s+/, '');
  if (line.startsWith('#')) return null;

  const eq = line.indexOf('=');
  if (eq === -1) return null;
  if (line.slice(0, eq).trim() !== key) return null;

  return unquote(line.slice(eq + 1).trim());
}

/**
 * The value of one key from `.env` text.
 *
 * @param {string} contents
 * @param {string} key
 * @returns {string | undefined}
 */
function valueFromEnvFile(contents, key) {
  for (const line of contents.split('\n')) {
    const value = assignedValue(line, key);
    if (value !== null) return value;
  }
  return undefined;
}

/**
 * File contents, or null when the file is not there. Absence is the normal case
 * - most environments set the variable rather than keeping a file - so it is a
 * return value rather than an exception to step around inside a loop.
 *
 * @param {string} file
 * @param {(p: string) => string} readFile
 * @returns {string | null}
 */
function readIfPresent(file, readFile) {
  try {
    return readFile(file);
  } catch {
    return null;
  }
}

/**
 * DATABASE_URL as Prisma will see it: the environment first, then the same
 * files Prisma reads, in the same order.
 *
 * @param {{ env?: NodeJS.ProcessEnv, cwd?: string, readFile?: (p: string) => string }} [deps]
 * @returns {string | undefined}
 */
function resolveDatabaseUrl(deps = {}) {
  const env = deps.env ?? process.env;
  if (env.DATABASE_URL) return env.DATABASE_URL;

  const cwd = deps.cwd ?? process.cwd();
  const readFile = deps.readFile ?? ((file) => fs.readFileSync(file, 'utf8'));

  for (const candidate of ENV_FILES) {
    const contents = readIfPresent(path.join(cwd, candidate), readFile);
    const value = contents === null ? undefined : valueFromEnvFile(contents, 'DATABASE_URL');
    if (value) return value;
  }

  return undefined;
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

module.exports = { REQUIRED_SCHEMA, resolveDatabaseUrl, schemaProblem, valueFromEnvFile };

if (require.main === module) {
  const problem = schemaProblem(resolveDatabaseUrl());
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
}
