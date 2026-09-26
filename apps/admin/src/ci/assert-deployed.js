#!/usr/bin/env node

/**
 * Assert that a specific commit is the one the deployed app is serving.
 *
 * `/api/health` publishes the commit the running build was made from, so one
 * HTTP request can tie an assertion to the build it was made against. The route
 * answers without authentication. A 401 with a Basic challenge is treated as
 * terminal rather than retried, since waiting longer does not change it.
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
    // A 401 with a Basic challenge does not change by waiting, so polling for
    // the full timeout would only delay the answer.
    const challenge = response.headers.get('www-authenticate');
    if (response.status === 401 && challenge?.toLowerCase().startsWith('basic')) {
      return {
        sha: null,
        terminal: true,
        reason: 'HTTP 401 with a Basic challenge - the health route requires authentication',
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
            'never read. `GET /api/health` is expected to answer without',
            'authentication.',
          ]
        : [
            'This does not mean the site is down - it usually means the build for',
            'this commit did not finish, and the previous build keeps serving.',
            'Check the build log for this branch.',
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
