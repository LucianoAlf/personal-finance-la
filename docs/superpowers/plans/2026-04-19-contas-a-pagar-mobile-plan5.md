# Contas a Pagar Mobile Redesign — Plan 5

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt `/contas-pagar` page to mobile viewports (< 1024px) by reusing the patterns established in Plans 3 and 4 (compact summary 2×2, dual-render lists, ResponsiveDialog for forms, sheet for filters), with desktop pixel-identical via dual-render or `<md:`-only classes.

**Architecture:** Re-use the existing `ResponsiveDialog` primitive (Plan 4) for `BillDialog`. Wrap the 4 inline filters in a new mobile-only `BillFiltersSheet`. Mobile tabs become horizontally scrollable; desktop keeps `grid-cols-3`. Summary uses the StatCard mobile-compact already shipped in Plan 3 — only change is the wrapping grid (`grid-cols-2` mobile). ViewToggle hides Table+Calendar options on mobile (forces Cards). BillList gets dual-render for compact mobile rows.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS, Radix UI / shadcn (Tabs, Dialog, Sheet, Select), Vitest + @testing-library/react.

**Spec:** [docs/superpowers/specs/2026-04-19-contas-a-pagar-mobile-design.md](../specs/2026-04-19-contas-a-pagar-mobile-design.md)

### Non-negotiable
**Desktop (≥ lg) must remain pixel-identical.** Use `<md:`-only classes OR dual-render (`lg:hidden` + `hidden lg:block`). Don't modify existing `lg:` / `xl:` classes.

---

## Task 1 — `BillSummaryCards` mobile grid 2-col

**File:** `src/components/payable-bills/BillSummaryCards.tsx`

**Why this is small:** `BillSummaryCards` already uses `StatCard` (Plan 3 already gave it mobile-compact internals). Only needs the grid wrapper updated.

- [ ] **Step 1.1: Read file**

Confirm current return is:
```tsx
<div className="grid gap-4 md:grid-cols-4">
```

- [ ] **Step 1.2: Replace the grid wrapper className**

Change to:
```tsx
<div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
```

That's the only edit in this file.

- [ ] **Step 1.3: Run tests**

```bash
pnpm test src/pages/PayableBills.test.tsx src/components/payable-bills
```

Expected: pass.

- [ ] **Step 1.4: Commit**

```bash
git add src/components/payable-bills/BillSummaryCards.tsx
git commit -m "feat(bills): summary cards 2x2 on mobile (4-col preserved at md+)"
```

---

## Task 2 — `ViewToggle` hides Table + Calendar on mobile

**Goal:** On viewports < md, only the "Cards" button is visible. The other two (Table, Calendar) are `hidden md:inline-flex`. Default mobile view is forced to `'cards'` via a hook in PayableBills.tsx (Task 6).

**File:** `src/components/payable-bills/ViewToggle.tsx`

- [ ] **Step 2.1: Read the file**

The component renders 3 `<Button>`s with text "Cards", "Tabela", "Calendário".

- [ ] **Step 2.2: Add `hidden md:inline-flex` to the Table and Calendar buttons**

Find each `<Button>`. The Cards button stays as-is. Tabela and Calendário buttons get a className addition:

For "Tabela":
```tsx
<Button
  variant="ghost"
  size="sm"
  className={cn(
    "hidden md:inline-flex h-10 rounded-[0.9rem] px-4 text-sm font-semibold text-muted-foreground transition-all",
    value === 'table' && "bg-surface text-foreground shadow-sm ring-1 ring-primary/15"
  )}
  onClick={() => onChange('table')}
>
```

For "Calendário": same — prepend `hidden md:inline-flex` to the existing className.

The Cards button keeps its existing className unchanged.

- [ ] **Step 2.3: Run tests**

```bash
pnpm test src/pages/PayableBills.test.tsx
```

Expected: pass.

- [ ] **Step 2.4: Commit**

```bash
git add src/components/payable-bills/ViewToggle.tsx
git commit -m "feat(bills): ViewToggle hides Table+Calendar on mobile (force Cards)"
```

---

## Task 3 — `BillDialog` consume `ResponsiveDialog`

**Goal:** BillDialog form (the create/edit modal) becomes full-screen sheet on mobile. Same pattern as TransactionDialog in Plan 4 (commit `83bca4e`).

**File:** `src/components/payable-bills/BillDialog.tsx`

- [ ] **Step 3.1: Read current outer structure**

