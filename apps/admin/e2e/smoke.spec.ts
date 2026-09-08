import { test, expect } from '@playwright/test';

test('homepage redirects unauthenticated users to sign-in', async ({ page }) => {
  await page.goto('/');
  // /auth, not /sign-in. This assertion has been wrong since it was written -
  // the app has never had a /sign-in route - and nothing noticed because no
  // workflow ever ran this file.
  await expect(page).toHaveURL(/\/auth/);
});
