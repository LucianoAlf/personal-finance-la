import { test, expect } from '@playwright/test';

test.describe('auth shell (no credentials)', () => {
  test('login page renders email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.getByRole('heading', { name: /Personal Finance LA/i }),
    ).toBeVisible();
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('login page does not expose hardcoded test credentials', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/Usuário de teste:/i)).toHaveCount(0);
    await expect(page.getByText(/Senha:\s*250178Alf#/i)).toHaveCount(0);
  });

  test('protected /categorias redirects to login', async ({ page }) => {
    await page.goto('/categorias');
    await expect(page).toHaveURL(/\/login/);
  });

  test('protected /tags redirects to login', async ({ page }) => {
    await page.goto('/tags');
    await expect(page).toHaveURL(/\/login/);
  });

  test('protected /transacoes with type=income redirects to login', async ({
    page,
  }) => {
    await page.goto('/transacoes?type=income');
    await expect(page).toHaveURL(/\/login/);
  });
});
