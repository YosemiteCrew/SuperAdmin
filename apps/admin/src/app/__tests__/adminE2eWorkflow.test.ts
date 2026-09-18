/**
 * @jest-environment node
 */

import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const WORKFLOW = readFileSync(path.join(REPO_ROOT, '.github/workflows/admin-e2e.yml'), 'utf8');
const EXPECTED_SHA = 'c'.repeat(40);
const MOVED_SHA = 'd'.repeat(40);
const MAIN_ONLY =
  "github.ref == 'refs/heads/main' && " +
  "(github.event_name == 'push' || github.event_name == 'workflow_dispatch')";

/** The lines of one job, from its `  id:` header to the next job. */
function job(id: string): string[] {
  const lines = WORKFLOW.split('\n');
  const start = lines.indexOf(`  ${id}:`);
  if (start === -1) throw new Error(`job ${id} not found`);
  const end = lines.findIndex((line, index) => index > start && /^ {0,2}\S/.test(line));
  return lines.slice(start, end === -1 ? undefined : end);
}

/** A job's steps, each as its own block of lines. */
function steps(jobLines: string[]): string[][] {
  const blocks: string[][] = [];
  for (const line of jobLines) {
    if (line.startsWith('      - ')) blocks.push([line]);
    else if (blocks.length > 0 && !/^ {0,5}\S/.test(line)) blocks.at(-1)?.push(line);
  }
  return blocks;
}

/** The value of `key:` at the given indentation, or undefined. */
function field(block: string[], key: string, indent: number): string | undefined {
  const prefix = `${' '.repeat(indent)}${key}: `;
  return block.find((line) => line.startsWith(prefix))?.slice(prefix.length);
}

function stepNamed(jobLines: string[], name: string): { index: number; block: string[] } {
  const all = steps(jobLines);
  const index = all.findIndex((block) => block[0] === `      - name: ${name}`);
  if (index === -1) throw new Error(`step "${name}" not found`);
  return { index, block: all[index] };
}

/** The body of a step's `run: |` block, de-indented. */
function runBody(block: string[]): string {
  const start = block.indexOf('        run: |');
  if (start === -1) throw new Error('run block not found');
  return block
    .slice(start + 1)
    .map((line) => (line.startsWith('          ') ? line.slice(10) : line))
    .join('\n');
}

const WAIT_STEP = 'Wait for the deployed panel to serve this commit';
const SPECS_STEP = 'Run specs against the deployed panel';
const AGGREGATE_STEP = 'Fail unless every leg actually ran and passed';

describe('admin-e2e workflow: deployed leg', () => {
  const deployed = job('deployed');

  it('runs only for main, on a push or a manual dispatch', () => {
    expect(field(deployed, 'if', 4)).toBe(MAIN_ONLY);
  });

  it('is bounded by a job timeout', () => {
    expect(Number(field(deployed, 'timeout-minutes', 4))).toBeGreaterThan(0);
  });

  it('waits for this commit to be served before the specs run', () => {
    const wait = stepNamed(deployed, WAIT_STEP);
    const specs = stepNamed(deployed, SPECS_STEP);

    expect(wait.index).toBeLessThan(specs.index);
    expect(wait.block).toContain('          EXPECTED_SHA: ${{ github.sha }}');
    expect(runBody(wait.block)).toContain('bash scripts/ci/wait-for-deployed-main.sh');
    expect(runBody(wait.block)).toContain(
      'https://admin.yosemitecrew.com/api/health "$EXPECTED_SHA"'
    );
    expect(Number(field(wait.block, 'timeout-minutes', 8))).toBeGreaterThan(0);
  });

  it('runs the specs only when the wait step reported this commit served', () => {
    const id = field(stepNamed(deployed, WAIT_STEP).block, 'id', 8);

    expect(id).toBeTruthy();
    expect(field(stepNamed(deployed, SPECS_STEP).block, 'if', 8)).toBe(
      `steps.${id}.outputs.served == 'true'`
    );
  });

  it('keeps push runs alive while they wait, and still cancels pull request runs', () => {
    expect(WORKFLOW).toContain(
      "\n  cancel-in-progress: ${{ github.event_name == 'pull_request' }}\n"
    );
  });

  describe('wait step outcomes', () => {
    let stubDirectory: string;

    beforeEach(() => {
      stubDirectory = mkdtempSync(path.join(os.tmpdir(), 'admin-e2e-'));
      const nodeStub = path.join(stubDirectory, 'node');
      const ghStub = path.join(stubDirectory, 'gh');
      writeFileSync(
        nodeStub,
        `#!${process.execPath}\n` +
          `const args = process.argv.slice(3);\n` +
          `if (args[args.indexOf('--sha') + 1] !== process.env.EXPECTED_SHA) process.exit(9);\n` +
          `process.exit(Number(process.env.DEPLOY_CHECK_EXIT));\n`
      );
      writeFileSync(
        ghStub,
        `#!${process.execPath}\nprocess.stdout.write(process.env.TIP_OUTPUT ?? '');\n`
      );
      chmodSync(nodeStub, 0o755);
      chmodSync(ghStub, 0o755);
    });

    afterEach(() => {
      rmSync(stubDirectory, { force: true, recursive: true });
    });

    function runWait(deployCheckExit: number, tipOutput: string) {
      const outputFile = path.join(stubDirectory, 'github-output');
      writeFileSync(outputFile, '');
      const result = spawnSync('/bin/bash', ['-c', runBody(stepNamed(deployed, WAIT_STEP).block)], {
        encoding: 'utf8',
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          PATH: `${stubDirectory}:${process.env.PATH ?? ''}`,
          EXPECTED_SHA,
          TIMEOUT_SECONDS: '1',
          INTERVAL_SECONDS: '1',
          GITHUB_REPOSITORY: 'example/repository',
          GITHUB_OUTPUT: outputFile,
          DEPLOY_CHECK_EXIT: String(deployCheckExit),
          TIP_OUTPUT: tipOutput,
        },
      });
      return { status: result.status, output: readFileSync(outputFile, 'utf8') };
    }

    it('marks the commit served when the panel reports it', () => {
      expect(runWait(0, '')).toEqual({ status: 0, output: 'served=true\n' });
    });

    it('passes without running the specs when a newer commit replaced the build', () => {
      expect(runWait(1, MOVED_SHA)).toEqual({ status: 0, output: '' });
    });

    it('fails when the commit is never served and main has not moved', () => {
      expect(runWait(1, EXPECTED_SHA)).toEqual({ status: 1, output: '' });
    });

    it('fails when the tip of main cannot be read', () => {
      expect(runWait(1, '')).toEqual({ status: 1, output: '' });
    });
  });
});