The file imports `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter` from `@/components/ui/dialog` and renders the form inside.

- [ ] **Step 3.2: Update imports**

Remove from `dialog` if no longer needed:
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
```

Add:
```tsx
import {
  ResponsiveDialog,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
```

- [ ] **Step 3.3: Refactor the return**

Find the existing return that wraps `<Dialog open={open} onOpenChange={onOpenChange}>...<DialogContent>...<DialogHeader>...<form>...</form>...<DialogFooter>...</DialogFooter></DialogContent></Dialog>`.

Replace with the same shape used in Plan 4's TransactionDialog:

```tsx
return (
  <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
    <ResponsiveDialogHeader
      title={isEditing ? 'Editar conta' : 'Nova conta'}
      onClose={() => onOpenChange(false)}
    />
    <ResponsiveDialogBody>
      <Form {...form}>
        <form
          id="bill-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* ... ALL existing form field JSX UNCHANGED ... */}
        </form>
      </Form>
    </ResponsiveDialogBody>
    <ResponsiveDialogFooter>
      {/* ... existing Cancelar + Salvar buttons UNCHANGED, but Save button gains form="bill-form" ... */}
    </ResponsiveDialogFooter>
  </ResponsiveDialog>
);
```

The Salvar button (currently `<Button type="submit">Salvar</Button>` inside the `<form>`) needs to move to the footer (outside `<form>`). To still submit, give it `form="bill-form"`:

```tsx
<Button type="submit" form="bill-form" className={primaryButtonClass}>
  Salvar
</Button>
```

Add `id="bill-form"` to the `<form>` element.

If there's an existing `<DialogFooter>` block with the buttons, copy its content into `<ResponsiveDialogFooter>` and update the submit button to include `form="bill-form"`.

- [ ] **Step 3.4: Run tests**

```bash
pnpm test src/pages/PayableBills.test.tsx
```

Expected: pass. (`BillDialog` is mocked in PayableBills tests so refactor is internal.)

```bash
pnpm test 2>&1 | tail -5
```

Baseline unchanged.

- [ ] **Step 3.5: Commit**

```bash
git add src/components/payable-bills/BillDialog.tsx
git commit -m "refactor(bills): BillDialog consumes ResponsiveDialog (Sheet on mobile)"
```

---

## Task 4 — Create `BillFiltersSheet` mobile-only component

**Goal:** New component that wraps the 4 inline filters (PeriodFilter, BillCategoryFilter, RecurrenceTypeFilter, BillSortSelect) into a `ResponsiveDialog` sheet, opened by the mobile filter icon button.

**Files:**
- Create: `src/components/payable-bills/BillFiltersSheet.tsx`
- Create: `src/components/payable-bills/BillFiltersSheet.test.tsx`

- [ ] **Step 4.1: Write the failing test**

Create `src/components/payable-bills/BillFiltersSheet.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { BillFiltersSheet } from './BillFiltersSheet';

vi.mock('@/components/payable-bills/PeriodFilter', () => ({
  PeriodFilter: () => <div data-testid="period-filter">period</div>,
}));
vi.mock('@/components/payable-bills/BillCategoryFilter', () => ({
  BillCategoryFilter: () => <div data-testid="category-filter">category</div>,
}));
vi.mock('@/components/payable-bills/RecurrenceTypeFilter', () => ({
  RecurrenceTypeFilter: () => <div data-testid="recurrence-filter">recurrence</div>,
}));
vi.mock('@/components/payable-bills/BillSortSelect', () => ({
  BillSortSelect: () => <div data-testid="sort-select">sort</div>,
}));

describe('BillFiltersSheet', () => {
  afterEach(() => cleanup());

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    periodFilter: 'this_month' as const,
    onPeriodChange: vi.fn(),
    categoryFilter: 'all' as const,
    onCategoryChange: vi.fn(),
    categories: [],
    recurrenceTypeFilter: 'all' as const,
    onRecurrenceTypeChange: vi.fn(),
    sortOption: 'due_soon' as const,
    onSortChange: vi.fn(),
  };

  it('renders the 4 filter components when open', () => {
    render(<BillFiltersSheet {...defaultProps} />);
    expect(screen.getByTestId('period-filter')).toBeTruthy();
    expect(screen.getByTestId('category-filter')).toBeTruthy();
    expect(screen.getByTestId('sort-select')).toBeTruthy();
  });

  it('renders RecurrenceTypeFilter only when periodFilter === recurring', () => {
    const { rerender } = render(<BillFiltersSheet {...defaultProps} periodFilter="this_month" />);
    expect(screen.queryByTestId('recurrence-filter')).toBeNull();

    rerender(<BillFiltersSheet {...defaultProps} periodFilter="recurring" />);
    expect(screen.queryByTestId('recurrence-filter')).toBeTruthy();
  });

  it('renders both responsive wrappers when open', () => {
    render(<BillFiltersSheet {...defaultProps} />);
    expect(screen.getByTestId('responsive-dialog-mobile')).toBeTruthy();
    expect(screen.getByTestId('responsive-dialog-desktop')).toBeTruthy();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<BillFiltersSheet {...defaultProps} open={false} />);
    expect(container.querySelector('[data-testid="responsive-dialog-mobile"]')).toBeNull();
  });
});
```

- [ ] **Step 4.2: Run test — verify FAIL**

```bash
pnpm test src/components/payable-bills/BillFiltersSheet.test.tsx
```

Expected: module not found.

- [ ] **Step 4.3: Create the component**

Write `src/components/payable-bills/BillFiltersSheet.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
import { PeriodFilter, type PeriodOption } from '@/components/payable-bills/PeriodFilter';
import { BillCategoryFilter, type CategoryFilter } from '@/components/payable-bills/BillCategoryFilter';
import { RecurrenceTypeFilter, type RecurrenceTypeOption } from '@/components/payable-bills/RecurrenceTypeFilter';
import { BillSortSelect, type SortOption } from '@/components/payable-bills/BillSortSelect';
import type { Category } from '@/types/categories';

