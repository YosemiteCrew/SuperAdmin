/**
 * @jest-environment node
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * `/api/health` publishes `buildSha` so an external check can tie an assertion
 * about the deployed configuration to the artifact it was made against. That is
 * only worth anything if the value is a commit.
 *
 * `amplify.yml` used to write it whenever `AWS_COMMIT_ID` was non-empty. A
 * webhook build supplies a real sha; a manually started job supplies the literal
 * string `HEAD`, which a presence test accepts and publishes as though it were
 * one. So the field was correct on every ordinary day and wrong during a
 * hand-run recovery deploy — the one occasion when "which commit is live" is the
 * question being asked. Observed on job 64.
 *
 * This runs the stanza as it is written in `amplify.yml` rather than a copy of
 * it, so the test cannot pass against a rule the build does not actually use.
 */

const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..');
const AMPLIFY_YML = join(REPO_ROOT, 'amplify.yml');

/**
 * The build-sha region of `amplify.yml`, lifted out of the YAML block scalar and
 * dedented so `sh` can run it. Delimited by sentinel comments rather than by
 * matching `if`/`fi`, because the region now contains nested conditionals and a
 * brace-matching extractor would silently pick a shorter span.
 */
const START = '# >>> build sha';
const END = '# <<< build sha';

function extractBuildShaStanza(): string {
  const lines = readFileSync(AMPLIFY_YML, 'utf8').split('\n');
  const start = lines.findIndex((line) => line.trim() === START);
  const end = lines.findIndex((line) => line.trim() === END);
  if (start === -1) throw new Error(`amplify.yml has no \`${START}\` marker`);
  if (end === -1) throw new Error(`amplify.yml has no \`${END}\` marker`);
  if (end <= start) throw new Error('the build sha markers are in the wrong order');

  const stanza = lines.slice(start + 1, end);
  const indent = /^\s*/.exec(stanza[0])?.[0].length ?? 0;
  return stanza.map((line) => line.slice(indent)).join('\n');
}

interface RunResult {
  stdout: string;
  written: string | null;
}

