// Tests for scripts/ci/sbom.sh. Every case runs the real script against a
// throwaway repository root with a stand-in syft (and, where a download would
// happen, a stand-in curl), so nothing here touches the network. The real tool
// runs in .github/workflows/sbom.yml, straight after these tests.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const SCRIPT = path.join(import.meta.dirname, 'sbom.sh');
const SHA = '13e8eb9b0d61ecc7be4c06753a7f4057d703f79c';

const PROD_MODULES = [
  'included:',
  '  dependencies: true',
  '  devDependencies: false',
  '  optionalDependencies: true',
  'nodeLinker: hoisted',
  '',
].join('\n');

// A stand-in syft: answers the version probe with `version`, and on `scan`
// records its arguments and writes FAKE_CDX / an SPDX stub to the -o targets.
const FAKE_SYFT = `#!/usr/bin/env bash
if [ "$1" = version ]; then echo "Version: \${FAKE_SYFT_VERSION}"; exit 0; fi
printf '%s\\n' "$@" > "$(dirname "$0")/../syft-args"
for arg in "$@"; do
  case "$arg" in
    cyclonedx-json=*) printf '%s' "\${FAKE_CDX}" > "\${arg#cyclonedx-json=}" ;;
    spdx-json=*) printf '{"spdxVersion":"SPDX-2.3"}' > "\${arg#spdx-json=}" ;;
  esac
done
`;

// A stand-in curl that writes junk to its -o target, as a tampered or
// truncated download would.
const JUNK_CURL = `#!/usr/bin/env bash
while [ "$#" -gt 0 ]; do
  if [ "$1" = -o ]; then printf 'not the release tarball' > "$2"; fi
  shift
done
`;

const FAILING_CURL = `#!/usr/bin/env bash
echo "curl was called" >&2
exit 7
`;

function fakeRoot({ modules = PROD_MODULES, syft = true, curl = FAILING_CURL } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'sbom-test-'));
  const bin = path.join(root, '.security-tools', 'bin');
  mkdirSync(bin, { recursive: true });
  if (syft) writeFileSync(path.join(bin, 'syft'), FAKE_SYFT, { mode: 0o755 });
  if (curl) writeFileSync(path.join(bin, 'curl'), curl, { mode: 0o755 });
  if (modules !== null) {
    mkdirSync(path.join(root, 'node_modules'));
    writeFileSync(path.join(root, 'node_modules', '.modules.yaml'), modules);
  }
  const manifest = (dir, dependencies) => {
    mkdirSync(path.join(root, dir), { recursive: true });
    writeFileSync(path.join(root, dir, 'package.json'), JSON.stringify({ dependencies }));
  };
  manifest('apps/admin', { '@superadmin/database': 'workspace:^', next: '16.3.5' });
  manifest('packages/database', { '@prisma/client': '^7.10.0', pg: '^8.16.3' });
  // A directory with no package.json is not a workspace package and is skipped.
  mkdirSync(path.join(root, 'packages', 'no-manifest'));
  return root;
}

// The shape syft writes: a library component per package, and a file
// component per manifest it read, named by path and carrying its hashes.
function cdx(names, files = names.map((name) => `/node_modules/${name}/package.json`)) {
  return JSON.stringify({
    bomFormat: 'CycloneDX',
    components: [
      ...names.map((name) => ({ type: 'library', name })),
      ...files.map((name) => ({ type: 'file', name })),
    ],
  });
}

function run(root, env = {}, args = []) {
  const result = spawnSync('bash', [SCRIPT, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SBOM_REPO_ROOT: root,
      GITHUB_SHA: SHA,
      FAKE_SYFT_VERSION: '1.50.0',
      FAKE_CDX: cdx(['next', '@prisma/client', 'pg']),
      ...env,
    },
  });
  return { ...result, output: `${result.stdout}${result.stderr}` };
}

test('arguments are refused with usage, exit 2', (t) => {
  const root = fakeRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { status, stderr } = run(root, {}, ['all']);
  assert.equal(status, 2);
  assert.match(stderr, /usage/);
});

test('no node_modules is exit 2 and says how to install', (t) => {
  const root = fakeRoot({ modules: null });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { status, stderr } = run(root);
  assert.equal(status, 2);
  assert.match(stderr, /node_modules missing - run pnpm install --frozen-lockfile --prod/);
  assert.equal(existsSync(path.join(root, '.security-tools', 'syft-args')), false);
});

