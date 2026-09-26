/**
 * @jest-environment node
 */

import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const EXPECTED_SHA = 'a'.repeat(40);
const MOVED_SHA = 'b'.repeat(40);
const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const WORKFLOW = path.join(REPO_ROOT, '.github/workflows/deployed-commit.yml');
const SCRIPT = 'scripts/ci/wait-for-deployed-main.sh';
const ADMIN_ORIGIN = 'https://example.test';
const HEALTH_URL = `${ADMIN_ORIGIN}/api/health`;

function workflowScript(): string {
  const lines = readFileSync(WORKFLOW, 'utf8').split('\n');
  const start = lines.indexOf('        run: |');
  if (start === -1) throw new Error('workflow run block not found');
  return lines
    .slice(start + 1)
    .map((line) => (line.startsWith('          ') ? line.slice(10) : line))
    .join('\n');
}

describe('wait-for-deployed-main', () => {
  let stubDirectory: string;

  beforeEach(() => {
    stubDirectory = mkdtempSync(path.join(os.tmpdir(), 'deployed-commit-'));
    const nodeStub = path.join(stubDirectory, 'node');
    const ghStub = path.join(stubDirectory, 'gh');
    // Stands in for assert-deployed.js, and refuses to answer unless it was
    // asked about the expected commit and health URL through the real script path.
    writeFileSync(
      nodeStub,
      `#!${process.execPath}\n` +
        `const [script, ...args] = process.argv.slice(2);\n` +
        `if (!script.endsWith('/apps/admin/src/ci/assert-deployed.js')) process.exit(9);\n` +
        `if (args[args.indexOf('--sha') + 1] !== process.env.STUB_SHA) process.exit(9);\n` +
        `if (args[args.indexOf('--url') + 1] !== process.env.STUB_URL) process.exit(8);\n` +
        `process.exit(Number(process.env.DEPLOY_CHECK_EXIT));\n`
    );
    // Answers only the lookup of main's tip in this repository.
    writeFileSync(
      ghStub,
      `#!${process.execPath}\n` +
        `if (process.argv[3] !== 'repos/example/repository/commits/main') process.exit(9);\n` +
        `const code = Number(process.env.TIP_EXIT);\nif (code) process.exit(code);\n` +
        `process.stdout.write(process.env.TIP_OUTPUT ?? '');\n`
    );
    chmodSync(nodeStub, 0o755);
    chmodSync(ghStub, 0o755);
  });

  afterEach(() => {
    rmSync(stubDirectory, { force: true, recursive: true });
  });

  function run(
    args: string[],
    deployCheckExit: number,
    tipOutput = EXPECTED_SHA,
    tipExit = 0,
    adminOrigin = ADMIN_ORIGIN
  ): { status: number | null; stdout: string } {
    const result = spawnSync('/bin/bash', args, {
      encoding: 'utf8',
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PATH: `${stubDirectory}:${process.env.PATH ?? ''}`,
        ADMIN_ORIGIN: adminOrigin,
        EXPECTED_SHA,
        STUB_SHA: EXPECTED_SHA,
        STUB_URL: HEALTH_URL,
        TIMEOUT_SECONDS: '1',
        INTERVAL_SECONDS: '1',
        GITHUB_REPOSITORY: 'example/repository',
        DEPLOY_CHECK_EXIT: String(deployCheckExit),
        TIP_OUTPUT: tipOutput,
        TIP_EXIT: String(tipExit),
      },
    });
    return { status: result.status, stdout: result.stdout ?? '' };
  }

  const runScript = (deployCheckExit: number, tipOutput?: string, tipExit?: number) =>
    run([SCRIPT, HEALTH_URL, EXPECTED_SHA], deployCheckExit, tipOutput, tipExit);

  const runWorkflowStep = (deployCheckExit: number, tipOutput?: string, tipExit?: number) =>
    run(['-c', workflowScript()], deployCheckExit, tipOutput, tipExit);

  describe('the script', () => {
    it('exits 0 when the expected commit is served', () => {
      expect(runScript(0, '', 99).status).toBe(0);
    });

    it('fails when main still points at the undeployed commit', () => {
      const result = runScript(1);

      expect(result.status).toBe(1);
      expect(result.stdout).toContain(`main is still ${EXPECTED_SHA}`);
    });

    it('exits 3 when a newer main commit superseded the deployment', () => {
      const result = runScript(1, MOVED_SHA);

      expect(result.status).toBe(3);
      expect(result.stdout).toContain(`SUPERSEDED: main has moved to ${MOVED_SHA}`);
    });

    it.each([
      ['', 2],
      ['not-an-object-name', 0],
    ])('fails closed when the current main tip is unreadable (%j, gh exit %i)', (tip, tipExit) => {
      const result = runScript(1, tip, tipExit);

      expect(result.status).toBe(1);
      expect(result.stdout).toContain('Supersession is unestablished');
    });

    it('refuses to run without both a health URL and a sha', () => {
      expect(run([SCRIPT, HEALTH_URL], 0).status).toBe(1);
    });
  });

  describe('the deployed-commit workflow step', () => {
    it('passes when the expected commit is served', () => {
      expect(runWorkflowStep(0, '', 99).status).toBe(0);
    });

    it('passes when a newer main commit superseded the deployment', () => {
      const result = runWorkflowStep(1, MOVED_SHA);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`SUPERSEDED: main has moved to ${MOVED_SHA}`);
    });

    it('fails when main still points at the undeployed commit', () => {
      expect(runWorkflowStep(1).status).toBe(1);
    });

    it('fails when the current main tip is unreadable', () => {
      expect(runWorkflowStep(1, '', 2).status).toBe(1);
    });

    it('fails before polling when the deployed origin secret is missing', () => {
      const result = run(['-c', workflowScript()], 0, EXPECTED_SHA, 0, '');

      expect(result.status).toBe(1);
      expect(result.stdout).toContain('Missing repository secret: ADMIN_ORIGIN');
    });

    it('reads the deployed origin from a repository secret, never a literal', () => {
      const workflow = readFileSync(WORKFLOW, 'utf8');

      expect(workflow).toContain('          ADMIN_ORIGIN: ${{ secrets.ADMIN_ORIGIN }}\n');
      expect(workflow).not.toMatch(/https?:\/\//);
    });

    it('delegates to the script instead of carrying its own copy of the poll', () => {
      const step = workflowScript();

      expect(step).toContain(`bash ${SCRIPT} "$ADMIN_ORIGIN/api/health" "$EXPECTED_SHA"`);
      expect(step).not.toContain('assert-deployed.js');
      expect(step).not.toContain('gh api');
    });
  });
});