interface BillFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodFilter: PeriodOption;
  onPeriodChange: (value: PeriodOption) => void;
  categoryFilter: CategoryFilter;
  onCategoryChange: (value: CategoryFilter) => void;
  categories: Category[];
  recurrenceTypeFilter: RecurrenceTypeOption;
  onRecurrenceTypeChange: (value: RecurrenceTypeOption) => void;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function BillFiltersSheet({
  open,
  onOpenChange,
  periodFilter,
  onPeriodChange,
  categoryFilter,
  onCategoryChange,
  categories,
  recurrenceTypeFilter,
  onRecurrenceTypeChange,
  sortOption,
  onSortChange,
}: BillFiltersSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogHeader
        title="Filtros"
        description="Refine sua lista de contas"
        onClose={() => onOpenChange(false)}
      />
      <ResponsiveDialogBody>
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Período</div>
            <PeriodFilter value={periodFilter} onChange={onPeriodChange} />
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria</div>
            <BillCategoryFilter
              categories={categories}
              value={categoryFilter}
              onChange={onCategoryChange}
            />
          </div>
          {periodFilter === 'recurring' && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recorrência</div>
              <RecurrenceTypeFilter value={recurrenceTypeFilter} onChange={onRecurrenceTypeChange} />
            </div>
          )}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ordenar por</div>
            <BillSortSelect value={sortOption} onChange={onSortChange} />
          </div>
        </div>
      </ResponsiveDialogBody>
      <ResponsiveDialogFooter>
        <Button onClick={() => onOpenChange(false)} className="w-full md:w-auto">
          Aplicar
        </Button>
      </ResponsiveDialogFooter>
    </ResponsiveDialog>
  );
}
```

If the type imports for `PeriodOption`, `CategoryFilter`, `RecurrenceTypeOption`, `SortOption` differ from the actual export paths, adapt:
- `PeriodOption` is exported from `PeriodFilter.tsx` (confirmed via grep)
- `CategoryFilter` is from `BillCategoryFilter.tsx` (or might be from PayableBills.tsx — check)
- Adapt as needed and report the deviation.

- [ ] **Step 4.4: Run test — verify PASS**

```bash
pnpm test src/components/payable-bills/BillFiltersSheet.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/components/payable-bills/BillFiltersSheet.tsx src/components/payable-bills/BillFiltersSheet.test.tsx
git commit -m "feat(bills): add BillFiltersSheet (mobile-only, wraps 4 filters)"
```

---

## Task 5 — `BillList` dual-render (mobile inline, desktop preserved)

**Goal:** On mobile, render simpler inline cards (icon + name + meta + amount). On desktop, render the existing `<BillCard>` and `<InstallmentGroupCard>` exactly as today.

**File:** `src/components/payable-bills/BillList.tsx`

- [ ] **Step 5.1: Read the existing render**

The current return loops over `installmentGroups` and `individualBills`, rendering `<InstallmentGroupCard>` and `<BillCard>` respectively, wrapped in `<motion.div>` for animation.

- [ ] **Step 5.2: Wrap existing render in `hidden lg:block` and add mobile branch**

Find the JSX that renders the bill list. Wrap it in `<div className="hidden lg:block">` and add a sibling `<div className="space-y-2 lg:hidden">` with a compact mobile rendering:

```tsx
{/* Desktop list — preserved */}
<div className="hidden lg:block">
  {/* ... existing JSX UNCHANGED: motion.div wrappers + BillCard / InstallmentGroupCard ... */}