test('a node_modules with devDependencies is refused before anything is cataloged', (t) => {
  const root = fakeRoot({
    modules: PROD_MODULES.replace('devDependencies: false', 'devDependencies: true'),
  });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { status, stderr } = run(root);
  assert.equal(status, 2);
  assert.match(stderr, /includes devDependencies/);
  assert.equal(existsSync(path.join(root, '.security-tools', 'syft-args')), false);
});

test('a production install writes both formats for the deployed commit', (t) => {
  const root = fakeRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { status, stdout, output } = run(root);
  assert.equal(status, 0, output);
  const cdxFile = path.join(root, 'security', 'sbom', 'superadmin.cdx.json');
  const spdxFile = path.join(root, 'security', 'sbom', 'superadmin.spdx.json');
  assert.equal(JSON.parse(readFileSync(cdxFile, 'utf8')).bomFormat, 'CycloneDX');
  assert.equal(JSON.parse(readFileSync(spdxFile, 'utf8')).spdxVersion, 'SPDX-2.3');
  assert.match(stdout, /SBOM lists 3 packages,/);
  assert.match(stdout, new RegExp(`SBOMs written for ${SHA}`));

  const args = readFileSync(path.join(root, '.security-tools', 'syft-args'), 'utf8').split('\n');
  assert.equal(args[0], 'scan');
  assert.equal(args[1], `dir:${root}`);
  // Only the installed-package cataloger: the lockfile would add every
  // development tool.
  const catalogers = args.indexOf('--override-default-catalogers');
  assert.notEqual(catalogers, -1);
  assert.equal(args[catalogers + 1], 'javascript-package-cataloger');
  assert.equal(args[args.indexOf('--source-version') + 1], SHA);
});

test('a scoped runtime dependency encoded as group and name still counts', (t) => {
  const root = fakeRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const FAKE_CDX = JSON.stringify({
    components: [
      { type: 'library', name: 'next' },
      { type: 'library', group: '@prisma', name: 'client' },
      { type: 'library', name: 'pg' },
    ],
  });
  const { status, output } = run(root, { FAKE_CDX });
  assert.equal(status, 0, output);
});

test('a runtime dependency missing from the SBOM is exit 1 and is named', (t) => {
  const root = fakeRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  // A file component is a manifest, not a package, so one named pg does not
  // stand in for the package.
  const FAKE_CDX = cdx(['next', '@prisma/client'], ['pg']);
  const { status, stderr } = run(root, { FAKE_CDX });
  assert.equal(status, 1);
  assert.match(stderr, /SBOM is missing runtime dependencies: pg$/m);
  assert.doesNotMatch(stderr, /next/);
});

test('a repository without a packages directory still checks the apps', (t) => {
  const root = fakeRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  rmSync(path.join(root, 'packages'), { recursive: true });
  const { status, stderr } = run(root, { FAKE_CDX: cdx(['@prisma/client', 'pg']) });
  assert.equal(status, 1);
  assert.match(stderr, /SBOM is missing runtime dependencies: next$/m);
});

test('an SBOM with no components fails and lists every runtime dependency', (t) => {
  const root = fakeRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { status, stderr } = run(root, { FAKE_CDX: '{}' });
  assert.equal(status, 1);
  assert.match(stderr, /missing runtime dependencies: @prisma\/client, next, pg/);
});

test('syft at the pinned version is used as is, with no download', (t) => {
  const root = fakeRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { status, output } = run(root);
  assert.equal(status, 0, output);
  assert.doesNotMatch(output, /installing syft|curl was called/);
});

test('syft at another version triggers a download, and a digest mismatch installs nothing', (t) => {
  const root = fakeRoot({ curl: JUNK_CURL });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { status, stderr } = run(root, { FAKE_SYFT_VERSION: '1.49.0' });
  assert.equal(status, 1);
  assert.match(stderr, /installing syft v1\.50\.0/);
  assert.match(stderr, /DIGEST MISMATCH for syft_1\.50\.0_(linux|darwin)_(amd64|arm64)\.tar\.gz/);
  // The stand-in syft was not replaced, and nothing was cataloged.
  assert.match(readFileSync(path.join(root, '.security-tools', 'bin', 'syft'), 'utf8'), /FAKE_CDX/);
  assert.equal(existsSync(path.join(root, '.security-tools', 'syft-args')), false);
});

test('a failed download stops the run', (t) => {
  const root = fakeRoot({ syft: false });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { status, stderr } = run(root, { PATH: `/usr/bin:/bin` });
  assert.notEqual(status, 0);
  assert.match(stderr, /curl was called/);
  assert.equal(existsSync(path.join(root, 'security', 'sbom', 'superadmin.cdx.json')), false);
});
