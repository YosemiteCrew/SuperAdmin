/**
 * @jest-environment node
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const AMPLIFY_SPEC = path.join(REPO_ROOT, 'amplify.yml');

const BUILD = '- (cd ../.. && pnpm run build --filter admin)';
const HEALTH_GATE = 'echo "OK: the built artifact reached Postgres through the pg driver adapter"';
const MAIN_GUARD = 'if [ "$AWS_BRANCH" = "main" ]; then';
const MIGRATION = '(cd ../.. && pnpm run migrate:deploy)';

function matchingLineIndexes(lines: readonly string[], text: string): number[] {
  return lines.flatMap((line, index) => (line.trim() === text ? [index] : []));
}

describe('Amplify production deployment ordering', () => {
  const lines = readFileSync(AMPLIFY_SPEC, 'utf8').split('\n');

  it('builds and probes the artifact before running the production migration', () => {
    const build = matchingLineIndexes(lines, BUILD);
    const healthGate = matchingLineIndexes(lines, HEALTH_GATE);
    const migration = matchingLineIndexes(lines, MIGRATION);

    // Exact counts keep an empty match or a second, earlier migration from
    // satisfying the ordering assertion accidentally.
    expect(build).toHaveLength(1);
    expect(healthGate).toHaveLength(1);
    expect(migration).toHaveLength(1);
    expect(build[0]).toBeLessThan(healthGate[0]);
    expect(healthGate[0]).toBeLessThan(migration[0]);
  });

  it('keeps the migration behind the main-branch guard', () => {
    const guard = matchingLineIndexes(lines, MAIN_GUARD);
    const migration = matchingLineIndexes(lines, MIGRATION);

    expect(guard).toHaveLength(1);
    expect(migration).toHaveLength(1);
    expect(guard[0]).toBeLessThan(migration[0]);
    expect(lines.slice(guard[0], migration[0]).map((line) => line.trim())).not.toContain('fi');
  });
});
