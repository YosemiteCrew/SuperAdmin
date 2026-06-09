import { test, expect } from '@playwright/test';

test('homepage redirects unauthenticated users to sign-in', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/sign-in/);
});
