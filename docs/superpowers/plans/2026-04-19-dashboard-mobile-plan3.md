# Dashboard Mobile Redesign — Plan 3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt the Dashboard page to mobile viewports (< lg, 1024px) with priority-first block ordering (alerts → Ana Clara → KPIs → bills → widgets → recent transactions → charts), donut chart with center total, and stacked full-width widgets — while leaving the desktop visual pixel-identical. Also refactor the shared `<Header>` component to render cleanly in mobile (stacked rows) so every page benefits.

**Architecture:** Enhance the existing shared `<Header>` with responsive CSS classes (no new `MobileHeader` component) — desktop layout stays in row 1, mobile splits into row 1 (icon + title + theme + avatar) and row 2 (subtitle + actions with `overflow-x-auto`). Create `DashboardAlertCard` (mobile-only; renders when overdue bills exist) and `DonutChart` (mobile replacement for the pie). Make `ExpensesByCategoryChart` switch between pie (desktop) and donut (mobile) via Tailwind visibility classes. Upgrade `MonthlyTrendChart` to `ResponsiveContainer` with `min-h-[240px]`. Reorder the `Dashboard.tsx` JSX tree so priority-first is the natural read order on mobile and the existing desktop grid is preserved by breakpoint classes.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS, Radix UI + shadcn/ui (Avatar, DropdownMenu), Recharts (PieChart, LineChart), Lucide icons, Vitest + @testing-library/react (jsdom).

**Spec:** [docs/superpowers/specs/2026-04-19-dashboard-mobile-design.md](../specs/2026-04-19-dashboard-mobile-design.md)

### Deviations from spec
- **Spec §4.1 showed avatar as `<Link to="/perfil">`** — implementation will **preserve the existing DropdownMenu avatar** (Perfil + Sair items) on both viewports. User intent "tap direto → /perfil" is honored via the "Perfil" item in the dropdown (1 tap). Rationale: removing the dropdown on mobile would drop the only `signOut` access point in that viewport, which is worse UX than "tap + select Perfil".
- Theme toggle button (existing) stays visible in row 1 on mobile, between the title and the avatar. Not removed.

---

## Task 1 — Refactor `Header.tsx` to be responsive

**Goal:** The shared `<Header>` stacks to 2 rows on mobile (< lg) and keeps the current single-row layout on desktop (≥ lg). No API changes — all existing callsites keep working.

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Create: `src/components/layout/Header.mobile.test.tsx`
- Existing test: `src/components/layout/Header.test.tsx` must keep passing byte-for-byte.

- [ ] **Step 1.1: Verify existing test passes before refactor**

Run: `pnpm test src/components/layout/Header.test.tsx`
Expected: passes (current `Header user menu` test suite).

- [ ] **Step 1.2: Write the failing mobile test**

Create `src/components/layout/Header.mobile.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Header } from './Header';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'luciano@example.com' },
    profile: { full_name: 'Luciano Alf', avatar_url: null },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    userSettings: { display_name: 'Luciano Alf', avatar_url: null, updated_at: null },
    setTheme: vi.fn(),
  }),
}));

describe('Header responsive layout', () => {
  afterEach(() => cleanup());

  function renderHeader(props: { subtitle?: string; actions?: React.ReactNode } = {}) {
    return render(
      <ThemeProvider defaultTheme="light">
        <MemoryRouter>
          <Header title="Teste" {...props} />
        </MemoryRouter>
      </ThemeProvider>,
    );
  }

  it('wraps actions/subtitle in a mobile-only row 2 container', () => {
    renderHeader({ subtitle: 'Sub', actions: <button>Action</button> });
    const row2 = screen.getByTestId('header-row2');
    expect(row2).toBeTruthy();
    expect(row2.className).toContain('lg:hidden');
  });

  it('renders the subtitle in row 2 on mobile and in row 1 on desktop', () => {
    renderHeader({ subtitle: 'Bem-vindo' });
    expect(screen.getAllByText('Bem-vindo')).toHaveLength(2);
    const desktopSub = screen.getByTestId('header-subtitle-desktop');
    expect(desktopSub.className).toContain('hidden');
    expect(desktopSub.className).toContain('lg:block');
    const mobileSub = screen.getByTestId('header-subtitle-mobile');
    expect(mobileSub.className).toContain('lg:hidden');
  });

  it('keeps the avatar dropdown accessible (mobile + desktop)', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: /abrir menu do usuario/i })).toBeTruthy();
  });

  it('keeps root header class sticky top-0', () => {
    renderHeader();
    const header = screen.getByRole('banner');
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('top-0');
  });
});
```

