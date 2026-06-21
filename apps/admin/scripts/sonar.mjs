#!/usr/bin/env node
// Local SonarCloud scanner runner.
// Token is read from SONAR_TOKEN env var only — never inline a token in source.
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import scanner from 'sonarqube-scanner';

/** Best-effort current git branch, used as the PR source branch default. */
function currentGitBranch(cwd) {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

const token = process.env.SONAR_TOKEN;
if (!token) {
  process.stderr.write(
    [
      '',
      '  SONAR_TOKEN env var is not set.',
      '',
      '  Generate a token at https://sonarcloud.io/account/security',
      '  then export it before running:',
      '',
      '      export SONAR_TOKEN=<your-token>',
      '      pnpm sonar       # or pnpm sonar:full to include coverage',
      '',
    ].join('\n')
  );
  process.exit(1);
}

const adminRoot = resolve(import.meta.dirname, '..');
const lcovPath = resolve(adminRoot, 'coverage/lcov.info');
if (!existsSync(lcovPath)) {
  process.stdout.write(
    '  Warning: coverage/lcov.info not found. Run `pnpm sonar:full` ' +
      'to include test coverage in this scan.\n\n'
  );
}

// Optional PR-decoration mode. Set SONAR_PR_KEY to analyze against a pull request
// instead of the main branch, so a local scan updates the PR's quality gate
// exactly like CI — without overwriting the main branch analysis. The source
// branch (mandatory for PR analysis) defaults to the current git branch and the
// base to `dev`; override either with SONAR_PR_BRANCH / SONAR_PR_BASE.
const options = { 'sonar.projectBaseDir': adminRoot };
const prKey = process.env.SONAR_PR_KEY;
if (prKey) {
  const prBranch = process.env.SONAR_PR_BRANCH || currentGitBranch(adminRoot);
  const prBase = process.env.SONAR_PR_BASE || 'dev';
  if (!prBranch) {
    process.stderr.write(
      '\n  PR mode needs a source branch but none could be determined.\n' +
        '  Set SONAR_PR_BRANCH=<branch> and re-run.\n\n'
    );
    process.exit(1);
  }
  options['sonar.pullrequest.key'] = prKey;
  options['sonar.pullrequest.branch'] = prBranch;
  options['sonar.pullrequest.base'] = prBase;
  process.stdout.write(`  Analyzing as pull request #${prKey} (${prBranch} → ${prBase}).\n\n`);
} else {
  process.stdout.write('  Analyzing as the main branch (set SONAR_PR_KEY for PR mode).\n\n');
}

scanner.default(
  {
    serverUrl: 'https://sonarcloud.io',
    token,
    options,
  },
  () => process.exit()
);
