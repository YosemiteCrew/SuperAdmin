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
child.on('exit', (code) => process.exit(code ?? 0));
