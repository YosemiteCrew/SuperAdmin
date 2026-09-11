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
 * `/api/health` is one of the named `BASIC_AUTH_EXEMPTIONS` the app's own gate
 * carries (`apps/admin/src/proxy.ts`, landed in #377) - a route called by
 * machines that cannot complete a browser Basic Auth challenge is exempt from
 * the panel-wide layer by design. So this request is unauthenticated on
 * purpose, not because a credential is missing. If a 401 with a Basic
 * challenge ever comes back from this URL, that exemption has been removed or
 * narrowed; treat it as terminal rather than retrying, since no credential
 * this script could supply would fix a routing decision.
 *
 *   node apps/admin/src/ci/assert-deployed.js --url <health-url> --sha <commit>
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
async function readDeployedSha(url) {
  let response;
  try {
    response = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  } catch (error) {
    // `fetch` rejects with a bare `TypeError: fetch failed` and puts the useful
    // code on `cause`. Reporting the wrapper would print "TypeError" for a
    // refused connection, a DNS failure and a TLS error alike.
    const code = error.cause?.code ?? error.code ?? error.name;
    return { sha: null, reason: `unreachable (${code})` };
  }
  if (!response.ok) {
    // `/api/health` is a named exemption from the app's own Basic Auth gate
    // (see the file header). A 401 with a Basic challenge means that
    // exemption is gone, not that this run is missing a credential - there is
    // no credential to supply, so polling for the full timeout only delays
    // the answer.
    const challenge = response.headers.get('www-authenticate');
    if (response.status === 401 && challenge?.toLowerCase().startsWith('basic')) {
      return {
        sha: null,
        terminal: true,
        reason: 'HTTP 401 with a Basic challenge - the /api/health exemption appears to be gone',
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

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const url = args.url;
  const expected = args.sha;
  const timeout = Number(args.timeout ?? DEFAULTS.timeout);
  const interval = Number(args.interval ?? DEFAULTS.interval);

  if (!url || !expected) throw new Error('--url and --sha are both required');
  if (!SHA_PATTERN.test(expected)) throw new Error(`--sha is not an object name: "${expected}"`);
  if (!Number.isFinite(timeout) || !Number.isFinite(interval) || interval <= 0) {
    throw new Error('--timeout and --interval must be numbers, and --interval must be positive');
  }

  const deadline = Date.now() + timeout * 1000;
  console.log(`expecting ${expected}`);
  const safeUrl = url.replace(/[\n\r]/g, '_');
  console.log(`polling   ${safeUrl} every ${interval}s for up to ${timeout}s`);

  let attempts = 0;
  let last;

  // Checked once before the first sleep so an already-deployed commit costs one
  // request rather than a full interval.
  for (;;) {
    attempts += 1;
    last = await readDeployedSha(url);
    const seen = (last.sha ?? `- (${last.reason})`).replace(/[\n\r]/g, '_');
    const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
    console.log(`  attempt ${attempts}  deployed ${seen}  ${remaining}s left`);

    if (last.sha === expected) {
      console.log(`\nDEPLOYED: ${safeUrl} is serving ${expected} after ${attempts} attempt(s).`);
      return 0;
    }
    if (last.terminal) {
      console.log('  (terminal condition - not retrying)');
      break;
    }
    if (Date.now() + interval * 1000 >= deadline) break;
    await sleep(interval);
  }

  const gated = last.terminal === true;
  const deployed = (last.sha ?? `not read (${last.reason})`).replace(/[\n\r]/g, '_');
  console.error(
    [
      '',
      gated
        ? 'COULD NOT READ THE DEPLOYED COMMIT: /api/health answered with a Basic Auth challenge.'
        : 'NOT DEPLOYED: the expected commit is not the one being served.',
      `  expected  ${expected}`,
      `  deployed  ${deployed}`,
      `  after     ${attempts} attempt(s)`,
      '',
      ...(gated
        ? [
            'This says NOTHING about whether the deploy succeeded - the sha was',
            'never read. `GET /api/health` is supposed to be exempt from the',
            "panel's Basic Auth gate (`BASIC_AUTH_EXEMPTIONS` in",
            '`apps/admin/src/proxy.ts`). A 401 here means that exemption has been',
            'removed or the route renamed - fix the exemption list, there is no',
            'credential this workflow can add to work around it.',
            '',
            'Do not switch this workflow off to make the red go away. It is',
            'reporting that it cannot see production, which is the state it exists',
            'to make visible.',
          ]
        : [
            'This does not mean the site is down - it usually means the build never',
            'produced an artifact. Check the Amplify job list for this branch; the',
            'previous artifact keeps serving, which is why nothing else goes red.',
          ]),
    ].join('\n')
  );
  return 1;
}

if (require.main === module) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`assert-deployed: ${error.message.replace(/[\n\r]/g, '_')}`);
      process.exit(1);
    }
  );
}

module.exports = { main, parseArgs, readDeployedSha };
