import { expect, test, type Page } from '@playwright/test';
import {
  DASHBOARD_ROUTE_PATTERN,
  SIGN_IN_PATH,
  getRequiredEnv,
  submitSignIn,
  submitTotp,
  waitForRouteAwayFrom,
} from './support/auth';

/**
 * The browser half of #552. jsdom implements `showModal()` but models neither
 * inertness nor Escape-closes-a-dialog (probed: a modal dialog there fires no
 * `cancel` event), so containment can only be asserted somewhere real. The unit
 * suite pins the wiring; this pins the behaviour.
 */

// This spec types a real credential — same artifact rules as authenticated.spec.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

const signIn = async (page: Page) => {
  const email = getRequiredEnv('SA_E2E_EMAIL');
  const password = getRequiredEnv('SA_E2E_PASSWORD');
  const totpSecret = getRequiredEnv('SA_E2E_TOTP_SECRET');
  if (!email || !password || !totpSecret) return false;

  await page.goto(SIGN_IN_PATH, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load', { timeout: 30_000 });
  await submitSignIn(page, email, password);
  await waitForRouteAwayFrom(page, SIGN_IN_PATH);
  await submitTotp(page, totpSecret);
  await waitForRouteAwayFrom(page, '/auth/mfa/totp');
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 60_000 })
    .toMatch(DASHBOARD_ROUTE_PATTERN);
  return true;
};

/**
 * Where focus sits relative to the open dialog, as a phrase naming what it found.
 *
 * `dialog.contains(activeElement)` is too strict to be the containment test:
 * Chromium parks focus on `<body>` for one press as the tab cycle wraps past the
 * last control in a modal dialog, so a walk asserting containment after every
 * press fails once in each direction on a dialog that contains focus perfectly.
 * `<body>` is the ABSENCE of a focused element, not a control behind the overlay
 * - which is the thing #552 is about. So the escape this reports is a focused
 * element OUTSIDE the dialog, and nothing else.
 */
const focusPlacement = (page: Page) =>
  page.evaluate(() => {
    const dialog = document.querySelector('dialog[open]');
    if (!(dialog instanceof HTMLElement)) return 'no open dialog';
    const active = document.activeElement;
    if (
      !(active instanceof Element) ||
      active === document.body ||
      active === document.documentElement
    ) {
      return 'nothing focused';
    }
    if (dialog.contains(active)) return 'inside the dialog';
    return `OUTSIDE the dialog: ${active.tagName.toLowerCase()}${active.id ? `#${active.id}` : ''}`;
  });

/**
 * How many tabbable controls the open dialog holds, so the walk outlasts it.
 *
 * A LOWER bound, not the number of tab stops: Chromium also makes a scrollable
 * region a tab stop without giving it a `tabindex`, and the palette's results
 * list is one. Under-counting only shortens the walk, which is why the walk also
 * asserts how many presses actually landed inside - a count that undershot the
 * cycle would otherwise turn "focus is contained" into "focus is contained for
 * the first few presses".
 */
const tabbableCountInDialog = (page: Page) =>
  page.evaluate(() => {
    const dialog = document.querySelector('dialog[open]');
    if (!(dialog instanceof HTMLElement)) return 0;
    return dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    ).length;
  });

const walkTabsAndStayInside = async (page: Page, extraPresses = 3) => {
  const inside = await tabbableCountInDialog(page);
  expect(inside, 'the dialog must hold at least one tabbable control').toBeGreaterThan(0);

  const walk: string[] = [];
  for (const key of ['Tab', 'Shift+Tab'] as const) {
    for (let press = 1; press <= inside + extraPresses; press += 1) {
      await page.keyboard.press(key);
      walk.push(`${key} ${press}/${inside + extraPresses}: ${await focusPlacement(page)}`);
    }
  }

  expect(
    walk.filter((step) => step.includes('OUTSIDE the dialog')),
    'Tab reached page content behind the overlay'
  ).toEqual([]);

  // Without this the assertion above passes on a page where nothing inside the
  // dialog is focusable at all, since 'nothing focused' is not an escape.
  expect(
    walk.filter((step) => step.endsWith('inside the dialog')).length,
    `the walk barely entered the dialog: ${walk.join(' | ')}`
  ).toBeGreaterThanOrEqual(inside);
};

test('the command palette contains Tab and returns focus to its opener', async ({ page }) => {
  test.setTimeout(180_000);
  if (!(await signIn(page))) return;

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  // Focus a real control first: "returns focus to the opener" is unfalsifiable
  // if focus was on <body> when the overlay opened.
  const opener = page.locator('a[href="/users"]').first();
  await opener.focus();
  await expect(opener).toBeFocused();

  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel(/command palette input/i)).toBeFocused();

  await walkTabsAndStayInside(page);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('the bulk-delete confirm contains Tab and returns focus to its opener', async ({ page }) => {
  test.setTimeout(180_000);
  if (!(await signIn(page))) return;

  await page.goto('/users', { waitUntil: 'domcontentloaded' });

  const rowCheckboxes = page.getByRole('checkbox').filter({ hasNotText: /select all/i });
  const first = rowCheckboxes.nth(1);
  await expect(first).toBeVisible({ timeout: 30_000 });
  await first.check();

  const deleteButton = page.getByRole('button', { name: /^delete$/i }).first();
  test.skip(!(await deleteButton.count()), 'the signed-in account has no deletable user selected');
  await deleteButton.focus();
  await deleteButton.click();

  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible();

  await walkTabsAndStayInside(page);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(deleteButton).toBeFocused();
});