- [ ] **Step 1.3: Run the mobile test, verify it fails**

Run: `pnpm test src/components/layout/Header.mobile.test.tsx`
Expected: FAIL — `header-row2` / `header-subtitle-mobile` / `header-subtitle-desktop` not found.

- [ ] **Step 1.4: Refactor `Header.tsx`**

Open `src/components/layout/Header.tsx`. Find the current `return (<header className="...">...</header>)` block. Replace the OUTER structure so it looks like this while keeping ALL existing inner JSX (theme toggle button, avatar DropdownMenu, DropdownMenuContent with Perfil/Configurações/Sair items, etc.) untouched:

```tsx
return (
  <header
    role="banner"
    className="sticky top-0 z-20 border-b border-border bg-surface/95 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur supports-[backdrop-filter]:bg-surface/85"
  >
    {/* Row 1: icon + title + theme/avatar (always visible) */}
    <div className="flex items-center justify-between gap-3 px-4 py-3 lg:gap-4 lg:px-6 lg:py-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm lg:h-11 lg:w-11">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground lg:text-3xl">{title}</h1>
          {subtitle ? (
            <p
              data-testid="header-subtitle-desktop"
              className="mt-1 hidden text-sm text-muted-foreground lg:block"
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 lg:gap-3">
        {/* Desktop-only: actions inline in row 1 */}
        {actions ? <div className="hidden items-center gap-3 lg:flex">{actions}</div> : null}

        {/* Theme toggle button — KEEP EXISTING JSX HERE (the <Button variant="ghost" size="icon" ...>) */}
        {/* ... */}

        {/* Avatar DropdownMenu — KEEP EXISTING JSX HERE (the <DropdownMenu><DropdownMenuTrigger>...</DropdownMenu>) */}
        {/* ... */}
      </div>
    </div>

    {/* Row 2: mobile-only — subtitle + actions overflow */}
    {(subtitle || actions) && (
      <div
        data-testid="header-row2"
        className="flex items-center gap-2 border-t border-border/60 px-4 py-2 lg:hidden"
      >
        {subtitle ? (
          <p
            data-testid="header-subtitle-mobile"
            className="flex-1 truncate text-xs text-muted-foreground lg:hidden"
          >
            {subtitle}
          </p>
        ) : <span className="flex-1" />}
        {actions ? (
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            {actions}
          </div>
        ) : null}
      </div>
    )}
  </header>
);
```

Preserve the EXACT existing JSX for the theme toggle `<Button>` and the avatar `<DropdownMenu>` — just move them into the new `<div className="flex flex-shrink-0 ...">` wrapper. Do NOT change their props, aria-labels, or event handlers.

- [ ] **Step 1.5: Run mobile test to verify it passes**

Run: `pnpm test src/components/layout/Header.mobile.test.tsx`
Expected: all 4 tests pass.

- [ ] **Step 1.6: Run existing test to confirm no regression**

Run: `pnpm test src/components/layout/Header.test.tsx`
Expected: existing `Header user menu` suite still passes byte-for-byte (no changes to its file).

- [ ] **Step 1.7: Run full suite**

Run: `pnpm test`
Expected: baseline unchanged (3 pre-existing calendar/ticktick failures, nothing new).

- [ ] **Step 1.8: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/Header.mobile.test.tsx
git commit -m "refactor(header): stack to rows on mobile, keep desktop inline"
```

---

## Task 2 — Create `DashboardAlertCard` component

**Goal:** A card that appears at the top of the mobile Dashboard when there are overdue bills (`overdueCount > 0`). Hidden on desktop (the badge on the sidebar already signals). CTA navigates to `/contas-pagar`.

**Files:**
- Create: `src/components/dashboard/DashboardAlertCard.tsx`
- Create: `src/components/dashboard/DashboardAlertCard.test.tsx`

- [ ] **Step 2.1: Write the failing test**

Create `src/components/dashboard/DashboardAlertCard.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { DashboardAlertCard } from './DashboardAlertCard';

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

