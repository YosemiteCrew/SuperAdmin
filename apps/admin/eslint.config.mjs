import { dirname } from 'path';
import { fileURLToPath } from 'url';
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
    ignores: ['node_modules/**', '.next/**', 'coverage/**', 'dist/**', 'next-env.d.ts'],
  },
];

export default config;