describe('admin-e2e workflow: Admin E2E Required', () => {
  const aggregate = stepNamed(job('admin-e2e-required'), AGGREGATE_STEP).block;
  const body = runBody(aggregate);

  it('reads the change-detection result and the deployed condition from env', () => {
    expect(aggregate).toContain('          CHANGES: ${{ needs.changes.result }}');
    expect(field(aggregate, 'DEPLOYED_EXPECTED', 10)).toBe(`\${{ ${MAIN_ONLY} }}`);
    expect(body).not.toContain('${{');
  });

  function verdict(fixture: Record<string, string>): number | null {
    return spawnSync('/bin/bash', ['-c', body], {
      encoding: 'utf8',
      // Only the step's own inputs, so nothing from the runner leaks in.
      env: {
        NODE_ENV: 'test',
        PATH: process.env.PATH ?? '',
        CHANGES: 'success',
        LOCAL: 'success',
        DEPLOYED: 'success',
        NEEDED: 'true',
        DEPLOYED_EXPECTED: 'false',
        ...fixture,
      },
    }).status;
  }

  // DEPLOYED_EXPECTED is what the `deployed` job's condition evaluates to:
  // true on a push or dispatch of refs/heads/main, false for dev and PRs.
  const DEV = { DEPLOYED_EXPECTED: 'false' };
  const MAIN = { DEPLOYED_EXPECTED: 'true' };

  it.each(['failure', 'cancelled', 'skipped'])(
    'fails when change detection ended %s, whatever its output says',
    (changes) => {
      for (const needed of ['false', 'true', '']) {
        expect(verdict({ CHANGES: changes, NEEDED: needed, LOCAL: 'skipped' })).toBe(1);
      }
    }
  );

  it('fails when a successful detection gave no decision', () => {
    expect(verdict({ NEEDED: '', LOCAL: 'skipped', DEPLOYED: 'skipped' })).toBe(1);
  });

  it('passes a pull request with no admin changes', () => {
    expect(verdict({ NEEDED: 'false', LOCAL: 'skipped', DEPLOYED: 'skipped' })).toBe(0);
  });

  it.each(['failure', 'cancelled', 'skipped'])('fails when the local leg ended %s', (local) => {
    expect(verdict({ ...DEV, LOCAL: local, DEPLOYED: 'skipped' })).toBe(1);
  });

  it('passes a dev push with the deployed leg skipped', () => {
    expect(verdict({ ...DEV, DEPLOYED: 'skipped' })).toBe(0);
  });

  it('passes a main push when both legs passed', () => {
    expect(verdict({ ...MAIN })).toBe(0);
  });

  it.each(['failure', 'cancelled', 'skipped'])(
    'fails a main push when the deployed leg ended %s',
    (deployedResult) => {
      expect(verdict({ ...MAIN, DEPLOYED: deployedResult })).toBe(1);
    }
  );
});
