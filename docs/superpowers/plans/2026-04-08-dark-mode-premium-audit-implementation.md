# Dark Mode Premium Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implantar o dark mode premium do Finance LA em todo o sistema, corrigindo vazamentos de light mode, consolidando uma foundation visual consistente e validando cada página em desktop e mobile.

**Architecture:** A implantação segue a spec aprovada em duas camadas. Primeiro estabilizamos a foundation do dark mode premium com tokens, shell e primitives compartilhados; depois aplicamos a linguagem visual página por página, começando pelo dashboard como página-modelo e fechando com regressão desktop/mobile e smoke tests.

**Tech Stack:** React 18, TypeScript, React Router, Tailwind CSS, Radix UI, Vitest, Testing Library, Playwright, Vite, existing `ThemeContext`, existing shadcn/ui primitives.

---

## Working Rules

- Preserve a direção `luxury/refined`: base navy profunda, acento roxo contido, contraste forte e superfícies bem recortadas.
- Do not reintroduce hardcoded light colors in shared primitives.
- Prefer reusing Tailwind tokens and CSS variables over page-local color strings.
- Every page phase must finish with:
  - focused tests green
  - visual smoke on desktop
  - visual smoke on mobile
  - one isolated commit
- If a page depends on a shared primitive that is still wrong, fix the primitive first instead of stacking page-local overrides.

## File Structure

**Likely create:**
- `src/components/ui/__tests__/premium-theme-primitives.test.tsx` - regression for tokenized buttons, cards, inputs, badges, selects, dialogs, dropdowns, and toasts
- `src/components/layout/MainLayout.test.tsx` - app shell background and layout regression
- `src/pages/Dashboard.test.tsx` - dashboard root, stat cards, and chart surfaces
- `src/pages/Contas.test.tsx` - accounts page dark-mode shell regression
- `src/components/accounts/AccountCard.test.tsx` - account card contrast and status badge coverage
- `src/pages/CreditCards.test.tsx` - credit card page dark-mode shell/tabs regression
- `src/pages/Investments.dark-theme.test.tsx` - investments analytics surface regression
- `src/pages/Reports.dark-theme.test.tsx` - reports analytics surface regression
- `src/pages/Login.dark-theme.test.tsx` - login page dark-mode contract
- `e2e/dark-mode-login.spec.ts` - unauthenticated dark-mode smoke
- `e2e/dark-mode-authenticated.spec.ts` - authenticated desktop/mobile route smoke for key pages
- `docs/superpowers/reports/2026-04-08-dark-mode-premium-validation.md` - manual QA matrix with page-by-page desktop/mobile signoff

**Likely modify foundation files:**
- `tailwind.config.js`
- `src/index.css`
- `src/contexts/ThemeContext.tsx`
- `src/contexts/ThemeContext.test.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/sonner.tsx`
- `src/components/layout/MainLayout.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Header.test.tsx`
- `src/components/layout/Sidebar.tsx`

**Likely modify page/model files:**
- `src/pages/Dashboard.tsx`
- `src/components/dashboard/StatCard.tsx`
- `src/components/dashboard/charts/ChartCard.tsx`
- `src/components/dashboard/AnaDashboardWidget.tsx`
- `src/components/dashboard/TransactionItem.tsx`
- `src/components/dashboard/DashboardSkeleton.tsx`
- `src/pages/Contas.tsx`
- `src/components/accounts/AccountCard.tsx`
- `src/components/accounts/AccountDialog.tsx`
- `src/pages/Transacoes.tsx`
- `src/components/transactions/TransactionDialog.tsx`
- `src/pages/CreditCards.tsx`
- `src/components/credit-cards/CreditCardList.tsx`
- `src/components/analytics/AnalyticsTab.tsx`
- `src/components/invoices/InvoiceList.tsx`
- `src/components/invoices/InvoiceHistory.tsx`
- `src/pages/PayableBills.tsx`
- `src/components/payable-bills/BillSummaryCards.tsx`
- `src/components/payable-bills/BillList.tsx`
- `src/components/payable-bills/BillDialog.tsx`
- `src/components/payable-bills/BillTable.tsx`
- `src/components/payable-bills/BillCalendar.tsx`
- `src/pages/Goals.tsx`
- `src/components/gamification/XPProgressBar.tsx`
- `src/components/gamification/NextAchievements.tsx`
- `src/components/gamification/StreakHeatmap.tsx`
- `src/components/gamification/GamificationStats.tsx`
- `src/components/gamification/GamificationToaster.tsx`
- `src/pages/Investments.tsx`
- `src/components/investments/AnaInvestmentInsights.tsx`
- `src/components/investments/BenchmarkComparison.tsx`
- `src/components/investments/DiversificationScoreCard.tsx`
- `src/components/investments/OpportunityCard.tsx`
- `src/components/investments/PerformanceBarChart.tsx`
- `src/components/investments/PerformanceHeatMap.tsx`
- `src/components/investments/SmartRebalanceWidget.tsx`
- `src/pages/Reports.tsx`
- `src/components/reports/ReportsOverviewCards.tsx`
- `src/components/reports/ReportsSpendingSection.tsx`
- `src/components/reports/ReportsTrendSection.tsx`
- `src/components/reports/ReportsBalanceSheetSection.tsx`
- `src/pages/Settings.tsx`
- `src/components/settings/GeneralSettings.tsx`
- `src/components/settings/AIProviderSettings.tsx`
- `src/components/settings/IntegrationsSettings.tsx`
- `src/components/settings/WebhooksSettings.tsx`
- `src/components/settings/NotificationsSettings.tsx`
- `src/components/settings/WebhookFormDialog.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Login.tsx`
- `src/pages/Education.tsx`
- `src/pages/LessonViewer.tsx`
- `src/components/education/EducationHero.tsx`
- `src/components/education/EducationJourneySection.tsx`
- `src/components/education/EducationDailyTipCard.tsx`
- `src/components/education/EducationAnaMentorshipCard.tsx`
- `src/pages/Tags.tsx`
- `src/pages/Categories.tsx`
- `src/components/categories/CategoryCard.tsx`
- `src/components/categories/CreateCategoryDialog.tsx`
- `src/pages/Accounts.tsx`
- `src/pages/Transactions.tsx`
- `src/pages/Planning.tsx`
- `src/pages/TestEmail.tsx`
- `src/pages/TestePage.tsx`

