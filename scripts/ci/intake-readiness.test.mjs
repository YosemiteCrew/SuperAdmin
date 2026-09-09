import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const SCRIPT = path.join(import.meta.dirname, 'intake-readiness.mjs');
const SHA = '13e8eb9b0d61ecc7be4c06753a7f4057d703f79c';
const OLDER = 'acba2636cf3e2f0a344e19ed7581ed6d3c8bc31f';

function run(body, expected = SHA) {
  const dir = mkdtempSync(path.join(tmpdir(), 'intake-readiness-'));
  const file = path.join(dir, 'health.json');
  writeFileSync(file, typeof body === 'string' ? body : JSON.stringify(body));
  const result = spawnSync(process.execPath, [SCRIPT, file, expected], { encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  return result;
}

test('a body that is not JSON is exit 2, not a clean run', () => {
  const { status, stderr } = run('<html>gate</html>');
  assert.equal(status, 2);
  assert.match(stderr, /not parseable JSON/);
});

test('a buildSha that is absent is exit 2 - the deployment cannot be attributed', () => {
  const { status, stderr } = run({ intake: { contact: 'configured', consent: 'configured' } });
  assert.equal(status, 2);
  assert.match(stderr, /buildSha is absent or empty/);
});

test('an empty-string buildSha is exit 2, distinct from a real sha', () => {
  const { status, stderr } = run({ buildSha: '', intake: { contact: 'configured', consent: 'configured' } });
  assert.equal(status, 2);
  assert.match(stderr, /buildSha is absent or empty/);
});

test('a missing intake object is exit 2', () => {
  const { status, stderr } = run({ buildSha: SHA });
  assert.equal(status, 2);
  assert.match(stderr, /intake is absent or not an object/);
});

test('a live sha that is not the expected one is exit 0 but says NOT_DEPLOYED', () => {
  const { status, stdout } = run({ buildSha: OLDER, intake: { contact: 'unconfigured', consent: 'unconfigured' } });
  assert.equal(status, 0);
  assert.match(stdout, /NOT_DEPLOYED/);
  assert.match(stdout, new RegExp(`expected ${SHA}, live ${OLDER}`));
});

test('the expected sha live with both intakes configured is exit 0 DEPLOYED_OK', () => {
  const { status, stdout } = run({ buildSha: SHA, intake: { contact: 'configured', consent: 'configured' } });
  assert.equal(status, 0);
  assert.match(stdout, /DEPLOYED_OK/);
});

test('the expected sha live with contact unconfigured is exit 1 and names the field', () => {
  const { status, stdout, stderr } = run({ buildSha: SHA, intake: { contact: 'unconfigured', consent: 'configured' } });
  assert.equal(status, 1);
  assert.match(stdout, /DEPLOYED_BUT_UNCONFIGURED/);
  assert.match(stdout, /contact/);
  assert.doesNotMatch(stdout, /consent/);
  assert.equal(stderr, '');
});

test('the expected sha live with consent unconfigured names only consent', () => {
  const { status, stdout } = run({ buildSha: SHA, intake: { contact: 'configured', consent: 'unconfigured' } });
  assert.equal(status, 1);
  assert.match(stdout, /consent/);
  assert.doesNotMatch(stdout, /contact/);
});

test('the expected sha live with both unconfigured names both', () => {
  const { status, stdout } = run({ buildSha: SHA, intake: { contact: 'unconfigured', consent: 'unconfigured' } });
  assert.equal(status, 1);
  assert.match(stdout, /contact and consent/);
});

test('intake values other than configured are treated as not configured', () => {
  const { status, stdout } = run({ buildSha: SHA, intake: { contact: 'unknown', consent: 'configured' } });
  assert.equal(status, 1);
  assert.match(stdout, /contact/);
});

test('missing CLI arguments are exit 2 with usage', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /usage/);
});