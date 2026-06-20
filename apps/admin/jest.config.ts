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
    // Type-only files have no runtime code
    '!<rootDir>/src/app/services/http/types.ts',
    '!<rootDir>/src/app/features/organizations/types.ts',
    // SuperTokens provider is framework bootstrapping (module-level init side
    // effect) — not meaningfully unit-testable without asserting mocks.
    '!<rootDir>/src/app/components/supertokensProvider.tsx',
    // Trivial barrel re-exports
    '!<rootDir>/src/app/features/**/index.ts',
    '!<rootDir>/src/app/ui/components/index.ts',
  ],
  // Server-rendered pages and layouts under (routes) are evaluated by Next at
  // request-time with framework internals — excluded from unit coverage. Same
  // applies to the auth catch-all page and the root layout.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    String.raw`/\(routes\)/.*/page\.tsx?$`,
    String.raw`/\(routes\)/.*/layout\.tsx?$`,
    String.raw`/src/app/auth/.*/page\.tsx?$`,
    String.raw`/src/app/auth/layout\.tsx?$`,
    String.raw`/src/app/layout\.tsx?$`,
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
