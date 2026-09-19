#!/usr/bin/env node
// Intake-readiness assertion for a deployment the caller has already confirmed
// as live.
//
// `/api/health` publishes `buildSha` and `intake` on purpose. The route's own
// comment says who reads it: a check that can tell "no submissions have
// arrived" apart from "the path has been refusing every submission since the
// day it was deployed". This is that check, and it is deliberately the SHAPE
// the route says is worth having:
//
//   post-deploy assertion - fires once per deployment, against a known
//   artifact, and never on a timer.
//
// A timer repeats the same answer over the same unchanged configuration, and a
// monitor that has learned to ignore a repeating alarm is worse than no monitor
// - the route comment declines a 503 for exactly that reason. This script
// asserts against the artifact that JUST shipped instead.
//
// HOW A CALLER USES IT
//
//   node scripts/ci/intake-readiness.mjs <health.json> <expected-sha> \
//     [--require contact[,consent]]
//
// `health.json` is the body of `GET /api/health`. `<expected-sha>`
// is the commit the caller expected to be live. The caller's job is to say
// WHICH deployment is being asserted (on push to main, that is `github.sha`);
// this script's job is to classify the body it is given.
//
// EXIT SEMANTICS - the same three-way rule the forbidden-terms gate uses:
//
//   exit 0  ran, and the assertion held
//   exit 1  ran, and found the failure this check exists to catch
//   exit 2  could not run - the body was unreadable, so an assertion that did
//           not happen is red, not clean
//
// A caller treating 2 as a pass has switched the check off without saying so.
//
// WHAT "the assertion held" MEANS, AND WHAT IT DOES NOT
//
// exit 0 covers two different facts and prints which one:
//
//   NOT_DEPLOYED   the live buildSha does not match the expected sha, so no
//                  assertion is made about THIS deployment yet; a polling
//                  caller keeps polling
//   DEPLOYED_OK    the expected sha IS live and every required intake is
//                  configured
//
// exit 1 names the fields that are unconfigured:
//
//   DEPLOYED_BUT_UNCONFIGURED  the expected sha is live and at least one
//                              intake is refusing writes
//
// The contact and consent keys are optional by design - a deployment may
// legitimately never provision one. Callers select the paths the deployment
// must serve with `--require`; omitted means both for backwards compatibility.
// Unrequired paths are still printed so their state is visible without making
// an intentionally dormant path fail every deployment.

import { readFileSync } from 'node:fs';
import process from 'node:process';
import { parseArgs } from 'node:util';

const INTAKES = ['contact', 'consent'];

/**
 * Classify a parsed health body against the expected live commit.
 *
 * Returns `{ state, details }` where `state` is one of `NOT_DEPLOYED`,
 * `DEPLOYED_OK`, `DEPLOYED_BUT_UNCONFIGURED`, and `details` is free text
 * suited to a log line. Throws an Error for anything that means "could not
 * run": unparseable JSON, a body that is not an object, a missing or empty
 * `buildSha`, or a missing/unobject `intake`.
 *
 * `buildSha` is the load-bearing field. Comparing the body's buildSha to the
 * expected sha is what makes this deploy-scoped rather than periodic: absent
 * or empty means the build environment did not supply its commit (the `??`
 * vs `||` trap the route documents), and a check that asserts against an
 * empty string asserts against nothing.
 */
export function classifyReadiness(body, expectedSha, requiredIntakes = INTAKES) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error('body is not a JSON object');
  }
  const { buildSha, intake } = body;
  if (typeof buildSha !== 'string' || buildSha.trim() === '') {
    throw new Error('buildSha is absent or empty, so this deployment cannot be attributed');
  }
  if (typeof intake !== 'object' || intake === null || Array.isArray(intake)) {
    throw new Error('intake is absent or not an object');
  }

  if (buildSha !== expectedSha) {
    return {
      state: 'NOT_DEPLOYED',
      details: `expected ${expectedSha}, live ${buildSha}`,
    };
  }

  const unconfigured = requiredIntakes.filter((k) => intake[k] !== 'configured');
  if (unconfigured.length === 0) {
    const names =
      requiredIntakes.length === INTAKES.length ? '' : ` ${requiredIntakes.join(' and ')}`;
    return { state: 'DEPLOYED_OK', details: `${buildSha} live, intake${names} configured` };
  }
  return {
    state: 'DEPLOYED_BUT_UNCONFIGURED',
    details: `${buildSha} live, intake ${unconfigured.join(' and ')} not configured`,
  };
}

function fail(reason) {
  process.stderr.write(`intake-readiness: could not run - ${reason}.\n`);
  if (process.env.CI === 'true') {
    process.stderr.write(
      'intake-readiness: exit 2 - an assertion that did not run is red, not clean.\n'
    );
  }
  process.exitCode = 2;
}

function parseRequiredIntakes(value) {
  if (value === undefined) return INTAKES;
  const names = [...new Set(value.split(','))];
  if (names.some((name) => name === '')) {
    throw new Error('--require must name at least one intake');
  }
  const unknown = names.filter((name) => !INTAKES.includes(name));
  if (unknown.length > 0) {
    throw new Error(`unknown intake name: ${unknown.join(', ')}`);
  }
  return names;
}

function main() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: { require: { type: 'string' } },
      allowPositionals: true,
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return;
  }

  const [healthPath, expectedSha] = parsed.positionals;
  if (!healthPath || !expectedSha) {
    fail(
      'usage: node scripts/ci/intake-readiness.mjs <health.json> <expected-sha> [--require contact[,consent]]'
    );
    return;
  }

  let requiredIntakes;
  try {
    requiredIntakes = parseRequiredIntakes(parsed.values.require);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return;
  }

  let body;
  try {
    body = JSON.parse(readFileSync(healthPath, 'utf8'));
  } catch {
    fail('health response was not parseable JSON');
    return;
  }
  try {
    const { state, details } = classifyReadiness(body, expectedSha, requiredIntakes);
    process.stdout.write(`intake-readiness: ${state} - ${details}.\n`);
    if (state !== 'NOT_DEPLOYED') {
      for (const name of INTAKES.filter((intake) => !requiredIntakes.includes(intake))) {
        process.stdout.write(
          `intake-readiness: INFO - intake ${name} is ${body.intake[name] === 'configured' ? '' : 'un'}configured (not required).\n`
        );
      }
    }
    if (state === 'DEPLOYED_BUT_UNCONFIGURED') {
      process.exitCode = 1;
    }
  } catch (error) {
    fail(error.message);
  }
}

main();
