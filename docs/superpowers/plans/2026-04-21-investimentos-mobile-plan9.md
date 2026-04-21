# Investimentos Mobile — Plan 9

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the mobile redesign of the Investimentos (`/investimentos`) page — hero card, 5 swipeable tabs via `SlidingPillTabs`, persisted tab selection, mobile-friendly cards for Portfolio/Transações/Dividendos/Alertas lists, stacked charts + Ana Insights on the Overview tab, and a `DividendCalendarSheet` bottom sheet. Desktop stays pixel-identical. Heavy analytical widgets (Heatmap, Rebalance, Calculator) show a "Disponível no desktop" placeholder on mobile.

**Architecture:** 8 new mobile components + 1 hook + 1 placeholder card + 1 bottom sheet. Three existing Radix `Dialog`-based modals (`InvestmentDialog`, `TransactionDialog`, `AlertDialog`) migrate to `ResponsiveDialog` to prevent the mobile portal freeze bug. `Investments.tsx` dual-renders desktop (existing `Tabs` Radix) and mobile (new subtree) behind `hidden lg:block` / `lg:hidden` CSS.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, date-fns, lucide-react, Recharts (unchanged), Vitest + @testing-library/react (jsdom). Reuses `SlidingPillTabs`, `ResponsiveDialog`, and the `DividendCalendar` / `AnaInvestmentInsights` / 3 Recharts components already in the tree.

**Spec:** [docs/superpowers/specs/2026-04-21-investimentos-mobile-design.md](../specs/2026-04-21-investimentos-mobile-design.md)

**Suggested branch:** `feat/investimentos-mobile` (already created before starting this plan)

---

## Task 1 — `useInvestmentsActiveTab` hook (localStorage persistence)

**Files:**
- Create: `src/hooks/useInvestmentsActiveTab.ts`
- Create: `src/hooks/__tests__/useInvestmentsActiveTab.test.ts`

- [ ] **Step 1.1: Write the failing test**

Create `src/hooks/__tests__/useInvestmentsActiveTab.test.ts`:

```ts
/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useInvestmentsActiveTab } from '../useInvestmentsActiveTab';

const KEY = 'investments-active-tab';

describe('useInvestmentsActiveTab', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it('defaults to "portfolio" when nothing is stored', () => {
    const { result } = renderHook(() => useInvestmentsActiveTab());
    expect(result.current[0]).toBe('portfolio');
  });

  it('reads a valid stored value', () => {
    window.localStorage.setItem(KEY, 'overview');
    const { result } = renderHook(() => useInvestmentsActiveTab());
    expect(result.current[0]).toBe('overview');
  });

  it('falls back to default on invalid stored value', () => {
    window.localStorage.setItem(KEY, 'bogus');
    const { result } = renderHook(() => useInvestmentsActiveTab('alerts'));
    expect(result.current[0]).toBe('alerts');
  });

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useInvestmentsActiveTab());
    act(() => result.current[1]('dividends'));
    expect(window.localStorage.getItem(KEY)).toBe('dividends');
    expect(result.current[0]).toBe('dividends');
  });

  it('accepts explicit default override', () => {
    const { result } = renderHook(() => useInvestmentsActiveTab('transactions'));
    expect(result.current[0]).toBe('transactions');
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `pnpm test src/hooks/__tests__/useInvestmentsActiveTab.test.ts`
Expected: FAIL with "Cannot find module '../useInvestmentsActiveTab'".

- [ ] **Step 1.3: Implement the hook**

Create `src/hooks/useInvestmentsActiveTab.ts`:

```ts
import { useEffect, useState } from 'react';

export type InvestmentTab = 'portfolio' | 'transactions' | 'dividends' | 'alerts' | 'overview';

const STORAGE_KEY = 'investments-active-tab';
const VALID: ReadonlySet<InvestmentTab> = new Set([
  'portfolio',
  'transactions',
  'dividends',
  'alerts',
  'overview',
]);

function readStored(fallback: InvestmentTab): InvestmentTab {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw && VALID.has(raw as InvestmentTab) ? (raw as InvestmentTab) : fallback;
}

export function useInvestmentsActiveTab(defaultTab: InvestmentTab = 'portfolio') {
  const [tab, setTab] = useState<InvestmentTab>(() => readStored(defaultTab));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, tab);
  }, [tab]);

  return [tab, setTab] as const;
}
```

- [ ] **Step 1.4: Run test to verify it passes**

Run: `pnpm test src/hooks/__tests__/useInvestmentsActiveTab.test.ts`
Expected: 5 tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add src/hooks/useInvestmentsActiveTab.ts src/hooks/__tests__/useInvestmentsActiveTab.test.ts
git commit -m "feat(investments): add useInvestmentsActiveTab hook with localStorage persistence"
```

---

## Task 2 — `DesktopOnlyWidgetCard` component

**Files:**
- Create: `src/components/investments/DesktopOnlyWidgetCard.tsx`
- Create: `src/components/investments/__tests__/DesktopOnlyWidgetCard.test.tsx`

- [ ] **Step 2.1: Write the failing test**

Create `src/components/investments/__tests__/DesktopOnlyWidgetCard.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DesktopOnlyWidgetCard } from '../DesktopOnlyWidgetCard';

describe('DesktopOnlyWidgetCard', () => {
  afterEach(() => cleanup());

  it('renders the provided title', () => {
    render(<DesktopOnlyWidgetCard title="Heatmap de performance" />);
    expect(screen.getByText('Heatmap de performance')).toBeTruthy();
  });

  it('renders the default "Disponível no desktop" description', () => {
    render(<DesktopOnlyWidgetCard title="X" />);
    expect(screen.getByText(/disponível no desktop/i)).toBeTruthy();
  });

  it('renders a custom description when provided', () => {
    render(<DesktopOnlyWidgetCard title="X" description="Abra um notebook para ver o gráfico completo" />);
    expect(screen.getByText(/abra um notebook/i)).toBeTruthy();
  });

  it('has role="status" with an aria-label', () => {
    const { container } = render(<DesktopOnlyWidgetCard title="X" />);
    const root = container.querySelector('[role="status"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('aria-label')).toMatch(/apenas no desktop/i);
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `pnpm test src/components/investments/__tests__/DesktopOnlyWidgetCard.test.tsx`
Expected: FAIL with "Cannot find module '../DesktopOnlyWidgetCard'".

- [ ] **Step 2.3: Implement the component**

Create `src/components/investments/DesktopOnlyWidgetCard.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Monitor } from 'lucide-react';

interface DesktopOnlyWidgetCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function DesktopOnlyWidgetCard({
  title,
  description = 'Disponível no desktop',
  icon,
}: DesktopOnlyWidgetCardProps) {
  return (
    <div
      role="status"
      aria-label={`${title} — disponível apenas no desktop`}
      className="lg:hidden mx-4 my-2 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-surface-elevated/40 px-4 py-6 text-center"
    >
      <div className="text-2xl text-muted-foreground">{icon ?? <Monitor className="h-6 w-6" aria-hidden="true" />}</div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
```

- [ ] **Step 2.4: Run test to verify it passes**

Run: `pnpm test src/components/investments/__tests__/DesktopOnlyWidgetCard.test.tsx`
Expected: 4 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/components/investments/DesktopOnlyWidgetCard.tsx src/components/investments/__tests__/DesktopOnlyWidgetCard.test.tsx
git commit -m "feat(investments): add DesktopOnlyWidgetCard placeholder for mobile"
```

---

## Task 3 — `InvestmentsHeroCard` component

**Files:**
- Create: `src/components/investments/InvestmentsHeroCard.tsx`
- Create: `src/components/investments/__tests__/InvestmentsHeroCard.test.tsx`

- [ ] **Step 3.1: Write the failing test**

Create `src/components/investments/__tests__/InvestmentsHeroCard.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { InvestmentsHeroCard } from '../InvestmentsHeroCard';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

describe('InvestmentsHeroCard', () => {
  afterEach(() => cleanup());

  it('renders the formatted current patrimônio value', () => {
    render(
      <InvestmentsHeroCard
        currentValue={127450}
        totalInvested={113300}
        totalReturn={14150}
        totalReturnPct={12.4}
        monthlyYield={980}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText('R$ 127450,00')).toBeTruthy();
  });

  it('renders the positive delta with an up arrow', () => {
    render(
      <InvestmentsHeroCard
        currentValue={127450}
        totalInvested={113300}
        totalReturn={14150}
        totalReturnPct={12.4}
        monthlyYield={980}
        formatCurrency={format}
      />,
    );
    const delta = screen.getByTestId('hero-delta');
    expect(delta.textContent).toMatch(/12[.,]4%/);
    expect(delta.textContent).toContain('▲');
    expect(delta.className).toContain('text-emerald');
  });

  it('renders the negative delta with a down arrow and red color', () => {
    render(
      <InvestmentsHeroCard
        currentValue={90000}
        totalInvested={100000}
        totalReturn={-10000}
        totalReturnPct={-10}
        monthlyYield={0}
        formatCurrency={format}
      />,
    );
    const delta = screen.getByTestId('hero-delta');
    expect(delta.textContent).toContain('▼');
    expect(delta.className).toContain('text-red');
  });

  it('renders investido and yield/mês on the bottom row', () => {
    render(
      <InvestmentsHeroCard
        currentValue={127450}
        totalInvested={113300}
        totalReturn={14150}
        totalReturnPct={12.4}
        monthlyYield={980}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText(/investido/i)).toBeTruthy();
    expect(screen.getByText('R$ 113300,00')).toBeTruthy();
    expect(screen.getByText(/yield/i)).toBeTruthy();
    expect(screen.getByText('R$ 980,00')).toBeTruthy();
  });

  it('is hidden on desktop via lg:hidden class', () => {
    const { container } = render(
      <InvestmentsHeroCard
        currentValue={1}
        totalInvested={1}
        totalReturn={0}
        totalReturnPct={0}
        monthlyYield={0}
        formatCurrency={format}
      />,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain('lg:hidden');
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

Run: `pnpm test src/components/investments/__tests__/InvestmentsHeroCard.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 3.3: Implement the component**

Create `src/components/investments/InvestmentsHeroCard.tsx`:

```tsx
import { cn } from '@/lib/cn';

interface InvestmentsHeroCardProps {
  currentValue: number;
  totalInvested: number;
  totalReturn: number;
  totalReturnPct: number;
  monthlyYield: number;
  formatCurrency: (value: number) => string;
}

export function InvestmentsHeroCard({
  currentValue,
  totalInvested,
  totalReturn,
  totalReturnPct,
  monthlyYield,
  formatCurrency,
}: InvestmentsHeroCardProps) {
  const positive = totalReturn >= 0;
  return (
    <section
      aria-label="Resumo do portfolio"
      className="lg:hidden mx-4 mt-4 rounded-2xl border border-border/60 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-4 text-foreground"
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Patrimônio
      </div>
      <div className="mt-1 text-3xl font-extrabold leading-none text-foreground">
        {formatCurrency(currentValue)}
      </div>
      <div
        data-testid="hero-delta"
        className={cn(
          'mt-2 text-sm font-semibold',
          positive ? 'text-emerald-400' : 'text-red-400',
        )}
      >
        <span>{positive ? '▲' : '▼'}</span>
        <span className="ml-1">
          {Math.abs(totalReturnPct).toFixed(1).replace('.', ',')}%
        </span>
        <span className="ml-2 text-xs opacity-80">
          {positive ? '+' : '-'}
          {formatCurrency(Math.abs(totalReturn))} total
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Investido
          </div>
          <div className="mt-0.5 text-sm font-bold text-foreground">
            {formatCurrency(totalInvested)}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Yield/mês
          </div>
          <div className="mt-0.5 text-sm font-bold text-foreground">
            {formatCurrency(monthlyYield)}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3.4: Run test to verify it passes**

Run: `pnpm test src/components/investments/__tests__/InvestmentsHeroCard.test.tsx`
Expected: 5 tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add src/components/investments/InvestmentsHeroCard.tsx src/components/investments/__tests__/InvestmentsHeroCard.test.tsx
git commit -m "feat(investments): add InvestmentsHeroCard with patrimônio + delta + secondary metrics"
```

---

## Task 4 — `PortfolioCardList` component

**Files:**
- Create: `src/components/investments/PortfolioCardList.tsx`
- Create: `src/components/investments/__tests__/PortfolioCardList.test.tsx`

**Prerequisite check:** before writing tests, read `src/types/database.types.ts` and confirm the `Investment` shape has fields: `id`, `ticker`, `name`, `type` (one of `stock | fund | treasury | crypto | real_estate | other`), `current_value`, `total_invested`, `quantity`, `purchase_price`. If any field is named differently (e.g. `asset_type` vs `type`), adjust the component + test accordingly. Also check `src/utils/investments/pricing.ts` for `resolveInvestmentDisplayValue`, which the desktop page already uses — the mobile card should use the same resolver for consistency.

- [ ] **Step 4.1: Write the failing test**

Create `src/components/investments/__tests__/PortfolioCardList.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PortfolioCardList } from '../PortfolioCardList';
import type { Investment } from '@/types/database.types';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

function makeInvestment(overrides: Partial<Investment> = {}): Investment {
  return {
    id: 'i1',
    user_id: 'u1',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    type: 'stock',
    quantity: 700,
    purchase_price: 35,
    current_price: 35,
    current_value: 24500,
    total_invested: 24500,
    linked_investments: [],
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  } as Investment;
}

describe('PortfolioCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when no investments', () => {
    render(<PortfolioCardList investments={[]} onCardTap={vi.fn()} formatCurrency={format} />);
    expect(screen.getByText(/nenhum ativo/i)).toBeTruthy();
  });

  it('renders one card per investment', () => {
    render(
      <PortfolioCardList
        investments={[
          makeInvestment(),
          makeInvestment({ id: 'i2', ticker: 'HGLG11', name: 'CSHG Log', type: 'fund' }),
        ]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText('PETR4')).toBeTruthy();
    expect(screen.getByText('HGLG11')).toBeTruthy();
  });

  it('fires onCardTap with the investment when tapped', () => {
    const onCardTap = vi.fn();
    const inv = makeInvestment();
    render(<PortfolioCardList investments={[inv]} onCardTap={onCardTap} formatCurrency={format} />);
    fireEvent.click(screen.getByRole('button', { name: /PETR4/i }));
    expect(onCardTap).toHaveBeenCalledWith(inv);
  });

  it('applies a blue border-left for stocks', () => {
    const { container } = render(
      <PortfolioCardList investments={[makeInvestment()]} onCardTap={vi.fn()} formatCurrency={format} />,
    );
    const card = container.querySelector('[data-testid="portfolio-card"]') as HTMLElement;
    expect(card.className).toContain('border-l-blue-500');
  });

  it('applies a purple border-left for funds', () => {
    const { container } = render(
      <PortfolioCardList
        investments={[makeInvestment({ type: 'fund' })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    const card = container.querySelector('[data-testid="portfolio-card"]') as HTMLElement;
    expect(card.className).toContain('border-l-purple-500');
  });

  it('shows positive return in green with up arrow', () => {
    render(
      <PortfolioCardList
        investments={[makeInvestment({ current_value: 28000, total_invested: 25000 })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    const ret = screen.getByTestId('return-pct');
    expect(ret.textContent).toContain('▲');
    expect(ret.className).toContain('text-emerald');
  });

  it('shows negative return in red with down arrow', () => {
    render(
      <PortfolioCardList
        investments={[makeInvestment({ current_value: 22000, total_invested: 25000 })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    const ret = screen.getByTestId('return-pct');
    expect(ret.textContent).toContain('▼');
    expect(ret.className).toContain('text-red');
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

Run: `pnpm test src/components/investments/__tests__/PortfolioCardList.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 4.3: Implement the component**

Create `src/components/investments/PortfolioCardList.tsx`:

```tsx
import { cn } from '@/lib/cn';
import type { Investment } from '@/types/database.types';

interface PortfolioCardListProps {
  investments: Investment[];
  onCardTap: (investment: Investment) => void;
  formatCurrency: (value: number) => string;
  isLoading?: boolean;
}

const TYPE_BORDER: Record<string, string> = {
  stock: 'border-l-blue-500',
  fund: 'border-l-purple-500',
  treasury: 'border-l-emerald-500',
  crypto: 'border-l-orange-500',
  real_estate: 'border-l-amber-500',
  other: 'border-l-slate-500',
};

const TYPE_LABEL: Record<string, string> = {
  stock: 'Ação',
  fund: 'FII',
  treasury: 'TD',
  crypto: 'Crypto',
  real_estate: 'Imóvel',
  other: 'Outro',
};

const TYPE_BADGE: Record<string, string> = {
  stock: 'bg-blue-500/15 text-blue-300',
  fund: 'bg-purple-500/15 text-purple-300',
  treasury: 'bg-emerald-500/15 text-emerald-300',
  crypto: 'bg-orange-500/15 text-orange-300',
  real_estate: 'bg-amber-500/15 text-amber-300',
  other: 'bg-slate-500/15 text-slate-300',
};

export function PortfolioCardList({
  investments,
  onCardTap,
  formatCurrency,
}: PortfolioCardListProps) {
  if (investments.length === 0) {
    return (
      <div className="lg:hidden px-4 py-10 text-center text-sm text-muted-foreground">
        Nenhum ativo cadastrado ainda.
      </div>
    );
  }

  return (
    <ul role="list" className="lg:hidden space-y-2 px-4 pb-4 pt-2">
      {investments.map((inv) => {
        const type = inv.type ?? 'other';
        const borderClass = TYPE_BORDER[type] ?? TYPE_BORDER.other;
        const badgeClass = TYPE_BADGE[type] ?? TYPE_BADGE.other;
        const badgeLabel = TYPE_LABEL[type] ?? TYPE_LABEL.other;
        const returnAbs = (inv.current_value ?? 0) - (inv.total_invested ?? 0);
        const returnPct =
          inv.total_invested && inv.total_invested > 0
            ? (returnAbs / inv.total_invested) * 100
            : 0;
        const positive = returnAbs >= 0;
        return (
          <li key={inv.id} role="listitem">
            <button
              type="button"
              data-testid="portfolio-card"
              onClick={() => onCardTap(inv)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border-l-[3px] bg-surface-elevated/60 px-3 py-3 text-left transition-colors hover:bg-surface-elevated',
                borderClass,
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{inv.ticker}</span>
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                      badgeClass,
                    )}
                  >
                    {badgeLabel}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{inv.name}</div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {inv.quantity} un · {formatCurrency(inv.purchase_price ?? 0)}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-sm font-bold text-foreground">
                  {formatCurrency(inv.current_value ?? 0)}
                </div>
                <div
                  data-testid="return-pct"
                  className={cn(
                    'mt-0.5 text-xs font-semibold',
                    positive ? 'text-emerald-400' : 'text-red-400',
                  )}
                >
                  {positive ? '▲' : '▼'} {Math.abs(returnPct).toFixed(1).replace('.', ',')}%
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

**IMPORTANT:** If the actual `Investment` type uses different field names (e.g. `asset_type` instead of `type`, or lacks `current_value` and needs a resolver from `src/utils/investments/pricing.ts`), adjust the property accesses in the component to match. The test factory should also match. Do not change the test's structural assertions (role, testid, arrow characters, color classes) — those are the contract.

- [ ] **Step 4.4: Run test to verify it passes**

Run: `pnpm test src/components/investments/__tests__/PortfolioCardList.test.tsx`
Expected: 7 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/components/investments/PortfolioCardList.tsx src/components/investments/__tests__/PortfolioCardList.test.tsx
git commit -m "feat(investments): add PortfolioCardList — mobile portfolio cards with type-colored borders"
```

---

## Task 5 — `TransactionsCardList` component

**Files:**
- Create: `src/components/investments/TransactionsCardList.tsx`
- Create: `src/components/investments/__tests__/TransactionsCardList.test.tsx`

**Prerequisite check:** Read `src/hooks/useInvestmentTransactions.ts` to get the transaction shape. Likely fields: `id`, `investment_id`, `ticker` (or join), `transaction_type` (one of `buy | sell | dividend | split | jscp`), `quantity`, `price`, `total_amount`, `transaction_date`. If the hook returns data via a join (e.g., `investments.ticker`), adjust.

- [ ] **Step 5.1: Write the failing test**

Create `src/components/investments/__tests__/TransactionsCardList.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TransactionsCardList, type TransactionItem } from '../TransactionsCardList';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

function today() { return new Date().toISOString(); }
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function makeTx(overrides: Partial<TransactionItem> = {}): TransactionItem {
  return {
    id: 't1',
    ticker: 'PETR4',
    transaction_type: 'buy',
    quantity: 100,
    price: 35,
    total_amount: 3500,
    transaction_date: today(),
    ...overrides,
  };
}

describe('TransactionsCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when no transactions', () => {
    render(
      <TransactionsCardList transactions={[]} onCardTap={vi.fn()} formatCurrency={format} />,
    );
    expect(screen.getByText(/nenhuma transação/i)).toBeTruthy();
  });

  it('groups transactions by date with "Hoje" and "Ontem" labels', () => {
    render(
      <TransactionsCardList
        transactions={[
          makeTx({ id: 't1' }),
          makeTx({ id: 't2', transaction_date: daysAgo(1) }),
        ]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText(/^hoje$/i)).toBeTruthy();
    expect(screen.getByText(/^ontem$/i)).toBeTruthy();
  });

  it('applies green border-left for buy transactions', () => {
    const { container } = render(
      <TransactionsCardList
        transactions={[makeTx({ transaction_type: 'buy' })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(container.querySelector('[data-testid="tx-card"]')?.className).toContain('border-l-blue-500');
  });

  it('applies red border-left for sell transactions', () => {
    const { container } = render(
      <TransactionsCardList
        transactions={[makeTx({ transaction_type: 'sell' })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(container.querySelector('[data-testid="tx-card"]')?.className).toContain('border-l-red-500');
  });

  it('applies emerald border-left for dividend transactions', () => {
    const { container } = render(
      <TransactionsCardList
        transactions={[makeTx({ transaction_type: 'dividend' })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(container.querySelector('[data-testid="tx-card"]')?.className).toContain('border-l-emerald-500');
  });

  it('fires onCardTap with the transaction when tapped', () => {
    const onCardTap = vi.fn();
    const tx = makeTx();
    render(
      <TransactionsCardList transactions={[tx]} onCardTap={onCardTap} formatCurrency={format} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /PETR4/i }));
    expect(onCardTap).toHaveBeenCalledWith(tx);
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

Run: `pnpm test src/components/investments/__tests__/TransactionsCardList.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 5.3: Implement the component**

Create `src/components/investments/TransactionsCardList.tsx`:

```tsx
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/cn';

export interface TransactionItem {
  id: string;
  ticker: string;
  transaction_type: 'buy' | 'sell' | 'dividend' | 'split' | 'jscp' | string;
  quantity: number;
  price: number;
  total_amount: number;
  transaction_date: string;
}

interface TransactionsCardListProps {
  transactions: TransactionItem[];
  onCardTap: (tx: TransactionItem) => void;
  formatCurrency: (value: number) => string;
}

const TX_BORDER: Record<string, string> = {
  buy: 'border-l-blue-500',
  sell: 'border-l-red-500',
  dividend: 'border-l-emerald-500',
  jscp: 'border-l-emerald-500',
  split: 'border-l-amber-500',
};

const TX_LABEL: Record<string, string> = {
  buy: 'Compra',
  sell: 'Venda',
  dividend: 'Dividendo',
  jscp: 'JCP',
  split: 'Split',
};

function groupLabel(isoDate: string): string {
  const date = parseISO(isoDate);
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "dd 'de' MMM", { locale: ptBR });
}

export function TransactionsCardList({
  transactions,
  onCardTap,
  formatCurrency,
}: TransactionsCardListProps) {
  if (transactions.length === 0) {
    return (
      <div className="lg:hidden px-4 py-10 text-center text-sm text-muted-foreground">
        Nenhuma transação registrada ainda.
      </div>
    );
  }

  const groups = new Map<string, TransactionItem[]>();
  for (const tx of transactions) {
    const key = groupLabel(tx.transaction_date);
    const arr = groups.get(key) ?? [];
    arr.push(tx);
    groups.set(key, arr);
  }

  return (
    <div className="lg:hidden pb-4">
      {Array.from(groups.entries()).map(([label, items]) => (
        <section key={label}>
          <h3 className="px-4 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </h3>
          <ul role="list" className="space-y-2 px-4">
            {items.map((tx) => {
              const borderClass = TX_BORDER[tx.transaction_type] ?? 'border-l-slate-500';
              const actionLabel = TX_LABEL[tx.transaction_type] ?? tx.transaction_type;
              return (
                <li key={tx.id} role="listitem">
                  <button
                    type="button"
                    data-testid="tx-card"
                    onClick={() => onCardTap(tx)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border-l-[3px] bg-surface-elevated/60 px-3 py-3 text-left transition-colors hover:bg-surface-elevated',
                      borderClass,
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground">
                        {tx.ticker} <span className="ml-1 text-xs font-semibold text-muted-foreground">{actionLabel}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {tx.quantity} un · {formatCurrency(tx.price)}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right text-sm font-bold text-foreground">
                      {formatCurrency(tx.total_amount)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

**IMPORTANT:** The `TransactionItem` interface here is a local type to decouple from any database-layer type. In Task 13 (Investments.tsx integration), the page will map the actual hook output to this shape before passing to this component. If you prefer to align with the exact DB type, check `src/hooks/useInvestmentTransactions.ts` and adjust.

- [ ] **Step 5.4: Run test to verify it passes**

Run: `pnpm test src/components/investments/__tests__/TransactionsCardList.test.tsx`
Expected: 6 tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add src/components/investments/TransactionsCardList.tsx src/components/investments/__tests__/TransactionsCardList.test.tsx
git commit -m "feat(investments): add TransactionsCardList — date-grouped transaction cards"
```

---

## Task 6 — `DividendsCardList` component

**Files:**
- Create: `src/components/investments/DividendsCardList.tsx`
- Create: `src/components/investments/__tests__/DividendsCardList.test.tsx`

- [ ] **Step 6.1: Write the failing test**

Create `src/components/investments/__tests__/DividendsCardList.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  DividendsCardList,
  type DividendPaidItem,
  type DividendUpcomingItem,
} from '../DividendsCardList';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

describe('DividendsCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when both lists are empty', () => {
    render(
      <DividendsCardList
        paidThisMonth={[]}
        upcoming30Days={[]}
        formatCurrency={format}
        onOpenCalendar={vi.fn()}
      />,
    );
    expect(screen.getByText(/sem dividendos/i)).toBeTruthy();
  });

  it('renders "Este mês" section with paid items and their total', () => {
    const paid: DividendPaidItem[] = [
      { id: 'p1', ticker: 'HGLG11', subtitle: 'Rendimento jan/26', amount: 285, date: '15 jan' },
      { id: 'p2', ticker: 'BBAS3', subtitle: 'JCP', amount: 120, date: '12 jan' },
    ];
    render(
      <DividendsCardList
        paidThisMonth={paid}
        upcoming30Days={[]}
        formatCurrency={format}
        onOpenCalendar={vi.fn()}
      />,
    );
    expect(screen.getByText(/este mês/i)).toBeTruthy();
    expect(screen.getByText('HGLG11')).toBeTruthy();
    expect(screen.getByText('BBAS3')).toBeTruthy();
    // total = 285 + 120 = 405
    expect(screen.getByText(/R\$ 405,00/i)).toBeTruthy();
  });

  it('renders "Próximos 30 dias" section with upcoming items', () => {
    const upcoming: DividendUpcomingItem[] = [
      { id: 'u1', ticker: 'MXRF11', subtitle: 'Distribuição prevista', amount: 340, date: '28 fev' },
    ];
    render(
      <DividendsCardList
        paidThisMonth={[]}
        upcoming30Days={upcoming}
        formatCurrency={format}
        onOpenCalendar={vi.fn()}
      />,
    );
    expect(screen.getByText(/próximos 30 dias/i)).toBeTruthy();
    expect(screen.getByText('MXRF11')).toBeTruthy();
  });

  it('fires onOpenCalendar when the "Abrir calendário" button is tapped', () => {
    const onOpenCalendar = vi.fn();
    render(
      <DividendsCardList
        paidThisMonth={[]}
        upcoming30Days={[]}
        formatCurrency={format}
        onOpenCalendar={onOpenCalendar}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /abrir calendário/i }));
    expect(onOpenCalendar).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

Run: `pnpm test src/components/investments/__tests__/DividendsCardList.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 6.3: Implement the component**

Create `src/components/investments/DividendsCardList.tsx`:

```tsx
import { CalendarDays } from 'lucide-react';

export interface DividendPaidItem {
  id: string;
  ticker: string;
  subtitle: string;
  amount: number;
  date: string;
}

export interface DividendUpcomingItem {
  id: string;
  ticker: string;
  subtitle: string;
  amount: number;
  date: string;
}

interface DividendsCardListProps {
  paidThisMonth: DividendPaidItem[];
  upcoming30Days: DividendUpcomingItem[];
  formatCurrency: (value: number) => string;
  onOpenCalendar: () => void;
}

export function DividendsCardList({
  paidThisMonth,
  upcoming30Days,
  formatCurrency,
  onOpenCalendar,
}: DividendsCardListProps) {
  const paidTotal = paidThisMonth.reduce((acc, item) => acc + item.amount, 0);
  const hasAnything = paidThisMonth.length > 0 || upcoming30Days.length > 0;

  return (
    <div className="lg:hidden pb-4">
      <div className="px-4 pt-2">
        <button
          type="button"
          onClick={onOpenCalendar}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-surface-elevated/60 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-elevated"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Abrir calendário
        </button>
      </div>

      {!hasAnything ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          Sem dividendos registrados ou previstos.
        </div>
      ) : null}

      {paidThisMonth.length > 0 ? (
        <section>
          <h3 className="flex items-center justify-between px-4 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Este mês</span>
            <span className="text-emerald-400">{formatCurrency(paidTotal)}</span>
          </h3>
          <ul role="list" className="space-y-2 px-4">
            {paidThisMonth.map((item) => (
              <li key={item.id} role="listitem">
                <div className="flex w-full items-start gap-3 rounded-xl border-l-[3px] border-l-emerald-500 bg-surface-elevated/60 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">{item.ticker}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-bold text-emerald-400">
                      +{formatCurrency(item.amount)}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.date}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {upcoming30Days.length > 0 ? (
        <section>
          <h3 className="px-4 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Próximos 30 dias
          </h3>
          <ul role="list" className="space-y-2 px-4">
            {upcoming30Days.map((item) => (
              <li key={item.id} role="listitem">
                <div className="flex w-full items-start gap-3 rounded-xl border-l-[3px] border-l-purple-500 bg-surface-elevated/60 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">{item.ticker}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-bold text-foreground">
                      ≈ {formatCurrency(item.amount)}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.date}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6.4: Run test to verify it passes**

Run: `pnpm test src/components/investments/__tests__/DividendsCardList.test.tsx`
Expected: 4 tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add src/components/investments/DividendsCardList.tsx src/components/investments/__tests__/DividendsCardList.test.tsx
git commit -m "feat(investments): add DividendsCardList — paid + upcoming dividend cards"
```

---

## Task 7 — `DividendCalendarSheet` component

**Files:**
- Create: `src/components/investments/DividendCalendarSheet.tsx`
- Create: `src/components/investments/__tests__/DividendCalendarSheet.test.tsx`

This follows the same bottom-sheet pattern we built in `src/components/calendar/CalendarFiltersSheet.tsx` — fixed position with slide-up animation, backdrop dismissal, ESC key, body-scroll lock.

- [ ] **Step 7.1: Write the failing test**

Create `src/components/investments/__tests__/DividendCalendarSheet.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DividendCalendarSheet } from '../DividendCalendarSheet';

vi.mock('../DividendCalendar', () => ({
  DividendCalendar: () => <div data-testid="dividend-calendar-inline">calendar</div>,
}));

describe('DividendCalendarSheet', () => {
  afterEach(() => cleanup());

  it('is pointer-events-none and translated off-screen when closed', () => {
    const { container } = render(
      <DividendCalendarSheet open={false} onOpenChange={vi.fn()} />,
    );
    const root = container.querySelector('[data-testid="dividend-calendar-sheet-root"]') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('pointer-events-none');
    const sheet = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(sheet.className).toContain('translate-y-full');
  });

  it('slides in and renders the DividendCalendar when open', () => {
    const { container } = render(
      <DividendCalendarSheet open={true} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByTestId('dividend-calendar-inline')).toBeTruthy();
    const sheet = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(sheet.className).toContain('translate-y-0');
  });

  it('closes when the backdrop is tapped', () => {
    const onOpenChange = vi.fn();
    render(<DividendCalendarSheet open={true} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByLabelText('Fechar calendário'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes when the X button is tapped', () => {
    const onOpenChange = vi.fn();
    render(<DividendCalendarSheet open={true} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^fechar$/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes when Escape is pressed', () => {
    const onOpenChange = vi.fn();
    render(<DividendCalendarSheet open={true} onOpenChange={onOpenChange} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 7.2: Run test to verify it fails**

Run: `pnpm test src/components/investments/__tests__/DividendCalendarSheet.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 7.3: Implement the component**

Create `src/components/investments/DividendCalendarSheet.tsx`:

```tsx
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DividendCalendar } from './DividendCalendar';

interface DividendCalendarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DividendCalendarSheet({ open, onOpenChange }: DividendCalendarSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div
      data-testid="dividend-calendar-sheet-root"
      aria-hidden={!open}
      className={cn('fixed inset-0 z-[80] lg:hidden', !open && 'pointer-events-none')}
    >
      <button
        type="button"
        aria-label="Fechar calendário"
        onClick={() => onOpenChange(false)}
        className={cn(
          'absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Calendário de dividendos"
        className={cn(
          'absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-[0_-12px_40px_rgba(0,0,0,0.35)]',
          'transition-transform duration-300 ease-out pb-[env(safe-area-inset-bottom)]',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-foreground">Calendário de dividendos</span>
            <span className="text-xs text-muted-foreground">Próximas distribuições</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-elevated"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <DividendCalendar />
        </div>
      </div>
    </div>
  );
}
```

**Note:** If `DividendCalendar` requires specific props (e.g., range or hook-provided data), pass them through as additional props on `DividendCalendarSheetProps` and forward. For the MVP, use the component as-is.

- [ ] **Step 7.4: Run test to verify it passes**

Run: `pnpm test src/components/investments/__tests__/DividendCalendarSheet.test.tsx`
Expected: 5 tests pass.

- [ ] **Step 7.5: Commit**

```bash
git add src/components/investments/DividendCalendarSheet.tsx src/components/investments/__tests__/DividendCalendarSheet.test.tsx
git commit -m "feat(investments): add DividendCalendarSheet bottom sheet for mobile"
```

---

## Task 8 — `AlertsCardList` component

**Files:**
- Create: `src/components/investments/AlertsCardList.tsx`
- Create: `src/components/investments/__tests__/AlertsCardList.test.tsx`

**Prerequisite check:** Read `src/hooks/useInvestmentAlerts.ts` to confirm the alert shape. Likely fields: `id`, `ticker`, `condition` (e.g., 'gt' | 'lt'), `threshold` (number), `active` (boolean), `created_at`, `last_triggered_at`.

- [ ] **Step 8.1: Write the failing test**

Create `src/components/investments/__tests__/AlertsCardList.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AlertsCardList, type InvestmentAlertItem } from '../AlertsCardList';

function makeAlert(overrides: Partial<InvestmentAlertItem> = {}): InvestmentAlertItem {
  return {
    id: 'a1',
    ticker: 'PETR4',
    description: 'PETR4 > R$ 40',
    subtitle: 'Criado há 3 dias',
    active: true,
    ...overrides,
  };
}

describe('AlertsCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when no alerts', () => {
    render(
      <AlertsCardList
        alerts={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText(/nenhum alerta/i)).toBeTruthy();
  });

  it('renders one card per alert with description and subtitle', () => {
    render(
      <AlertsCardList
        alerts={[
          makeAlert(),
          makeAlert({ id: 'a2', ticker: 'HGLG11', description: 'HGLG11 < R$ 120', subtitle: 'Disparado ontem' }),
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText('PETR4 > R$ 40')).toBeTruthy();
    expect(screen.getByText('HGLG11 < R$ 120')).toBeTruthy();
    expect(screen.getByText(/criado há 3 dias/i)).toBeTruthy();
  });

  it('shows the active section header with count', () => {
    render(
      <AlertsCardList
        alerts={[makeAlert(), makeAlert({ id: 'a2' }), makeAlert({ id: 'a3', active: false })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText(/ativos · 2/i)).toBeTruthy();
  });

  it('fires onEdit when the Edit menu item is tapped', () => {
    const onEdit = vi.fn();
    const alert = makeAlert();
    render(
      <AlertsCardList
        alerts={[alert]}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onToggle={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /editar.*PETR4/i }));
    expect(onEdit).toHaveBeenCalledWith(alert);
  });

  it('fires onDelete when the Delete menu item is tapped', () => {
    const onDelete = vi.fn();
    const alert = makeAlert();
    render(
      <AlertsCardList
        alerts={[alert]}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onToggle={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /remover.*PETR4/i }));
    expect(onDelete).toHaveBeenCalledWith('a1');
  });
});
```

- [ ] **Step 8.2: Run test to verify it fails**

Run: `pnpm test src/components/investments/__tests__/AlertsCardList.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 8.3: Implement the component**

Create `src/components/investments/AlertsCardList.tsx`:

```tsx
import { Bell, Pencil, Trash2 } from 'lucide-react';

export interface InvestmentAlertItem {
  id: string;
  ticker: string;
  description: string;
  subtitle: string;
  active: boolean;
}

interface AlertsCardListProps {
  alerts: InvestmentAlertItem[];
  onEdit: (alert: InvestmentAlertItem) => void;
  onDelete: (alertId: string) => void;
  onToggle: (alertId: string, active: boolean) => void;
}

export function AlertsCardList({ alerts, onEdit, onDelete }: AlertsCardListProps) {
  if (alerts.length === 0) {
    return (
      <div className="lg:hidden px-4 py-10 text-center text-sm text-muted-foreground">
        Nenhum alerta cadastrado.
      </div>
    );
  }

  const activeCount = alerts.filter((a) => a.active).length;

  return (
    <div className="lg:hidden pb-4">
      <h3 className="px-4 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Ativos · {activeCount}
      </h3>
      <ul role="list" className="space-y-2 px-4">
        {alerts.map((alert) => (
          <li key={alert.id} role="listitem">
            <div className="flex w-full items-start gap-3 rounded-xl border-l-[3px] border-l-amber-500 bg-surface-elevated/60 px-3 py-3">
              <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">{alert.description}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{alert.subtitle}</div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(alert)}
                  aria-label={`Editar alerta ${alert.ticker}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-overlay hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(alert.id)}
                  aria-label={`Remover alerta ${alert.ticker}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-overlay hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 8.4: Run test to verify it passes**

Run: `pnpm test src/components/investments/__tests__/AlertsCardList.test.tsx`
Expected: 5 tests pass.

- [ ] **Step 8.5: Commit**

```bash
git add src/components/investments/AlertsCardList.tsx src/components/investments/__tests__/AlertsCardList.test.tsx
git commit -m "feat(investments): add AlertsCardList — mobile alert cards with edit/delete actions"
```

---

## Task 9 — `OverviewMobileLayout` component

**Files:**
- Create: `src/components/investments/OverviewMobileLayout.tsx`
- Create: `src/components/investments/__tests__/OverviewMobileLayout.test.tsx`

- [ ] **Step 9.1: Write the failing test**

Create `src/components/investments/__tests__/OverviewMobileLayout.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../AssetAllocationChart', () => ({
  AssetAllocationChart: () => <div data-testid="asset-allocation-chart" />,
}));
vi.mock('../PortfolioEvolutionChart', () => ({
  PortfolioEvolutionChart: () => <div data-testid="portfolio-evolution-chart" />,
}));
vi.mock('../PerformanceBarChart', () => ({
  PerformanceBarChart: () => <div data-testid="performance-bar-chart" />,
}));
vi.mock('../AnaInvestmentInsights', () => ({
  AnaInvestmentInsights: () => <div data-testid="ana-insights" />,
}));

import { OverviewMobileLayout } from '../OverviewMobileLayout';

describe('OverviewMobileLayout', () => {
  afterEach(() => cleanup());

  it('renders the 3 charts stacked in order: Allocation, Evolution, Performance', () => {
    const { container } = render(<OverviewMobileLayout />);
    const testIds = Array.from(container.querySelectorAll('[data-testid]'))
      .map((el) => el.getAttribute('data-testid'))
      .filter((id): id is string =>
        id === 'asset-allocation-chart' ||
        id === 'portfolio-evolution-chart' ||
        id === 'performance-bar-chart',
      );
    expect(testIds).toEqual([
      'asset-allocation-chart',
      'portfolio-evolution-chart',
      'performance-bar-chart',
    ]);
  });

  it('renders AnaInvestmentInsights after the charts', () => {
    render(<OverviewMobileLayout />);
    expect(screen.getByTestId('ana-insights')).toBeTruthy();
  });

  it('renders 3 "Disponível no desktop" placeholders (Heatmap, Rebalance, Calculator)', () => {
    render(<OverviewMobileLayout />);
    expect(screen.getByText(/heatmap/i)).toBeTruthy();
    expect(screen.getByText(/rebalance/i)).toBeTruthy();
    expect(screen.getByText(/planejamento/i)).toBeTruthy();
    const placeholders = screen.getAllByText(/disponível no desktop/i);
    expect(placeholders.length).toBeGreaterThanOrEqual(3);
  });

  it('is hidden on desktop via lg:hidden class', () => {
    const { container } = render(<OverviewMobileLayout />);
    expect((container.firstElementChild as HTMLElement).className).toContain('lg:hidden');
  });
});
```

- [ ] **Step 9.2: Run test to verify it fails**

Run: `pnpm test src/components/investments/__tests__/OverviewMobileLayout.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 9.3: Implement the component**

Create `src/components/investments/OverviewMobileLayout.tsx`:

```tsx
import { AssetAllocationChart } from './AssetAllocationChart';
import { PortfolioEvolutionChart } from './PortfolioEvolutionChart';
import { PerformanceBarChart } from './PerformanceBarChart';
import { AnaInvestmentInsights } from './AnaInvestmentInsights';
import { DesktopOnlyWidgetCard } from './DesktopOnlyWidgetCard';

export function OverviewMobileLayout() {
  return (
    <div className="lg:hidden space-y-3 pb-4 pt-2">
      <div className="mx-4 rounded-xl border border-border/60 bg-surface-elevated/60 p-3">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Alocação por Tipo</h3>
        <AssetAllocationChart />
      </div>
      <div className="mx-4 rounded-xl border border-border/60 bg-surface-elevated/60 p-3">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Evolução do Patrimônio</h3>
        <PortfolioEvolutionChart />
      </div>
      <div className="mx-4 rounded-xl border border-border/60 bg-surface-elevated/60 p-3">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Performance por Ativo</h3>
        <PerformanceBarChart />
      </div>
      <div className="mx-4 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-3">
        <AnaInvestmentInsights />
      </div>
      <DesktopOnlyWidgetCard title="Heatmap de performance" />
      <DesktopOnlyWidgetCard title="Rebalance inteligente" />
      <DesktopOnlyWidgetCard title="Planejamento de investimentos" />
    </div>
  );
}
```

**IMPORTANT:** The 3 existing chart components (`AssetAllocationChart`, `PortfolioEvolutionChart`, `PerformanceBarChart`) may require props. Check their current signatures in `src/components/investments/`. If they expect props from the page (e.g., `investments`, `metrics`, `timeSeries`), extend `OverviewMobileLayoutProps` to forward them. The desktop page currently passes these — replicate the same prop forwarding here. Similarly for `AnaInvestmentInsights`.

- [ ] **Step 9.4: Run test to verify it passes**

Run: `pnpm test src/components/investments/__tests__/OverviewMobileLayout.test.tsx`
Expected: 4 tests pass.

- [ ] **Step 9.5: Commit**

```bash
git add src/components/investments/OverviewMobileLayout.tsx src/components/investments/__tests__/OverviewMobileLayout.test.tsx
git commit -m "feat(investments): add OverviewMobileLayout with stacked charts + Ana + desktop placeholders"
```

---

## Task 10 — Migrate `InvestmentDialog` to `ResponsiveDialog`

**Files:**
- Modify: `src/components/investments/InvestmentDialog.tsx`
- Modify: `src/components/investments/__tests__/InvestmentDialog.test.tsx` (if exists) OR create if missing.

- [ ] **Step 10.1: Read the existing component and test**

Read: `src/components/investments/InvestmentDialog.tsx` and `src/components/investments/__tests__/InvestmentDialog.test.tsx` (if it exists).

- [ ] **Step 10.2: Update the component to use `ResponsiveDialog`**

1. Replace the import block from `@/components/ui/dialog` with:

```tsx
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogHeader,
} from '@/components/ui/responsive-dialog';
```

2. Find the outer JSX. It likely looks like:

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>{investmentToEdit ? 'Editar ativo' : 'Novo ativo'}</DialogTitle>
    </DialogHeader>
    {/* form body */}
  </DialogContent>
</Dialog>
```

3. Extract the title into a local const:

```tsx
const dialogTitle = investmentToEdit ? 'Editar ativo' : 'Novo ativo';
```

4. Replace the outer JSX with:

```tsx
<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
  <ResponsiveDialogHeader
    title={dialogTitle}
    onClose={() => onOpenChange(false)}
  />
  <ResponsiveDialogBody>
    {/* existing form body — unchanged */}
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

5. If the form had an inner `max-h-[...]` scroll wrapper, remove it — `ResponsiveDialogBody` handles overflow on mobile, and Radix `DialogContent` handles it on desktop.

6. Preserve all form fields, validators, submit handlers, callback props. Only the shell changes.

- [ ] **Step 10.3: Update or create the test**

If `src/components/investments/__tests__/InvestmentDialog.test.tsx` exists, add this mock at the top:

```tsx
vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="rd-root">{children}</div> : null,
  ResponsiveDialogHeader: ({ title, onClose }: { title: string; onClose?: () => void }) => (
    <div><h2>{title}</h2><button type="button" onClick={onClose}>Fechar</button></div>
  ),
  ResponsiveDialogBody: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
```

Replace any existing `vi.mock('@/components/ui/dialog', ...)`. Update any DOM-specific selectors (e.g. `getByTestId('dialog-content')`) to look for the title via `screen.getByRole('heading', { name: /novo ativo/i })`.

If no test file exists, skip to Step 10.4.

- [ ] **Step 10.4: Run the test**

Run: `pnpm test src/components/investments/__tests__/InvestmentDialog.test.tsx`
Expected: all existing assertions pass (or nothing to run if no file existed).

- [ ] **Step 10.5: Commit**

```bash
git add src/components/investments/InvestmentDialog.tsx src/components/investments/__tests__/InvestmentDialog.test.tsx
git commit -m "refactor(investments): migrate InvestmentDialog to ResponsiveDialog"
```

---

## Task 11 — Migrate `TransactionDialog` to `ResponsiveDialog`

**Files:**
- Modify: `src/components/investments/TransactionDialog.tsx`
- Modify: `src/components/investments/__tests__/TransactionDialog.test.tsx` (if exists)

- [ ] **Step 11.1: Read the existing component and test**

Read: `src/components/investments/TransactionDialog.tsx` and its test if exists.

- [ ] **Step 11.2: Update the component**

Replace the Dialog imports and swap the outer JSX exactly as in Task 10. The dynamic title is typically:

```tsx
const dialogTitle = transactionToEdit ? 'Editar transação' : 'Nova transação';
```

Replace the outer:

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>{dialogTitle}</DialogTitle>
    </DialogHeader>
    {/* form body */}
  </DialogContent>
</Dialog>
```

With:

```tsx
<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
  <ResponsiveDialogHeader
    title={dialogTitle}
    onClose={() => onOpenChange(false)}
  />
  <ResponsiveDialogBody>
    {/* existing form body — unchanged */}
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

- [ ] **Step 11.3: Update or create the test**

If a test file exists, apply the same `vi.mock('@/components/ui/responsive-dialog', ...)` block from Task 10. Remove any existing `vi.mock('@/components/ui/dialog', ...)`.

- [ ] **Step 11.4: Run the test**

Run: `pnpm test src/components/investments/__tests__/TransactionDialog.test.tsx`

- [ ] **Step 11.5: Commit**

```bash
git add src/components/investments/TransactionDialog.tsx src/components/investments/__tests__/TransactionDialog.test.tsx
git commit -m "refactor(investments): migrate TransactionDialog to ResponsiveDialog"
```

---

## Task 12 — Migrate `AlertDialog` to `ResponsiveDialog`

**Files:**
- Modify: `src/components/investments/AlertDialog.tsx`
- Modify: `src/components/investments/__tests__/AlertDialog.test.tsx` (if exists)

- [ ] **Step 12.1: Read the existing component and test**

Read: `src/components/investments/AlertDialog.tsx` and its test.

- [ ] **Step 12.2: Update the component**

Swap the Dialog shell. Dynamic title example:

```tsx
const dialogTitle = alertToEdit ? 'Editar alerta' : 'Novo alerta';
```

Replace:

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>{dialogTitle}</DialogTitle>
    </DialogHeader>
    {/* form body */}
  </DialogContent>
</Dialog>
```

With:

```tsx
<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-md">
  <ResponsiveDialogHeader
    title={dialogTitle}
    onClose={() => onOpenChange(false)}
  />
  <ResponsiveDialogBody>
    {/* existing form body — unchanged */}
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

- [ ] **Step 12.3: Update or create the test**

Same mock pattern from Task 10.

- [ ] **Step 12.4: Run the test**

Run: `pnpm test src/components/investments/__tests__/AlertDialog.test.tsx`

- [ ] **Step 12.5: Commit**

```bash
git add src/components/investments/AlertDialog.tsx src/components/investments/__tests__/AlertDialog.test.tsx
git commit -m "refactor(investments): migrate AlertDialog to ResponsiveDialog"
```

---

## Task 13 — Wire mobile subtree into `Investments.tsx`

**Files:**
- Modify: `src/pages/Investments.tsx`
- Modify: `src/pages/Investments.test.tsx`

- [ ] **Step 13.1: Read the existing page**

Read `src/pages/Investments.tsx` in full. Identify:
- Where `activeTab` is declared (replace with hook).
- Where the Radix `<Tabs>` is rendered (wrap in `hidden lg:block`).
- Where `PortfolioSummaryCards` is rendered (wrap in `hidden lg:block`).
- Where each tab's content lives (need to dual-render with mobile component alongside).
- The `formatCurrency` function (likely from `useUserPreferences`).
- The existing event handlers: `handleEditInvestment`, `handleAddTransaction`, etc.

- [ ] **Step 13.2: Update imports**

Add to the top of `Investments.tsx`:

```tsx
import { SlidingPillTabs } from '@/components/ui/sliding-pill-tabs';
import { useInvestmentsActiveTab, type InvestmentTab } from '@/hooks/useInvestmentsActiveTab';
import { InvestmentsHeroCard } from '@/components/investments/InvestmentsHeroCard';
import { PortfolioCardList } from '@/components/investments/PortfolioCardList';
import { TransactionsCardList } from '@/components/investments/TransactionsCardList';
import { DividendsCardList } from '@/components/investments/DividendsCardList';
import { DividendCalendarSheet } from '@/components/investments/DividendCalendarSheet';
import { AlertsCardList } from '@/components/investments/AlertsCardList';
import { OverviewMobileLayout } from '@/components/investments/OverviewMobileLayout';
```

- [ ] **Step 13.3: Replace activeTab state**

Find:

```tsx
const [activeTab, setActiveTab] = useState<...>('portfolio');
```

Replace with:

```tsx
const [activeTab, setActiveTab] = useInvestmentsActiveTab('portfolio');
```

Add:

```tsx
const [dividendCalendarSheetOpen, setDividendCalendarSheetOpen] = useState(false);
```

- [ ] **Step 13.4: Wrap desktop-only elements with `hidden lg:block`**

Wrap the existing `<PortfolioSummaryCards ... />` render with:

```tsx
<div className="hidden lg:block">
  <PortfolioSummaryCards {...existingProps} />
</div>
```

Wrap the existing `<Tabs value={activeTab} onValueChange={setActiveTab}>` (the Radix Tabs block that holds the 5 `TabsContent`s) with:

```tsx
<div className="hidden lg:block">
  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InvestmentTab)}>
    {/* existing TabsList + all 5 TabsContent */}
  </Tabs>
</div>
```

- [ ] **Step 13.5: Add the mobile subtree**

Directly after the desktop `<div className="hidden lg:block">` above, add:

```tsx
<div className="lg:hidden">
  <InvestmentsHeroCard
    currentValue={currentPortfolioValue}
    totalInvested={totalInvested}
    totalReturn={totalReturn}
    totalReturnPct={totalReturnPct}
    monthlyYield={monthlyYield}
    formatCurrency={formatCurrency}
  />

  <div className="mx-4 mt-3">
    <SlidingPillTabs
      tabs={[
        { value: 'portfolio', label: 'Portf' },
        { value: 'transactions', label: 'Trans' },
        { value: 'dividends', label: 'Divid' },
        { value: 'alerts', label: 'Alert' },
        { value: 'overview', label: 'Visão' },
      ]}
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as InvestmentTab)}
      ariaLabel="Abas de investimentos"
    />
  </div>

  {activeTab === 'portfolio' && (
    <PortfolioCardList
      investments={investments}
      onCardTap={handleEditInvestment}
      formatCurrency={formatCurrency}
    />
  )}
  {activeTab === 'transactions' && (
    <TransactionsCardList
      transactions={transactions.map((tx) => ({
        id: tx.id,
        ticker: tx.ticker ?? tx.investment?.ticker ?? '',
        transaction_type: tx.transaction_type,
        quantity: tx.quantity,
        price: tx.price,
        total_amount: tx.total_amount,
        transaction_date: tx.transaction_date,
      }))}
      onCardTap={(tx) => handleEditTransaction?.(tx.id)}
      formatCurrency={formatCurrency}
    />
  )}
  {activeTab === 'dividends' && (
    <DividendsCardList
      paidThisMonth={paidThisMonthItems}
      upcoming30Days={upcoming30DaysItems}
      formatCurrency={formatCurrency}
      onOpenCalendar={() => setDividendCalendarSheetOpen(true)}
    />
  )}
  {activeTab === 'alerts' && (
    <AlertsCardList
      alerts={alertItems}
      onEdit={handleEditAlert}
      onDelete={handleDeleteAlert}
      onToggle={handleToggleAlert}
    />
  )}
  {activeTab === 'overview' && <OverviewMobileLayout />}

  <DividendCalendarSheet
    open={dividendCalendarSheetOpen}
    onOpenChange={setDividendCalendarSheetOpen}
  />
</div>
```

**Variable notes:**
- `currentPortfolioValue`, `totalInvested`, `totalReturn`, `totalReturnPct`, `monthlyYield` — derive from `usePortfolioMetrics()` (inspect the existing page for exact field names; e.g. it may be `metrics.totalValue`, `metrics.totalInvested`, `metrics.totalReturnPct`). If any metric is not available, compute it inline:
  ```ts
  const totalReturn = currentPortfolioValue - totalInvested;
  const totalReturnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  ```
- `paidThisMonthItems` — map `useDividendHistory()` output to the `DividendPaidItem` shape.
- `upcoming30DaysItems` — map `useDividendCalendar()` output to `DividendUpcomingItem`.
- `alertItems` — map `useInvestmentAlerts()` output to `InvestmentAlertItem` (shape: `id`, `ticker`, `description`, `subtitle`, `active`). Build `description` from alert fields (e.g. `` `${alert.ticker} ${alert.condition === 'gt' ? '>' : '<'} ${formatCurrency(alert.threshold)}` ``) and `subtitle` from `created_at` / `last_triggered_at`.

If a mapping is ambiguous, extract it into a small `useMemo` near the top of the page body so the JSX stays readable.

- [ ] **Step 13.6: Update `Investments.test.tsx`**

Add these mocks at the top (before the page import):

```tsx
vi.mock('@/hooks/useInvestmentsActiveTab', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useInvestmentsActiveTab')>(
    '@/hooks/useInvestmentsActiveTab',
  );
  return {
    ...actual,
    useInvestmentsActiveTab: (defaultTab: string) => {
      const [tab, setTab] = React.useState(
        (typeof window !== 'undefined' && window.localStorage.getItem('investments-active-tab')) || defaultTab,
      );
      React.useEffect(() => {
        if (typeof window !== 'undefined') window.localStorage.setItem('investments-active-tab', tab);
      }, [tab]);
      return [tab, setTab] as const;
    },
  };
});

vi.mock('@/components/ui/sliding-pill-tabs', () => ({
  SlidingPillTabs: ({ tabs, value, onValueChange }: { tabs: { value: string; label: string }[]; value: string; onValueChange: (v: string) => void }) => (
    <div role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onValueChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/components/investments/InvestmentsHeroCard', () => ({
  InvestmentsHeroCard: () => <div data-testid="hero-card-mobile" />,
}));
vi.mock('@/components/investments/PortfolioCardList', () => ({
  PortfolioCardList: () => <div data-testid="portfolio-card-list-mobile" />,
}));
vi.mock('@/components/investments/TransactionsCardList', () => ({
  TransactionsCardList: () => <div data-testid="transactions-card-list-mobile" />,
}));
vi.mock('@/components/investments/DividendsCardList', () => ({
  DividendsCardList: () => <div data-testid="dividends-card-list-mobile" />,
}));
vi.mock('@/components/investments/AlertsCardList', () => ({
  AlertsCardList: () => <div data-testid="alerts-card-list-mobile" />,
}));
vi.mock('@/components/investments/OverviewMobileLayout', () => ({
  OverviewMobileLayout: () => <div data-testid="overview-mobile" />,
}));
vi.mock('@/components/investments/DividendCalendarSheet', () => ({
  DividendCalendarSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="dividend-calendar-sheet-open" /> : null,
}));
```

Add a new `describe` block at the end of the file:

```tsx
describe('Investments mobile layout', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('dual-renders the hero card and mobile portfolio list on default tab', () => {
    render(<MemoryRouter><Investments /></MemoryRouter>);
    expect(screen.getByTestId('hero-card-mobile')).toBeTruthy();
    expect(screen.getByTestId('portfolio-card-list-mobile')).toBeTruthy();
  });

  it('switches to transactions mobile view when transactions tab is tapped', () => {
    render(<MemoryRouter><Investments /></MemoryRouter>);
    const tabs = screen.getAllByRole('tab', { name: /trans/i });
    fireEvent.click(tabs[0]);
    expect(screen.getByTestId('transactions-card-list-mobile')).toBeTruthy();
  });

  it('switches to overview mobile layout when overview tab is tapped', () => {
    render(<MemoryRouter><Investments /></MemoryRouter>);
    const tabs = screen.getAllByRole('tab', { name: /visão/i });
    fireEvent.click(tabs[0]);
    expect(screen.getByTestId('overview-mobile')).toBeTruthy();
  });

  it('persists active tab to localStorage', () => {
    render(<MemoryRouter><Investments /></MemoryRouter>);
    const tabs = screen.getAllByRole('tab', { name: /alert/i });
    fireEvent.click(tabs[0]);
    expect(window.localStorage.getItem('investments-active-tab')).toBe('alerts');
  });
});
```

- [ ] **Step 13.7: Run the page tests**

Run: `pnpm test src/pages/Investments.test.tsx`
Expected: all new assertions pass. Fix any cascading failures by tightening mocks.

- [ ] **Step 13.8: Run the full investments folder**

Run: `pnpm test src/components/investments src/hooks/__tests__/useInvestmentsActiveTab`
Expected: all tests pass.

- [ ] **Step 13.9: Commit**

```bash
git add src/pages/Investments.tsx src/pages/Investments.test.tsx
git commit -m "feat(investments): dual-render desktop + mobile layouts in Investments page"
```

---

## Task 14 — Manual verification

- [ ] **Step 14.1: Start the dev server**

Run: `pnpm dev`
Expected: Vite dev server on `http://localhost:5173`.

- [ ] **Step 14.2: Verify at desktop (1440×900)**

- Navigate to `/investimentos`.
- `PortfolioSummaryCards` grid visible at top; no mobile hero card.
- Radix `Tabs` with 5 tabs visible; clicking them switches content as before.
- All 3 dialogs (`InvestmentDialog`, `TransactionDialog`, `AlertDialog`) open/close cleanly. Form data persists.
- Pixel-identical comparison vs `main` (git stash + visual diff).

- [ ] **Step 14.3: Verify at iPhone SE (375×667)**

- DevTools → Responsive → iPhone SE.
- Hero card visible at top with Patrimônio + delta + 2 métricas.
- `SlidingPillTabs` with 5 pills (Portf · Trans · Divid · Alert · Visão). Active pill slides on selection.
- **Portfolio** tab: cards with type-colored border-left, ticker + badge + value + return %. Tap opens `InvestmentDialog` overlay.
- **Transações** tab: cards agrupados por data (Hoje / Ontem / dd mmm).
- **Dividendos** tab: "Abrir calendário" CTA at top; tap opens bottom sheet. "Este mês" + "Próximos 30 dias" sections below.
- **Alertas** tab: cards with bell icon + edit/delete actions.
- **Visão** tab: 3 charts stacked + Ana Insights (purple gradient) + 3 "Disponível no desktop" placeholders (Heatmap, Rebalance, Calculator).
- View mode persists after reload.
- No horizontal scroll anywhere.
- No frozen screens after dialog open/close.

- [ ] **Step 14.4: Verify at tablet portrait (768×1024)**

Same mobile behavior as Step 14.3.

- [ ] **Step 14.5: Record findings**

Append an "Execution Log" section at the bottom of this plan document with: date, commits (sha + title), viewports checked, deviations, any manual fixes.

- [ ] **Step 14.6: Commit the log + close out**

```bash
git add docs/superpowers/plans/2026-04-21-investimentos-mobile-plan9.md
git commit -m "docs(plan9): record manual verification of investimentos mobile"
```

---

## Definition of done

- All 14 tasks executed and committed.
- `pnpm test` green on all new and modified test files.
- Desktop pixel-identical at 1440×900 vs `main`.
- Mobile (375×667 and 768×1024) works: all 5 tabs functional, hero card visible, dialogs open without freezing, filter/calendar bottom sheets work, persistence via `localStorage['investments-active-tab']`.
- Zero new dependencies.
- Types in `src/types/database.types.ts` unchanged.
- Hooks (`useInvestments`, `useInvestmentTransactions`, `useDividendCalendar`, `useInvestmentAlerts`, etc.) unchanged — the page adapts their output via small `useMemo` mappings.
