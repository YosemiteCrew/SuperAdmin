/**
 * Unit tests for the repo-root pre-commit secret scanner.
 *
 * The scanner lives at `scripts/check-staged-secrets.js`, outside every
 * workspace package, so it has no Jest project of its own and a spec placed
 * next to it would never be collected. It is tested from here because
 * `apps/admin` owns the only Jest project in the repo, and `ci-affected.yaml`
 * runs `pnpm run test --filter admin` on every pull request with no `paths:`
 * filter as the required "Lint + Type-check + Test + Build" check. A later PR
 * touching only `scripts/` still runs this spec.
 *
 * The scanner is also outside `sonar.sources` and outside `collectCoverageFrom`,
 * so it contributes no Sonar coverage in either direction. This spec is the only
 * thing in CI that can go red on a regression here.
 *
 * `collectFindings` is the exported surface deliberately: the two predicates it
 * composes (`isProtectedPath`, `isBlockedLocalFile`) are each individually
 * correct on the paths below. The defect these tests pin lives only in how they
 * are composed, so a predicate-level suite is green before and after the fix.
 */
import { execFileSync } from 'node:child_process';

import { collectFindings } from '../../../../../scripts/check-staged-secrets';

// The scanner reads staged content with `execFileSync('git', ['show', :<path>])`.
// `collectFindings` is handed its file list directly, so that read is the only
// child process it can start — which makes the mock a probe for "was this file
// content-scanned".
jest.mock('node:child_process', () => ({ execFileSync: jest.fn(() => '') }));

type Finding = { file: string; line: number; name: string };

const mockedExecFileSync = execFileSync as unknown as jest.Mock;

const localSecretsFindings = (paths: string[]): Finding[] =>
  (collectFindings(paths) as Finding[]).filter((f) => f.name === 'local secrets file');

const isBlocked = (path: string) => localSecretsFindings([path]).length > 0;

describe('check-staged-secrets: local secrets file rule', () => {
  // Every one of these is an env file that must never be committed, "even if
  // they look empty" per the rule's own comment. All but the first were staged
  // and committed cleanly before the composition was fixed.
  describe.each([
    ['.env'],
    ['.env.local'],
    // Root `.gitignore` covers `.env` and `.env.local` but NOT `.env.production`,
    // so this one is reachable by a plain `git add -A` with no `-f`.
    ['.env.production'],
    ['apps/admin/.env.local'],
    ['packages/database/.env.local'],
    ['packages/database/.env.production'],
  ])('blocks %s', (path) => {
    it('reports it as a local secrets file', () => {
      expect(isBlocked(path)).toBe(true);
    });
  });

  // The exemptions. `.env.example` is a committed template at every depth, and
  // `apps/admin/.env.example` is the only `.env*` file this repo actually
  // tracks — blocking it would break the repo rather than protect it.
  describe.each([
    ['.env.example'],
    ['apps/admin/.env.example'],
    ['packages/types/.env.example'],
    // `.env` mid-name is not a dotfile at a path boundary.
    ['apps/admin/src/config.env.local'],
    // No dot after `.env`, so the rule does not reach it.
    ['apps/admin/.environment'],
    ['README.md'],
  ])('allows %s', (path) => {
    it('reports no local secrets finding', () => {
      expect(isBlocked(path)).toBe(false);
    });
  });

  it('reports one finding per blocked path', () => {
    expect(localSecretsFindings(['apps/admin/.env.local'])).toHaveLength(1);
  });

  it('does not content-scan a file it has already blocked', () => {
    // `.env` is in TEXT_FILE_EXTENSIONS, so a blocked `apps/admin/.env` is also a
    // candidate for the content scan. Dropping blocked paths from the narrowed
    // list preserves the original `continue`: a file already refused by name is
    // never read. Asserted on the read itself rather than on the finding count,
    // because a duplicate would need a credential-shaped fixture to provoke.
    mockedExecFileSync.mockClear();
    collectFindings(['apps/admin/.env']);
    expect(mockedExecFileSync).not.toHaveBeenCalled();
  });

  it('reports every blocked path in a mixed staged set', () => {
    const findings = localSecretsFindings([
      'README.md',
      '.env.production',
      'apps/admin/.env.example',
      'packages/database/.env.local',
    ]);

    expect(findings.map((f) => f.file).sort()).toEqual([
      '.env.production',
      'packages/database/.env.local',
    ]);
  });

  it('returns no findings for an empty staged set', () => {
    expect(collectFindings([])).toEqual([]);
  });
});
