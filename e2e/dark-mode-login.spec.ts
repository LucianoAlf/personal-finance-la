import { test, expect } from '@playwright/test';

test.describe('login dark mode smoke', () => {
  test('login page preserves dark shell contrast when dark mode is forced', async ({ page }) => {
    await page.goto('/login');
    await page.locator('html').evaluate((node) => node.classList.add('dark'));

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
    await expect(
      page.getByRole('heading', { level: 1, name: /personal finance la/i }),
    ).toBeVisible();
    const emailInput = page.getByPlaceholder('seu@email.com');
    const passwordInput = page.locator('input[type="password"]');
    const googleButton = page.getByRole('button', { name: /google/i });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(googleButton).toBeVisible();

    const bodyBackground = await page.locator('body').evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    const inputBackground = await emailInput.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    const outlineButtonBackground = await googleButton.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    const outlineButtonBorder = await googleButton.evaluate(
      (node) => getComputedStyle(node).borderColor,
    );

    expect(bodyBackground).not.toBe('rgb(255, 255, 255)');
    expect(inputBackground).not.toBe('rgb(255, 255, 255)');
    expect(outlineButtonBackground).not.toBe('rgb(255, 255, 255)');
    expect(outlineButtonBorder).not.toBe('rgb(255, 255, 255)');
  });
});
