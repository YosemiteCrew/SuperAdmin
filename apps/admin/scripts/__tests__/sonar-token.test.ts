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
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RESOLVER = path.join(__dirname, '..', '..', 'sonar-token.sh');
const REPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: __dirname,
  encoding: 'utf8',
}).trim();

// Assembled from parts rather than written out, because this file is inside the
// population the scan below walks: a literal here would be a hit in the guard's
// own source and the guard would have to exempt itself to stay green.
const UNQUALIFIED_SERVICE = ['sonar', 'token'].join('-');
const SERVICE = `${UNQUALIFIED_SERVICE}-superadmin`;

/**
 * Matches the unqualified service name as a whole word. A fresh instance per
 * call: the `g` flag carries `lastIndex` between uses.
 *
 * The namespaced name is not a hit (the `-` fails the trailing lookahead), and
 * neither is the legacy dotfile or the resolver's own filename (the `.` fails a
 * lookaround on either side) — so the pattern separates "names the old Keychain
 * service" from "mentions one of the files".
 */
const unqualifiedService = (): RegExp =>
  new RegExp(`(?<![-.\\w])${UNQUALIFIED_SERVICE}(?![-.\\w])`, 'g');

/**
 * Every tracked file that talks about a generic password, repo-root-relative.
 *
 * Derived from git rather than listed here, and keyed on a string the guarded
 * pattern does not contain, so a new file that documents the Keychain item
 * joins the population on its own. `git grep` exits 1 with no matches, which
 * throws here and fails the suite to run rather than scanning an empty set.
 */
const KEYCHAIN_FILES = execFileSync(
  'git',
  ['grep', '--files-with-matches', '--fixed-strings', '--no-color', 'generic-password'],
  { cwd: REPO_ROOT, encoding: 'utf8' }
)
  .split('\n')
  .filter(Boolean)
  .sort();
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

  it('asks the Keychain for the namespaced service by name', () => {
    // Pins the lookup key. A resolver that read some other service would still
    // satisfy the arm above, because the stub answers every question.
    stubSecurity(`printf '%s' "$*"`);
    // Whole argument list, not a substring: any longer service name contains
    // the shorter one, so a containment check survives a renamed service.
    expect(resolve().stdout).toBe(`find-generic-password -s ${SERVICE} -w`);
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
    // And the service name comes from the resolver too. Both of these scripts
    // print a "create the Keychain item like this" hint when no token resolves,
    // which is exactly the moment a hint naming a different service misleads.
    expect(source).toContain('$SONAR_KEYCHAIN_SERVICE');
    // The precedence must live in one place. A second reader of the legacy file
    // is how one of these two scripts got left behind by the migration before.
    expect(source).not.toMatch(/cat\s+"?\.?\/?\.sonar-token/);
  });
});

describe('the Keychain service name', () => {
  it('is set once in the resolver and read from there', () => {
    const resolver = readFileSync(RESOLVER, 'utf8');
    expect(resolver).toContain(`SONAR_KEYCHAIN_SERVICE="${SERVICE}"`);
    expect(resolver).toContain('find-generic-password -s "$SONAR_KEYCHAIN_SERVICE" -w');
  });

  it('scans the files that document the Keychain item, and no others', () => {
    // Canary and review gate in one. An equality rather than a containment: if
    // git returned nothing, or a new file starts documenting the item, this is
    // the arm that says so instead of the scan below passing over a short list.
    expect(KEYCHAIN_FILES).toEqual([
      'apps/admin/.sonar-token.example',
      'apps/admin/fetch-sonar-issues.command',
      'apps/admin/scripts/__tests__/sonar-token.test.ts',
      'apps/admin/sonar-local.sh',
      'apps/admin/sonar-token.sh',
    ]);
  });

  it('is detected as a whole word, in every shape the old name was written in', () => {
    // Drives the scan's pattern both ways before trusting a clean sweep: a
    // lookaround typo that matched nothing would leave the scan silently green.
    expect(`-s ${UNQUALIFIED_SERVICE} -w`.match(unqualifiedService())).toHaveLength(1);
    expect(`-s "${UNQUALIFIED_SERVICE}" -w`.match(unqualifiedService())).toHaveLength(1);
    expect(`service name '${UNQUALIFIED_SERVICE}'`.match(unqualifiedService())).toHaveLength(1);
    // The three things that are not the old service and must not be flagged.
    expect(`-s ${SERVICE} -w`.match(unqualifiedService())).toBeNull();
    expect(`cat .${UNQUALIFIED_SERVICE}`.match(unqualifiedService())).toBeNull();
    expect(`. ./${UNQUALIFIED_SERVICE}.sh`.match(unqualifiedService())).toBeNull();
  });

  it.each(KEYCHAIN_FILES)('%s names no unqualified Keychain service', (file) => {
    const source = readFileSync(path.join(REPO_ROOT, file), 'utf8');
    // Canary: proves this is the file git matched, not a path that resolved
    // somewhere empty — an unreadable file would throw, but a wrong-but-real
    // one would sail through the scan.
    expect(source).toContain('generic-password');
    // Comments and docs cannot interpolate the shell variable, so the copies
    // that stay literal are pinned here instead.
    expect(source.match(unqualifiedService())).toBeNull();
  });
});
