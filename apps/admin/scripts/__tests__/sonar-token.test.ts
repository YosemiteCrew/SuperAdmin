/**
 * @jest-environment node
 */
// Tests for apps/admin/sonar-token.sh, the single place the SonarCloud token is
// resolved for this app.
//
// The token used to be read straight from a plaintext `.sonar-token` file. It now
// comes from the login Keychain, and these tests pin the three things that made
// that migration safe to do: the env var still wins, the Keychain is consulted
// before the legacy file, and a Keychain read that never returns cannot hang the
// caller. Over ssh, or with a locked login keychain, `security` blocks on a UI
// prompt nobody can answer — unbounded, that stops the whole local gate.
//
// They stub the TOOL, not the call site: a directory holding an executable named
// `security` is prepended to PATH, so the real `command -v security` and the real
// backgrounded read are exercised end to end. PATH is pinned to that stub plus
// `/usr/bin:/bin` rather than inherited, because the resolver also needs `mktemp`,
// `cat` and `sleep`, and an inherited PATH would vary by machine.
//
// The resolver is copied into a temp dir for every run. It locates the legacy
// file relative to its own `BASH_SOURCE`, so a copy keeps the `.sonar-token` arm
// from ever writing a token-shaped file into the real apps/admin.
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RESOLVER = path.join(__dirname, '..', '..', 'sonar-token.sh');
const CONSUMERS = ['sonar-local.sh', 'fetch-sonar-issues.command'].map((name) =>
  path.join(__dirname, '..', '..', name)
);

const ENV_TOKEN = 'token-from-the-environment';
const KEYCHAIN_TOKEN = 'token-from-the-keychain';
const FILE_TOKEN = 'token-from-the-legacy-file';

let workDir: string;
let stubDir: string;

/** Install `body` as the `security` executable the resolver will find. */
function stubSecurity(body: string): void {
  const stub = path.join(stubDir, 'security');
  writeFileSync(stub, `#!/bin/bash\n${body}\n`);
  chmodSync(stub, 0o755);
}

/**
 * Source the copied resolver and print what `sonar_token` returns.
 * `pathDirs` is the whole PATH, so a caller can also test the case where no
 * `security` binary exists at all.
 */
function resolve(
  env: Record<string, string> = {},
  pathDirs: string[] = [stubDir, '/usr/bin', '/bin']
): { stdout: string; status: number | null } {
  const result = spawnSync(
    '/bin/bash',
    ['-c', `. "${path.join(workDir, 'sonar-token.sh')}"; sonar_token`],
    {
      encoding: 'utf8',
      env: {
        // This repo's ProcessEnv augmentation makes NODE_ENV required, and the env
        // is replaced rather than spread, so it has to be named here.
        NODE_ENV: 'test',
        PATH: pathDirs.join(':'),
        HOME: workDir,
        ...env,
      },
    }
  );
  return { stdout: result.stdout, status: result.status };
}

beforeEach(() => {
  workDir = mkdtempSync(path.join(os.tmpdir(), 'sonar-token-work-'));
  stubDir = mkdtempSync(path.join(os.tmpdir(), 'sonar-token-stub-'));
  writeFileSync(path.join(workDir, 'sonar-token.sh'), readFileSync(RESOLVER));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
  rmSync(stubDir, { recursive: true, force: true });
});

describe('sonar-token.sh', () => {
  it('copies the shipped resolver, not an empty file', () => {
    // Canary. Every arm below sources the copy; if the copy were empty or
    // truncated, `sonar_token` would be undefined and each arm would report an
    // empty token — which is also the pass value for two of them.
    const copied = readFileSync(path.join(workDir, 'sonar-token.sh'), 'utf8');
    expect(copied).toEqual(readFileSync(RESOLVER, 'utf8'));
    expect(copied).toContain('sonar_token() {');
    expect(copied).toContain('_sonar_token_from_keychain() {');
  });

  it('prefers SONAR_TOKEN over the Keychain', () => {
    stubSecurity(`echo "${KEYCHAIN_TOKEN}"`);
    expect(resolve({ SONAR_TOKEN: ENV_TOKEN }).stdout).toBe(ENV_TOKEN);
  });

  it('reads the Keychain when SONAR_TOKEN is unset', () => {
    stubSecurity(`echo "${KEYCHAIN_TOKEN}"`);
    expect(resolve().stdout).toBe(KEYCHAIN_TOKEN);
  });

  it('asks the Keychain for the sonar-token service by name', () => {
    // Pins the lookup key. A resolver that read some other service would still
    // satisfy the arm above, because the stub answers every question.
    stubSecurity(`printf '%s' "$*"`);
    // Whole argument list, not a substring: `-s sonar-token-other` contains
    // `-s sonar-token`, so a containment check survives a renamed service.
    expect(resolve().stdout).toBe('find-generic-password -s sonar-token -w');
  });

  it('falls back to the legacy file when the Keychain has no item', () => {
    stubSecurity('exit 44'); // security's "item not found" status
    writeFileSync(path.join(workDir, '.sonar-token'), `${FILE_TOKEN}\n`);
    expect(resolve().stdout).toBe(FILE_TOKEN);
  });

  it('prefers the Keychain over the legacy file', () => {
    stubSecurity(`echo "${KEYCHAIN_TOKEN}"`);
    writeFileSync(path.join(workDir, '.sonar-token'), `${FILE_TOKEN}\n`);
    expect(resolve().stdout).toBe(KEYCHAIN_TOKEN);
  });

  it('falls back to the legacy file where there is no security binary', () => {
    // Linux, or any machine without the Keychain. A missing `security` must read
    // as "no token here" and hand on to the next source, not error or hang.
    writeFileSync(path.join(workDir, '.sonar-token'), `${FILE_TOKEN}\n`);
    expect(resolve({}, [stubDir, '/usr/bin', '/bin'].slice(1)).stdout).toBe(FILE_TOKEN);
  });

  it('prints nothing when no source has a token', () => {
    stubSecurity('exit 44');
    expect(resolve().stdout).toBe('');
  });

  it('gives up on a Keychain read that never returns', () => {
    // The reason the bound exists. Without it this arm runs for the stub's full
    // sleep; the resolver must abandon the read at ~5s and answer from the file.
    stubSecurity('sleep 60');
    writeFileSync(path.join(workDir, '.sonar-token'), `${FILE_TOKEN}\n`);
    const started = Date.now();
    const { stdout } = resolve();
    const elapsed = Date.now() - started;
    expect(stdout).toBe(FILE_TOKEN);
    expect(elapsed).toBeLessThan(30_000);
  }, 60_000);
});

describe('the scripts that consume it', () => {
  it.each(CONSUMERS)('%s sources the shared resolver and reads no token itself', (script) => {
    const source = readFileSync(script, 'utf8');
    // Canary: a path typo would make every assertion below vacuous.
    expect(source).toContain('#!/');
    expect(source).toContain('sonar-token.sh"');
    expect(source).toContain('sonar_token)');
    // The precedence must live in one place. A second reader of the legacy file
    // is how one of these two scripts got left behind by the migration before.
    expect(source).not.toMatch(/cat\s+"?\.?\/?\.sonar-token/);
  });
});