---

## Task 1: Establish Premium Theme Tokens and Shared Primitive Contract

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`
- Modify: `src/contexts/ThemeContext.tsx`
- Modify: `src/contexts/ThemeContext.test.tsx`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/select.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/dropdown-menu.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/table.tsx`
- Modify: `src/components/ui/sonner.tsx`
- Test: `src/components/ui/__tests__/premium-theme-primitives.test.tsx`

- [ ] **Step 1: Write the failing primitive regression test**

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

describe('premium dark-mode primitives', () => {
  it('uses theme tokens instead of hardcoded light surfaces', () => {
    render(
      <ThemeProvider defaultTheme="dark" storageKey="plan-theme">
        <Card data-testid="card">surface</Card>
        <Input data-testid="input" placeholder="email" />
        <Button variant="outline">Outline</Button>
        <Badge variant="success">Ativa</Badge>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('card').className).toContain('bg-card');
    expect(screen.getByTestId('input').className).toContain('bg-background');
    expect(screen.getByRole('button', { name: 'Outline' }).className).toContain('border');
    expect(screen.getByText('Ativa').className).not.toContain('bg-white');
  });
});
```

- [ ] **Step 2: Run the failing primitive/theme tests**

Run: `pnpm test -- src/contexts/ThemeContext.test.tsx src/components/ui/__tests__/premium-theme-primitives.test.tsx`

Expected:
- `ThemeContext.test.tsx` stays green
- `premium-theme-primitives.test.tsx` fails because shared primitives still use mixed `zinc`, `white`, and ad-hoc dark classes instead of a premium token contract

- [ ] **Step 3: Add dark-mode premium tokens and surface layers**

```js
// tailwind.config.js
extend: {
  colors: {
    canvas: 'hsl(var(--canvas))',
    surface: {
      DEFAULT: 'hsl(var(--surface))',
      elevated: 'hsl(var(--surface-elevated))',
      overlay: 'hsl(var(--surface-overlay))',
    },
    success: {
      DEFAULT: 'hsl(var(--success))',
      foreground: 'hsl(var(--success-foreground))',
      subtle: 'hsl(var(--success-subtle))',
      border: 'hsl(var(--success-border))',
    },
    warning: {
      DEFAULT: 'hsl(var(--warning))',
      foreground: 'hsl(var(--warning-foreground))',
      subtle: 'hsl(var(--warning-subtle))',
      border: 'hsl(var(--warning-border))',
    },
    danger: {
      DEFAULT: 'hsl(var(--danger))',
      foreground: 'hsl(var(--danger-foreground))',
      subtle: 'hsl(var(--danger-subtle))',
      border: 'hsl(var(--danger-border))',
    },
  },
}
```

```css
/* src/index.css */
:root {
  --canvas: 220 23% 97%;
  --surface: 0 0% 100%;
  --surface-elevated: 220 20% 98%;
  --surface-overlay: 0 0% 100%;
}

.dark {
  --background: 228 38% 9%;
  --foreground: 210 40% 98%;
  --canvas: 228 38% 9%;
  --surface: 226 30% 12%;
  --surface-elevated: 225 27% 15%;
  --surface-overlay: 225 24% 18%;
  --card: 226 30% 12%;
  --popover: 225 24% 18%;
  --border: 224 19% 24%;
  --input: 224 19% 24%;
  --muted: 223 20% 18%;
  --muted-foreground: 216 18% 68%;
  --success-subtle: 152 53% 14%;
  --warning-subtle: 38 65% 15%;
  --danger-subtle: 0 54% 16%;
}
```

- [ ] **Step 4: Retheme shared primitives to consume the new token contract**

```tsx
// src/components/ui/button.tsx
variant: {
  default: 'bg-foreground text-background hover:opacity-90',
  brand: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_12px_30px_rgba(139,92,246,0.18)]',
  outline: 'border-border bg-surface text-foreground hover:bg-surface-elevated',
  secondary: 'bg-surface-elevated text-foreground hover:bg-surface-overlay',
  ghost: 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
}
```

```tsx
// src/components/ui/select.tsx
className={cn(
  'flex h-9 w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground',
  className,
)}
```

```tsx
// src/components/ui/dialog.tsx
className={cn(
  'fixed left-[50%] top-[50%] z-[70] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border border-border bg-surface-overlay p-6 text-foreground shadow-2xl',
  className,
)}
```

```tsx
// src/components/ui/badge.tsx
const variants = {
  default: 'bg-primary/15 text-primary border border-primary/25',
  success: 'bg-success-subtle text-success-foreground border border-success-border',
  warning: 'bg-warning-subtle text-warning-foreground border border-warning-border',
  danger: 'bg-danger-subtle text-danger-foreground border border-danger-border',
  secondary: 'bg-surface-elevated text-foreground border border-border',
};
```

- [ ] **Step 5: Re-run focused tests, lint, and commit**

Run:
- `pnpm test -- src/contexts/ThemeContext.test.tsx src/components/ui/__tests__/premium-theme-primitives.test.tsx`
- `pnpm lint`

Expected:
- tests PASS
- lint PASS

```bash
git add tailwind.config.js src/index.css src/contexts/ThemeContext.tsx src/contexts/ThemeContext.test.tsx src/components/ui/button.tsx src/components/ui/select.tsx src/components/ui/dialog.tsx src/components/ui/dropdown-menu.tsx src/components/ui/badge.tsx src/components/ui/table.tsx src/components/ui/sonner.tsx src/components/ui/__tests__/premium-theme-primitives.test.tsx
git commit -m "feat(ui): establish premium dark theme primitives"
```

---

## Task 2: Retheme the Global Shell and Navigation

**Files:**
- Create: `src/components/layout/MainLayout.test.tsx`
- Modify: `src/components/layout/MainLayout.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/Header.test.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Test: `e2e/dark-mode-login.spec.ts`

- [ ] **Step 1: Write failing shell regression tests**

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MainLayout } from './MainLayout';

vi.mock('./Sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar">sidebar</aside>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">page</div>,
  };
});

