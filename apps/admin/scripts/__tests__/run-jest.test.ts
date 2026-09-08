/**
 * @jest-environment node
 */
// Tests for the jest wrapper's exit-status handling.
//
// The wrapper is the only path CI takes to the test suite, and `turbo` keys the
// task result off its exit status, so any run it reports as 0 is a green
// required check. These tests pin what it must NOT report as success.
//
// They stub the TOOL rather than the call site: a directory holding an
// executable named `jest` becomes the entire PATH, so the wrapper's real
// `spawn('jest', ...)` is exercised end to end. Asserting on an exported helper
// instead would leave the wiring — which is where the defect lived — untested.
// PATH is replaced rather than prepended: the ambient PATH under a pnpm script
// contains node_modules/.bin, so anything less would find the real jest and run
// the whole suite inside one of its own tests.
//
// Written as a jest test rather than a `node:test` script (the convention for
// scripts/ elsewhere in this repo) so that it runs inside the existing required
// `Test` step rather than needing a CI home of its own.
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const WRAPPER = path.join(__dirname, '..', 'run-jest.mjs');

let stubDir: string;

/**
 * Install `body` as the `jest` executable the wrapper will find.
 * The shebang names this node binary outright so the stub does not need
 * anything else on PATH to run.
 */
function stubJest(body: string): void {
  const stub = path.join(stubDir, 'jest');
  writeFileSync(stub, `#!${process.execPath}\n${body}\n`);
  chmodSync(stub, 0o755);
}

/** Run the wrapper against the stub directory alone. */
function runWrapper(): { status: number | null; stderr: string } {
  const result = spawnSync(process.execPath, [WRAPPER, '--someArg'], {
    encoding: 'utf8',
    env: {
      // Satisfies the wrapper's own full-suite guard, which is not under test here.
      CI: 'true',
      // This repo's ProcessEnv augmentation makes NODE_ENV required, and the
      // env is replaced rather than spread, so it has to be named here.
      NODE_ENV: 'test',
      PATH: stubDir,
    },
  });
  return { status: result.status, stderr: result.stderr ?? '' };
}

beforeEach(() => {
  stubDir = mkdtempSync(path.join(os.tmpdir(), 'run-jest-stub-'));
});

afterEach(() => {
  rmSync(stubDir, { force: true, recursive: true });
});

describe('run-jest.mjs exit status', () => {
  it('passes a successful jest run through as 0', () => {
    stubJest('process.exit(0);');
    expect(runWrapper().status).toBe(0);
  });

  // The must-fail arm. Without it, an assertion that the other cases are
  // non-zero could be satisfied by a wrapper that fails unconditionally.
  it('passes a failing jest run through as its own non-zero code', () => {
    stubJest('process.exit(3);');
    expect(runWrapper().status).toBe(3);
  });

  it('reports failure when jest is killed by a signal', () => {
    // Node reports (code: null, signal: 'SIGKILL') for this child. Treating the
    // null code as 0 is what made a killed suite look like a passing one.
    stubJest("process.kill(process.pid, 'SIGKILL');");
    const { status, stderr } = runWrapper();
    expect(status).not.toBe(0);
    // The status alone is not enough: an unhandled failure inside the wrapper
    // would also be non-zero. The diagnostic is what shows the signal was
    // recognised rather than merely surviving as an accident.
    expect(stderr).toContain('SIGKILL');
  });

  it('reports failure when jest cannot be started at all', () => {
    // No stub written, so PATH holds an empty directory: the spawn emits
    // 'error' and never emits 'exit'. Node exits non-zero on an unhandled
    // 'error' event too, so the status cannot distinguish a handled failure
    // from an unhandled one — only the diagnostic can.
    const { status, stderr } = runWrapper();
    expect(status).not.toBe(0);
    expect(stderr).toContain('Could not start jest');
  });
});