function renderCard(props: React.ComponentProps<typeof DashboardAlertCard>) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <DashboardAlertCard {...props} />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DashboardAlertCard', () => {
  afterEach(() => cleanup());

  it('renders when overdueCount > 0', () => {
    renderCard({ overdueCount: 2, overdueAmount: 1750, topItems: [{ name: 'Aluguel', dueLabel: 'hoje' }] });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/2 contas vencidas/i)).toBeTruthy();
  });

  it('renders nothing when overdueCount is 0', () => {
    const { container } = renderCard({ overdueCount: 0, overdueAmount: 0, topItems: [] });
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('renders an amount string formatted with R$', () => {
    renderCard({ overdueCount: 1, overdueAmount: 150.5, topItems: [] });
    expect(screen.getByText(/R\$\s?150,50/)).toBeTruthy();
  });

  it('shows up to 2 top item previews', () => {
    renderCard({
      overdueCount: 3,
      overdueAmount: 500,
      topItems: [
        { name: 'Aluguel', dueLabel: 'hoje' },
        { name: 'Luz', dueLabel: 'ontem' },
        { name: 'Gás', dueLabel: 'há 3 dias' },
      ],
    });
    expect(screen.getByText('Aluguel')).toBeTruthy();
    expect(screen.getByText('Luz')).toBeTruthy();
    expect(screen.queryByText('Gás')).toBeNull();
  });

  it('CTA navigates to /contas-pagar', () => {
    renderCard({ overdueCount: 1, overdueAmount: 100, topItems: [] });
    fireEvent.click(screen.getByRole('link', { name: /ver contas a pagar/i }));
    expect(screen.getByTestId('location').textContent).toBe('/contas-pagar');
  });

  it('is hidden on desktop (lg:hidden class)', () => {
    renderCard({ overdueCount: 1, overdueAmount: 100, topItems: [] });
    expect(screen.getByRole('alert').className).toContain('lg:hidden');
  });
});
```

- [ ] **Step 2.2: Run test, verify it fails (module not found)**

Run: `pnpm test src/components/dashboard/DashboardAlertCard.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 2.3: Create the component**

Write `src/components/dashboard/DashboardAlertCard.tsx`:

```tsx
import { AlertCircle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/utils/formatters';

export interface DashboardAlertCardProps {
  overdueCount: number;
  overdueAmount: number;
  topItems: { name: string; dueLabel: string }[];
}

export function DashboardAlertCard({ overdueCount, overdueAmount, topItems }: DashboardAlertCardProps) {
  if (overdueCount <= 0) return null;

  const preview = topItems.slice(0, 2);

  return (
    <div
      role="alert"
      className={cn(
        'lg:hidden',
        'rounded-2xl border border-destructive/40 bg-destructive/10 p-4 shadow-sm',
        'flex flex-col gap-3',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
          <AlertCircle size={20} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-foreground">
            {overdueCount} {overdueCount === 1 ? 'conta vencida' : 'contas vencidas'}
          </div>
          <div className="mt-1 text-sm font-medium text-destructive">{formatCurrency(overdueAmount)}</div>
        </div>
      </div>

      {preview.length > 0 && (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {preview.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-3">
              <span className="truncate">{item.name}</span>
              <span className="flex-shrink-0 text-xs">{item.dueLabel}</span>
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/contas-pagar"
        className="inline-flex items-center justify-between rounded-xl border border-destructive/40 bg-background/40 px-4 py-2 text-sm font-medium text-foreground hover:bg-background/70"
      >
        <span>Ver contas a pagar</span>
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
```

- [ ] **Step 2.4: Run test to verify it passes**

Run: `pnpm test src/components/dashboard/DashboardAlertCard.test.tsx`
Expected: 6 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/components/dashboard/DashboardAlertCard.tsx src/components/dashboard/DashboardAlertCard.test.tsx
git commit -m "feat(dashboard): add DashboardAlertCard for mobile overdue alerts"
```

---

## Task 3 — Create `DonutChart` component

**Goal:** Donut variant of the pie chart for mobile. Takes the same data shape as `ExpensesByCategoryChart` internal, renders with `innerRadius`, places the total in the center, and shows legend as chips below.

**Files:**
- Create: `src/components/dashboard/charts/DonutChart.tsx`
- Create: `src/components/dashboard/charts/DonutChart.test.tsx`

- [ ] **Step 3.1: Write the failing test**

Create `src/components/dashboard/charts/DonutChart.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DonutChart } from './DonutChart';