describe('MainLayout dark shell', () => {
  it('uses background tokens instead of gray-50 shell surfaces', () => {
    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-shell').className).toContain('bg-background');
    expect(screen.getByTestId('app-shell').className).not.toContain('bg-gray-50');
  });
});
```

```ts
// append to src/components/layout/Header.test.tsx
it('keeps the theme toggle and menu trigger on premium shell surfaces', async () => {
  renderHeader();
  expect(screen.getByRole('button', { name: /ativar tema/i }).className).not.toContain('bg-white');
});
```

- [ ] **Step 2: Run the shell tests**

Run: `pnpm test -- src/components/layout/MainLayout.test.tsx src/components/layout/Header.test.tsx`

Expected:
- `MainLayout.test.tsx` fails because the shell still uses `bg-gray-50`
- `Header.test.tsx` fails if the dark shell still depends on white-background assumptions

- [ ] **Step 3: Retheme `MainLayout`, `Header`, and `Sidebar`**

```tsx
// src/components/layout/MainLayout.tsx
export function MainLayout() {
  return (
    <div data-testid="app-shell" className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        <Outlet />
      </main>
      <QuickCreateManager />
    </div>
  );
}
```

```tsx
// src/components/layout/Header.tsx
<header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-6 py-6 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
  <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
  {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
</header>
```

```tsx
// src/components/layout/Sidebar.tsx
<aside className="fixed top-0 left-0 h-screen w-64 border-r border-border bg-surface text-foreground shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)]">
  ...
  isActive
    ? 'bg-surface-elevated text-foreground ring-1 ring-primary/20 shadow-[0_0_0_1px_rgba(139,92,246,0.08)]'
    : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
</aside>
```

- [ ] **Step 4: Add the login-shell smoke test for dark mode**

```ts
// e2e/dark-mode-login.spec.ts
import { test, expect } from '@playwright/test';

test('login page supports premium dark shell', async ({ page }) => {
  await page.goto('/login');
  await page.locator('html').evaluate((node) => node.classList.add('dark'));
  await expect(page.getByRole('heading', { level: 1, name: /personal finance la/i })).toBeVisible();
  await expect(page).toHaveScreenshot('login-dark-shell.png');
});
```

- [ ] **Step 5: Re-run tests and commit**

Run:
- `pnpm test -- src/components/layout/MainLayout.test.tsx src/components/layout/Header.test.tsx`
- `pnpm test:e2e -- e2e/dark-mode-login.spec.ts`

Expected:
- Vitest PASS
- Playwright PASS with one stable screenshot baseline

```bash
git add src/components/layout/MainLayout.tsx src/components/layout/MainLayout.test.tsx src/components/layout/Header.tsx src/components/layout/Header.test.tsx src/components/layout/Sidebar.tsx e2e/dark-mode-login.spec.ts
git commit -m "feat(ui): retheme global app shell"
```

---

## Task 3: Make the Dashboard the Reference Dark-Mode Page

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/components/dashboard/StatCard.tsx`
- Modify: `src/components/dashboard/charts/ChartCard.tsx`
- Modify: `src/components/dashboard/AnaDashboardWidget.tsx`
- Modify: `src/components/dashboard/TransactionItem.tsx`
- Modify: `src/components/dashboard/DashboardSkeleton.tsx`
- Test: `src/pages/Dashboard.test.tsx`

- [ ] **Step 1: Write the failing dashboard regression test**

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'luciano@example.com' }, profile: { full_name: 'Luciano Alf' } }),
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({ userSettings: { display_name: 'Luciano Alf' } }),
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({ formatCurrency: (value: number) => `R$ ${value.toFixed(2)}` }),
}));

describe('Dashboard dark mode shell', () => {
  it('uses the premium background contract', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Bem-vindo ao seu painel financeiro/i).closest('div')?.className).not.toContain('bg-gray-50');
  });
});
```

- [ ] **Step 2: Run the dashboard regression test**

Run: `pnpm test -- src/pages/Dashboard.test.tsx`

Expected:
- FAIL because the dashboard root and child widgets still rely on `bg-gray-50`, `text-gray-*`, and ad-hoc purple gradients

- [ ] **Step 3: Retheme the dashboard shell, stat cards, and chart wrappers**

```tsx
// src/pages/Dashboard.tsx
return (
  <div className="min-h-screen bg-background">
    <Header ... />
    <div className="space-y-6 p-6">
      ...
    </div>
  </div>
);
```

```tsx
// src/components/dashboard/StatCard.tsx
<Card
  data-testid="stat-card"
  className="group relative overflow-hidden border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-surface-elevated hover:shadow-[0_18px_40px_rgba(7,12,24,0.35)]"
>
  <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
  <p className="mb-1 text-sm font-medium text-muted-foreground">{title}</p>
  <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
</Card>
```

```tsx
// src/components/dashboard/charts/ChartCard.tsx
<Card className="overflow-hidden border-border bg-surface shadow-sm">
  <CardHeader className="border-b border-border bg-surface-elevated">
    <div className="h-8 w-8 rounded-lg border border-primary/20 bg-primary/12 text-primary" />
  </CardHeader>
