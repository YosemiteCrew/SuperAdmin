#!/usr/bin/env ts-node

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');
const PACKAGE_JSON = 'package.json';
const LOCKFILE = 'pnpm-lock.yaml';

type StringMap = Record<string, string>;
type Manifest = {
  pnpm?: { overrides?: StringMap };
  overrideReasons?: StringMap;
  overrideResolutionEffects?: Record<string, boolean>;
};

export function withoutOverrideHeader(lockfile: string): string {
  return lockfile.replace(/\noverrides:\n[\s\S]*?\nimporters:\n/, '\nimporters:\n');
}

export function validateMetadata(
  overrides: StringMap,
  reasons: StringMap,
  effects: Record<string, boolean>
) {
  const overrideKeys = Object.keys(overrides).sort();
  const reasonKeys = Object.keys(reasons).sort();
  const effectKeys = Object.keys(effects).sort();
  return {
    missingReasons: overrideKeys.filter((key) => !reasonKeys.includes(key)),
    staleReasons: reasonKeys.filter((key) => !overrideKeys.includes(key)),
    missingEffects: overrideKeys.filter((key) => !effectKeys.includes(key)),
    staleEffects: effectKeys.filter((key) => !overrideKeys.includes(key)),
  };
}

function copyManifestTree(root: string, target: string): void {
  for (const directory of ['apps', 'packages']) {
    const source = path.join(root, directory);
    for (const entry of readdirSync(source, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const relative = path.join(directory, entry.name, PACKAGE_JSON);
      mkdirSync(path.dirname(path.join(target, relative)), { recursive: true });
      cpSync(path.join(root, relative), path.join(target, relative));
    }
  }
}

function main(): number {
  const root = ROOT;
  const packageFile = path.join(root, PACKAGE_JSON);
  const lockFile = path.join(root, LOCKFILE);
  const manifest = JSON.parse(readFileSync(packageFile, 'utf8')) as Manifest;
  const overrides = manifest.pnpm?.overrides ?? {};
  const expectedEffects = manifest.overrideResolutionEffects ?? {};
  const metadata = validateMetadata(overrides, manifest.overrideReasons ?? {}, expectedEffects);

  if (Object.values(metadata).some((entries) => entries.length)) {
    for (const [problem, entries] of Object.entries(metadata)) {
      if (entries.length) console.error(`${problem}: ${entries.join(', ')}`);
    }
    return 1;
  }

  const originalLockfile = readFileSync(lockFile, 'utf8');
  const baseline = withoutOverrideHeader(originalLockfile);
  const directory = mkdtempSync(path.join(tmpdir(), 'superadmin-overrides-'));
  const changed = [];
  let loadBearing = 0;

  try {
    cpSync(path.join(root, '.npmrc'), path.join(directory, '.npmrc'));
    cpSync(path.join(root, 'pnpm-workspace.yaml'), path.join(directory, 'pnpm-workspace.yaml'));
    copyManifestTree(root, directory);

    for (const selector of Object.keys(overrides)) {
      console.log(`Checking ${selector}`);
      const candidate = structuredClone(manifest);
      delete candidate.pnpm?.overrides?.[selector];
      writeFileSync(path.join(directory, PACKAGE_JSON), `${JSON.stringify(candidate, null, 2)}\n`);
      writeFileSync(path.join(directory, LOCKFILE), originalLockfile);

      const result = spawnSync(
        'pnpm',
        ['install', '--lockfile-only', '--ignore-scripts', '--no-frozen-lockfile'],
        { cwd: directory, encoding: 'utf8' }
      );
      if (result.status !== 0) {
        console.error(result.stderr || result.stdout || `pnpm exited ${result.status}`);
        return result.status || 1;
      }
      const candidateLockfile = readFileSync(path.join(directory, LOCKFILE), 'utf8');
      const affectsResolution = withoutOverrideHeader(candidateLockfile) !== baseline;
      if (affectsResolution) loadBearing += 1;
      if (affectsResolution !== expectedEffects[selector]) changed.push(selector);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }

  if (changed.length) {
    console.error(`pnpm override resolution changed: ${changed.join(', ')}`);
    return 1;
  }
  console.log(
    `${Object.keys(overrides).length} pnpm overrides checked: ${loadBearing} load-bearing, ${Object.keys(overrides).length - loadBearing} redundant.`
  );
  return 0;
}

if (require.main === module) process.exitCode = main();
