import { expect, test } from '@playwright/test';
import {
  DASHBOARD_ROUTE_PATTERN,
  SIGN_IN_PATH,
  getRequiredEnv,
  submitSignIn,
  submitTotp,
  waitForRouteAwayFrom,
} from './support/auth';

// This spec types a real credential. Playwright records input values verbatim,
// so trace, screenshot and video are forced off for this file - the config
// default is trace: 'on-first-retry', which would capture the filled fields.
// The AI error-context snapshot is a separate sink, disabled in the job env via
// PLAYWRIGHT_NO_COPY_PROMPT. The job also uploads no artifacts.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test('a super admin signs in, clears TOTP, and reaches the dashboard', async ({ page }) => {
  test.setTimeout(120_000);

  const email = getRequiredEnv('SA_E2E_EMAIL');
  const password = getRequiredEnv('SA_E2E_PASSWORD');
  const totpSecret = getRequiredEnv('SA_E2E_TOTP_SECRET');
  if (!email || !password || !totpSecret) return;

  await page.goto(SIGN_IN_PATH, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load', { timeout: 30_000 });

  await submitSignIn(page, email, password);
  await waitForRouteAwayFrom(page, SIGN_IN_PATH);

  // TOTP is mandatory for every super admin, so landing anywhere other than the
  // MFA screen at this point is itself worth failing on.
  await submitTotp(page, totpSecret);
  await waitForRouteAwayFrom(page, '/auth/mfa/totp');

  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 60_000 })
    .toMatch(DASHBOARD_ROUTE_PATTERN);

  // The credential fields must be gone: a sign-in form still on screen means the
  // route changed without the session being established.
  await expect(page.locator('#auth-signin-password')).toHaveCount(0);

  // /forbidden is what an authenticated user WITHOUT the superadmin role gets.
  // Reaching it would mean the credential works and the role grant does not,
  // which is a different failure and must not read as success.
  expect(new URL(page.url()).pathname).not.toBe('/forbidden');
});