</Card>
```

- [ ] **Step 4: Retheme the dashboard support components**

```tsx
// src/components/dashboard/AnaDashboardWidget.tsx
<Card className="border-border bg-gradient-to-br from-surface to-surface-elevated shadow-sm">
```

```tsx
// src/components/dashboard/TransactionItem.tsx
className={cn(
  'flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-all duration-200 hover:bg-surface-elevated hover:shadow-sm',
)}
```

```tsx
// src/components/dashboard/DashboardSkeleton.tsx
<div className="min-h-screen bg-background">
```

- [ ] **Step 5: Re-run tests and commit**

Run:
- `pnpm test -- src/pages/Dashboard.test.tsx src/components/layout/MainLayout.test.tsx`

Expected:
- dashboard theming regression PASS

```bash
git add src/pages/Dashboard.tsx src/pages/Dashboard.test.tsx src/components/dashboard/StatCard.tsx src/components/dashboard/charts/ChartCard.tsx src/components/dashboard/AnaDashboardWidget.tsx src/components/dashboard/TransactionItem.tsx src/components/dashboard/DashboardSkeleton.tsx
git commit -m "feat(ui): make dashboard the dark-mode reference page"
```

## Task 4: Retheme Accounts Surfaces and Account Dialogs

**Files:**
- Create: `src/pages/Contas.test.tsx`
- Create: `src/components/accounts/AccountCard.test.tsx`
- Modify: `src/pages/Contas.tsx`
- Modify: `src/components/accounts/AccountCard.tsx`
- Modify: `src/components/accounts/AccountDialog.tsx`
- Modify: `src/components/accounts/DeleteAccountDialog.tsx`

- [ ] **Step 1: Write the failing accounts page regression test**

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Contas } from './Contas';

vi.mock('@/components/layout/Header', () => ({
  Header: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  ),
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [
      {
        id: 'acc-1',
        name: 'Conta Principal',
        type: 'checking',
        bank_name: 'Nubank',
        current_balance: 5419,
        color: '#3b82f6',
        icon: 'checking',
        is_active: true,
      },
    ],
    loading: false,
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    archiveAccount: vi.fn(),
    deleteAccount: vi.fn(),
    adjustBalance: vi.fn(),
  }),
}));

describe('Contas dark mode', () => {
  it('uses themed surfaces instead of light-mode shell classes', () => {
    const { container } = render(
      <MemoryRouter>
        <Contas />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /Contas/i })).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('min-h-screen', 'bg-background');
    expect(container.querySelector('.bg-gray-50')).toBeNull();
    expect(container.querySelector('.bg-white')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the accounts page test**

Run: `pnpm test -- src/pages/Contas.test.tsx`

Expected:
- FAIL because `src/pages/Contas.tsx` still uses light wrappers and summary cards with `bg-white`

- [ ] **Step 3: Write the failing account card regression test**

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AccountCard } from './AccountCard';

vi.mock('@/utils/formatters', () => ({
  formatCurrency: (value: number) => `R$ ${value.toFixed(2)}`,
}));

describe('AccountCard dark mode', () => {
  it('renders premium dark surfaces and muted support text', () => {
    render(
      <AccountCard
        account={{
          id: 'acc-1',
          name: 'Nubank',
          type: 'checking',
          bank_name: 'Nubank',
          current_balance: 599,
          color: '#3b82f6',
          icon: 'checking',
          is_active: true,
          is_shared: false,
        } as any}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onViewTransactions={vi.fn()}
        onAdjustBalance={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const title = screen.getByText('Nubank');
    expect(title.closest('[class*="bg-surface"]')).not.toBeNull();
    expect(title.closest('.bg-white')).toBeNull();
    expect(screen.getByText(/Saldo Atual/i).className).toContain('text-muted-foreground');
  });
});
```

- [ ] **Step 4: Re-theme page summaries and account cards**

```tsx
// src/pages/Contas.tsx
return (
  <div className="min-h-screen bg-background">
    <Header ... />
    <div className="space-y-6 p-6">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-border bg-gradient-to-r from-primary to-primary-strong text-primary-foreground shadow-[0_22px_50px_rgba(80,70,229,0.28)]" />
        <Card className="border-border bg-surface shadow-sm" />
        <Card className="border-border bg-surface shadow-sm" />
      </section>
    </div>
  </div>
);
```

```tsx
// src/components/accounts/AccountCard.tsx
<Card className="group relative h-full overflow-hidden border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-surface-elevated hover:shadow-[0_22px_50px_rgba(7,12,24,0.35)]">
  <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
  <p className="mb-4 text-sm text-muted-foreground">
    {accountType}{account.bank_name ? ` • ${account.bank_name}` : account.type === 'cash' ? ' • Outro' : ''}
  </p>
  <p className="mb-1 text-sm text-muted-foreground">Saldo Atual</p>
  <p className="mb-4 text-3xl font-semibold tracking-tight text-foreground">
    {formatCurrency(account.current_balance)}
  </p>
  {account.is_active && (
    <Badge className="border-0 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20">
      Ativa
    </Badge>
  )}
</Card>
```

- [ ] **Step 5: Re-theme account dialogs and destructive flows**

```tsx
// src/components/accounts/AccountDialog.tsx
<DialogContent className="border-border bg-panel shadow-[0_24px_80px_rgba(3,8,20,0.65)] sm:max-w-[425px]">
  <DialogHeader className="space-y-1">
    <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
      {account ? 'Editar Conta' : 'Nova Conta'}
    </DialogTitle>
  </DialogHeader>
</DialogContent>
```

```tsx
// src/components/accounts/DeleteAccountDialog.tsx
<AlertDialogContent className="border-border bg-panel">
  <AlertDialogTitle className="text-foreground">Excluir conta</AlertDialogTitle>
  <AlertDialogDescription className="text-muted-foreground">
    Esta ação remove a conta do fluxo principal e precisa manter contraste legível em dark mode.
  </AlertDialogDescription>
  <AlertDialogAction className="bg-danger text-danger-foreground hover:bg-danger/90">
    Excluir
  </AlertDialogAction>
</AlertDialogContent>
```

- [ ] **Step 6: Re-run tests and commit**

Run:
- `pnpm test -- src/pages/Contas.test.tsx src/components/accounts/AccountCard.test.tsx`

Expected:
- PASS with no `bg-gray-50` / `bg-white` leakage in the accounts shell

```bash
git add src/pages/Contas.tsx src/pages/Contas.test.tsx src/components/accounts/AccountCard.tsx src/components/accounts/AccountCard.test.tsx src/components/accounts/AccountDialog.tsx src/components/accounts/DeleteAccountDialog.tsx
git commit -m "feat(ui): retheme accounts page and dialogs"
```

## Task 5: Retheme Transactions and Credit Card Flows

**Files:**
- Modify: `src/pages/Transacoes.tsx`
- Modify: `src/pages/Transacoes.test.tsx`
- Modify: `src/components/transactions/TransactionDialog.tsx`
- Modify: `src/pages/CreditCards.tsx`
- Modify: `src/pages/CreditCards.test.tsx`
- Modify: `src/components/credit-cards/CreditCardList.tsx`
- Modify: `src/components/analytics/AnalyticsTab.tsx`
- Modify: `src/components/invoices/InvoiceList.tsx`
- Modify: `src/components/invoices/InvoiceHistory.tsx`

- [ ] **Step 1: Extend the transactions test to lock the dark shell**