</div>

{/* Mobile list — inline cards */}
<div className="space-y-2 lg:hidden">
  {individualBills.map((bill) => {
    const category = categories.find((c) => c.id === bill.category_id);
    const account = accounts.find((a) => a.id === bill.account_id);
    const isOverdue = isBillOverdue(bill);
    const remaining = getRemainingAmount(bill);

    return (
      <button
        key={`m-${bill.id}`}
        type="button"
        onClick={() => onEdit?.(bill)}
        className={`flex w-full items-center gap-3 rounded-xl border-l-4 border border-border bg-surface-elevated p-3 text-left transition-colors hover:bg-surface-overlay ${
          isOverdue ? 'border-l-destructive' : 'border-l-warning'
        }`}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {/* category icon — fall back to a generic Receipt icon */}
          <Receipt size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{bill.description}</div>
          <div className="truncate text-xs text-muted-foreground">
            {category?.name ?? 'Sem categoria'}
            {account ? ` · ${account.name}` : ''}
            {' · '}
            {format(parseISO(bill.due_date), 'dd/MM')}
          </div>
        </div>
        <div className="flex-shrink-0 text-right text-sm font-bold text-foreground">
          {formatCurrency(remaining)}
        </div>
      </button>
    );
  })}

  {installmentGroups.map((group) => (
    <button
      key={`m-${group.groupId}`}
      type="button"
      onClick={() => onEdit?.(group.installments[0])}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-elevated p-3 text-left hover:bg-surface-overlay"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Receipt size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{group.installments[0].description}</div>
        <div className="truncate text-xs text-muted-foreground">
          {group.installments.length} parcelas
        </div>
      </div>
      <div className="flex-shrink-0 text-right text-sm font-bold text-foreground">
        {formatCurrency(group.installments.reduce((s, b) => s + getRemainingAmount(b), 0))}
      </div>
    </button>
  ))}

  {bills.length === 0 && (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      <Inbox size={32} aria-hidden="true" />
      <div>{emptyMessage}</div>
    </div>
  )}
</div>
```

Imports needed at top of file (add if missing):
```tsx
import { Receipt } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { isBillOverdue, getRemainingAmount, formatCurrency } from '@/utils/billCalculations';
```

(Some may already be imported elsewhere — check existing imports.)

- [ ] **Step 5.3: Run tests**

```bash
pnpm test src/components/payable-bills src/pages/PayableBills.test.tsx
```

Expected: existing tests still pass. If a test like `getByText('Aluguel')` now finds 2 elements (desktop + mobile both render the same data), narrow with `getAllByText('Aluguel')[0]`.

- [ ] **Step 5.4: Commit**

```bash
git add src/components/payable-bills/BillList.tsx
git commit -m "feat(bills): BillList dual-render (mobile inline cards, desktop preserved)"
```

---

## Task 6 — `PayableBills.tsx` integration (tabs, filter bar, view force)

**Goal:** Wire all the previous tasks together at the page level:
- Tabs scrolláveis horizontal mobile (preserved 3-col grid desktop)
- Filter bar dual-render (mobile: search + filter icon button; desktop: current inline filters)
- Force `viewMode = 'cards'` on mobile via effect

**File:** `src/pages/PayableBills.tsx`

- [ ] **Step 6.1: Add useEffect to force cards on mobile**

Near the other state declarations (around the `useState` block):

```tsx
useEffect(() => {
  const mql = typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023.98px)') : null;
  if (!mql) return;
  if (mql.matches && viewMode !== 'cards') {
    setViewMode('cards');
  }
  const handler = (e: MediaQueryListEvent) => {
    if (e.matches && viewMode !== 'cards') setViewMode('cards');
  };
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}, [viewMode]);
```

Add `useEffect` to the React imports if not already there.

- [ ] **Step 6.2: Add filtersSheetOpen state + activeFiltersCount**

Near the existing `useState` for dialogs:

```tsx
const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
```

Compute count near the other `useMemo`s:

```tsx
const activeFiltersCount = useMemo(() => {
  let count = 0;
  if (periodFilter !== 'this_month') count++;
  if (categoryFilter !== 'all') count++;
  if (periodFilter === 'recurring' && recurrenceTypeFilter !== 'all') count++;
  if (sortOption !== 'due_soon') count++;
  return count;
}, [periodFilter, categoryFilter, recurrenceTypeFilter, sortOption]);
```

(Adjust the "default" values if they differ in the actual code — inspect what `useState` uses for initial values.)

- [ ] **Step 6.3: Import new components**

At the top of the file:

```tsx
import { Filter as FilterIcon } from 'lucide-react'; // if not already imported
import { BillFiltersSheet } from '@/components/payable-bills/BillFiltersSheet';
```

- [ ] **Step 6.4: Wrap the tabs in dual-render**

Find the existing `<TabsList className="grid h-auto w-full grid-cols-3 ...">`. Wrap it:

```tsx
{/* Desktop tabs — preserved */}
<TabsList className="hidden md:grid h-auto w-full grid-cols-3 rounded-[1.35rem] border border-border/70 bg-card/95 p-1 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_42px_rgba(2,6,23,0.24)]">
  {/* ... existing 3 TabsTrigger UNCHANGED ... */}
