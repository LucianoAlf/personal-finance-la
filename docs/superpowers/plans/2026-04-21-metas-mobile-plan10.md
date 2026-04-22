# Metas Mobile — Plan 10

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobile redesign of the Metas (`/metas`) page — multi-category hero, 5 swipeable tabs (Economia · Gastos · Invest · Progresso · Configurações) via `SlidingPillTabs`, persisted tab via localStorage, mobile card lists for each goal type, simplified gamification (XP + achievements grid; heatmap stays desktop-only), and 5 dialog migrations to `ResponsiveDialog`. Desktop pixel-identical.

**Architecture:** 7 new mobile components + 1 hook. Five existing Radix-Dialog modals (`CreateGoalDialog`, `EditGoalDialog`, `AddValueDialog`, `InvestmentGoalDialog`, `ContributionDialog`) migrate to `ResponsiveDialog`. `CategoryTransactionsDrawer` switches to bottom-side Sheet on mobile. `Goals.tsx` dual-renders desktop and mobile under `hidden lg:block` / `lg:hidden`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, lucide-react, Vitest + @testing-library/react (jsdom). Reuses `SlidingPillTabs`, `ResponsiveDialog`, `DesktopOnlyWidgetCard`, and the existing `useGoals` / `useInvestmentGoals` / `useGamification` hooks.

**Spec:** [docs/superpowers/specs/2026-04-21-metas-mobile-design.md](../specs/2026-04-21-metas-mobile-design.md)

**Suggested branch:** `feat/metas-mobile` (already created before starting this plan)

---

## Task 1 — `useGoalsActiveTab` hook (localStorage persistence)

**Files:**
- Create: `src/hooks/useGoalsActiveTab.ts`
- Create: `src/hooks/__tests__/useGoalsActiveTab.test.ts`

- [ ] **Step 1.1: Write the failing test**

Create `src/hooks/__tests__/useGoalsActiveTab.test.ts`:

```ts
/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGoalsActiveTab } from '../useGoalsActiveTab';

const KEY = 'metas-active-tab';

describe('useGoalsActiveTab', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it('defaults to "savings" when nothing is stored', () => {
    const { result } = renderHook(() => useGoalsActiveTab());
    expect(result.current[0]).toBe('savings');
  });

  it('reads a valid stored value', () => {
    window.localStorage.setItem(KEY, 'progress');
    const { result } = renderHook(() => useGoalsActiveTab());
    expect(result.current[0]).toBe('progress');
  });

  it('falls back to default on invalid stored value', () => {
    window.localStorage.setItem(KEY, 'bogus');
    const { result } = renderHook(() => useGoalsActiveTab('config'));
    expect(result.current[0]).toBe('config');
  });

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useGoalsActiveTab());
    act(() => result.current[1]('investments'));
    expect(window.localStorage.getItem(KEY)).toBe('investments');
    expect(result.current[0]).toBe('investments');
  });

  it('accepts explicit default override', () => {
    const { result } = renderHook(() => useGoalsActiveTab('spending'));
    expect(result.current[0]).toBe('spending');
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `pnpm test src/hooks/__tests__/useGoalsActiveTab.test.ts`
Expected: FAIL with "Cannot find module '../useGoalsActiveTab'".

- [ ] **Step 1.3: Implement the hook**

Create `src/hooks/useGoalsActiveTab.ts`:

```ts
import { useEffect, useState } from 'react';

export type GoalsTab = 'savings' | 'spending' | 'investments' | 'progress' | 'config';

const STORAGE_KEY = 'metas-active-tab';
const VALID: ReadonlySet<GoalsTab> = new Set([
  'savings', 'spending', 'investments', 'progress', 'config',
]);

function readStored(fallback: GoalsTab): GoalsTab {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw && VALID.has(raw as GoalsTab) ? (raw as GoalsTab) : fallback;
}

export function useGoalsActiveTab(defaultTab: GoalsTab = 'savings') {
  const [tab, setTab] = useState<GoalsTab>(() => readStored(defaultTab));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, tab);
  }, [tab]);

  return [tab, setTab] as const;
}
```

- [ ] **Step 1.4: Run test to verify it passes**

Run: `pnpm test src/hooks/__tests__/useGoalsActiveTab.test.ts`
Expected: 5 tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add src/hooks/useGoalsActiveTab.ts src/hooks/__tests__/useGoalsActiveTab.test.ts
git commit -m "feat(metas): add useGoalsActiveTab hook with localStorage persistence"
```

---

## Task 2 — `GoalsHeroCard` component

**Files:**
- Create: `src/components/goals/GoalsHeroCard.tsx`
- Create: `src/components/goals/__tests__/GoalsHeroCard.test.tsx`

- [ ] **Step 2.1: Write the failing test**

Create `src/components/goals/__tests__/GoalsHeroCard.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GoalsHeroCard } from '../GoalsHeroCard';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

const baseProps = {
  monthLabel: 'Janeiro 2026',
  savingsCurrent: 7500,
  savingsTarget: 25000,
  spendingLimitsOk: 3,
  spendingLimitsTotal: 5,
  investmentsCurrent: 50000,
  investmentsTarget: 100000,
  streakDays: 14,
  formatCurrency: format,
};

describe('GoalsHeroCard', () => {
  afterEach(() => cleanup());

  it('renders the month label', () => {
    render(<GoalsHeroCard {...baseProps} />);
    expect(screen.getByText(/janeiro 2026/i)).toBeTruthy();
  });

  it('renders the 4 summary rows: Economia, Limites, Investimentos, Streak', () => {
    render(<GoalsHeroCard {...baseProps} />);
    expect(screen.getByText(/economia/i)).toBeTruthy();
    expect(screen.getByText(/limites/i)).toBeTruthy();
    expect(screen.getByText(/investimentos/i)).toBeTruthy();
    expect(screen.getByText(/streak/i)).toBeTruthy();
  });

  it('formats savings and investments with formatCurrency', () => {
    render(<GoalsHeroCard {...baseProps} />);
    expect(screen.getByText(/R\$ 7500,00/)).toBeTruthy();
    expect(screen.getByText(/R\$ 50000,00/)).toBeTruthy();
  });

  it('shows spending limits as "X / Y OK"', () => {
    render(<GoalsHeroCard {...baseProps} />);
    expect(screen.getByText(/3 \/ 5/i)).toBeTruthy();
  });

  it('shows streak in days', () => {
    render(<GoalsHeroCard {...baseProps} />);
    expect(screen.getByText(/14 dias/i)).toBeTruthy();
  });

  it('is hidden on desktop via lg:hidden class', () => {
    const { container } = render(<GoalsHeroCard {...baseProps} />);
    expect((container.firstElementChild as HTMLElement).className).toContain('lg:hidden');
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `pnpm test src/components/goals/__tests__/GoalsHeroCard.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 2.3: Implement the component**

Create `src/components/goals/GoalsHeroCard.tsx`:

