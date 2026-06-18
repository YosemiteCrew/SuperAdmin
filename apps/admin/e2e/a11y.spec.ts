import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('sign-in page has no critical a11y violations', async ({ page }) => {
  await page.goto('/sign-in');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => v.impact === 'critical')).toHaveLength(0);
});