```tsx
it('renders transactions with themed dark wrappers', () => {
  const { container } = render(
    <MemoryRouter>
      <Transacoes />
    </MemoryRouter>,
  );

  expect(container.firstChild).toHaveClass('min-h-screen', 'bg-background');
  expect(container.querySelector('.bg-gray-50')).toBeNull();
  expect(container.querySelector('.bg-white')).toBeNull();
});
```

- [ ] **Step 2: Run the transactions test**

Run: `pnpm test -- src/pages/Transacoes.test.tsx`

Expected:
- FAIL because the page and filter bar still render legacy light classes

- [ ] **Step 3: Re-theme transaction metrics, filters, list items, and dialog**

```tsx
// src/pages/Transacoes.tsx
return (
  <div className="min-h-screen bg-background">
    <Header ... />
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <StatCard ... />
      </div>
      <Card className="border-border bg-panel p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Input className="border-border bg-surface text-foreground placeholder:text-muted-foreground" />
        </div>
      </Card>
    </div>
  </div>
);
```

```tsx
// src/components/transactions/TransactionDialog.tsx
<DialogContent className="border-border bg-panel shadow-[0_24px_80px_rgba(3,8,20,0.7)] sm:max-w-2xl">
  <FormLabel className="text-foreground">Tipo</FormLabel>
  <Switch className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-elevated" />
  <div className="flex flex-wrap gap-2">
    {tags.map((tag) => (
      <Badge
        key={tag.id}
        variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
        className="border-border bg-surface text-foreground"
      >
        {tag.name}
      </Badge>
    ))}
  </div>
</DialogContent>
```

- [ ] **Step 4: Extend the credit cards test to cover the dark shell**

```tsx
it('renders cards and invoices in premium dark surfaces', () => {
  const { container } = render(
    <MemoryRouter initialEntries={['/cartoes']}>
      <CreditCards />
    </MemoryRouter>,
  );

  expect(container.firstChild).toHaveClass('min-h-screen', 'bg-background');
  expect(container.querySelector('.bg-gray-50')).toBeNull();
});
```

- [ ] **Step 5: Re-theme credit cards overview, tabs, invoices, and analytics**

```tsx
// src/pages/CreditCards.tsx
return (
  <div className="min-h-screen bg-background">
    <Header ... />
    <div className="space-y-6 p-6">
      <CreditCardAlerts cards={cardsSummary} />
      <Tabs defaultValue="cartoes" className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-2xl border border-border bg-surface-elevated p-1" />
      </Tabs>
    </div>
  </div>
);
```

```tsx
// src/components/invoices/InvoiceList.tsx
<Card className="border-border bg-surface shadow-sm">
  <div className="rounded-2xl border border-border bg-surface-elevated p-4 transition-colors hover:bg-surface" />
</Card>
```

```tsx
// src/components/analytics/AnalyticsTab.tsx
<Card className="border-border bg-panel shadow-sm">
  <CardHeader className="border-b border-border bg-surface-elevated" />
</Card>
```

- [ ] **Step 6: Re-run tests and commit**

Run:
- `pnpm test -- src/pages/Transacoes.test.tsx src/pages/CreditCards.test.tsx`

Expected:
- PASS with transactions and credit cards using the same premium dark shell language as the dashboard

```bash
git add src/pages/Transacoes.tsx src/pages/Transacoes.test.tsx src/components/transactions/TransactionDialog.tsx src/pages/CreditCards.tsx src/pages/CreditCards.test.tsx src/components/credit-cards/CreditCardList.tsx src/components/analytics/AnalyticsTab.tsx src/components/invoices/InvoiceList.tsx src/components/invoices/InvoiceHistory.tsx
git commit -m "feat(ui): retheme transactions and credit cards"
```

## Task 6: Retheme Payable Bills and Goals

**Files:**
- Modify: `src/pages/PayableBills.tsx`
- Modify: `src/components/payable-bills/BillSummaryCards.tsx`
- Modify: `src/components/payable-bills/BillList.tsx`
- Modify: `src/components/payable-bills/BillDialog.tsx`
- Modify: `src/components/payable-bills/BillTable.tsx`
- Modify: `src/components/payable-bills/BillCalendar.tsx`
- Modify: `src/pages/Goals.tsx`
- Modify: `src/pages/Goals.test.tsx`
- Modify: `src/components/gamification/XPProgressBar.tsx`
- Modify: `src/components/gamification/NextAchievements.tsx`
- Modify: `src/components/gamification/StreakHeatmap.tsx`
- Modify: `src/components/gamification/GamificationStats.tsx`
- Modify: `src/components/gamification/GamificationToaster.tsx`

- [ ] **Step 1: Add a goals regression that locks the premium dark shell**

```tsx
it('renders goals inside dark themed surfaces', () => {
  const { container } = render(
    <MemoryRouter>
      <Goals />
    </MemoryRouter>,
  );

  expect(container.querySelector('.bg-gray-50')).toBeNull();
  expect(container.querySelector('.text-gray-600')).toBeNull();
});
```

- [ ] **Step 2: Run the goals test**

Run: `pnpm test -- src/pages/Goals.test.tsx`

Expected:
- FAIL because loading, gamification, and settings areas still leak gray utility classes

- [ ] **Step 3: Re-theme payable bills surface system**

```tsx
// src/pages/PayableBills.tsx
return (
  <div className="min-h-screen bg-background">
    <Header ... />
    <div className="space-y-6 p-6">
      <Tabs className="space-y-6">
        <TabsList className="rounded-2xl border border-border bg-surface-elevated p-1" />
      </Tabs>
    </div>
  </div>
);
```

```tsx
// src/components/payable-bills/BillTable.tsx
<div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-sm">
  <table className="w-full text-sm text-foreground" />
</div>
```

```tsx
// src/components/payable-bills/BillCalendar.tsx
<Card className="border-border bg-surface shadow-sm">
  <div className="grid gap-px rounded-2xl bg-border p-px" />
</Card>
```

- [ ] **Step 4: Re-theme goals tabs, progress, and gamification widgets**

```tsx
// src/pages/Goals.tsx
<div className="min-h-screen bg-background">
  <Header ... />
  <div className="space-y-6 p-6">
    <TabsList className="grid w-full grid-cols-4 rounded-2xl border border-border bg-surface-elevated p-1" />
  </div>
</div>
```

