/**
 * @jest-environment node
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const HANDOVER = path.join(REPO_ROOT, 'HANDOVER.md');
const ADMIN_PACKAGE = path.join(REPO_ROOT, 'apps/admin/package.json');

function documentedPaths(markdown: string): string[] {
  const knownExtension = /\.(?:cjs|json|md|mjs|prisma|ts|tsx|ya?ml)$/;
  return [
    ...new Set(
      Array.from(markdown.matchAll(/`([^`\n]+)`/g), ([, token]) => token).filter(
        (token) => !/\s|[<>*]/.test(token) && (token.includes('/') || knownExtension.test(token))
      )
    ),
  ];
}

function trackedPathExists(entry: string, trackedPaths: Set<string>): boolean {
  if (trackedPaths.has(entry)) return true;
  const directoryPrefix = `${entry.replace(/\/$/, '')}/`;
  return [...trackedPaths].some((trackedPath) => trackedPath.startsWith(directoryPrefix));
}

describe('HANDOVER.md', () => {
  const handover = readFileSync(HANDOVER, 'utf8');

  it('references repository paths that exist', () => {
    const paths = documentedPaths(handover);
    const trackedPaths = new Set(
      execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim().split('\n')
    );

    expect(paths.length).toBeGreaterThanOrEqual(15);
    expect(paths.filter((entry) => !trackedPathExists(entry, trackedPaths))).toEqual([]);
  });

  it('names the installed Next.js major', () => {
    const documentedMajor = handover.match(/Next\.js (\d+)/)?.[1];
    const packageJson = JSON.parse(readFileSync(ADMIN_PACKAGE, 'utf8')) as {
      dependencies: { next: string };
    };
    const installedMajor = packageJson.dependencies.next.match(/\d+/)?.[0];

    expect(documentedMajor).toBe(installedMajor);
  });
});
