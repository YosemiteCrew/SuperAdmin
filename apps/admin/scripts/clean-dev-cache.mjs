#!/usr/bin/env node
// Targeted cleanup before `next dev`.
// Removes only the cache slices that can poison Turbopack's incremental graph.
//
// SAFETY: refuses to run if a dev server is already listening on the dev port.
// Wiping .next/cache while next dev is alive breaks the running process — the
// runtime tries to require chunks we just deleted.
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:net';

const root = resolve(import.meta.dirname, '..');
const DEFAULT_DEV_PORT = Number(process.env.PORT ?? 3000);

async function isPortInUse(port) {
  return new Promise((resolveCheck) => {
    const tester = createServer()
      .once('error', (err) => {
        resolveCheck(err.code === 'EADDRINUSE');
      })
      .once('listening', () => {
        tester.close(() => resolveCheck(false));
      })
      .listen(port, '127.0.0.1');
  });
}

if (await isPortInUse(DEFAULT_DEV_PORT)) {
  process.stdout.write(
    `  skip     port ${DEFAULT_DEV_PORT} is in use (dev server running) — not wiping caches.\n`
  );
  process.exit(0);
}

const targets = ['.next/cache', '.turbo'];

for (const relative of targets) {
  const full = resolve(root, relative);
  try {
    await rm(full, { recursive: true, force: true });
    process.stdout.write(`  cleaned  ${relative}\n`);
  } catch (error) {
    process.stdout.write(`  skip     ${relative} (${error.message})\n`);
  }
}
