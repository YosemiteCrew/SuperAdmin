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
    const curlStub = path.join(stubDirectory, 'curl');
    // Stands in for assert-deployed.js, and refuses to answer unless it was
    // asked about the expected commit through the real script path.
    writeFileSync(
      nodeStub,
      `#!${process.execPath}\n` +
        `const { readFileSync } = require('node:fs');\n` +
        `const [script, ...args] = process.argv.slice(2);\n` +
        `if (script.endsWith('/apps/admin/src/ci/assert-deployed.js')) {\n` +
        `  if (args[args.indexOf('--sha') + 1] !== process.env.STUB_SHA) process.exit(9);\n` +
        `  process.exit(Number(process.env.DEPLOY_CHECK_EXIT));\n` +
        `}\n` +
        `if (script.endsWith('scripts/ci/intake-readiness.mjs')) {\n` +
        `  if (args[1] !== process.env.STUB_SHA || args[2] !== '--require' || args[3] !== 'contact') process.exit(9);\n` +
        `  if (JSON.parse(readFileSync(args[0], 'utf8')).buildSha !== process.env.STUB_SHA) process.exit(9);\n` +
        `  process.stdout.write('INTAKE_CALLED\\n');\n` +
        `  process.exit(Number(process.env.INTAKE_CHECK_EXIT));\n` +
        `}\n` +
        `process.exit(9);\n`
    );
    // Answers only the lookup of main's tip in this repository.
    writeFileSync(
      ghStub,
      `#!${process.execPath}\n` +
        `if (process.argv[3] !== 'repos/example/repository/commits/main') process.exit(9);\n` +
        `const code = Number(process.env.TIP_EXIT);\nif (code) process.exit(code);\n` +
        `process.stdout.write(process.env.TIP_OUTPUT ?? '');\n`
    );
    writeFileSync(
      curlStub,
      `#!${process.execPath}\n` +
        `const { writeFileSync } = require('node:fs');\n` +
        `const args = process.argv.slice(2);\n` +
        `const code = Number(process.env.CURL_EXIT);\n` +
        `if (code) process.exit(code);\n` +
        `const output = args[args.indexOf('--output') + 1];\n` +
        `if (!output || args.at(-1) !== process.env.HEALTH_URL) process.exit(9);\n` +
        `writeFileSync(output, JSON.stringify({ buildSha: process.env.STUB_SHA, intake: {} }));\n`
    );
    chmodSync(nodeStub, 0o755);
    chmodSync(ghStub, 0o755);
    chmodSync(curlStub, 0o755);
  });

  afterEach(() => {
    rmSync(stubDirectory, { force: true, recursive: true });
  });

  function run(
    args: string[],
    deployCheckExit: number,
    tipOutput = EXPECTED_SHA,
    tipExit = 0,
    intakeCheckExit = 0,
    curlExit = 0
  ): { status: number | null; stdout: string } {
    const result = spawnSync('/bin/bash', args, {
      encoding: 'utf8',
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PATH: `${stubDirectory}:${process.env.PATH ?? ''}`,
        HEALTH_URL: 'https://example.test/health',
        EXPECTED_SHA,
        STUB_SHA: EXPECTED_SHA,
        TIMEOUT_SECONDS: '1',
        INTERVAL_SECONDS: '1',
        GITHUB_REPOSITORY: 'example/repository',
        DEPLOY_CHECK_EXIT: String(deployCheckExit),
        INTAKE_CHECK_EXIT: String(intakeCheckExit),
        CURL_EXIT: String(curlExit),
        TIP_OUTPUT: tipOutput,
        TIP_EXIT: String(tipExit),
      },
    });
    return { status: result.status, stdout: result.stdout ?? '' };
  }

  const runScript = (deployCheckExit: number, tipOutput?: string, tipExit?: number) =>
    run([SCRIPT, 'https://example.test/health', EXPECTED_SHA], deployCheckExit, tipOutput, tipExit);

  const runWorkflowStep = (
    deployCheckExit: number,
    options: {
      tipOutput?: string;
      tipExit?: number;
      intakeCheckExit?: number;
      curlExit?: number;
    } = {}
  ) =>
    run(
      ['-c', workflowScript()],
      deployCheckExit,
      options.tipOutput,
      options.tipExit,
      options.intakeCheckExit,
      options.curlExit
    );

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
      expect(run([SCRIPT, 'https://example.test/health'], 0).status).toBe(1);
    });
  });

  describe('the deployed-commit workflow step', () => {
    it('passes when the expected commit is served', () => {
      const result = runWorkflowStep(0, { tipOutput: '', tipExit: 99 });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('INTAKE_CALLED');
    });

    it('passes when a newer main commit superseded the deployment', () => {
      const result = runWorkflowStep(1, { tipOutput: MOVED_SHA, intakeCheckExit: 99 });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`SUPERSEDED: main has moved to ${MOVED_SHA}`);
      expect(result.stdout).not.toContain('INTAKE_CALLED');
    });

    it('fails when main still points at the undeployed commit', () => {
      expect(runWorkflowStep(1).status).toBe(1);
    });

    it('fails when the current main tip is unreadable', () => {
      expect(runWorkflowStep(1, { tipOutput: '', tipExit: 2 }).status).toBe(1);
    });

    it.each([1, 2])('propagates intake-readiness exit %i after a confirmed deploy', (exitCode) => {
      const result = runWorkflowStep(0, { intakeCheckExit: exitCode });

      expect(result.status).toBe(exitCode);
      expect(result.stdout).toContain('INTAKE_CALLED');
    });

    it('fails before the assertion when the health body cannot be fetched', () => {
      const result = runWorkflowStep(0, { curlExit: 22 });

      expect(result.status).toBe(22);
      expect(result.stdout).not.toContain('INTAKE_CALLED');
    });

    it('delegates to the script instead of carrying its own copy of the poll', () => {
      const step = workflowScript();

      expect(step).toContain(`bash ${SCRIPT} "$HEALTH_URL" "$EXPECTED_SHA"`);
      expect(step).toContain('node scripts/ci/intake-readiness.mjs');
      expect(step).toContain('"$health_file" "$EXPECTED_SHA" --require contact');
      expect(step).not.toContain('assert-deployed.js');
      expect(step).not.toContain('gh api');
    });
  });
});
