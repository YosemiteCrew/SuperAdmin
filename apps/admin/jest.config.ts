import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  watchman: false,
  clearMocks: true,
  collectCoverage: false,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,tsx}',
    '!<rootDir>/src/**/*.d.ts',
    '!<rootDir>/src/**/*.test.ts',
    '!<rootDir>/src/**/*.test.tsx',
    '!<rootDir>/src/**/*.spec.ts',
    '!<rootDir>/src/**/*.spec.tsx',
    '!<rootDir>/src/**/__tests__/**',
    '!<rootDir>/src/app/jest.mocks/**',
    '!<rootDir>/src/app/constants/**',
    '!<rootDir>/src/app/(routes)/**/layout.tsx',
    '!<rootDir>/src/app/(routes)/**/page.tsx',
  ],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['text-summary', 'lcov'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  slowTestThreshold: 5,
  testTimeout: 30000,
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@superadmin/types$': '<rootDir>/../../packages/types/src',
    '^next/navigation$': '<rootDir>/src/app/jest.mocks/nextNavigation.ts',
  },
  transformIgnorePatterns: [
    String.raw`/node_modules/(?!((\.pnpm/)?@iconify[^/]*\/))`,
    String.raw`^.+\.module\.(css|sass|scss)$`,
  ],
};

export default createJestConfig(config);
