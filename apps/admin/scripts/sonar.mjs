#!/usr/bin/env node
// Local SonarCloud scanner runner.
// Token is read from SONAR_TOKEN env var only — never inline a token in source.
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import scanner from 'sonarqube-scanner';

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

// Optional PR-decoration mode. Set SONAR_PR_KEY (and ideally SONAR_PR_BRANCH /
// SONAR_PR_BASE) to analyze against a pull request instead of the main branch,
// so a local scan updates the PR's quality gate exactly like CI — without
// overwriting the main branch analysis.
const options = { 'sonar.projectBaseDir': adminRoot };
const prKey = process.env.SONAR_PR_KEY;
if (prKey) {
  options['sonar.pullrequest.key'] = prKey;
  if (process.env.SONAR_PR_BRANCH)
    options['sonar.pullrequest.branch'] = process.env.SONAR_PR_BRANCH;
  if (process.env.SONAR_PR_BASE) options['sonar.pullrequest.base'] = process.env.SONAR_PR_BASE;
  process.stdout.write(`  Analyzing as pull request #${prKey}.\n\n`);
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
