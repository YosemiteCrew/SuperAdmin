import { expect, test, type Page } from '@playwright/test';
import { totp } from './totp';

/**
 * Sign-in plumbing for the specs that use a real credential.
 *
 * Every super admin is required to hold a TOTP device, so reaching the dashboard
 * takes three secrets, not two. That means CI holds both factors for an account
 * the panel grants a single, ungranulated `superadmin` role to - there is no
 * lesser role to fall back on. Treat these values accordingly: never echo them,
 * never let an artifact capture them.
 */

/**
 * `/auth`, not `/sign-in`. Ten places in the app redirect here - proxy.ts,
 * the dashboard layout, requireSuperAdmin, the forbidden page - and `/sign-in`
 * appears nowhere in the source. The existing smoke spec asserted `/sign-in`
 * and was simply wrong; nothing caught it because no workflow ran it.
 */
export const SIGN_IN_PATH = '/auth';

/** Where the panel can legitimately land a signed-in super admin. */
export const DASHBOARD_ROUTE_PATTERN = /^\/(dashboard|users|organizations|admins)(\/|$|\?)/;

type RequiredName = 'SA_E2E_EMAIL' | 'SA_E2E_PASSWORD' | 'SA_E2E_TOTP_SECRET';

export const getRequiredEnv = (name: RequiredName): string => {
  const value = process.env[name]?.trim();
  test.skip(!value, `${name} is required to run this spec`);
  return value ?? '';
};

const STEP_SECONDS = 30;

/**
 * A code generated in the last breath of its window is frequently rejected: the
 * form submit, the network hop and the core's own check land in the next step.
 * Waiting for a fresh window costs a few seconds and removes a flake that would
 * otherwise be blamed on the app.
 */
export const freshTotp = async (secret: string): Promise<string> => {
  const secondsIntoStep = Math.floor(Date.now() / 1000) % STEP_SECONDS;
  const remaining = STEP_SECONDS - secondsIntoStep;
  if (remaining < 5) {
    await new Promise((resolve) => setTimeout(resolve, remaining * 1000 + 500));
  }
  return totp(secret);
};

/** Fills and submits the SuperTokens email/password form. */
export const submitSignIn = async (page: Page, email: string, password: string) => {
  // The sign-in form is this app's own, not the prebuilt UI, and its
  // FloatingField sets id/type/autoComplete but NO name attribute - so
  // `input[name="email"]`, copied from the sibling repo, matches nothing here.
  const emailInput = page.locator('#auth-signin-email');
  const passwordInput = page.locator('#auth-signin-password');

  await expect(emailInput).toBeVisible({ timeout: 30_000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);

  await page.getByRole('button', { name: /^sign in$/i }).click();
};

/**
 * Completes the mandatory TOTP challenge.
 *
 * The prebuilt UI renders one code field; locating it by its own input rather
 * than a label keeps this working across the copy changes SuperTokens makes
 * between releases. If the field never appears the failure names what was on
 * screen, because "timed out waiting for a selector" on an auth screen is
 * indistinguishable from a genuine auth outage.
 */
export const submitTotp = async (page: Page, secret: string) => {
  // The MFA screens ARE the prebuilt UI (TOTPPreBuiltUI), which renders the
  // code field as id="totp" with autocomplete="one-time-code".
  const codeField = page.locator('#totp, input[autocomplete="one-time-code"]').first();

  try {
    await expect(codeField).toBeVisible({ timeout: 30_000 });
  } catch (error) {
    const heading = await page.locator('h1, h2, h3').first().textContent().catch(() => null);
    throw new Error(
      `No TOTP field appeared at ${new URL(page.url()).pathname}. ` +
        `Heading on screen: ${heading ?? '(none)'}. ` +
        `If the account has no enrolled device this is an enrolment screen, not a code screen.`
    );
  }

  await codeField.fill(await freshTotp(secret));
  await page.getByRole('button', { name: /continue|verify|submit/i }).click();
};

export const waitForRouteAwayFrom = async (page: Page, fromPath: string) => {
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 60_000 })
    .not.toBe(fromPath);
};
