import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const JAVASCRIPT_FILES = '**/*.{js,jsx,mjs,cjs}';
const TYPESCRIPT_FILES = '**/*.{ts,tsx}';
const SOURCE_FILES = `**/*.{js,jsx,mjs,cjs,ts,tsx}`;

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.next/**',
      '**/*.d.ts',
      'apps/admin/**',
    ],
  },
  {
    files: [SOURCE_FILES],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest,
      },
    },
  },
  {
    files: [JAVASCRIPT_FILES],
    ...js.configs.recommended,
  },
  {
    files: [TYPESCRIPT_FILES],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
