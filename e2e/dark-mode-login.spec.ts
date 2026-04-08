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

  test('contas route renders the premium dark shell through the dev auth bypass', async ({ page }) => {
    await page.goto('/contas');
    await page.locator('html').evaluate((node) => node.classList.add('dark'));

    await expect(page).toHaveURL(/\/contas/);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');

    const appShell = page.getByTestId('app-shell');
    const sidebar = page.locator('aside').filter({
      has: page.getByRole('heading', { name: /finance la/i }),
    });
    const header = page.locator('main header').first();
    const activeContasLink = page.locator('aside a[href="/contas"]').first();

    await expect(appShell).toBeVisible();
    await expect(sidebar).toBeVisible();
    await expect(header).toBeVisible();
    await expect(page.getByRole('button', { name: /^novo$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ativar tema/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /abrir menu do usuario/i })).toBeVisible();

    await expect(appShell).toHaveClass(/bg-background/);
    await expect(sidebar).toHaveClass(/bg-surface/);
    await expect(header).toHaveClass(/bg-surface/);
    await expect(activeContasLink).toHaveClass(/bg-surface-elevated/);
    await expect(activeContasLink).toHaveClass(/ring-primary\/20/);
  });
});