```tsx
// src/components/gamification/XPProgressBar.tsx
<Card className="border-border bg-gradient-to-br from-surface to-surface-elevated shadow-sm">
  <div className="h-3 rounded-full bg-surface-overlay">
    <div className="h-3 rounded-full bg-gradient-to-r from-primary to-info" style={{ width: `${xpProgress}%` }} />
  </div>
</Card>
```

```tsx
// src/components/gamification/GamificationToaster.tsx
<div className="rounded-2xl border border-primary/20 bg-panel text-foreground shadow-[0_20px_60px_rgba(7,12,24,0.45)]" />
```

- [ ] **Step 5: Re-run tests and commit**

Run:
- `pnpm test -- src/pages/Goals.test.tsx`

Expected:
- PASS with goals and payable-bills flows visually aligned to the premium dark contract

```bash
git add src/pages/PayableBills.tsx src/components/payable-bills/BillSummaryCards.tsx src/components/payable-bills/BillList.tsx src/components/payable-bills/BillDialog.tsx src/components/payable-bills/BillTable.tsx src/components/payable-bills/BillCalendar.tsx src/pages/Goals.tsx src/pages/Goals.test.tsx src/components/gamification/XPProgressBar.tsx src/components/gamification/NextAchievements.tsx src/components/gamification/StreakHeatmap.tsx src/components/gamification/GamificationStats.tsx src/components/gamification/GamificationToaster.tsx
git commit -m "feat(ui): retheme bills and goals experiences"
```

## Task 7: Retheme Investments and Reports Analytics

**Files:**
- Create: `src/pages/Investments.dark-theme.test.tsx`
- Create: `src/pages/Reports.dark-theme.test.tsx`
- Modify: `src/pages/Investments.tsx`
- Modify: `src/components/investments/AnaInvestmentInsights.tsx`
- Modify: `src/components/investments/BenchmarkComparison.tsx`
- Modify: `src/components/investments/DiversificationScoreCard.tsx`
- Modify: `src/components/investments/OpportunityFeed.tsx`
- Modify: `src/components/investments/PerformanceBarChart.tsx`
- Modify: `src/components/investments/PerformanceHeatMap.tsx`
- Modify: `src/components/investments/SmartRebalanceWidget.tsx`
- Modify: `src/pages/Reports.tsx`
- Modify: `src/components/reports/ReportsOverviewCards.tsx`
- Modify: `src/components/reports/ReportsSpendingSection.tsx`
- Modify: `src/components/reports/ReportsTrendSection.tsx`
- Modify: `src/components/reports/ReportsBalanceSheetSection.tsx`

- [ ] **Step 1: Write the failing investments dark-mode regression**

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Investments } from './Investments';

vi.mock('@/components/layout/Header', () => ({
  Header: () => <div>Investimentos</div>,
}));

vi.mock('@/hooks/useInvestments', () => ({
  useInvestments: () => ({
    investments: [],
    loading: false,
    refresh: vi.fn(),
    addInvestment: vi.fn(),
    updateInvestment: vi.fn(),
    deleteInvestment: vi.fn(),
  }),
}));