```tsx
import { Trophy } from 'lucide-react';

interface GoalsHeroCardProps {
  monthLabel: string;
  savingsCurrent: number;
  savingsTarget: number;
  spendingLimitsOk: number;
  spendingLimitsTotal: number;
  investmentsCurrent: number;
  investmentsTarget: number;
  streakDays: number;
  formatCurrency: (value: number) => string;
}

export function GoalsHeroCard({
  monthLabel,
  savingsCurrent,
  savingsTarget,
  spendingLimitsOk,
  spendingLimitsTotal,
  investmentsCurrent,
  investmentsTarget,
  streakDays,
  formatCurrency,
}: GoalsHeroCardProps) {
  return (
    <section
      aria-label="Resumo de metas"
      className="relative lg:hidden mx-2 mt-4 overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-[#1a1a2e] via-[#1a1f3a] to-[#16213e] p-5 text-foreground shadow-[0_18px_44px_rgba(15,23,42,0.45)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-purple-500/25 to-transparent blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-foreground">Suas Metas</h2>
          <p className="mt-0.5 text-xs text-muted-foreground capitalize">{monthLabel}</p>
        </div>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-[0_10px_24px_rgba(79,70,229,0.4)]">
          <Trophy className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
      </div>

      <dl className="relative mt-4 space-y-2 border-t border-white/[0.08] pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">💰 Economia</dt>
          <dd className="font-bold text-foreground [font-variant-numeric:tabular-nums]">
            {formatCurrency(savingsCurrent)} / {formatCurrency(savingsTarget)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">📊 Limites</dt>
          <dd className="font-bold text-foreground">
            {spendingLimitsOk} / {spendingLimitsTotal} OK
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">📈 Investimentos</dt>
          <dd className="font-bold text-foreground [font-variant-numeric:tabular-nums]">
            {formatCurrency(investmentsCurrent)} / {formatCurrency(investmentsTarget)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">🔥 Streak</dt>
          <dd className="font-bold text-foreground">{streakDays} dias</dd>
        </div>
      </dl>
    </section>
  );
}
```

- [ ] **Step 2.4: Run test to verify it passes**

Run: `pnpm test src/components/goals/__tests__/GoalsHeroCard.test.tsx`
Expected: 6 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/components/goals/GoalsHeroCard.tsx src/components/goals/__tests__/GoalsHeroCard.test.tsx
git commit -m "feat(metas): add GoalsHeroCard with multi-category summary rows"
```

---

## Task 3 — `SavingsGoalCardList` component

**Files:**
- Create: `src/components/goals/SavingsGoalCardList.tsx`
- Create: `src/components/goals/__tests__/SavingsGoalCardList.test.tsx`

**Prerequisite check:** Read `src/types/goals.types.ts` (or wherever `FinancialGoalWithCategory` lives) to confirm field names. The component assumes: `id`, `name`, `icon`, `target_amount`, `current_amount`, `percentage`, `remaining`, `days_left`, `status`. Adjust if needed.

- [ ] **Step 3.1: Write the failing test**

Create `src/components/goals/__tests__/SavingsGoalCardList.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SavingsGoalCardList } from '../SavingsGoalCardList';
import type { FinancialGoalWithCategory } from '@/types/goals.types';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

function makeGoal(overrides: Partial<FinancialGoalWithCategory> = {}): FinancialGoalWithCategory {
  return {
    id: 'g1',
    user_id: 'u1',
    goal_type: 'savings',
    name: 'Viagem Europa',
    icon: '✈️',
    target_amount: 10000,
    current_amount: 4200,
    deadline: '2026-12-31',
    category_id: null,
    period_type: null,
    status: 'active',
    streak_count: 0,
    best_streak: 0,
    category_name: null,
    percentage: 42,
    remaining: 5800,
    days_left: 180,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  } as FinancialGoalWithCategory;
}

