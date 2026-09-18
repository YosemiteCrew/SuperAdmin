/**
 * @jest-environment node
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

/**
 * Both secret scans must read every tracked file, including one whose name
 * `.gitignore` lists. `.gitignore` decides what `git add -A` picks up, not what
 * a repository can hold: `git add -f` tracks an ignored file all the same, and
 * secretlint respects `.gitignore` by default since v13.
 *
 * Each case builds a throwaway repository with this repo's own `.gitignore`,
 * secretlint config and lint-staged config, force-adds an env file, and runs the
 * command exactly as CI (`check:secrets`) and the pre-commit hook (lint-staged)
 * would. The harmless-file cases are the controls: they prove the scan ran and
 * that it is the value, not the file name or the fixture, that fails the run.
 */

const ROOT = join(__dirname, '..', '..', '..', '..', '..', '..');
const COPIED_CONFIG = [
  '.gitignore',
  '.secretlintrc.cjs',
  '.secretlintignore',
  'lint-staged.config.cjs',
];
const ENV_FILE = '.env.production';
const RULE = '@secretlint/secretlint-rule-basicauth';

// A credential-in-URL shape that RULE reports, assembled at runtime so that no
// scanner reads one in this file. Every part of it is plainly a fixture.
const FIXTURE_CREDENTIAL = [
  'https://',
  'fixture-user',
  ':',
  'not-a-real-secret',
  '@example.test',
].join('');

// Git variables are dropped (spawn skips an undefined value) so that a run
// started from inside a git hook cannot point these commands at the real
// repository instead of the throwaway one.
const childEnv: NodeJS.ProcessEnv = {
  ...process.env,
  ...Object.fromEntries(
    Object.keys(process.env)
      .filter((key) => key.startsWith('GIT_'))
      .map((key) => [key, undefined])
  ),
  PATH: `${join(ROOT, 'node_modules', '.bin')}${delimiter}${process.env.PATH ?? ''}`,
};

type Run = { status: number | null; output: string };

function run(cwd: string, command: string, args: string[]): Run {
  const result = spawnSync(command, args, { cwd, env: childEnv, encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

function repositoryTracking(envContents: string): string {
  // Resolved, because the tools print the real path and the cases match on it.
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'secret-scan-')));
  for (const file of COPIED_CONFIG) {
    copyFileSync(join(ROOT, file), join(dir, file));
  }
  // secretlint resolves its rule packages through this link. It never scans it.
  symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'dir');
  writeFileSync(join(dir, ENV_FILE), envContents);

  expect(run(dir, 'git', ['init', '--quiet']).status).toBe(0);
  expect(run(dir, 'git', ['add', '--force', ENV_FILE]).status).toBe(0);
  // The premise: the file is tracked AND its name is one `.gitignore` lists.
  expect(run(dir, 'git', ['ls-files', ENV_FILE]).output.trim()).toBe(ENV_FILE);
  expect(run(dir, 'git', ['check-ignore', '--no-index', ENV_FILE]).status).toBe(0);
  return dir;
}

// The script is split into argv and run without a shell, so its text is never
// interpreted as shell syntax. The assertion keeps the split faithful: a script
// that needs a shell (a pipe, &&, a variable) fails here instead of being run
// differently from CI.
const ciScan = (dir: string): Run => {
  const { scripts } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const script = scripts['check:secrets'];
  expect(script).not.toMatch(/[|&;<>$`\\]/);
  const [command, ...args] = Array.from(
    script.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g),
    (m) => m[1] ?? m[2] ?? m[3]
  );
  return run(dir, command, args);
};

const preCommitScan = (dir: string): Run =>
  run(dir, 'lint-staged', ['--config', join(dir, 'lint-staged.config.cjs')]);

describe('secret scans reach a tracked env file that .gitignore lists', () => {
  const dirs: string[] = [];
  let withCredential: string;
  let harmless: string;

  beforeAll(() => {
    withCredential = repositoryTracking(`DATABASE_URL=${FIXTURE_CREDENTIAL}\n`);
    harmless = repositoryTracking('FEATURE_FLAG=on\n');
    dirs.push(withCredential, harmless);
  });

  afterAll(() => {
    // Removes the node_modules link, never what it points at.
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });

  it('fails the CI scan when the env file holds a credential', () => {
    const result = ciScan(withCredential);
    expect(result.output).toContain(ENV_FILE);
    expect(result.output).toContain(RULE);
    expect(result.status).not.toBe(0);
  });

  it('passes the CI scan when the env file holds none', () => {
    const result = ciScan(harmless);
    expect(result.output).not.toContain(RULE);
    expect(result.status).toBe(0);
  });

  it('fails the pre-commit scan when the staged env file holds a credential', () => {
    const result = preCommitScan(withCredential);
    expect(result.output).toContain(RULE);
    expect(result.status).not.toBe(0);
  });

  it('runs secretlint on the staged env file when it holds none', () => {
    const result = preCommitScan(harmless);
    // Without this the pass below is also what a config whose globs never
    // match an env file produces.
    expect(result.output).toContain('secretlint');
    expect(result.output).toContain(join(harmless, ENV_FILE));
    expect(result.status).toBe(0);
  });
});