describe('Investments dark mode', () => {
  it('renders inside premium dark surfaces', () => {
    const { container } = render(
      <MemoryRouter>
        <Investments />
      </MemoryRouter>,
    );

    expect(container.firstChild).toHaveClass('min-h-screen', 'bg-background');
    expect(container.querySelector('.bg-gray-50')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the investments regression**

Run: `pnpm test -- src/pages/Investments.dark-theme.test.tsx`

Expected:
- FAIL because loading and overview containers still depend on `bg-gray-50` and light skeleton tones

- [ ] **Step 3: Re-theme investments overview, analytics cards, and insight widgets**

```tsx
// src/pages/Investments.tsx
if (loading) {
  return (
    <div className="min-h-screen bg-background">
      <Header ... />
      <div className="space-y-6 p-6">
        <Card className="border-border bg-surface shadow-sm" />
      </div>
    </div>
  );
}
```

```tsx
// src/components/investments/SmartRebalanceWidget.tsx
<Card className="border-border bg-gradient-to-br from-surface to-surface-elevated shadow-sm">
  <CardHeader className="border-b border-border bg-surface-elevated" />
</Card>
```

```tsx
// src/components/investments/PerformanceHeatMap.tsx
<div className="rounded-2xl border border-border bg-panel p-4 shadow-sm">
  <div className="grid gap-2">{/* heatmap cells use surface tiers, not raw grays */}</div>
</div>
```

- [ ] **Step 4: Write the failing reports dark-mode regression**

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Reports } from './Reports';

vi.mock('@/components/layout/Header', () => ({
  Header: () => <div>Relatórios</div>,
}));

vi.mock('@/hooks/useReportsIntelligence', () => ({
  getDefaultReportsPeriod: () => ({ preset: 'month' }),
  buildReportsPeriod: () => ({ label: 'Abril 2026', startDate: '2026-04-01', endDate: '2026-04-30' }),
  useReportsIntelligence: () => ({
    data: null,
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

describe('Reports dark mode', () => {
  it('keeps analytics surfaces on themed dark tokens', () => {
    const { container } = render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>,
    );

    expect(container.firstChild).toHaveClass('min-h-screen', 'bg-background');
    expect(container.querySelector('.bg-gray-50')).toBeNull();
  });
});
```

- [ ] **Step 5: Re-theme reports overview, sections, and empty/error states**

```tsx
// src/pages/Reports.tsx
return (
  <div className="min-h-screen bg-background">
    <Header ... />
    <div className="space-y-6 p-6">
      <ReportsPeriodFilter ... />
      <Alert className="border-danger/30 bg-danger/8 text-foreground" />
    </div>
  </div>
);
```

```tsx
// src/components/reports/ReportsOverviewCards.tsx
<Card className="border-border bg-surface shadow-sm" />
```

```tsx
// src/components/reports/ReportsSpendingSection.tsx
<section className="rounded-3xl border border-border bg-panel shadow-sm" />
```

- [ ] **Step 6: Re-run analytics tests and commit**

Run:
- `pnpm test -- src/pages/Investments.dark-theme.test.tsx src/pages/Reports.dark-theme.test.tsx`

Expected:
- PASS with investments and reports using the same dark-mode elevation and chart container language

```bash
git add src/pages/Investments.dark-theme.test.tsx src/pages/Reports.dark-theme.test.tsx src/pages/Investments.tsx src/components/investments/AnaInvestmentInsights.tsx src/components/investments/BenchmarkComparison.tsx src/components/investments/DiversificationScoreCard.tsx src/components/investments/OpportunityFeed.tsx src/components/investments/PerformanceBarChart.tsx src/components/investments/PerformanceHeatMap.tsx src/components/investments/SmartRebalanceWidget.tsx src/pages/Reports.tsx src/components/reports/ReportsOverviewCards.tsx src/components/reports/ReportsSpendingSection.tsx src/components/reports/ReportsTrendSection.tsx src/components/reports/ReportsBalanceSheetSection.tsx
git commit -m "feat(ui): retheme investments and reports analytics"
```

## Task 8: Retheme Settings, Profile, and Login

**Files:**
- Create: `src/pages/Login.dark-theme.test.tsx`
- Modify: `src/pages/Settings.tsx`
- Modify: `src/components/settings/GeneralSettings.tsx`
- Modify: `src/components/settings/AIProviderSettings.tsx`
- Modify: `src/components/settings/IntegrationsSettings.tsx`
- Modify: `src/components/settings/WebhooksSettings.tsx`
- Modify: `src/components/settings/NotificationsSettings.tsx`
- Modify: `src/components/settings/WebhookFormDialog.tsx`
- Modify: `src/pages/Profile.tsx`
- Modify: `src/pages/Login.tsx`

- [ ] **Step 1: Write the failing login dark-mode regression**

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Login } from './Login';

describe('Login dark mode', () => {
  it('renders a premium dark auth shell instead of the light card-on-gradient pattern', () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Personal Finance LA/i)).toBeInTheDocument();
    expect(container.querySelector('.bg-white')).toBeNull();
    expect(container.querySelector('.from-purple-600')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the login regression**

Run: `pnpm test -- src/pages/Login.dark-theme.test.tsx`

Expected:
- FAIL because the login screen still uses a light card with a bright gradient background

- [ ] **Step 3: Re-theme settings tabs, settings cards, and webhook modal**

```tsx
// src/pages/Settings.tsx
<div className="min-h-screen bg-background">
  <Header ... />
  <div className="container mx-auto max-w-7xl p-6">
    <TabsList className="grid w-full grid-cols-5 rounded-2xl border border-border bg-surface-elevated p-1" />
  </div>
</div>
```

```tsx
// src/components/settings/GeneralSettings.tsx
<Card className="border-border bg-surface shadow-sm">
  <CardHeader className="space-y-1">
    <CardTitle className="text-foreground">Preferências Gerais</CardTitle>
  </CardHeader>
</Card>
```

```tsx
// src/components/settings/WebhookFormDialog.tsx
<DialogContent className="border-border bg-panel shadow-[0_24px_80px_rgba(3,8,20,0.7)]">
  <DialogTitle className="text-foreground">Novo Webhook</DialogTitle>
</DialogContent>
```

- [ ] **Step 4: Re-theme profile aliasing and the login experience**

```tsx
// src/pages/Profile.tsx
import { Settings } from './Settings';

export function Profile() {
  return <Settings />;
}
```

```tsx
// src/pages/Login.tsx
return (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(93,74,255,0.18),_transparent_40%)]" />
    <div className="relative w-full max-w-md rounded-[28px] border border-border bg-panel p-8 shadow-[0_28px_90px_rgba(3,8,20,0.68)]">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Personal Finance LA</h1>
      <p className="mt-2 text-muted-foreground">Bem-vindo de volta!</p>
    </div>
  </div>
);
```

- [ ] **Step 5: Re-run tests and commit**

Run:
- `pnpm test -- src/pages/Login.dark-theme.test.tsx src/components/layout/Header.test.tsx`

Expected:
- PASS with settings/profile/login visually aligned to the same premium surface system

```bash
git add src/pages/Login.dark-theme.test.tsx src/pages/Settings.tsx src/components/settings/GeneralSettings.tsx src/components/settings/AIProviderSettings.tsx src/components/settings/IntegrationsSettings.tsx src/components/settings/WebhooksSettings.tsx src/components/settings/NotificationsSettings.tsx src/components/settings/WebhookFormDialog.tsx src/pages/Profile.tsx src/pages/Login.tsx
git commit -m "feat(ui): retheme settings and authentication flows"
```

## Task 9: Retheme Education, Tags, Categories, and Legacy Pages

**Files:**
- Modify: `src/pages/Education.tsx`
- Modify: `src/pages/LessonViewer.tsx`
- Modify: `src/components/education/EducationHero.tsx`
- Modify: `src/components/education/EducationJourneySection.tsx`
- Modify: `src/components/education/EducationDailyTipCard.tsx`
- Modify: `src/components/education/EducationAnaMentorshipCard.tsx`
- Modify: `src/pages/Tags.tsx`
- Modify: `src/pages/Categories.tsx`
- Modify: `src/pages/Categories.test.tsx`
- Modify: `src/components/categories/CategoryCard.tsx`
- Modify: `src/components/categories/CreateCategoryDialog.tsx`
- Modify: `src/pages/Accounts.tsx`
- Modify: `src/pages/Transactions.tsx`
- Modify: `src/pages/Planning.tsx`
- Modify: `src/pages/TestEmail.tsx`
- Modify: `src/pages/TestePage.tsx`

- [ ] **Step 1: Extend the categories regression with dark-mode assertions**

```tsx
it('keeps categories on themed surfaces in dark mode', () => {
  const { container } = render(<Categories />);

  expect(container.querySelector('.bg-red-50')).toBeNull();
  expect(container.querySelector('.bg-green-50')).toBeNull();
  expect(container.querySelector('.text-gray-900')).toBeNull();
});
```

- [ ] **Step 2: Run the categories regression**

Run: `pnpm test -- src/pages/Categories.test.tsx`

Expected:
- FAIL because category tabs, empty states, and cards still use light warning/success fills

- [ ] **Step 3: Re-theme the education hub and lesson viewer**

```tsx
// src/pages/Education.tsx
return (
  <div className="min-h-screen bg-background">
    <Header ... />
    <div className="space-y-6 p-6">
      <EducationHero ... />
    </div>
  </div>
);
```

```tsx
// src/pages/LessonViewer.tsx
<div className="min-h-screen bg-background">
  <LessonProgressBar />
  <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
    <p className="border-l-2 border-primary/30 pl-3 text-muted-foreground italic" />
  </div>
</div>
```

- [ ] **Step 4: Re-theme tags, categories, and legacy pages**

```tsx
// src/pages/Tags.tsx
<div className="min-h-screen bg-background">
  <Header ... />
  <div className="max-w-7xl mx-auto space-y-6 p-6">
    <Card className="border-border bg-panel shadow-sm" />
  </div>
</div>
```

```tsx
// src/pages/Categories.tsx
<div className="max-w-7xl mx-auto space-y-6 p-6">
  <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl border border-border bg-surface-elevated p-1" />
  <div className="rounded-2xl border border-dashed border-border bg-surface px-8 py-10 text-center" />
</div>
```

```tsx
// src/pages/Accounts.tsx, src/pages/Transactions.tsx, src/pages/Planning.tsx, src/pages/TestEmail.tsx, src/pages/TestePage.tsx
export default function LegacyPage() {
  return <div className="min-h-screen bg-background text-foreground" />;
}
```

- [ ] **Step 5: Re-run tests and commit**

Run:
- `pnpm test -- src/pages/Categories.test.tsx`

Expected:
- PASS with education and auxiliary pages no longer leaking light-only surfaces

```bash
git add src/pages/Education.tsx src/pages/LessonViewer.tsx src/components/education/EducationHero.tsx src/components/education/EducationJourneySection.tsx src/components/education/EducationDailyTipCard.tsx src/components/education/EducationAnaMentorshipCard.tsx src/pages/Tags.tsx src/pages/Categories.tsx src/pages/Categories.test.tsx src/components/categories/CategoryCard.tsx src/components/categories/CreateCategoryDialog.tsx src/pages/Accounts.tsx src/pages/Transactions.tsx src/pages/Planning.tsx src/pages/TestEmail.tsx src/pages/TestePage.tsx
git commit -m "feat(ui): retheme education and supporting pages"
```

## Task 10: Run Desktop/Mobile Regression and Capture Final Validation

**Files:**
- Create: `e2e/dark-mode-authenticated.spec.ts`
- Create: `docs/superpowers/reports/2026-04-08-dark-mode-premium-validation.md`
- Modify: `e2e/canonical-routes.authenticated.spec.ts`

- [ ] **Step 1: Add authenticated desktop/mobile dark-mode smoke coverage**

```ts
import { test, expect, devices } from '@playwright/test';
import { loadE2ECredentials } from './support/e2eCredentials';

const credentials = loadE2ECredentials();

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByPlaceholder('seu@email.com').fill(credentials!.email);
  await page.locator('input[type="password"]').fill(credentials!.password);
  await page.getByRole('button', { name: /^entrar$/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

test.describe('dark mode authenticated smoke', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!credentials, 'Set E2E credentials to run authenticated dark-mode smoke');
    await login(page);
  });

  test('desktop routes render premium dark shell', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    for (const route of ['/dashboard', '/contas', '/transacoes', '/cartoes', '/configuracoes']) {
      await page.goto(route);
      await expect(page.locator('body')).toHaveScreenshot(`dark-${route.replace('/', '')}-desktop.png`, { fullPage: true });
    }
  });

  test('mobile routes preserve dark hierarchy', async ({ browser }) => {
    const context = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await context.newPage();
    await login(page);
    for (const route of ['/dashboard', '/transacoes', '/configuracoes']) {
      await page.goto(route);
      await expect(page.locator('body')).toHaveScreenshot(`dark-${route.replace('/', '')}-mobile.png`, { fullPage: true });
    }
    await context.close();
  });
});
```

- [ ] **Step 2: Run authenticated Playwright dark-mode coverage**

Run: `pnpm test:e2e -- e2e/dark-mode-authenticated.spec.ts`

Expected:
- PASS locally when `E2E_EMAIL` and `E2E_PASSWORD` are available
- new screenshot baselines for desktop and mobile dark-mode shells

- [ ] **Step 3: Run the final repo verification sweep**

Run:
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Expected:
- all commands PASS with the new theming contract

- [ ] **Step 4: Record the final audit report**

```md
# Dark Mode Premium Validation Report

- Desktop audited routes: `/dashboard`, `/contas`, `/transacoes`, `/cartoes`, `/contas-pagar`, `/metas`, `/investimentos`, `/relatorios`, `/educacao`, `/configuracoes`, `/categorias`, `/tags`
- Mobile audited routes: `/dashboard`, `/transacoes`, `/configuracoes`
- Remaining visual debt: list only verified follow-ups that were intentionally deferred
- Attached evidence: Playwright screenshots + any manual before/after captures
```

- [ ] **Step 5: Commit validation artifacts**

```bash
git add e2e/dark-mode-authenticated.spec.ts e2e/canonical-routes.authenticated.spec.ts docs/superpowers/reports/2026-04-08-dark-mode-premium-validation.md
git commit -m "test(ui): add dark mode desktop and mobile validation"
```

## Spec Coverage Check

- Foundation tokens, semantic color system, and shared primitives are covered by Tasks 1-2.
- The dashboard reference implementation and premium interaction language are covered by Task 3.
- Financial CRUD pages and their modal flows are covered by Tasks 4-6.
- Analytics-heavy surfaces and charts are covered by Task 7.
- Settings, profile, and authentication entry flows are covered by Task 8.
- Education, auxiliary CRUD surfaces, and legacy routes are covered by Task 9.
- Desktop/mobile regression, screenshot evidence, and final validation reporting are covered by Task 10.

## Notes for Execution

- Execute tasks in order; each task assumes the token contract from Task 1 already exists.
- Keep the dashboard as the visual reference page when making judgment calls on elevation, contrast, and accent density.
- Do not widen scope into mobile-first layout redesigns; fix hierarchy, readability, spacing collapse, and shell consistency for existing responsive behavior.
- When a page uses business-state colors, prefer semantic tokens plus opacity layers over raw Tailwind palette classes.
- If a component cannot be brought onto tokens without large refactors, isolate only the theming change in this plan and defer structural cleanup to a separate spec.