function runWith(
  commitId: string | undefined,
  options: { gitRepo?: boolean; unborn?: boolean } = {}
): RunResult {
  const dir = mkdtempSync(join(tmpdir(), 'build-sha-'));
  try {
    // The fallback reads the checkout, so a case that exercises it needs a real
    // one. Identity is passed per-command: a machine with no global git config
    // must not change what this test measures.
    if (options.gitRepo) {
      const git = (...args: string[]): void => {
        execFileSync('git', ['-c', 'user.email=t@t.test', '-c', 'user.name=t', ...args], {
          cwd: dir,
          stdio: 'ignore',
        });
      };
      git('init', '-q');
      if (!options.unborn) git('commit', '-q', '--allow-empty', '-m', 'fixture');
    }

    const env = { ...process.env };
    delete env.AWS_COMMIT_ID;
    if (commitId !== undefined) env.AWS_COMMIT_ID = commitId;

    const stdout = execFileSync('sh', ['-c', extractBuildShaStanza()], {
      cwd: dir,
      env,
      encoding: 'utf8',
    });
    const artifact = join(dir, '.env.production');
    const written = existsSync(artifact) ? readFileSync(artifact, 'utf8').trim() : null;
    return { stdout, written };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function headShaOf(stdout: string): string {
  const match = /NEXT_PUBLIC_BUILD_SHA=([0-9a-fA-F]{7,40})/.exec(stdout);
  return match?.[1] ?? '';
}

const SHA = 'f048b979b39742d535452ae35ae0acfeadb38d9a';

describe('the amplify.yml stanza this test runs', () => {
  // A stanza that failed to extract would make every assertion below pass
  // against nothing at all.
  const stanza = extractBuildShaStanza();

  it('is the real write, not an empty or truncated extraction', () => {
    expect(stanza).toContain('NEXT_PUBLIC_BUILD_SHA=');
    expect(stanza).toContain('AWS_COMMIT_ID');
    expect(stanza).toContain('git rev-parse HEAD');
    expect(stanza).toContain('is_commit_sha');
    expect(stanza.split('\n').length).toBeGreaterThanOrEqual(15);
  });
});

describe('buildSha is written only for something shaped like a commit', () => {
  it.each([
    ['a full 40-character sha', SHA],
    ['an abbreviated sha', 'f048b97'],
    // Git emits lowercase, so this has no known source — but accepting it can
    // only ever preserve a working sha, and no rejected value is hex anyway.
    ['an uppercase sha', SHA.toUpperCase()],
  ])('writes it for %s', (_label, commitId) => {
    const { stdout, written } = runWith(commitId);
    expect(written).toBe(`NEXT_PUBLIC_BUILD_SHA=${commitId}`);
    expect(stdout).toContain(`OK: NEXT_PUBLIC_BUILD_SHA=${commitId} (from AWS_COMMIT_ID)`);
  });

  it.each([
    // What a manually started Amplify job actually supplies. This is the case
    // the presence test shipped.
    ['the literal string HEAD', 'HEAD'],
    ['a ref name', 'refs/heads/main'],
    ['a branch name', 'main'],
    ['the empty string', ''],
    ['whitespace', '   '],
    ['a sha with trailing whitespace', `${SHA} `],
    ['something too short to be a sha', 'f048b9'],
    ['something too long to be a sha', `${SHA}0`],
    // `grep -qE '^…$'` anchors PER LINE and `printf '%s'` preserves newlines, so
    // a value with one matching line satisfied it. `case` is whole-string.
    ['a sha hiding on the second line of a multi-line value', `HEAD\n${SHA}`],
    ['a sha followed by another line', `${SHA}\nNEXT_PUBLIC_OTHER=1`],
    ['a leading newline before a sha', `\n${SHA}`],
  ])('rejects %s and, with no checkout to fall back to, writes nothing', (_label, commitId) => {
    const { stdout, written } = runWith(commitId);
    expect(written).toBeNull();
    expect(stdout).toContain('WARN: AWS_COMMIT_ID is not a commit sha');
    expect(stdout).toContain('WARN: no commit sha available');
  });

  it('writes nothing when the variable is absent entirely', () => {
    const { stdout, written } = runWith(undefined);
    expect(written).toBeNull();
    expect(stdout).toContain('WARN: no commit sha available');
  });

  it('names the offending value in the warning, so a build log says which', () => {
    expect(runWith('HEAD').stdout).toContain("got 'HEAD'");
  });
});

describe('the git fallback', () => {
  it('reports the checkout when AWS_COMMIT_ID is HEAD, which is the case that shipped', () => {
    const { stdout, written } = runWith('HEAD', { gitRepo: true });
    const sha = headShaOf(written ?? '');
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
    expect(written).toBe(`NEXT_PUBLIC_BUILD_SHA=${sha}`);
    expect(stdout).toContain(`OK: NEXT_PUBLIC_BUILD_SHA=${sha} (from git)`);
  });

  it('is not reached when the platform supplies a real sha', () => {
    // The control for the case above: inside the same kind of checkout, a valid
    // AWS_COMMIT_ID must still win, or the fallback would be masking whether the
    // preferred source was read at all.
    const { stdout, written } = runWith(SHA, { gitRepo: true });
    expect(written).toBe(`NEXT_PUBLIC_BUILD_SHA=${SHA}`);
    expect(stdout).toContain(`OK: NEXT_PUBLIC_BUILD_SHA=${SHA} (from AWS_COMMIT_ID)`);
    expect(stdout).not.toContain('(from git)');
  });

  it('rejects the string `HEAD` that git itself prints when the checkout has no commits', () => {
    // `git rev-parse HEAD` in an initialised repository with an unborn HEAD
    // writes the literal string `HEAD` to STDOUT and exits 128, so `2>/dev/null
    // || true` captures `HEAD` and a non-emptiness test would take it. The
    // fallback for a `HEAD` bug can produce `HEAD`, which is why it validates
    // the shape of what git returned rather than only that it returned
    // something.
    const { stdout, written } = runWith('HEAD', { gitRepo: true, unborn: true });
    expect(written).toBeNull();
    expect(stdout).toContain('WARN: no commit sha available');
  });

  it('gives the build log four distinguishable states, where it previously had one', () => {
    // Job 64 wrote `HEAD` and job 65 wrote a real sha, and the old success line
    // was byte-identical in both. The log is the only artifact a reader can
    // check without downloading build output, so it has to name the value.
    const platform = runWith(SHA, { gitRepo: true }).stdout;
    const fallback = runWith('HEAD', { gitRepo: true }).stdout;
    const nothing = runWith('HEAD').stdout;
    const absent = runWith(undefined).stdout;

    expect(platform).toContain(`NEXT_PUBLIC_BUILD_SHA=${SHA} (from AWS_COMMIT_ID)`);
    expect(fallback).toContain('(from git)');
    expect(nothing).toContain('no commit sha available');
    expect(absent).toContain('no commit sha available');
    expect(new Set([platform, fallback, nothing]).size).toBe(3);
  });
});