const sampleData = [
  { name: 'Alimentação', value: 2239, color: '#f97316', percentage: 76 },
  { name: 'Transporte', value: 324, color: '#3b82f6', percentage: 11 },
  { name: 'Esportes', value: 200, color: '#10b981', percentage: 7 },
  { name: 'Consumo', value: 185, color: '#f59e0b', percentage: 6 },
];

describe('DonutChart', () => {
  afterEach(() => cleanup());

  it('renders the total center label', () => {
    render(<DonutChart data={sampleData} total={2948} />);
    expect(screen.getByTestId('donut-total').textContent).toMatch(/R\$\s?2\.948/);
    expect(screen.getByText(/TOTAL/i)).toBeTruthy();
  });

  it('renders legend chips for each item with label and percentage', () => {
    render(<DonutChart data={sampleData} total={2948} />);
    const chips = screen.getAllByTestId('donut-chip');
    expect(chips).toHaveLength(4);
    expect(chips[0].textContent).toContain('Alimentação');
    expect(chips[0].textContent).toContain('76%');
  });

  it('renders an empty state when data is empty', () => {
    render(<DonutChart data={[]} total={0} />);
    expect(screen.getByText(/sem despesas/i)).toBeTruthy();
  });

  it('has aria-label describing the chart', () => {
    render(<DonutChart data={sampleData} total={2948} />);
    expect(screen.getByRole('img', { name: /despesas por categoria/i })).toBeTruthy();
  });
});
```

- [ ] **Step 3.2: Run test, verify it fails**

Run: `pnpm test src/components/dashboard/charts/DonutChart.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3.3: Create the component**

Write `src/components/dashboard/charts/DonutChart.tsx`:

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/utils/formatters';

export interface DonutChartItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface DonutChartProps {
  data: DonutChartItem[];
  total: number;
}

export function DonutChart({ data, total }: DonutChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        Sem despesas neste mês.
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label="Despesas por categoria"
      className="flex flex-col items-center gap-4"
    >
      <div className="relative h-[200px] w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div data-testid="donut-total" className="text-lg font-semibold text-foreground">
            {formatCurrency(total)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">TOTAL</div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {data.map((item) => (
          <div
            key={item.name}
            data-testid="donut-chip"
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-foreground',
            )}
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ background: item.color }}
            />
            <span className="font-medium">{item.name}</span>
            <span className="text-muted-foreground">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3.4: Run test to verify it passes**