</TabsList>

{/* Mobile tabs — scrollable horizontal */}
<TabsList className="flex w-full gap-2 overflow-x-auto rounded-xl border border-border/70 bg-card/95 p-1 md:hidden">
  <TabsTrigger
    value="bills"
    className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground"
  >
    <Receipt className="h-4 w-4" />
    Contas ({filteredBills.length})
  </TabsTrigger>
  <TabsTrigger
    value="history"
    className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground"
  >
    <History className="h-4 w-4" />
    Histórico ({paidBills.length})
  </TabsTrigger>
  <TabsTrigger
    value="reports"
    className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground"
  >
    <BarChart3 className="h-4 w-4" />
    Relatórios
  </TabsTrigger>
</TabsList>
```

The desktop `<TabsList>` (currently has `grid h-auto w-full grid-cols-3`) gets `hidden md:grid` prepended. Mobile version `flex overflow-x-auto md:hidden` is new.

- [ ] **Step 6.5: Wrap the filter bar in dual-render**

Find the filter section (the `<div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">` that contains PeriodFilter, BillCategoryFilter, etc.).

Wrap the entire surrounding `<Card>` filter container in dual-render. Concretely, find the Card with class `rounded-[1.6rem] border-border/70 bg-card/95 p-4 ...` that holds the search + filter group. Replace its content:

```tsx
{/* Desktop filter card — preserved */}
<Card className="hidden md:block rounded-[1.6rem] border-border/70 bg-card/95 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_44px_rgba(2,6,23,0.2)]">
  {/* ... ALL existing filter row JSX UNCHANGED — Search Input + PeriodFilter + BillCategoryFilter + (RecurrenceTypeFilter conditional) + BillSortSelect + ViewToggle ... */}
</Card>

{/* Mobile filter bar */}
<div className="md:hidden flex items-center gap-2">
  <div className="relative flex-1">
    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
    <Input
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      placeholder="Buscar conta"
      className="h-11 w-full pl-9"
    />
  </div>
  <button
    type="button"
    onClick={() => setFiltersSheetOpen(true)}
    aria-label="Abrir filtros"
    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-elevated text-foreground hover:bg-surface-overlay"
  >
    <FilterIcon size={18} aria-hidden="true" />
    {activeFiltersCount > 0 && (
      <span
        aria-label={`${activeFiltersCount} filtros ativos`}
        className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
      >
        {activeFiltersCount}
      </span>
    )}
  </button>
</div>
```

- [ ] **Step 6.6: Render the BillFiltersSheet at the end of the page**

Near the other `<Dialog>` blocks at the bottom of the JSX (around line 800+):

```tsx
<BillFiltersSheet
  open={filtersSheetOpen}
  onOpenChange={setFiltersSheetOpen}
  periodFilter={periodFilter}
  onPeriodChange={setPeriodFilter}
  categoryFilter={categoryFilter}
  onCategoryChange={setCategoryFilter}
  categories={categories}
  recurrenceTypeFilter={recurrenceTypeFilter}
  onRecurrenceTypeChange={setRecurrenceTypeFilter}
  sortOption={sortOption}
  onSortChange={setSortOption}
/>
```

