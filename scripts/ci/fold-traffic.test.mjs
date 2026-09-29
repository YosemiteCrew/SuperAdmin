import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const SCRIPT = path.join(import.meta.dirname, 'fold-traffic.mjs');

function workspace() {
  const dir = mkdtempSync(path.join(tmpdir(), 'fold-traffic-'));
  mkdirSync(path.join(dir, 'traffic-data', 'history'), { recursive: true });
  mkdirSync(path.join(dir, 'traffic-data', 'badges'), { recursive: true });
  return dir;
}

function fold(dir, { clones, views }) {
  const env = { ...process.env, CLONES_JSON: clones ?? '', VIEWS_JSON: views ?? '' };
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: dir, env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function read(dir, file) {
  return JSON.parse(readFileSync(path.join(dir, 'traffic-data', file), 'utf8'));
}

function window(days) {
  return JSON.stringify({
    days: days.map(([date, count, uniques]) => ({
      timestamp: `${date}T00:00:00Z`,
      count,
      uniques,
    })),
  });
}

test('an overlapping snapshot overwrites a date instead of adding to it', (t) => {
  const dir = workspace();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  fold(dir, {
    clones: window([
      ['2026-09-01', 3, 1],
      ['2026-09-02', 2, 1],
    ]),
  });
  fold(dir, {
    clones: window([
      ['2026-09-02', 4, 2],
      ['2026-09-03', 5, 1],
    ]),
  });

  assert.deepEqual(read(dir, 'history/clones.json'), {
    '2026-09-01': { count: 3, uniques: 1 },
    '2026-09-02': { count: 4, uniques: 2 },
    '2026-09-03': { count: 5, uniques: 1 },
  });
  assert.equal(read(dir, 'badges/clones.json').message, '12');
  assert.equal(read(dir, 'badges/cloners.json').message, '4');
});

test('history is written in date order whatever order the window arrives in', (t) => {
  const dir = workspace();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  fold(dir, {
    views: window([
      ['2026-09-03', 1, 1],
      ['2026-09-01', 1, 1],
      ['2026-09-02', 1, 1],
    ]),
  });

  assert.deepEqual(Object.keys(read(dir, 'history/views.json')), [
    '2026-09-01',
    '2026-09-02',
    '2026-09-03',
  ]);
});

test('an unparseable or absent payload leaves the existing history untouched', (t) => {
  const dir = workspace();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  fold(dir, { clones: window([['2026-09-01', 7, 2]]), views: window([['2026-09-01', 9, 3]]) });
  const before = read(dir, 'history/clones.json');
  const run = fold(dir, { clones: '<html>rate limited</html>' });

  assert.deepEqual(read(dir, 'history/clones.json'), before);
  assert.deepEqual(read(dir, 'history/views.json'), { '2026-09-01': { count: 9, uniques: 3 } });
  assert.match(run.stdout, /clones: 7 total over 1 day\(s\), 0 updated/);
});

test('a day without numeric counts is skipped rather than recorded as zero', (t) => {
  const dir = workspace();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  fold(dir, { clones: window([['2026-09-01', 6, 2]]) });
  fold(dir, {
    clones: JSON.stringify({
      days: [
        { timestamp: '2026-09-01T00:00:00Z', count: null, uniques: 0 },
        { timestamp: 'not-a-date', count: 1, uniques: 1 },
      ],
    }),
  });

  assert.deepEqual(read(dir, 'history/clones.json'), { '2026-09-01': { count: 6, uniques: 2 } });
});

test('large totals are abbreviated on the badges', (t) => {
  const dir = workspace();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  fold(dir, {
    clones: window([['2026-09-01', 1500, 12_345]]),
    views: window([['2026-09-01', 2_500_000, 999]]),
  });

  assert.equal(read(dir, 'badges/clones.json').message, '1.5k');
  assert.equal(read(dir, 'badges/cloners.json').message, '12k');
  assert.equal(read(dir, 'badges/views.json').message, '2.5M');
  assert.equal(read(dir, 'badges/visitors.json').message, '999');
  assert.equal(read(dir, 'badges/views.json').schemaVersion, 1);
});
