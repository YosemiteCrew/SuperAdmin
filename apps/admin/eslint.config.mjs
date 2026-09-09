import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    plugins: {
      sonarjs: (await import('eslint-plugin-sonarjs')).default,
    },
    rules: {
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-collapsible-if': 'warn',
      'sonarjs/prefer-immediate-return': 'warn',
      // Security-hotspot rules mirrored from SonarCloud so they surface locally
      // (pre-push) instead of only after a server-side scan.
      'sonarjs/pseudo-random': 'error',
      'sonarjs/slow-regex': 'error',
      // Sonar issue rules first caught server-side (S7735 / S6759 / S3358),
      // mirrored locally per the parity mandate.
      'no-negated-condition': 'error',
      'react/prefer-read-only-props': 'error',
      'sonarjs/no-nested-conditional': 'error',
    },
  },
  {
    // Tests legitimately repeat literals (paths, route names, headers,
    // module specifiers). Forcing constants for them hurts readability.
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'sonarjs/no-duplicate-string': 'off',
    },
  },
  {
    ignores: ['node_modules/**', '.next/**', 'coverage/**', 'dist/**', 'next-env.d.ts'],
  },
];

export default config;
