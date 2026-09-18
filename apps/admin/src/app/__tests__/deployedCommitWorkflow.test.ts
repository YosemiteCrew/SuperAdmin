/**
 * @jest-environment node
 */

import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const EXPECTED_SHA = 'a'.repeat(40);
const MOVED_SHA = 'b'.repeat(40);
const WORKFLOW = path.resolve(__dirname, '../../../../../.github/workflows/deployed-commit.yml');

function workflowScript(): string {
  const lines = readFileSync(WORKFLOW, 'utf8').split('\n');
  const start = lines.indexOf('        run: |');
  if (start === -1) throw new Error('workflow run block not found');
  return lines
    .slice(start + 1)
    .map((line) => (line.startsWith('          ') ? line.slice(10) : line))
    .join('\n');
}

describe('deployed-commit workflow exit handling', () => {
  let stubDirectory: string;

  beforeEach(() => {
    stubDirectory = mkdtempSync(path.join(os.tmpdir(), 'deployed-commit-'));
    const nodeStub = path.join(stubDirectory, 'node');
    const ghStub = path.join(stubDirectory, 'gh');
    writeFileSync(
      nodeStub,
      `#!${process.execPath}\nprocess.exit(Number(process.env.DEPLOY_CHECK_EXIT));\n`
    );
    writeFileSync(
      ghStub,
      `#!${process.execPath}\nconst code = Number(process.env.TIP_EXIT);\nif (code) process.exit(code);\nprocess.stdout.write(process.env.TIP_OUTPUT ?? '');\n`
    );
    chmodSync(nodeStub, 0o755);
    chmodSync(ghStub, 0o755);
  });

  afterEach(() => {
    rmSync(stubDirectory, { force: true, recursive: true });
  });

  function runStep(
    deployCheckExit: number,
    tipOutput = EXPECTED_SHA,
    tipExit = 0
  ): { status: number | null; stdout: string } {
    const result = spawnSync('/bin/bash', ['-c', workflowScript()], {
      encoding: 'utf8',
      cwd: path.dirname(path.dirname(path.dirname(path.dirname(path.dirname(__dirname))))),
      env: {
        ...process.env,
        PATH: `${stubDirectory}:${process.env.PATH ?? ''}`,
        HEALTH_URL: 'https://example.test/health',
        EXPECTED_SHA,
        TIMEOUT_SECONDS: '1',
        INTERVAL_SECONDS: '1',
        REPO: 'example/repository',
        DEPLOY_CHECK_EXIT: String(deployCheckExit),
        TIP_OUTPUT: tipOutput,
        TIP_EXIT: String(tipExit),
      },
    });
    return { status: result.status, stdout: result.stdout ?? '' };
  }

  it('passes when the deployed-commit assertion passes', () => {
    expect(runStep(0, '', 99).status).toBe(0);
  });

  it('fails when main still points at the undeployed commit', () => {
    const result = runStep(1);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`main is still ${EXPECTED_SHA}`);
  });

  it('passes when a newer main commit superseded the deployment', () => {
    const result = runStep(1, MOVED_SHA);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`SUPERSEDED: main has moved to ${MOVED_SHA}`);
  });

  it.each([
    ['', 2],
    ['not-an-object-name', 0],
  ])('fails closed when the current main tip is unreadable', (tipOutput, tipExit) => {
    const result = runStep(1, tipOutput, tipExit);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Supersession is unestablished');
  });
});
