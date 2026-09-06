#!/usr/bin/env node

/**
 * Assert that a specific commit is the one the deployed app is serving.
 *
 * Nothing in this repository observed whether a merge to `main` actually
 * shipped. The panel deploys through the Amplify GitHub app, so there is no CD
 * workflow to fail and no webhook response to check - a merge either becomes a
 * build or does not, and the only signal was the Amplify console. On
 * 2026-09-06 a `DATABASE_URL` edit broke `migrate:deploy` and `main` stopped
 * deploying entirely; the repository stayed green, the site stayed up serving
 * the previous artifact, and the break was found by someone reading the job
 * list on a hunch.
 *
 * The deployed artifact can answer the question itself. `/api/health` publishes
 * the commit it was built from, and its own comment says why: so an assertion
 * can be tied to the artifact it was made against. This is that assertion.
 *
 * No AWS API call: the IAM principal available to this fleet is under an
 * explicit deny for Amplify configuration, and a check nobody can run is not a
 * check. One HTTP request is the whole dependency.
 *
 * `main` is behind Amplify branch access control, which is a single boolean per
 * branch with no per-path exemption - it sits in front of `/api/health` exactly
 * as it sits in front of everything else. So the request carries HTTP basic
 * auth, supplied through `HEALTH_BASIC_AUTH` as the base64 `user:password`
 * Amplify itself stores. The value is never printed, and no default is baked
 * in: if the gate is on and the variable is absent, this fails rather than
 * quietly reporting an unreachable app.
 *
 *   HEALTH_BASIC_AUTH=<base64> node scripts/assert-deployed.js --url <health-url> --sha <commit>
 *
 * Exit 0 only when the deployed sha equals the expected one. Every other
 * outcome - unreachable, non-200, unparseable, absent sha, still the previous
 * commit when time runs out - exits 1. A timeout is a failure, not a shrug:
 * an assertion whose exhausted state reads like success asserts nothing.
 */

const DEFAULTS = { timeout: 720, interval: 15 };

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    if (!key.startsWith('--')) throw new Error(`expected a --flag, got "${key}"`);
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`--${key.slice(2)} has no value`);
    args[key.slice(2)] = value;
  }
  return args;
}

/** A 40-character lowercase hex object name, and nothing else. */
const SHA_PATTERN = /^[0-9a-f]{40}$/;

/**
 * Read the deployed sha, or say why it could not be read.
 *
 * Every failure is reported as a reason rather than thrown, because all of them
 * are expected while a deployment is in flight: the CDN can serve a 502 during
 * a swap, and a partially deployed app can answer with an older body. The
 * caller retries on a reason and only the deadline is fatal.
 */
async function readDeployedSha(url, authorization) {
  let response;
  try {
    const headers = { 'cache-control': 'no-cache' };
    if (authorization) headers.authorization = authorization;
    response = await fetch(url, { headers });
  } catch (error) {
    // `fetch` rejects with a bare `TypeError: fetch failed` and puts the useful
    // code on `cause`. Reporting the wrapper would print "TypeError" for a
    // refused connection, a DNS failure and a TLS error alike.
    const code = error.cause?.code ?? error.code ?? error.name;
    return { sha: null, reason: `unreachable (${code})` };
  }
  if (!response.ok) {
    // A 401 has two meanings here and they need different fixes. The branch
    // gate answers with `WWW-Authenticate: Basic`; the application's own routes
    // do not. Reading the code alone is what let a gate rejection be mistaken
    // for an application rejection on 2026-09-06 - same status, opposite cause.
    const challenge = response.headers.get('www-authenticate');
    if (response.status === 401 && challenge?.toLowerCase().startsWith('basic')) {
      return {
        sha: null,
        reason: authorization
          ? 'HTTP 401 from the branch access-control gate - the supplied credential was rejected'
          : 'HTTP 401 from the branch access-control gate - no credential was supplied',
      };
    }
    return { sha: null, reason: `HTTP ${response.status}` };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return { sha: null, reason: 'response is not JSON' };
  }
  const sha = body?.buildSha;
  if (sha === null || sha === undefined) return { sha: null, reason: 'buildSha absent or null' };
  if (typeof sha !== 'string' || !SHA_PATTERN.test(sha)) {
    // Not merely unequal: a non-sha here means the build could not identify
    // itself, which stays wrong however long we wait.
    return { sha: null, reason: `buildSha is not an object name (${JSON.stringify(sha)})` };
  }
  return { sha, reason: null };
}

const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = args.url;
  const expected = args.sha;
  const timeout = Number(args.timeout ?? DEFAULTS.timeout);
  const interval = Number(args.interval ?? DEFAULTS.interval);

  if (!url || !expected) throw new Error('--url and --sha are both required');
  if (!SHA_PATTERN.test(expected)) throw new Error(`--sha is not an object name: "${expected}"`);
  if (!Number.isFinite(timeout) || !Number.isFinite(interval) || interval <= 0) {
    throw new Error('--timeout and --interval must be numbers, and --interval must be positive');
  }

  // Never interpolated into output. Only its presence is ever reported.
  const credential = (process.env.HEALTH_BASIC_AUTH ?? '').trim();
  const authorization = credential ? `Basic ${credential}` : null;

  const deadline = Date.now() + timeout * 1000;
  console.log(`expecting ${expected}`);
  console.log(`polling   ${url} every ${interval}s for up to ${timeout}s`);
  console.log(`basic auth ${authorization ? 'supplied' : 'NOT supplied'}`);

  let attempts = 0;
  let last = { sha: null, reason: 'never read' };

  // Checked once before the first sleep so an already-deployed commit costs one
  // request rather than a full interval.
  for (;;) {
    attempts += 1;
    last = await readDeployedSha(url, authorization);
    const seen = last.sha ?? `- (${last.reason})`;
    const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
    console.log(`  attempt ${attempts}  deployed ${seen}  ${remaining}s left`);

    if (last.sha === expected) {
      console.log(`\nDEPLOYED: ${url} is serving ${expected} after ${attempts} attempt(s).`);
      return 0;
    }
    if (Date.now() + interval * 1000 >= deadline) break;
    await sleep(interval);
  }

  console.error(
    [
      '',
      'NOT DEPLOYED: the expected commit is not the one being served.',
      `  expected  ${expected}`,
      `  deployed  ${last.sha ?? `none (${last.reason})`}`,
      `  waited    ${timeout}s over ${attempts} attempt(s)`,
      '',
      'This does not mean the site is down - it usually means the build never',
      'produced an artifact. Check the Amplify job list for this branch; the',
      'previous artifact keeps serving, which is why nothing else goes red.',
      '',
      'If the reason above names the access-control gate, this is not a deploy',
      'failure at all: the credential is missing or wrong, and the deployed sha',
      'was never read. Fix that before reading anything into the result.',
    ].join('\n')
  );
  return 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(`assert-deployed: ${error.message}`);
    process.exit(1);
  }
);
