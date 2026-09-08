import { defineConfig, devices } from '@playwright/test';

const LOCAL_URL = 'http://localhost:3000';
const baseURL = process.env.E2E_BASE_URL?.trim() || LOCAL_URL;

/** Loopback only. Anything else is a deployed environment we must not try to serve. */
const isLocalTarget = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/.test(baseURL);

/**
 * The deployed panel sits behind Amplify branch password protection, which answers
 * at the CloudFront edge with HTTP Basic before the app runs at all. Without this
 * every request - including the public /api/health - is a 401 the app never sees.
 * Supplied as user:password via the environment so it is never committed.
 */
const edgeGate = process.env.SA_EDGE_GATE_CREDENTIALS?.trim();
const [edgeUser, ...edgeRest] = edgeGate ? edgeGate.split(':') : [];
const httpCredentials =
  edgeUser && edgeRest.length ? { username: edgeUser, password: edgeRest.join(':') } : undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    ...(httpCredentials ? { httpCredentials } : {}),
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  // A deployed target must never start a local server: the run would be reported
  // against admin.yosemitecrew.com while actually exercising localhost.
  // The served URL is derived from baseURL rather than hardcoded - it was pinned
  // to :3001 while baseURL was :3000, so the server that started was never the
  // server under test.
  webServer:
    isLocalTarget && process.env.E2E_WEB_SERVER_COMMAND
      ? {
          command: process.env.E2E_WEB_SERVER_COMMAND,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
        }
      : undefined,
});
