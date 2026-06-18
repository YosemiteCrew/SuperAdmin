import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
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
