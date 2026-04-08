import { test, expect } from '@playwright/test';

test.describe('login dark mode smoke', () => {
  test('login page remains usable when dark mode is forced', async ({ page }) => {
    await page.goto('/login');
    await page.locator('html').evaluate((node) => node.classList.add('dark'));

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(
      page.getByRole('heading', { level: 1, name: /personal finance la/i }),
    ).toBeVisible();
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