- [ ] **Step 6.7: Run tests**

```bash
pnpm test src/pages/PayableBills.test.tsx
```

Expected: existing tests pass. Adapt any duplicated text matches with `getAllBy*[0]`.

```bash
pnpm test 2>&1 | tail -5
```

Baseline unchanged.

- [ ] **Step 6.8: Commit**

```bash
git add src/pages/PayableBills.tsx
git commit -m "feat(bills): mobile tabs scrollable + filter sheet + force cards view"
```

---

## Task 7 — Mobile assertions in `PayableBills.test.tsx`

**File:** `src/pages/PayableBills.test.tsx`

- [ ] **Step 7.1: Add 3 mobile-locking tests**

At the end of the existing describe block:

```tsx
  it('renders mobile filter button (aria-label)', () => {
    render(
      <MemoryRouter>
        <PayableBills />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /abrir filtros/i })).toBeTruthy();
  });

  it('renders mobile tab list with overflow-x-auto class (3 tabs scrollable)', () => {
    const { container } = render(
      <MemoryRouter>
        <PayableBills />
      </MemoryRouter>,
    );
    const mobileTabs = container.querySelector('.md\\:hidden.overflow-x-auto');
    expect(mobileTabs).toBeTruthy();
  });

  it('summary grid uses grid-cols-2 mobile / md:grid-cols-4 desktop', () => {
    const { container } = render(
      <MemoryRouter>
        <PayableBills />
      </MemoryRouter>,
    );
    const html = container.innerHTML;
    expect(html).toContain('grid-cols-2');
    expect(html).toContain('md:grid-cols-4');
  });
```

(Use `MemoryRouter` if existing tests use it; otherwise inline the `render` like other tests in the file.)

- [ ] **Step 7.2: Run tests**

```bash
pnpm test src/pages/PayableBills.test.tsx
```

Expected: all existing + 3 new pass.

- [ ] **Step 7.3: Commit**

```bash
git add src/pages/PayableBills.test.tsx
git commit -m "test(bills): assert mobile filter button + scrollable tabs + summary grid"
```

---

## Task 8 — Manual verification

- [ ] **Step 8.1**: `pnpm dev` (skip if already running).
- [ ] **Step 8.2**: Desktop 1440 — `/contas-pagar` looks identical to before Plan 5 (4-col tabs grid, 4 summary cards in row, all filters inline, ViewToggle with 3 buttons including Calendar visible, BillList same).
- [ ] **Step 8.3**: iPad portrait 768×1024 — bottom nav visible; tabs scroll-x; summary 2×2 (compact); search + filter icon (with badge count if filters active); tap filter → sheet opens with 4 filter controls; ViewToggle shows ONLY "Cards" button; BillList inline rows.
- [ ] **Step 8.4**: iPhone SE 375×667 — same as iPad. Specifically test: tap filter icon, change period filter, tap "Aplicar", sheet closes, list updates.
- [ ] **Step 8.5**: Open BillDialog (tap a bill or "Nova Conta"). On mobile it's full-screen sheet; on desktop centered Dialog.
- [ ] **Step 8.6**: Append execution log to `docs/superpowers/plans/2026-04-19-contas-a-pagar-mobile-plan5.md` with date, commits, viewport results.
- [ ] **Step 8.7**: Commit log:
  ```bash
  git add docs/superpowers/plans/2026-04-19-contas-a-pagar-mobile-plan5.md
  git commit -m "docs(plan5): record contas a pagar mobile verification"
  ```

---

## Definition of done

- BillSummaryCards mobile = 2-col, desktop = 4-col preserved
- ViewToggle mobile shows only "Cards"; mobile viewMode forced to 'cards'
- BillDialog full-screen sheet on mobile, Dialog on desktop
- BillFiltersSheet new component, used by mobile filter icon
- BillList: mobile inline cards, desktop preserved byte-for-byte
- PayableBills.tsx: tabs scrollable mobile, dual-render filter bar
- 3 new tests assert mobile contract
- Desktop 1440 pixel-identical
- All existing tests pass
- Manual verification logged

## Follow-on

- Plan 6 — Cartões/Metas/Investimentos/Relatórios (lote)
- Plan 7 — Agenda mobile
- Plan 8 — Utilitárias
- Plan 9 — Conciliação (mais complexa)