Run: `pnpm test src/components/dashboard/charts/DonutChart.test.tsx`
Expected: 4 tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add src/components/dashboard/charts/DonutChart.tsx src/components/dashboard/charts/DonutChart.test.tsx
git commit -m "feat(dashboard): add DonutChart with center total + chip legend"
```

---

## Task 4 — Make `ExpensesByCategoryChart` responsive (pie/donut switch)

**Goal:** Extract a minimal adapter that renders the existing pie on desktop (`lg`) and the new `DonutChart` on mobile (< lg). External API (`{ transactions, selectedDate }`) stays identical.

**Files:**
- Modify: `src/components/dashboard/charts/ExpensesByCategoryChart.tsx`

- [ ] **Step 4.1: Read the current file to identify the data-preparation block**

Open `src/components/dashboard/charts/ExpensesByCategoryChart.tsx`. Identify the `useMemo` that produces the array of `{ name, value, color, percentage }` items (the shape the current pie consumes). Give this value a stable name `chartData`. Also identify or compute `total` (sum of `value`).

- [ ] **Step 4.2: Refactor the return**

Find the existing `return (` block that renders the `<ChartCard>...<ResponsiveContainer><PieChart>...`. Wrap it in mutually-exclusive breakpoint containers and add the donut alternative.

Import at the top:
```tsx
import { DonutChart } from './DonutChart';
```

Refactor the return so the chart card body contains:

```tsx
<>
  {/* Desktop: keep existing pie */}
  <div className="hidden lg:block">
    <ResponsiveContainer width="100%" height={260}>
      {/* ... existing PieChart JSX ... */}
    </ResponsiveContainer>
    {/* ... existing Legend JSX if any ... */}
  </div>

  {/* Mobile: donut with center total */}
  <div className="lg:hidden">
    <DonutChart data={chartData} total={total} />
  </div>
</>
```

Do NOT change the outer `<ChartCard>` wrapper or any of the data-preparation logic. Preserve ALL existing empty-state handling for the desktop pie (e.g. "Sem despesas" message if already present) inside the `hidden lg:block` branch.

- [ ] **Step 4.3: Run existing chart + Dashboard tests**

Run: `pnpm test src/components/dashboard/charts src/pages/Dashboard.test.tsx`
Expected: Existing tests still pass. If the existing `ExpensesByCategoryChart` has its own test file, it must keep passing.

- [ ] **Step 4.4: Commit**

```bash
git add src/components/dashboard/charts/ExpensesByCategoryChart.tsx
git commit -m "refactor(chart): ExpensesByCategoryChart swaps pie<->donut at lg breakpoint"
```

---

## Task 5 — Make `MonthlyTrendChart` responsive

**Goal:** Ensure the line chart renders cleanly in narrow viewports with `min-h-[240px]` and the legend below.

**Files:**
- Modify: `src/components/dashboard/charts/MonthlyTrendChart.tsx`

- [ ] **Step 5.1: Open and inspect current JSX**

Open `src/components/dashboard/charts/MonthlyTrendChart.tsx`. Find the `return` block — it already uses Recharts `LineChart` + `ResponsiveContainer` + `Legend`.

- [ ] **Step 5.2: Apply mobile-safe sizing**

Find the `ResponsiveContainer` call. Ensure its height is `min-h-[240px]` on the outer wrapper (not only a fixed `height={}` on the container). Example pattern:

```tsx
<div className="w-full min-h-[240px] overflow-hidden">
  <ResponsiveContainer width="100%" height={240}>
    <LineChart ...>
      {/* ... existing Axis, Lines, Tooltip, Legend ... */}
      <Legend verticalAlign="bottom" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
    </LineChart>
  </ResponsiveContainer>
</div>
```

Also inspect the `XAxis` props: on mobile, the 6-month labels (`Nov Dez Jan Fev Mar Abr`) should fit. Add `tick={{ fontSize: 11 }}` to XAxis and YAxis if not already present — prevents truncation on 375px viewports.

- [ ] **Step 5.3: Run existing chart + Dashboard tests**

Run: `pnpm test src/components/dashboard/charts src/pages/Dashboard.test.tsx`
Expected: existing tests pass; no regressions.

- [ ] **Step 5.4: Commit**

```bash
git add src/components/dashboard/charts/MonthlyTrendChart.tsx
git commit -m "refactor(chart): MonthlyTrendChart gets min-h-[240px] + readable axis ticks"
```

---

## Task 6 — Reorder Dashboard blocks + stack widgets on mobile

**Goal:** Reorder the Dashboard JSX tree so the natural render order on mobile matches the priority-first spec (alerts → Ana → KPIs → A Pagar → Investimentos → Transações → Charts → Metas/Orçamento). Preserve the desktop grid layout via breakpoint classes.

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 6.1: Read the current return block**

Open `src/pages/Dashboard.tsx`. Locate the `return` block — it renders (in order): StatCards grid → Charts grid → Ana+Widgets grid → Transactions+Cards grid.

- [ ] **Step 6.2: Compute `overdueSummary` for `DashboardAlertCard`**

Near the existing `useMemo` hooks in the function body, add (placing it after the bills/spending-plan related memos):

```tsx
const overdueSummary = useMemo(() => {
  const bills = payableBillsQuery?.overdueBills ?? [];
  const amount = bills.reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const topItems = bills.slice(0, 2).map((b) => ({
    name: b.name ?? b.description ?? 'Conta',
    dueLabel: b.dueLabel ?? (b.due_date ? new Date(b.due_date).toLocaleDateString('pt-BR') : ''),
  }));
  return { count: bills.length, amount, topItems };
}, [payableBillsQuery]);
```

If `usePayableBillsQuery` is already called in this file, reuse its output; if not, import and call it: `import { usePayableBillsQuery } from '@/hooks/usePayableBillsQuery';` then `const payableBillsQuery = usePayableBillsQuery();`.

- [ ] **Step 6.3: Import the new components**

At the top of `Dashboard.tsx`, add:

```tsx
import { DashboardAlertCard } from '@/components/dashboard/DashboardAlertCard';
```

- [ ] **Step 6.4: Rewrite the `<PageContent>` body**

Replace the current `<PageContent className="space-y-8 py-8">...</PageContent>` with this new structure (preserving ALL inner component props/refs):

```tsx
<PageContent className="space-y-6 py-6 lg:space-y-8 lg:py-8">
  {/* Mobile-only alert (priority #1 on mobile) */}
  <DashboardAlertCard
    overdueCount={overdueSummary.count}
    overdueAmount={overdueSummary.amount}
    topItems={overdueSummary.topItems}
  />

  {/* Ana Clara — moved up on mobile, back to its grid slot on desktop */}
  <div data-testid="dashboard-block-ana" className="lg:order-3">
    <AnaDashboardWidget autoRefresh={true} />
  </div>

  {/* Stat Cards — 1-col on mobile, 4-col on desktop */}
  <div
    data-testid="dashboard-block-stats"
    className="grid grid-cols-1 gap-4 animate-fade-in md:grid-cols-2 lg:grid-cols-4 lg:gap-6 lg:order-1"
  >
    {/* ... existing <StatCard /> x4 blocks — DO NOT CHANGE their props ... */}
  </div>

  {/* Payable Bills (mobile full-width, desktop inside its grid slot) */}
  <div data-testid="dashboard-block-bills" className="lg:order-4">
    <PayableBillsWidget />
  </div>

  {/* Investments */}
  <div data-testid="dashboard-block-investments" className="lg:order-5">
    <InvestmentsWidget />
  </div>

  {/* Recent Transactions (the existing Card with transaction list — keep internal JSX) */}
  <div data-testid="dashboard-block-recent" className="lg:order-6">
    {/* ... existing Card with <TransactionItem> list and "Ver todas" button ... */}
  </div>

  {/* Charts — grid 1-col on mobile, 2-col on desktop; moved down on mobile via DOM order */}
  <div
    data-testid="dashboard-block-charts"
    className="grid grid-cols-1 gap-4 animate-fade-in lg:grid-cols-2 lg:gap-6 lg:order-2"
  >
    <ExpensesByCategoryChart transactions={filteredTransactions} selectedDate={selectedDate} />
    <MonthlyTrendChart transactions={filteredTransactions} selectedDate={selectedDate} />
  </div>

  {/* Goals + Budget — stacked on mobile, 2-col inside the existing widgets grid on desktop */}
  <div
    data-testid="dashboard-block-goals-budget"
    className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 lg:order-7"
  >
    <GoalsSummaryWidget />
    <BudgetComplianceWidget monthKey={monthKey} />
  </div>

  {/* Credit cards widget — desktop only, mobile users see cartões via "Mais" */}
  <div data-testid="dashboard-block-cards" className="hidden lg:block lg:order-8">
    <CreditCardsWidget />
  </div>
</PageContent>
```

**Important**: copy the existing inner JSX for each of `<StatCard />` x4, the "Recent Transactions" Card (with the `{transactions.slice(0,5).map(...)}` and "Adicionar Transação" fallback), and `<CreditCardsWidget />` directly from the current code — do not rewrite their props or internal logic.

The `lg:order-*` classes reorder the blocks on desktop back toward the original layout: `stats (1) → charts (2) → ana (3) → bills (4) → investments (5) → recent (6) → goals/budget (7) → cards (8)`. On mobile (< lg), the DOM order wins (alert → ana → stats → bills → investments → recent → charts → goals/budget).

On desktop this is CSS-only reordering so the rendered layout mirrors (approximately) what we had. If the visual diff is significant, re-examine: the spec prioritizes mobile — minor desktop visual drift may be acceptable but must be flagged.

- [ ] **Step 6.5: Run full suite**

Run: `pnpm test`
Expected: baseline unchanged. Dashboard tests should still pass (next task will update them to assert mobile order).

- [ ] **Step 6.6: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(dashboard): reorder blocks for mobile priority-first, preserve desktop via order"
```

---

## Task 7 — Update `Dashboard.test.tsx` to assert mobile order

**Goal:** Lock the DOM order via a test, ensuring future refactors don't drift.

**Files:**
- Modify: `src/pages/Dashboard.test.tsx`

- [ ] **Step 7.1: Add the mobile-order test**

Open `src/pages/Dashboard.test.tsx`. At the END of the existing describe block (or in a new one), add:

```tsx
  it('renders mobile blocks in priority-first DOM order', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const blocks = screen
      .getAllByTestId(/^dashboard-block-/)
      .map((el) => el.getAttribute('data-testid'));

    const expected = [
      'dashboard-block-ana',
      'dashboard-block-stats',
      'dashboard-block-bills',
      'dashboard-block-investments',
      'dashboard-block-recent',
      'dashboard-block-charts',
      'dashboard-block-goals-budget',
      'dashboard-block-cards',
    ];

    expect(blocks).toEqual(expected);
  });
```

Note: the alert card only renders when `overdueCount > 0` — it's not in this order test. If you want to cover it, add a separate test mocking `usePayableBillsQuery` to return overdue bills, then assert the alert appears FIRST in the DOM.

- [ ] **Step 7.2: Run the updated test**

Run: `pnpm test src/pages/Dashboard.test.tsx`
Expected: existing tests pass + the new mobile-order test passes.

- [ ] **Step 7.3: Run full suite**

Run: `pnpm test`
Expected: baseline unchanged.

- [ ] **Step 7.4: Commit**

```bash
git add src/pages/Dashboard.test.tsx
git commit -m "test(dashboard): lock mobile block order via data-testid assertions"
```

---

## Task 8 — Manual verification

**Goal:** Confirm the Dashboard visually matches the spec across 3 viewports.

- [ ] **Step 8.1: Start the dev server**

Run: `pnpm dev`
Expected: Vite server ready on `http://localhost:5173` (or next free port).

- [ ] **Step 8.2: Desktop verification (1440×900)**

- Open the app at desktop width.
- Dashboard should look visually indistinguishable from before Plan 3:
  - Header: icon + title + subtitle on left; MonthSelector + theme toggle + avatar-dropdown on right.
  - Body: stats (1) → charts (2) → ana (3) → bills (4) → investments (5) → recent (6) → goals/budget (7) → cards (8).
  - Ana tab FAB still at `bottom-6 right-6`.
- If there is a visible regression, identify which `lg:order-*` slot is wrong and adjust in `Dashboard.tsx`.

- [ ] **Step 8.3: Tablet verification (iPad portrait, 768×1024)**

- DevTools → Responsive → iPad portrait.
- Header stacks into rows 1+2. Avatar dropdown visible and opens.
- MonthSelector sits on row 2 along with subtitle.
- Body follows mobile order (ana → stats → bills → investments → recent → charts → goals/budget); cards widget hidden.
- Donut chart renders with total in center and chips below.

- [ ] **Step 8.4: Phone verification (iPhone SE, 375×667)**

- DevTools → Responsive → iPhone SE.
- Check every block from the spec §5 wireframe:
  - If there are overdue bills, DashboardAlertCard appears first with the ⚠ icon.
  - Ana Clara widget is the first visible content after the alert.
  - Stat cards render 1-col.
  - Payable Bills widget full-width with 3 upcoming items.
  - Donut center shows total, chips wrap without overflow.
  - Line chart height is at least 240px and X-axis labels readable.
- Zero horizontal scroll anywhere.
- Bottom nav + FAB from Plan 1 continue working.

- [ ] **Step 8.5: Record findings in the plan's Execution Log**

Append a section at the end of `docs/superpowers/plans/2026-04-19-dashboard-mobile-plan3.md`:

```markdown
## Execution Log

**Date**: <fill>
**Commits**: <list SHAs>

### Automated
- Header.mobile.test.tsx: N/N passing
- DashboardAlertCard.test.tsx: N/N passing
- DonutChart.test.tsx: N/N passing
- Dashboard.test.tsx mobile-order: passing
- Full suite: ~1005/1009 (baseline unchanged)

### Manual
- Desktop 1440: [pass/fail + notes]
- iPad 768: [pass/fail + notes]
- iPhone SE 375: [pass/fail + notes]

### Deviations
- [list any]
```

- [ ] **Step 8.6: Commit the log**

```bash
git add docs/superpowers/plans/2026-04-19-dashboard-mobile-plan3.md
git commit -m "docs(plan3): record dashboard mobile verification"
```

---

## Definition of done

After all 8 tasks:
- Header renders correctly on desktop (pixel-identical to before) and on mobile (stacked rows with avatar dropdown working).
- Dashboard renders the priority-first mobile order on viewports < 1024px.
- Desktop visual is preserved via `lg:order-*` classes.
- `DashboardAlertCard` conditionally appears on mobile only.
- `DonutChart` replaces the pie on mobile with center-total hero metric.
- All existing tests pass + 4 new test files cover the new behaviors.
- Manual verification on 3 viewports confirms the wireframe.

## Follow-on plans

- **Plan 4** — Transações mobile (table → cards)
- **Plan 5** — Conciliação mobile (tabs swipeable)
- **Plan 6** — Contas a Pagar mobile
- **Plan 7..N** — remaining pages
