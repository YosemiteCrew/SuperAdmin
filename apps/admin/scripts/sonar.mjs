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

scanner.default(
  {
    serverUrl: 'https://sonarcloud.io',
    token,
    options: {
      'sonar.projectBaseDir': adminRoot,
    },
  },
  () => process.exit()
);
