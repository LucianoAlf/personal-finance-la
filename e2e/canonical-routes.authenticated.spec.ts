import { test, expect } from '@playwright/test';
import { loadE2ECredentials } from './support/e2eCredentials';

const credentials = loadE2ECredentials();

test.describe('canonical routes (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !credentials,
      'Set E2E_EMAIL/E2E_PASSWORD or create .env.e2e.local to run authenticated E2E',
    );
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill(credentials!.email);
    await page.locator('input[type="password"]').fill(credentials!.password);
    await page.getByRole('button', { name: /^entrar$/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  });

  test('categorias page loads', async ({ page }) => {
    await page.goto('/categorias');
    await expect(page).toHaveURL(/\/categorias/);
    await expect(
      page.getByRole('heading', { level: 1, name: /Gerenciar Categorias/i }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('tags page loads', async ({ page }) => {
    await page.goto('/tags');
    await expect(page).toHaveURL(/\/tags/);
    await expect(
      page.getByRole('heading', { level: 1, name: /^Tags$/ }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('transacoes honors type=income in URL after auth', async ({ page }) => {
    await page.goto('/transacoes?type=income');
    await expect(page).toHaveURL(/type=income/);
    await expect(
      page.getByRole('heading', { level: 1, name: /^Transações$/ }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
