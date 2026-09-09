#!/usr/bin/env node
// Thin wrapper around jest that enforces --testPathPattern is set
// when running in non-CI mode to prevent accidental full-suite runs.
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const isCI = process.env.CI === 'true';
const hasPattern = args.some(
  (a) => a.startsWith('--testPathPattern') || a.startsWith('--testRegex') || a === '--watchAll'
);

if (!isCI && !hasPattern) {
  console.error(
    '\n❌ Full test suite run blocked. Pass --testPathPatterns=<file> to target tests.\n' +
      '   Use test:ci or test:coverage scripts for full-suite CI runs.\n'
  );
  process.exit(1);
}

const child = spawn('jest', args, { stdio: 'inherit' });

// A child that could not be started never emits 'exit', so without this the
// wrapper would reject an unhandled error instead of reporting a failed run.
child.on('error', (error) => {
  console.error(`\n❌ Could not start jest: ${error.message}\n`);
  process.exit(1);
});

// `code` is null when the child was terminated by a SIGNAL — the signal name
// arrives in the second argument. Defaulting that to 0 would report an
// OOM-killed or timed-out jest as a passing test run, and turbo keys the task
// result off this exit status. An exit carrying neither a code nor a signal is
// not evidence of success either, so the fallback is a failure.
child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`\n❌ jest was terminated by ${signal}. Reporting a failed run.\n`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