describe('SavingsGoalCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when no goals', () => {
    render(
      <SavingsGoalCardList
        goals={[]}
        onCardTap={vi.fn()}
        onAddValue={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText(/nenhuma meta/i)).toBeTruthy();
  });

  it('renders one card per goal', () => {
    render(
      <SavingsGoalCardList
        goals={[makeGoal(), makeGoal({ id: 'g2', name: 'Notebook' })]}
        onCardTap={vi.fn()}
        onAddValue={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText('Viagem Europa')).toBeTruthy();
    expect(screen.getByText('Notebook')).toBeTruthy();
  });

  it('shows percentage badge', () => {
    render(
      <SavingsGoalCardList
        goals={[makeGoal()]}
        onCardTap={vi.fn()}
        onAddValue={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText('42%')).toBeTruthy();
  });

  it('renders progressbar with correct aria-valuenow', () => {
    render(
      <SavingsGoalCardList
        goals={[makeGoal()]}
        onCardTap={vi.fn()}
        onAddValue={vi.fn()}
        formatCurrency={format}
      />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('fires onCardTap when card is tapped', () => {
    const onCardTap = vi.fn();
    const goal = makeGoal();
    render(
      <SavingsGoalCardList
        goals={[goal]}
        onCardTap={onCardTap}
        onAddValue={vi.fn()}
        formatCurrency={format}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /viagem europa/i }));
    expect(onCardTap).toHaveBeenCalledWith(goal);
  });

  it('shows "Adicionar valor" button only on active goals and fires onAddValue', () => {
    const onAddValue = vi.fn();
    const goal = makeGoal({ status: 'active' });
    render(
      <SavingsGoalCardList
        goals={[goal]}
        onCardTap={vi.fn()}
        onAddValue={onAddValue}
        formatCurrency={format}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /adicionar valor/i }));
    expect(onAddValue).toHaveBeenCalledWith(goal);
  });

  it('hides "Adicionar valor" on completed goals', () => {
    render(
      <SavingsGoalCardList
        goals={[makeGoal({ status: 'completed' })]}
        onCardTap={vi.fn()}
        onAddValue={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(screen.queryByRole('button', { name: /adicionar valor/i })).toBeNull();
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

Run: `pnpm test src/components/goals/__tests__/SavingsGoalCardList.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 3.3: Implement the component**

Create `src/components/goals/SavingsGoalCardList.tsx`:

```tsx
import { cn } from '@/lib/cn';
import type { FinancialGoalWithCategory } from '@/types/goals.types';

interface SavingsGoalCardListProps {
  goals: FinancialGoalWithCategory[];
  onCardTap: (goal: FinancialGoalWithCategory) => void;
  onAddValue: (goal: FinancialGoalWithCategory) => void;
  formatCurrency: (value: number) => string;
}

export function SavingsGoalCardList({
  goals,
  onCardTap,
  onAddValue,
  formatCurrency,
}: SavingsGoalCardListProps) {
  if (goals.length === 0) {
    return (
      <div className="lg:hidden px-2 py-10 text-center text-sm text-muted-foreground">
        Nenhuma meta de economia ainda.
      </div>
    );
  }

  return (
    <ul role="list" className="lg:hidden space-y-2 px-2 pb-4 pt-2">
      {goals.map((goal) => {
        const pct = Math.max(0, Math.min(100, goal.percentage ?? 0));
        const isActive = goal.status === 'active';
        const daysLabel = goal.days_left != null ? `${goal.days_left}d` : '';
        return (
          <li key={goal.id} role="listitem">
            <div className="rounded-xl border-l-[3px] border-l-emerald-500 bg-surface-elevated/60 px-3 py-3">
              <button
                type="button"
                onClick={() => onCardTap(goal)}
                aria-label={goal.name}
                className="block w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-base">{goal.icon ?? '🎯'}</span>
                  <span className="flex-1 truncate text-sm font-bold text-foreground">{goal.name}</span>
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300">
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progresso de ${goal.name}`}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/40"
                >
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{formatCurrency(goal.current_amount ?? 0)} / {formatCurrency(goal.target_amount ?? 0)}</span>
                  {daysLabel ? <span>{daysLabel}</span> : null}
                </div>
              </button>
              {isActive ? (
                <button
                  type="button"
                  onClick={() => onAddValue(goal)}
                  aria-label={`Adicionar valor em ${goal.name}`}
                  className={cn(
                    'mt-3 inline-flex w-full items-center justify-center rounded-lg bg-purple-500/15 px-3 py-2 text-xs font-semibold text-purple-300 transition-colors hover:bg-purple-500/25',
                  )}
                >
                  + Adicionar valor
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3.4: Run test to verify it passes**

Run: `pnpm test src/components/goals/__tests__/SavingsGoalCardList.test.tsx`
Expected: 7 tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add src/components/goals/SavingsGoalCardList.tsx src/components/goals/__tests__/SavingsGoalCardList.test.tsx
git commit -m "feat(metas): add SavingsGoalCardList — mobile cards with progress bar"
```

---

## Task 4 — `SpendingMonthSelector` component

**Files:**
- Create: `src/components/goals/SpendingMonthSelector.tsx`
- Create: `src/components/goals/__tests__/SpendingMonthSelector.test.tsx`

- [ ] **Step 4.1: Write the failing test**

Create `src/components/goals/__tests__/SpendingMonthSelector.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SpendingMonthSelector } from '../SpendingMonthSelector';

describe('SpendingMonthSelector', () => {
  afterEach(() => cleanup());

  it('renders the month label in PT-BR', () => {
    render(
      <SpendingMonthSelector
        selectedMonth={new Date(2026, 0, 15)}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/janeiro 2026/i)).toBeTruthy();
  });

  it('navigates to previous month when prev is tapped', () => {
    const onChange = vi.fn();
    render(
      <SpendingMonthSelector
        selectedMonth={new Date(2026, 1, 15)}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /mês anterior/i }));
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getMonth()).toBe(0);
    expect(arg.getFullYear()).toBe(2026);
  });

  it('navigates to next month when next is tapped', () => {
    const onChange = vi.fn();
    render(
      <SpendingMonthSelector
        selectedMonth={new Date(2026, 0, 15)}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /próximo mês/i }));
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getMonth()).toBe(1);
    expect(arg.getFullYear()).toBe(2026);
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

Run: `pnpm test src/components/goals/__tests__/SpendingMonthSelector.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 4.3: Implement the component**

Create `src/components/goals/SpendingMonthSelector.tsx`:

```tsx
import { addMonths, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SpendingMonthSelectorProps {
  selectedMonth: Date;
  onChange: (next: Date) => void;
}

export function SpendingMonthSelector({ selectedMonth, onChange }: SpendingMonthSelectorProps) {
  return (
    <div className="lg:hidden mx-2 mt-3 flex items-center justify-between rounded-full border border-border/60 bg-surface-elevated/60 px-3 py-2">
      <button
        type="button"
        onClick={() => onChange(subMonths(selectedMonth, 1))}
        aria-label="Mês anterior"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-overlay hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="text-sm font-semibold text-foreground capitalize">
        {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
      </span>
      <button
        type="button"
        onClick={() => onChange(addMonths(selectedMonth, 1))}
        aria-label="Próximo mês"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-overlay hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4.4: Run test to verify it passes**

Run: `pnpm test src/components/goals/__tests__/SpendingMonthSelector.test.tsx`
Expected: 3 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/components/goals/SpendingMonthSelector.tsx src/components/goals/__tests__/SpendingMonthSelector.test.tsx
git commit -m "feat(metas): add SpendingMonthSelector pill for mobile spending tab"
```

---

## Task 5 — `SpendingGoalCardList` component

**Files:**
- Create: `src/components/goals/SpendingGoalCardList.tsx`
- Create: `src/components/goals/__tests__/SpendingGoalCardList.test.tsx`

- [ ] **Step 5.1: Write the failing test**

Create `src/components/goals/__tests__/SpendingGoalCardList.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SpendingGoalCardList } from '../SpendingGoalCardList';
import type { FinancialGoalWithCategory } from '@/types/goals.types';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

function makeGoal(overrides: Partial<FinancialGoalWithCategory> = {}): FinancialGoalWithCategory {
  return {
    id: 's1',
    user_id: 'u1',
    goal_type: 'spending_limit',
    name: 'Alimentação',
    icon: '🍔',
    target_amount: 600,
    current_amount: 290,
    deadline: null,
    category_id: 'c1',
    period_type: 'monthly',
    status: 'active',
    streak_count: 0,
    best_streak: 0,
    category_name: 'Alimentação',
    percentage: 48,
    remaining: 310,
    days_left: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  } as FinancialGoalWithCategory;
}

describe('SpendingGoalCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when no goals', () => {
    render(
      <SpendingGoalCardList
        goals={[]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText(/nenhum limite/i)).toBeTruthy();
  });

  it('renders cards with orange border-left', () => {
    const { container } = render(
      <SpendingGoalCardList
        goals={[makeGoal()]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    const card = container.querySelector('[data-testid="spending-card"]') as HTMLElement;
    expect(card.className).toContain('border-l-orange-500');
  });

  it('shows green badge when usage < 80%', () => {
    render(
      <SpendingGoalCardList
        goals={[makeGoal({ percentage: 50 })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    const badge = screen.getByTestId('pct-badge');
    expect(badge.className).toContain('text-emerald');
  });

  it('shows orange badge when usage 80-100%', () => {
    render(
      <SpendingGoalCardList
        goals={[makeGoal({ percentage: 90 })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    const badge = screen.getByTestId('pct-badge');
    expect(badge.className).toContain('text-orange');
  });

  it('shows red badge and "+R$ X acima" when usage > 100%', () => {
    render(
      <SpendingGoalCardList
        goals={[makeGoal({ percentage: 112, current_amount: 670, target_amount: 600 })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    const badge = screen.getByTestId('pct-badge');
    expect(badge.className).toContain('text-red');
    expect(screen.getByText(/acima/i)).toBeTruthy();
  });

  it('fires onCardTap when card is tapped', () => {
    const onCardTap = vi.fn();
    const goal = makeGoal();
    render(
      <SpendingGoalCardList
        goals={[goal]}
        onCardTap={onCardTap}
        formatCurrency={format}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /alimentação/i }));
    expect(onCardTap).toHaveBeenCalledWith(goal);
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

Run: `pnpm test src/components/goals/__tests__/SpendingGoalCardList.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 5.3: Implement the component**

Create `src/components/goals/SpendingGoalCardList.tsx`:

```tsx
import { cn } from '@/lib/cn';
import type { FinancialGoalWithCategory } from '@/types/goals.types';

interface SpendingGoalCardListProps {
  goals: FinancialGoalWithCategory[];
  onCardTap: (goal: FinancialGoalWithCategory) => void;
  formatCurrency: (value: number) => string;
}

function badgeClass(pct: number): string {
  if (pct > 100) return 'bg-red-500/15 text-red-300';
  if (pct >= 80) return 'bg-orange-500/15 text-orange-300';
  return 'bg-emerald-500/15 text-emerald-300';
}

export function SpendingGoalCardList({
  goals,
  onCardTap,
  formatCurrency,
}: SpendingGoalCardListProps) {
  if (goals.length === 0) {
    return (
      <div className="lg:hidden px-2 py-10 text-center text-sm text-muted-foreground">
        Nenhum limite de gasto cadastrado.
      </div>
    );
  }

  return (
    <ul role="list" className="lg:hidden space-y-2 px-2 pb-4 pt-2">
      {goals.map((goal) => {
        const pct = Math.max(0, goal.percentage ?? 0);
        const fillWidth = Math.min(100, pct);
        const overspent = pct > 100 ? (goal.current_amount ?? 0) - (goal.target_amount ?? 0) : 0;
        return (
          <li key={goal.id} role="listitem">
            <button
              type="button"
              data-testid="spending-card"
              onClick={() => onCardTap(goal)}
              aria-label={goal.name}
              className={cn(
                'block w-full rounded-xl border-l-[3px] border-l-orange-500 bg-surface-elevated/60 px-3 py-3 text-left transition-colors hover:bg-surface-elevated',
              )}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-base">{goal.icon ?? '📊'}</span>
                <span className="flex-1 truncate text-sm font-bold text-foreground">{goal.name}</span>
                <span
                  data-testid="pct-badge"
                  className={cn(
                    'rounded-md px-2 py-0.5 text-xs font-bold',
                    badgeClass(pct),
                  )}
                >
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={fillWidth}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Uso do limite ${goal.name}`}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/40"
              >
                <div className="h-full bg-orange-500" style={{ width: `${fillWidth}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{formatCurrency(goal.current_amount ?? 0)} / {formatCurrency(goal.target_amount ?? 0)}</span>
                {overspent > 0 ? (
                  <span className="text-red-300 font-semibold">+{formatCurrency(overspent)} acima</span>
                ) : (
                  <span>resta {formatCurrency(Math.max(0, (goal.target_amount ?? 0) - (goal.current_amount ?? 0)))}</span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 5.4: Run test to verify it passes**

Run: `pnpm test src/components/goals/__tests__/SpendingGoalCardList.test.tsx`
Expected: 6 tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add src/components/goals/SpendingGoalCardList.tsx src/components/goals/__tests__/SpendingGoalCardList.test.tsx
git commit -m "feat(metas): add SpendingGoalCardList with semantic threshold colors"
```

---

## Task 6 — `InvestmentGoalCardList` component

**Files:**
- Create: `src/components/goals/InvestmentGoalCardList.tsx`
- Create: `src/components/goals/__tests__/InvestmentGoalCardList.test.tsx`

**Prerequisite check:** Read the `InvestmentGoal` type from where `useInvestmentGoals` returns it. Likely fields: `id`, `name`, `target_amount`, `current_amount`, `metrics.percentage`. Adjust accesses if different.

- [ ] **Step 6.1: Write the failing test**

Create `src/components/goals/__tests__/InvestmentGoalCardList.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InvestmentGoalCardList, type InvestmentGoalItem } from '../InvestmentGoalCardList';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

function makeGoal(overrides: Partial<InvestmentGoalItem> = {}): InvestmentGoalItem {
  return {
    id: 'ig1',
    name: 'Casa própria',
    icon: '🏠',
    target_amount: 100000,
    current_amount: 50000,
    percentage: 50,
    ...overrides,
  };
}

describe('InvestmentGoalCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when no goals', () => {
    render(
      <InvestmentGoalCardList goals={[]} onCardTap={vi.fn()} formatCurrency={format} />,
    );
    expect(screen.getByText(/nenhuma meta/i)).toBeTruthy();
  });

  it('renders cards with blue border-left', () => {
    const { container } = render(
      <InvestmentGoalCardList goals={[makeGoal()]} onCardTap={vi.fn()} formatCurrency={format} />,
    );
    const card = container.querySelector('[data-testid="invest-goal-card"]') as HTMLElement;
    expect(card.className).toContain('border-l-blue-500');
  });

  it('shows percentage badge', () => {
    render(
      <InvestmentGoalCardList goals={[makeGoal()]} onCardTap={vi.fn()} formatCurrency={format} />,
    );
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('fires onCardTap with the goal when tapped', () => {
    const onCardTap = vi.fn();
    const goal = makeGoal();
    render(
      <InvestmentGoalCardList goals={[goal]} onCardTap={onCardTap} formatCurrency={format} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /casa própria/i }));
    expect(onCardTap).toHaveBeenCalledWith(goal);
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

Run: `pnpm test src/components/goals/__tests__/InvestmentGoalCardList.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 6.3: Implement the component**

Create `src/components/goals/InvestmentGoalCardList.tsx`:

```tsx
import { cn } from '@/lib/cn';

export interface InvestmentGoalItem {
  id: string;
  name: string;
  icon?: string | null;
  target_amount: number;
  current_amount: number;
  percentage: number;
}

interface InvestmentGoalCardListProps {
  goals: InvestmentGoalItem[];
  onCardTap: (goal: InvestmentGoalItem) => void;
  formatCurrency: (value: number) => string;
}

export function InvestmentGoalCardList({
  goals,
  onCardTap,
  formatCurrency,
}: InvestmentGoalCardListProps) {
  if (goals.length === 0) {
    return (
      <div className="lg:hidden px-2 py-10 text-center text-sm text-muted-foreground">
        Nenhuma meta de investimento cadastrada.
      </div>
    );
  }

  return (
    <ul role="list" className="lg:hidden space-y-2 px-2 pb-4 pt-2">
      {goals.map((goal) => {
        const pct = Math.max(0, Math.min(100, goal.percentage ?? 0));
        return (
          <li key={goal.id} role="listitem">
            <button
              type="button"
              data-testid="invest-goal-card"
              onClick={() => onCardTap(goal)}
              aria-label={goal.name}
              className={cn(
                'block w-full rounded-xl border-l-[3px] border-l-blue-500 bg-surface-elevated/60 px-3 py-3 text-left transition-colors hover:bg-surface-elevated',
              )}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-base">{goal.icon ?? '📈'}</span>
                <span className="flex-1 truncate text-sm font-bold text-foreground">{goal.name}</span>
                <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-xs font-bold text-blue-300">
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso de ${goal.name}`}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/40"
              >
                <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 6.4: Run test to verify it passes**

Run: `pnpm test src/components/goals/__tests__/InvestmentGoalCardList.test.tsx`
Expected: 4 tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add src/components/goals/InvestmentGoalCardList.tsx src/components/goals/__tests__/InvestmentGoalCardList.test.tsx
git commit -m "feat(metas): add InvestmentGoalCardList — blue-bordered investment goal cards"
```

---

## Task 7 — `GamificationMobileLayout` component

**Files:**
- Create: `src/components/goals/GamificationMobileLayout.tsx`
- Create: `src/components/goals/__tests__/GamificationMobileLayout.test.tsx`

- [ ] **Step 7.1: Write the failing test**

Create `src/components/goals/__tests__/GamificationMobileLayout.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GamificationMobileLayout, type Achievement } from '../GamificationMobileLayout';

const achievements: Achievement[] = [
  { id: 'a1', icon: '🎯', name: 'Primeira meta', unlocked: true },
  { id: 'a2', icon: '🔥', name: '7 dias', unlocked: true },
  { id: 'a3', icon: '💰', name: 'R$ 1k', unlocked: true },
  { id: 'a4', icon: '🏔️', name: '30 dias', unlocked: false },
];

const baseProps = {
  level: 7,
  levelName: 'Disciplinado',
  xp: 2345,
  xpToNextLevel: 655,
  xpProgressPct: 65,
  streakDays: 14,
  achievements,
};

describe('GamificationMobileLayout', () => {
  afterEach(() => cleanup());

  it('renders the level and level name', () => {
    render(<GamificationMobileLayout {...baseProps} />);
    expect(screen.getByText(/nível 7/i)).toBeTruthy();
    expect(screen.getByText(/disciplinado/i)).toBeTruthy();
  });

  it('renders the XP amount and XP to next level', () => {
    render(<GamificationMobileLayout {...baseProps} />);
    expect(screen.getByText(/2\.?345 xp/i)).toBeTruthy();
    expect(screen.getByText(/655 XP até o próximo/i)).toBeTruthy();
  });

  it('renders the streak in days', () => {
    render(<GamificationMobileLayout {...baseProps} />);
    expect(screen.getByText(/14 dias/i)).toBeTruthy();
  });

  it('renders achievements with unlocked vs locked styling', () => {
    const { container } = render(<GamificationMobileLayout {...baseProps} />);
    const unlocked = container.querySelectorAll('[data-testid="achievement"][data-unlocked="true"]');
    const locked = container.querySelectorAll('[data-testid="achievement"][data-unlocked="false"]');
    expect(unlocked.length).toBe(3);
    expect(locked.length).toBe(1);
  });

  it('renders the heatmap desktop-only placeholder', () => {
    render(<GamificationMobileLayout {...baseProps} />);
    expect(screen.getByText(/heatmap/i)).toBeTruthy();
    expect(screen.getByText(/desktop/i)).toBeTruthy();
  });

  it('is hidden on desktop via lg:hidden class', () => {
    const { container } = render(<GamificationMobileLayout {...baseProps} />);
    expect((container.firstElementChild as HTMLElement).className).toContain('lg:hidden');
  });
});
```

- [ ] **Step 7.2: Run test to verify it fails**

Run: `pnpm test src/components/goals/__tests__/GamificationMobileLayout.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 7.3: Implement the component**

Create `src/components/goals/GamificationMobileLayout.tsx`:

```tsx
import { Trophy, Flame } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DesktopOnlyWidgetCard } from '@/components/investments/DesktopOnlyWidgetCard';

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  unlocked: boolean;
}

interface GamificationMobileLayoutProps {
  level: number;
  levelName: string;
  xp: number;
  xpToNextLevel: number;
  xpProgressPct: number;
  streakDays: number;
  achievements: Achievement[];
}

export function GamificationMobileLayout({
  level,
  levelName,
  xp,
  xpToNextLevel,
  xpProgressPct,
  streakDays,
  achievements,
}: GamificationMobileLayoutProps) {
  const pct = Math.max(0, Math.min(100, xpProgressPct));
  return (
    <div className="lg:hidden space-y-3 pb-4 pt-2">
      <section className="mx-2 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/15 to-blue-500/15 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-md">
            <Trophy className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
              Nível {level} · {levelName}
            </div>
            <div className="mt-0.5 text-base font-bold text-foreground [font-variant-numeric:tabular-nums]">
              {xp.toLocaleString('pt-BR')} XP
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
              <Flame className="h-3 w-3" aria-hidden="true" />
              {streakDays} dias de streak
            </div>
          </div>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso de XP até o próximo nível"
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/40"
        >
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 text-[10px] text-muted-foreground">
          {xpToNextLevel.toLocaleString('pt-BR')} XP até o próximo nível
        </div>
      </section>

      <h3 className="px-3 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Conquistas
      </h3>
      <div className="grid grid-cols-4 gap-2 px-2">
        {achievements.map((a) => (
          <div
            key={a.id}
            data-testid="achievement"
            data-unlocked={a.unlocked ? 'true' : 'false'}
            aria-label={`${a.name} — ${a.unlocked ? 'desbloqueada' : 'bloqueada'}`}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center',
              a.unlocked
                ? 'border-purple-500/40 bg-gradient-to-br from-purple-500/15 to-blue-500/15'
                : 'border-border/40 bg-surface-elevated/40',
            )}
          >
            <span aria-hidden="true" className={cn('text-xl', !a.unlocked && 'opacity-40')}>{a.icon}</span>
            <span className="text-[9px] leading-tight text-muted-foreground line-clamp-2">{a.name}</span>
          </div>
        ))}
      </div>

      <DesktopOnlyWidgetCard title="Heatmap de streak" description="Visualização completa no desktop" />
    </div>
  );
}
```

- [ ] **Step 7.4: Run test to verify it passes**

Run: `pnpm test src/components/goals/__tests__/GamificationMobileLayout.test.tsx`
Expected: 6 tests pass.

- [ ] **Step 7.5: Commit**

```bash
git add src/components/goals/GamificationMobileLayout.tsx src/components/goals/__tests__/GamificationMobileLayout.test.tsx
git commit -m "feat(metas): add GamificationMobileLayout — XP card + achievements grid + heatmap placeholder"
```

---

## Task 8 — `GoalsConfigMobileLayout` component

**Files:**
- Create: `src/components/goals/GoalsConfigMobileLayout.tsx`
- Create: `src/components/goals/__tests__/GoalsConfigMobileLayout.test.tsx`

- [ ] **Step 8.1: Write the failing test**

Create `src/components/goals/__tests__/GoalsConfigMobileLayout.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GoalsConfigMobileLayout } from '../GoalsConfigMobileLayout';

describe('GoalsConfigMobileLayout', () => {
  afterEach(() => cleanup());

  it('renders empty state when no sections', () => {
    render(<GoalsConfigMobileLayout sections={[]} />);
    expect(screen.getByText(/nenhuma configuração/i)).toBeTruthy();
  });

  it('renders each section with its title', () => {
    render(
      <GoalsConfigMobileLayout
        sections={[
          { id: 's1', title: 'Renda mensal', children: <div>Renda content</div> },
          { id: 's2', title: 'Ciclos financeiros', children: <div>Ciclos content</div> },
        ]}
      />,
    );
    expect(screen.getByText('Renda mensal')).toBeTruthy();
    expect(screen.getByText('Ciclos financeiros')).toBeTruthy();
  });

  it('opens sections marked as defaultOpen', () => {
    const { container } = render(
      <GoalsConfigMobileLayout
        sections={[
          { id: 's1', title: 'Renda', defaultOpen: true, children: <div>Renda content</div> },
          { id: 's2', title: 'Ciclos', children: <div>Ciclos content</div> },
        ]}
      />,
    );
    const detailsList = container.querySelectorAll('details');
    expect(detailsList[0].hasAttribute('open')).toBe(true);
    expect(detailsList[1].hasAttribute('open')).toBe(false);
  });

  it('is hidden on desktop via lg:hidden class', () => {
    const { container } = render(<GoalsConfigMobileLayout sections={[]} />);
    expect((container.firstElementChild as HTMLElement).className).toContain('lg:hidden');
  });
});
```

- [ ] **Step 8.2: Run test to verify it fails**

Run: `pnpm test src/components/goals/__tests__/GoalsConfigMobileLayout.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 8.3: Implement the component**

Create `src/components/goals/GoalsConfigMobileLayout.tsx`:

```tsx
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ConfigSection {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

interface GoalsConfigMobileLayoutProps {
  sections: ConfigSection[];
}

export function GoalsConfigMobileLayout({ sections }: GoalsConfigMobileLayoutProps) {
  if (sections.length === 0) {
    return (
      <div className="lg:hidden px-2 py-10 text-center text-sm text-muted-foreground">
        Nenhuma configuração disponível.
      </div>
    );
  }

  return (
    <div className="lg:hidden space-y-2 px-2 pb-4 pt-2">
      {sections.map((section) => (
        <details
          key={section.id}
          open={section.defaultOpen}
          className="group rounded-xl border border-border/60 bg-surface-elevated/60"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-sm font-semibold text-foreground">
            <span>{section.title}</span>
            <ChevronDown
              className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t border-border/60 p-3">{section.children}</div>
        </details>
      ))}
    </div>
  );
}
```

- [ ] **Step 8.4: Run test to verify it passes**

Run: `pnpm test src/components/goals/__tests__/GoalsConfigMobileLayout.test.tsx`
Expected: 4 tests pass.

- [ ] **Step 8.5: Commit**

```bash
git add src/components/goals/GoalsConfigMobileLayout.tsx src/components/goals/__tests__/GoalsConfigMobileLayout.test.tsx
git commit -m "feat(metas): add GoalsConfigMobileLayout — collapsible sections via <details>"
```

---

## Task 9 — Migrate `CreateGoalDialog` to `ResponsiveDialog`

**Files:**
- Modify: `src/components/goals/CreateGoalDialog.tsx`
- Modify: `src/components/goals/__tests__/CreateGoalDialog.test.tsx` (if exists)

- [ ] **Step 9.1: Read the file + existing test**

Read: `src/components/goals/CreateGoalDialog.tsx`. Check via Glob if `src/components/goals/__tests__/CreateGoalDialog.test.tsx` exists.

- [ ] **Step 9.2: Update the component**

1. Remove imports `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter` from `@/components/ui/dialog`.

2. Add:
```tsx
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogHeader,
} from '@/components/ui/responsive-dialog';
```

3. Extract title to a const (use the existing dialog's title text — likely "Nova Meta" or "Criar Nova Meta"):
```tsx
const dialogTitle = 'Nova Meta';
```

4. Replace outer wrapper:

Before:
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>{dialogTitle}</DialogTitle>
    </DialogHeader>
    {/* form */}
  </DialogContent>
</Dialog>
```

After:
```tsx
<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-md">
  <ResponsiveDialogHeader
    title={dialogTitle}
    onClose={() => onOpenChange(false)}
  />
  <ResponsiveDialogBody>
    {/* existing form — unchanged */}
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

5. Replace any `<DialogFooter>` with a plain `<div>` keeping equivalent classes.

6. Remove inner `max-h-[...] overflow-y-auto` wrappers.

7. Preserve all form state, validators, and handlers.

- [ ] **Step 9.3: Update or create the test**

If a test exists, add at the top:
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

Remove any `vi.mock('@/components/ui/dialog', ...)`. Update Dialog-specific assertions.

- [ ] **Step 9.4: Run tests**

Run: `pnpm test src/components/goals/__tests__/CreateGoalDialog.test.tsx`

If no test exists: `pnpm tsc --noEmit` to verify.

- [ ] **Step 9.5: Commit**

```bash
git add src/components/goals/CreateGoalDialog.tsx src/components/goals/__tests__/CreateGoalDialog.test.tsx
git commit -m "refactor(metas): migrate CreateGoalDialog to ResponsiveDialog"
```

---

## Task 10 — Migrate `EditGoalDialog` to `ResponsiveDialog`

**Files:**
- Modify: `src/components/goals/EditGoalDialog.tsx`
- Modify: `src/components/goals/__tests__/EditGoalDialog.test.tsx` (if exists)

- [ ] **Step 10.1: Read the file + existing test**

Read: `src/components/goals/EditGoalDialog.tsx`. Check via Glob for the test file.

- [ ] **Step 10.2: Update the component**

Apply the same transformation as Task 9:

1. Remove `Dialog`/`DialogContent`/etc. imports from `@/components/ui/dialog`.
2. Add `ResponsiveDialog`, `ResponsiveDialogHeader`, `ResponsiveDialogBody` from `@/components/ui/responsive-dialog`.
3. Extract title (likely "Editar Meta"):
```tsx
const dialogTitle = 'Editar Meta';
```
4. Swap shell:

```tsx
<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-md">
  <ResponsiveDialogHeader title={dialogTitle} onClose={() => onOpenChange(false)} />
  <ResponsiveDialogBody>
    {/* existing form body */}
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

5. Replace `<DialogFooter>` with plain div, remove inner scroll wrappers.

- [ ] **Step 10.3: Update or create the test**

Add the same `vi.mock('@/components/ui/responsive-dialog', ...)` block from Task 9.

- [ ] **Step 10.4: Run tests**

Run: `pnpm test src/components/goals/__tests__/EditGoalDialog.test.tsx`

If no test exists: `pnpm tsc --noEmit`.

- [ ] **Step 10.5: Commit**

```bash
git add src/components/goals/EditGoalDialog.tsx src/components/goals/__tests__/EditGoalDialog.test.tsx
git commit -m "refactor(metas): migrate EditGoalDialog to ResponsiveDialog"
```

---

## Task 11 — Migrate `AddValueDialog` to `ResponsiveDialog`

**Files:**
- Modify: `src/components/goals/AddValueDialog.tsx`
- Modify: `src/components/goals/__tests__/AddValueDialog.test.tsx` (if exists)

- [ ] **Step 11.1: Read the file**

Read: `src/components/goals/AddValueDialog.tsx`.

- [ ] **Step 11.2: Update the component**

Same migration pattern as Tasks 9-10.

Title likely:
```tsx
const dialogTitle = 'Adicionar valor';
```

Shell swap:
```tsx
<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-md">
  <ResponsiveDialogHeader title={dialogTitle} onClose={() => onOpenChange(false)} />
  <ResponsiveDialogBody>
    {/* existing form */}
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

- [ ] **Step 11.3: Update tests**

Same `vi.mock` from Task 9.

- [ ] **Step 11.4: Run tests**

Run: `pnpm test src/components/goals/__tests__/AddValueDialog.test.tsx`

If no test exists: `pnpm tsc --noEmit`.

- [ ] **Step 11.5: Commit**

```bash
git add src/components/goals/AddValueDialog.tsx src/components/goals/__tests__/AddValueDialog.test.tsx
git commit -m "refactor(metas): migrate AddValueDialog to ResponsiveDialog"
```

---

## Task 12 — Migrate `InvestmentGoalDialog` to `ResponsiveDialog`

**Files:**
- Modify: `src/components/investment-goals/InvestmentGoalDialog.tsx`
- Modify: `src/components/investment-goals/__tests__/InvestmentGoalDialog.test.tsx` (if exists)

- [ ] **Step 12.1: Read the file**

Read: `src/components/investment-goals/InvestmentGoalDialog.tsx`.

- [ ] **Step 12.2: Update the component**

Same pattern. Title likely:
```tsx
const dialogTitle = goalToEdit ? 'Editar meta de investimento' : 'Nova meta de investimento';
```
(Adapt to the actual existing logic.)

Shell:
```tsx
<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
  <ResponsiveDialogHeader title={dialogTitle} onClose={() => onOpenChange(false)} />
  <ResponsiveDialogBody>
    {/* existing form */}
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

- [ ] **Step 12.3: Update tests**

Same mock as Task 9.

- [ ] **Step 12.4: Run tests**

Run: `pnpm test src/components/investment-goals/__tests__/InvestmentGoalDialog.test.tsx`

- [ ] **Step 12.5: Commit**

```bash
git add src/components/investment-goals/InvestmentGoalDialog.tsx src/components/investment-goals/__tests__/InvestmentGoalDialog.test.tsx
git commit -m "refactor(metas): migrate InvestmentGoalDialog to ResponsiveDialog"
```

---

## Task 13 — Migrate `ContributionDialog` to `ResponsiveDialog`

**Files:**
- Modify: `src/components/investment-goals/ContributionDialog.tsx`
- Modify: `src/components/investment-goals/__tests__/ContributionDialog.test.tsx` (if exists)

- [ ] **Step 13.1: Read the file**

Read: `src/components/investment-goals/ContributionDialog.tsx`.

- [ ] **Step 13.2: Update the component**

Title likely:
```tsx
const dialogTitle = 'Nova contribuição';
```

Shell:
```tsx
<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-md">
  <ResponsiveDialogHeader title={dialogTitle} onClose={() => onOpenChange(false)} />
  <ResponsiveDialogBody>
    {/* existing form */}
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

- [ ] **Step 13.3: Update tests**

Same mock as Task 9.

- [ ] **Step 13.4: Run tests**

Run: `pnpm test src/components/investment-goals/__tests__/ContributionDialog.test.tsx`

- [ ] **Step 13.5: Commit**

```bash
git add src/components/investment-goals/ContributionDialog.tsx src/components/investment-goals/__tests__/ContributionDialog.test.tsx
git commit -m "refactor(metas): migrate ContributionDialog to ResponsiveDialog"
```

---

## Task 14 — `CategoryTransactionsDrawer`: side="bottom" on mobile

**Files:**
- Modify: `src/components/goals/CategoryTransactionsDrawer.tsx`

- [ ] **Step 14.1: Read the file**

Read: `src/components/goals/CategoryTransactionsDrawer.tsx`.

- [ ] **Step 14.2: Update the component**

Find the `<SheetContent side="right">` (or similar). Replace with viewport-conditional `side`:

1. Add hook usage near the top of the function body:

```tsx
import { useEffect, useState } from 'react';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return isMobile;
}
```

(Add `useIsMobile` as a local helper inside the same file — don't extract.)

2. In the component body:

```tsx
const isMobile = useIsMobile();
```

3. Update the `<SheetContent>`:

```tsx
<SheetContent
  side={isMobile ? 'bottom' : 'right'}
  className={isMobile ? 'h-[85dvh] rounded-t-2xl' : 'w-[480px] sm:max-w-[480px]'}
>
```

(Adapt the existing className logic — keep desktop's existing classes; for mobile use the bottom-sheet sizing.)

- [ ] **Step 14.3: Run any related tests**

Run: `pnpm test CategoryTransactionsDrawer`

If no specific test, run the broader goals folder: `pnpm test src/components/goals` to check no regression.

- [ ] **Step 14.4: Commit**

```bash
git add src/components/goals/CategoryTransactionsDrawer.tsx
git commit -m "refactor(metas): CategoryTransactionsDrawer uses bottom-side Sheet on mobile"
```

---

## Task 15 — Wire mobile subtree into `Goals.tsx`

**Files:**
- Modify: `src/pages/Goals.tsx`
- Modify: `src/pages/Goals.test.tsx` (or wherever existing test lives)

- [ ] **Step 15.1: Read the existing page**

Read `src/pages/Goals.tsx` in full. Identify:
- Where `activeTab` state lives.
- The Radix `<Tabs>` block (5 TabsContent).
- Where `GoalsSummaryWidget` is rendered.
- Hook calls: `useGoals`, `useInvestmentGoals`, `useGamification`, `useSpendingGoalsPlanning`, `useUserPreferences` (or similar).
- Handler functions: `handleEditGoal`, `handleAddValue`, `handleDeleteGoal`, etc.

Also read `src/pages/Goals.test.tsx`.

- [ ] **Step 15.2: Update imports**

Add to the top of `Goals.tsx`:

```tsx
import { SlidingPillTabs } from '@/components/ui/sliding-pill-tabs';
import { useGoalsActiveTab, type GoalsTab } from '@/hooks/useGoalsActiveTab';
import { GoalsHeroCard } from '@/components/goals/GoalsHeroCard';
import { SavingsGoalCardList } from '@/components/goals/SavingsGoalCardList';
import { SpendingGoalCardList } from '@/components/goals/SpendingGoalCardList';
import { SpendingMonthSelector } from '@/components/goals/SpendingMonthSelector';
import { InvestmentGoalCardList, type InvestmentGoalItem } from '@/components/goals/InvestmentGoalCardList';
import { GamificationMobileLayout, type Achievement } from '@/components/goals/GamificationMobileLayout';
import { GoalsConfigMobileLayout, type ConfigSection } from '@/components/goals/GoalsConfigMobileLayout';
```

- [ ] **Step 15.3: Replace activeTab state**

Find:
```tsx
const [activeTab, setActiveTab] = useState<...>('savings');
```

Replace with:
```tsx
const [activeTab, setActiveTab] = useGoalsActiveTab('savings');
```

Update the type cast for `setActiveTab` calls to `(v) => setActiveTab(v as GoalsTab)`.

- [ ] **Step 15.4: Wrap desktop-only elements**

Wrap `<GoalsSummaryWidget {...}/>` in:
```tsx
<div className="hidden lg:block">
  <GoalsSummaryWidget {...existingProps} />
</div>
```

Wrap the entire `<Tabs ...>` block (with its `TabsList` + 5 `TabsContent`) in:
```tsx
<div className="hidden lg:block">
  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GoalsTab)}>
    {/* existing TabsList + TabsContent */}
  </Tabs>
</div>
```

- [ ] **Step 15.5: Add the mobile subtree**

Directly after the desktop wrapper, add:

```tsx
<div className="lg:hidden">
  <GoalsHeroCard
    monthLabel={mobileMonthLabel}
    savingsCurrent={savingsCurrentTotal}
    savingsTarget={savingsTargetTotal}
    spendingLimitsOk={spendingLimitsOkCount}
    spendingLimitsTotal={spendingLimitsTotal}
    investmentsCurrent={investmentsCurrentTotal}
    investmentsTarget={investmentsTargetTotal}
    streakDays={currentStreakDays}
    formatCurrency={formatCurrency}
  />

  <div className="mx-2 mt-3">
    <SlidingPillTabs
      tabs={[
        { value: 'savings', label: 'Econ' },
        { value: 'spending', label: 'Gastos' },
        { value: 'investments', label: 'Invest' },
        { value: 'progress', label: 'Progr' },
        { value: 'config', label: 'Config' },
      ]}
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as GoalsTab)}
      ariaLabel="Abas de metas"
    />
  </div>

  {activeTab === 'savings' && (
    <SavingsGoalCardList
      goals={savingsGoals}
      onCardTap={handleEditGoal}
      onAddValue={handleAddValueClick}
      formatCurrency={formatCurrency}
    />
  )}
  {activeTab === 'spending' && (
    <>
      <SpendingMonthSelector
        selectedMonth={selectedMonth}
        onChange={setSelectedMonth}
      />
      <SpendingGoalCardList
        goals={spendingGoals}
        onCardTap={handleEditGoal}
        formatCurrency={formatCurrency}
      />
    </>
  )}
  {activeTab === 'investments' && (
    <InvestmentGoalCardList
      goals={mobileInvestmentGoalItems}
      onCardTap={handleInvestmentGoalTap}
      formatCurrency={formatCurrency}
    />
  )}
  {activeTab === 'progress' && (
    <GamificationMobileLayout
      level={gamification.level}
      levelName={gamification.levelName}
      xp={gamification.xp}
      xpToNextLevel={gamification.xpToNextLevel}
      xpProgressPct={gamification.xpProgressPct}
      streakDays={gamification.currentStreak}
      achievements={mobileAchievements}
    />
  )}
  {activeTab === 'config' && (
    <GoalsConfigMobileLayout sections={mobileConfigSections} />
  )}
</div>
```

- [ ] **Step 15.6: Add data mappings (useMemo blocks)**

Add near the top of the page body (after hook calls):

```tsx
// Hero data
const mobileMonthLabel = useMemo(
  () => format(new Date(), "MMMM yyyy", { locale: ptBR }),
  [],
);

const savingsGoals = useMemo(
  () => goals.filter((g) => g.goal_type === 'savings'),
  [goals],
);
const spendingGoals = useMemo(
  () => goals.filter((g) => g.goal_type === 'spending_limit'),
  [goals],
);

const savingsCurrentTotal = savingsGoals.reduce((acc, g) => acc + (g.current_amount ?? 0), 0);
const savingsTargetTotal = savingsGoals.reduce((acc, g) => acc + (g.target_amount ?? 0), 0);
const spendingLimitsOkCount = spendingGoals.filter((g) => (g.percentage ?? 0) <= 100).length;
const spendingLimitsTotal = spendingGoals.length;
const investmentsCurrentTotal = (investmentGoals ?? []).reduce(
  (acc, g) => acc + Number(g.current_amount ?? 0),
  0,
);
const investmentsTargetTotal = (investmentGoals ?? []).reduce(
  (acc, g) => acc + Number(g.target_amount ?? 0),
  0,
);
const currentStreakDays = gamification?.currentStreak ?? 0;

// Investment goals → InvestmentGoalItem
const mobileInvestmentGoalItems = useMemo<InvestmentGoalItem[]>(
  () =>
    (investmentGoals ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon ?? null,
      target_amount: Number(g.target_amount ?? 0),
      current_amount: Number(g.current_amount ?? g.metrics?.effective_current_amount ?? 0),
      percentage: Number(g.metrics?.percentage ?? 0),
    })),
  [investmentGoals],
);

const handleInvestmentGoalTap = (goal: InvestmentGoalItem) => {
  navigate(`/investimentos?goalId=${goal.id}`);
};

// Achievements → Achievement[]
const mobileAchievements = useMemo<Achievement[]>(
  () =>
    (gamification?.achievements ?? []).map((a) => ({
      id: a.id,
      icon: a.icon ?? '🏅',
      name: a.name,
      unlocked: Boolean(a.unlocked),
    })),
  [gamification?.achievements],
);

// Config sections → ConfigSection[]
// First: identify the existing config tab content. It likely renders inline JSX for
// the income field, cycles manager, and any notification settings. To enable both
// desktop and mobile to render the same forms, extract each form group into a
// small local function component (same file is fine). For example:
//
//   function IncomeFormSection() { return <>{/* existing income inputs */}</>; }
//   function CyclesFormSection() { return <>{/* existing cycles manager */}</>; }
//
// Then both the desktop config tab and the mobile sections array below can render
// <IncomeFormSection /> and <CyclesFormSection />, sharing the same form logic.
const mobileConfigSections = useMemo<ConfigSection[]>(
  () => [
    {
      id: 'income',
      title: 'Renda mensal',
      defaultOpen: true,
      children: <IncomeFormSection />,
    },
    {
      id: 'cycles',
      title: 'Ciclos financeiros',
      children: <CyclesFormSection />,
    },
  ],
  [],
);
```

**Notes:**
- The two function components (`IncomeFormSection`, `CyclesFormSection`) must be created by extracting the existing inline JSX from the desktop config tab. Use whatever section names match what's actually in the page today (look at the existing `<TabsContent value="config">` block to discover the real sections).
- The exact field names from `useGamification()` and `useInvestmentGoals()` may differ from the assumptions above. Inspect the hooks and adjust property accesses.
- Add `import { format } from 'date-fns'; import { ptBR } from 'date-fns/locale';` if not already present.

- [ ] **Step 15.7: Update Header actions for mobile**

Find the existing "Nova Meta" button (likely in `headerActions`). Wrap its label so it hides on mobile:

```tsx
<Button onClick={openCreateGoalDialog} className={...}>
  <Plus className="h-4 w-4" />
  <span className="hidden sm:inline">Nova Meta</span>
</Button>
```

If there's a dropdown to choose goal type, keep the dropdown trigger as the visible button — only hide the label inside.

- [ ] **Step 15.8: Update `Goals.test.tsx`**

Add mocks at the top:

```tsx
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

vi.mock('@/components/goals/GoalsHeroCard', () => ({
  GoalsHeroCard: () => <div data-testid="goals-hero-mobile" />,
}));
vi.mock('@/components/goals/SavingsGoalCardList', () => ({
  SavingsGoalCardList: () => <div data-testid="savings-card-list-mobile" />,
}));
vi.mock('@/components/goals/SpendingGoalCardList', () => ({
  SpendingGoalCardList: () => <div data-testid="spending-card-list-mobile" />,
}));
vi.mock('@/components/goals/SpendingMonthSelector', () => ({
  SpendingMonthSelector: () => <div data-testid="spending-month-selector-mobile" />,
}));
vi.mock('@/components/goals/InvestmentGoalCardList', () => ({
  InvestmentGoalCardList: () => <div data-testid="invest-goals-mobile" />,
}));
vi.mock('@/components/goals/GamificationMobileLayout', () => ({
  GamificationMobileLayout: () => <div data-testid="gamification-mobile" />,
}));
vi.mock('@/components/goals/GoalsConfigMobileLayout', () => ({
  GoalsConfigMobileLayout: () => <div data-testid="goals-config-mobile" />,
}));
```

Add a new `describe` block:

```tsx
describe('Goals mobile layout', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('dual-renders the hero and savings list on default tab', () => {
    render(<MemoryRouter><Goals /></MemoryRouter>);
    expect(screen.getByTestId('goals-hero-mobile')).toBeTruthy();
    expect(screen.getByTestId('savings-card-list-mobile')).toBeTruthy();
  });

  it('switches to spending mobile view when spending tab is tapped', () => {
    render(<MemoryRouter><Goals /></MemoryRouter>);
    const tabs = screen.getAllByRole('tab', { name: /gastos/i });
    fireEvent.click(tabs[0]);
    expect(screen.getByTestId('spending-card-list-mobile')).toBeTruthy();
    expect(screen.getByTestId('spending-month-selector-mobile')).toBeTruthy();
  });

  it('switches to gamification when progress tab is tapped', () => {
    render(<MemoryRouter><Goals /></MemoryRouter>);
    const tabs = screen.getAllByRole('tab', { name: /progr/i });
    fireEvent.click(tabs[0]);
    expect(screen.getByTestId('gamification-mobile')).toBeTruthy();
  });

  it('persists active tab to localStorage', () => {
    render(<MemoryRouter><Goals /></MemoryRouter>);
    const tabs = screen.getAllByRole('tab', { name: /config/i });
    fireEvent.click(tabs[0]);
    expect(window.localStorage.getItem('metas-active-tab')).toBe('config');
  });
});
```

Imports needed: `MemoryRouter`, `cleanup`, `screen`, `fireEvent`, `render`, `beforeEach`, `afterEach`.

- [ ] **Step 15.9: Run tests**

Run: `pnpm test src/pages/Goals.test.tsx`

If existing tests regress, fix mocks. Don't delete existing assertions.

- [ ] **Step 15.10: Run full goals folder**

Run: `pnpm test src/components/goals src/components/investment-goals src/hooks/__tests__/useGoalsActiveTab src/pages/Goals`

Expected: all tests pass (excluding any pre-existing failures inherited from `main`).

- [ ] **Step 15.11: Commit**

```bash
git add src/pages/Goals.tsx src/pages/Goals.test.tsx
git commit -m "feat(metas): dual-render desktop + mobile layouts in Goals page"
```

---

## Task 16 — Manual verification

- [ ] **Step 16.1: Start the dev server**

Run: `pnpm dev`
Expected: Vite dev server on `http://localhost:5173`.

- [ ] **Step 16.2: Verify at desktop (1440×900)**

- Navigate to `/metas`.
- `GoalsSummaryWidget` (4 stat cards) at the top; no mobile hero card.
- Radix `Tabs` with 5 tabs; all 5 tabs render desktop content.
- All 5 dialogs (`CreateGoalDialog`, `EditGoalDialog`, `AddValueDialog`, `InvestmentGoalDialog`, `ContributionDialog`) open/close cleanly.
- `CategoryTransactionsDrawer` opens from the right side (existing behavior).
- Pixel-identical compared to `main`.

- [ ] **Step 16.3: Verify at iPhone SE (375×667)**

DevTools → Responsive → iPhone SE.

- Hero card visible at top (Patrimônio summary multi-categoria).
- `SlidingPillTabs` with 5 pills (Econ · Gastos · Invest · Progr · Config). Active pill slides on selection.
- **Economia**: cards with green border-left + progress bar + "Adicionar valor" button on active goals.
- **Gastos**: month selector ‹ Janeiro 2026 › + cards with orange border-left, color-coded badges (green <80%, orange 80-100%, red >100%).
- **Investimentos**: cards with blue border-left; tap navigates to `/investimentos?goalId=X`.
- **Progresso**: XP card (gradient roxo) with level/XP/streak + grid 4-col of achievements + "Heatmap de streak — Visualização completa no desktop" placeholder.
- **Configurações**: collapsible sections (`<details>`) with first one open.
- All 5 dialogs open as full-screen mobile overlays without freezing.
- `CategoryTransactionsDrawer` opens from the bottom with `h-[85dvh] rounded-t-2xl`.
- View persists after reload.
- No horizontal scroll.

- [ ] **Step 16.4: Verify at tablet portrait (768×1024)**

Same mobile behavior as Step 16.3.

- [ ] **Step 16.5: Record findings**

Append "Execution Log" to the bottom of this plan with: date, commits (sha + title), viewports checked, deviations, fixes.

- [ ] **Step 16.6: Commit the log**

```bash
git add docs/superpowers/plans/2026-04-21-metas-mobile-plan10.md
git commit -m "docs(plan10): record manual verification of metas mobile"
```

---

## Definition of done

- All 16 tasks executed and committed.
- `pnpm test` green on all new and modified test files.
- Desktop pixel-identical at 1440×900 vs `main`.
- Mobile (375×667 and 768×1024) works: 5 tabs, hero card, all goal types, gamification with achievements grid, config collapsibles, 5 dialogs without freeze, drawer slides from bottom.
- View persists via `localStorage['metas-active-tab']`.
- Zero new dependencies.
- Existing types and hooks unchanged.
- Heatmap of streak is desktop-only (placeholder on mobile is accepted as MVP).
