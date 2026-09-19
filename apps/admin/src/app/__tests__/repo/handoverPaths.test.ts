/**
 * @jest-environment node
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const HANDOVER = path.join(REPO_ROOT, 'HANDOVER.md');
const ADMIN_PACKAGE = path.join(REPO_ROOT, 'apps/admin/package.json');
const SONAR_PROPERTIES = path.join(REPO_ROOT, 'apps/admin/sonar-project.properties');

type PackageManifest = {
  name: string;
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

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

function fencedPnpmCommands(markdown: string): string[] {
  return Array.from(markdown.matchAll(/```(?:bash|sh)\n([\s\S]*?)```/g), ([, block]) => block)
    .flatMap((block) => block.split('\n'))
    .map((line) => line.trim())
    .filter((line) => line.startsWith('pnpm '));
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

  it('uses maintained package scripts and binaries in fenced pnpm commands', () => {
    const commands = fencedPnpmCommands(handover);
    const rootPackage = JSON.parse(
      readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
    ) as PackageManifest;
    const adminPackage = JSON.parse(readFileSync(ADMIN_PACKAGE, 'utf8')) as PackageManifest;
    const workspaces = new Map([[adminPackage.name, adminPackage]]);
    const rootBinaries = new Set([
      ...Object.keys(rootPackage.dependencies ?? {}),
      ...Object.keys(rootPackage.devDependencies ?? {}),
    ]);

    const unresolved = commands.filter((command) => {
      const filteredScript = command.match(/^pnpm --filter (\S+) run ([\w:-]+)/);
      if (filteredScript) {
        const [, workspace, script] = filteredScript;
        return !workspaces.get(workspace)?.scripts[script];
      }

      const rootBinary = command.match(/^pnpm exec (\S+)/)?.[1];
      return !rootBinary || !rootBinaries.has(rootBinary);
    });

    expect(commands).toHaveLength(5);
    expect(unresolved).toEqual([]);
  });

  it('names the configured SonarCloud project key', () => {
    const documentedKey = handover.match(/SonarCloud project key is `([^`]+)`/)?.[1];
    const configuredKey = readFileSync(SONAR_PROPERTIES, 'utf8').match(
      /^sonar\.projectKey=(.+)$/m
    )?.[1];

    expect(documentedKey).toBe(configuredKey);
  });
});
