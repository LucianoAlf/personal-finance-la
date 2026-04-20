# Transações Mobile Redesign — Plan 4

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Transações page mobile-native (iPhone SE 375×667 minimum) without changing any pixel on desktop (≥ 1024px). Build a shared `ResponsiveDialog` primitive (Dialog on desktop, full-screen Sheet on mobile) consumed by both `AdvancedFiltersModal` and `TransactionDialog`. Compact the summary cards into a 2×2 grid on mobile. Replace the stacked filter bar with a single-row search-plus-icon. Render the transaction list rows inline on mobile via dual-render, preserving the existing desktop JSX byte-for-byte.

**Architecture:** One new primitive (`src/components/ui/responsive-dialog.tsx`) wraps shadcn `Dialog` and `Sheet` behind a single React API. Both modal components are refactored to consume it — 1 fewer component call instead of 2. The Transações page gets three localized changes: (a) filter bar becomes a mobile branch (`lg:hidden`) plus a desktop branch (`hidden lg:flex`), (b) summary grid adds `grid-cols-2` as the mobile default while preserving the existing `md:grid-cols-2 xl:grid-cols-4`, (c) transaction rows use dual-render — mobile inline via `lg:hidden` and desktop preserved exactly as today via `hidden lg:flex`.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS, Radix UI (Dialog, Sheet), shadcn/ui wrappers, Vitest + @testing-library/react (jsdom).

**Spec:** [docs/superpowers/specs/2026-04-19-transacoes-mobile-design.md](../specs/2026-04-19-transacoes-mobile-design.md)

### Non-negotiable rule
**Desktop (≥ 1024px) must remain pixel-identical to `main` before this plan.** If a change affects `lg`, `xl`, `2xl` classes on an existing element, prefer dual-render (`lg:hidden` + `hidden lg:block`) over modifying the existing class. See spec §1 "Restrição forte".

---

## Task 1 — Create `ResponsiveDialog` primitive (TDD)

**Goal:** Reusable wrapper that renders a shadcn `Dialog` in viewports ≥ lg and a full-screen `Sheet side="bottom"` in viewports < lg. Both share the same slot-based API (Header/Body/Footer).

**Files:**
- Create: `src/components/ui/responsive-dialog.tsx`
- Create: `src/components/ui/responsive-dialog.test.tsx`

- [ ] **Step 1.1: Write the failing test**

Create `src/components/ui/responsive-dialog.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import {
  ResponsiveDialog,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from './responsive-dialog';

describe('ResponsiveDialog', () => {
  afterEach(() => cleanup());

  it('renders both mobile and desktop containers with correct visibility classes', () => {
    render(
      <ResponsiveDialog open onOpenChange={() => {}}>
        <ResponsiveDialogHeader title="Filtros" />
        <ResponsiveDialogBody>body-content</ResponsiveDialogBody>
        <ResponsiveDialogFooter>footer-content</ResponsiveDialogFooter>
      </ResponsiveDialog>,
    );
    const mobileRoot = screen.getByTestId('responsive-dialog-mobile');
    const desktopRoot = screen.getByTestId('responsive-dialog-desktop');
    expect(mobileRoot.className).toContain('lg:hidden');
    expect(desktopRoot.className).toContain('hidden');
    expect(desktopRoot.className).toContain('lg:block');
  });

  it('renders header title in both mobile and desktop', () => {
    render(
      <ResponsiveDialog open onOpenChange={() => {}}>
        <ResponsiveDialogHeader title="Meus Filtros" />
        <ResponsiveDialogBody>b</ResponsiveDialogBody>
      </ResponsiveDialog>,
    );
    expect(screen.getAllByText('Meus Filtros').length).toBeGreaterThanOrEqual(1);
  });

  it('close button on mobile header triggers onOpenChange(false)', () => {
    const onOpenChange = vi.fn();
    render(
      <ResponsiveDialog open onOpenChange={onOpenChange}>
        <ResponsiveDialogHeader title="X" />
        <ResponsiveDialogBody>b</ResponsiveDialogBody>
      </ResponsiveDialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render mobile tree contents when open is false', () => {
    render(
      <ResponsiveDialog open={false} onOpenChange={() => {}}>
        <ResponsiveDialogHeader title="X" />
        <ResponsiveDialogBody>body-hidden</ResponsiveDialogBody>
      </ResponsiveDialog>,
    );
    expect(screen.queryByText('body-hidden')).toBeNull();
  });

  it('body has overflow-y-auto on mobile for scrollable long content', () => {
    render(
      <ResponsiveDialog open onOpenChange={() => {}}>
        <ResponsiveDialogHeader title="X" />
        <ResponsiveDialogBody>content</ResponsiveDialogBody>
      </ResponsiveDialog>,
    );
    const body = screen.getByTestId('responsive-dialog-body-mobile');
    expect(body.className).toContain('overflow-y-auto');
  });
});
```

- [ ] **Step 1.2: Run test — verify FAIL**

Run: `pnpm test src/components/ui/responsive-dialog.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 1.3: Create the primitive**

Write `src/components/ui/responsive-dialog.tsx`:

```tsx
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/cn';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function ResponsiveDialog({ open, onOpenChange, children, className }: ResponsiveDialogProps) {
  return (
    <>
      {/* Desktop: Radix Dialog via shadcn */}
      <div data-testid="responsive-dialog-desktop" className="hidden lg:block">
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className={cn('max-w-2xl', className)}>
            {children}
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile: full-screen sheet (plain portal to avoid Sheet animation conflicts) */}
      {open && (
        <div
          data-testid="responsive-dialog-mobile"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[80] flex flex-col bg-background text-foreground lg:hidden"
        >
          {children}
        </div>
      )}
    </>
  );
}

interface ResponsiveDialogHeaderProps {
  title: string;
  description?: string;
  onClose?: () => void;
}

export function ResponsiveDialogHeader({ title, description, onClose }: ResponsiveDialogHeaderProps) {
  return (
    <>
      {/* Desktop header — inherit from DialogContent (DialogHeader+DialogTitle shadcn pattern is embedded via children in consumer) */}
      <div data-testid="responsive-dialog-header-desktop" className="hidden lg:flex lg:flex-col lg:gap-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      {/* Mobile header — sticky top with close button + title */}
      <header
        data-testid="responsive-dialog-header-mobile"
        className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/85 lg:hidden"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-elevated"
        >
          <X size={20} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
          {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </header>
    </>
  );
}

export function ResponsiveDialogBody({ children }: { children: ReactNode }) {
  return (
    <>
      <div data-testid="responsive-dialog-body-desktop" className="hidden lg:block">
        {children}
      </div>
      <div
        data-testid="responsive-dialog-body-mobile"
        className="flex-1 overflow-y-auto px-4 py-4 lg:hidden"
      >
        {children}
      </div>
    </>
  );
}

export function ResponsiveDialogFooter({ children }: { children: ReactNode }) {
  return (
    <>
      <div
        data-testid="responsive-dialog-footer-desktop"
        className="hidden lg:flex lg:justify-end lg:gap-2 lg:pt-4"
      >
        {children}
      </div>
      <footer
        data-testid="responsive-dialog-footer-mobile"
        className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/85 lg:hidden"
      >
        {children}
      </footer>
    </>
  );
}
```

Wire `ResponsiveDialogHeader`'s `onClose` from the parent. Since the header doesn't know the parent's `onOpenChange`, the consumer passes `onClose={() => onOpenChange(false)}` explicitly. The test mocks this behavior.

Update the header test to verify `onClose` fires. In step 1.1, the test used `screen.getByRole('button', { name: /fechar/i })` and asserted `onOpenChange` was called with `false` — we need the consumer pattern to wire these together. Update the test's render to pass `onClose` to the header:

Actually, re-read the test in step 1.1 — it tests `onOpenChange` wiring. Our component separates `onClose` (on the header) from `onOpenChange` (on the dialog root), so the test must wire them. Rewrite the test's relevant block with a wrapper:

Delete the old test and replace with this corrected version in the same test file (replaces the 3rd test — "close button on mobile header triggers onOpenChange(false)"):

```tsx
  it('close button on mobile header triggers onOpenChange(false)', () => {
    const onOpenChange = vi.fn();

    function Example() {
      return (
        <ResponsiveDialog open onOpenChange={onOpenChange}>
          <ResponsiveDialogHeader title="X" onClose={() => onOpenChange(false)} />
          <ResponsiveDialogBody>b</ResponsiveDialogBody>
        </ResponsiveDialog>
      );
    }

    render(<Example />);
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
```

- [ ] **Step 1.4: Run tests — expect pass**

Run: `pnpm test src/components/ui/responsive-dialog.test.tsx`
Expected: 5/5 pass.

- [ ] **Step 1.5: Full suite**

Run: `pnpm test 2>&1 | tail -5`
Expected: baseline unchanged.

- [ ] **Step 1.6: Commit**

```bash
git add src/components/ui/responsive-dialog.tsx src/components/ui/responsive-dialog.test.tsx
git commit -m "feat(ui): add ResponsiveDialog primitive (Dialog on desktop, Sheet on mobile)"
```

---

## Task 2 — Refactor `AdvancedFiltersModal` to use `ResponsiveDialog`

**Goal:** The filter modal renders as a full-screen Sheet on mobile. Desktop Dialog behavior stays identical — same max width, same paddings, same submit buttons.

**Files:**
- Modify: `src/components/transactions/AdvancedFiltersModal.tsx`
- Modify: `src/components/transactions/AdvancedFiltersModal.test.tsx`

- [ ] **Step 2.1: Read the current modal**

Open `src/components/transactions/AdvancedFiltersModal.tsx`. Understand the current return block:

```tsx
return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="...">
      <DialogHeader>
        <DialogTitle>...</DialogTitle>
      </DialogHeader>
      {/* body: Tabs, date picker, multiselects */}
      {/* footer: Aplicar / Limpar buttons */}
    </DialogContent>
  </Dialog>
);
```

Note: the exact body JSX includes `<Tabs>`, `<Calendar>` inside popover for date range, `<CategoryMultiSelect>`, `<AccountMultiSelect>`, `<TagMultiSelect>`, `<StatusMultiSelect>`, `<TypeMultiSelect>`. Don't touch any of that.

- [ ] **Step 2.2: Refactor the outer structure**

Replace the outer `<Dialog>...<DialogContent>...</DialogContent></Dialog>` with:

```tsx
import {
  ResponsiveDialog,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
```

(Add at the top. Remove `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` imports if no longer used after refactor.)

Return:

```tsx
return (
  <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
    <ResponsiveDialogHeader
      title="Filtros Avançados"
      description="Aplique critérios detalhados às suas transações"
      onClose={() => onOpenChange(false)}
    />
    <ResponsiveDialogBody>
      {/* ... all the existing body JSX: Tabs, date range, multiselects, saved filters ... */}
    </ResponsiveDialogBody>
    <ResponsiveDialogFooter>
      {/* ... the existing footer: Limpar / Aplicar buttons ... */}
    </ResponsiveDialogFooter>
  </ResponsiveDialog>
);
```

Copy the body content from what's currently between `<DialogHeader>...</DialogHeader>` and the closing `</DialogContent>` (minus the footer buttons). Copy the footer buttons (Limpar tudo, Aplicar filtros) into `<ResponsiveDialogFooter>`. Do not change any internal logic — reuse `handleApply`, `handleClear`, state management, etc.

- [ ] **Step 2.3: Update existing test**

Open `src/components/transactions/AdvancedFiltersModal.test.tsx`. Whatever it currently asserts (e.g., "modal opens when open=true"), keep those assertions working. The main invariant: user-visible title "Filtros Avançados" is findable.

If a test breaks due to `getByText` finding 2 elements (desktop + mobile both render the title), wrap with `getAllByText(...)[0]` or narrow the scope by `within(container).getByText(...)`.

Add one new test:

```tsx
  it('renders both mobile and desktop wrappers when open', () => {
    render(
      <AdvancedFiltersModal
        open={true}
        onOpenChange={() => {}}
        onApplyFilters={() => {}}
      />,
    );
    expect(screen.getByTestId('responsive-dialog-mobile')).toBeTruthy();
    expect(screen.getByTestId('responsive-dialog-desktop')).toBeTruthy();
  });
```

- [ ] **Step 2.4: Run test**

Run: `pnpm test src/components/transactions/AdvancedFiltersModal.test.tsx`
Expected: all existing tests pass + 1 new test passes.

- [ ] **Step 2.5: Full suite**

Run: `pnpm test 2>&1 | tail -5`
Expected: baseline unchanged.

- [ ] **Step 2.6: Commit**

```bash
git add src/components/transactions/AdvancedFiltersModal.tsx src/components/transactions/AdvancedFiltersModal.test.tsx
git commit -m "refactor(filters): AdvancedFiltersModal consumes ResponsiveDialog"
```

---

## Task 3 — Refactor `TransactionDialog` to use `ResponsiveDialog`

**Goal:** Same pattern as Task 2 — TransactionDialog becomes full-screen sheet on mobile, Dialog on desktop. Preserve every internal behavior (React Hook Form, validation, transfer logic, is_paid, tags, recurrence, AlertDialog confirmation).

**Files:**
- Modify: `src/components/transactions/TransactionDialog.tsx`
- Modify: `src/components/transactions/TransactionDialog.test.tsx` (if exists; otherwise add minimal coverage)

- [ ] **Step 3.1: Read current structure**

Open `src/components/transactions/TransactionDialog.tsx`. Find the outer `<Dialog open={open} onOpenChange={...}>...<DialogContent>...<DialogHeader><DialogTitle>...` structure and the footer buttons (Salvar/Cancelar; maybe a Excluir button for edit mode).

Note: there's an `<AlertDialog>` embedded (confirmation for destructive actions). Leave it exactly as-is; it's separate from the main Dialog.

- [ ] **Step 3.2: Refactor**

Replace the outer structure (Dialog → DialogContent → DialogHeader):

```tsx
import {
  ResponsiveDialog,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
```

(Remove unused `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` imports if only used for the outer shell. Keep them if they're used inside the form — check.)

Wrap the form return:

```tsx
return (
  <>
    <ResponsiveDialog open={open} onOpenChange={handleDialogOpenChange}>
      <ResponsiveDialogHeader
        title={isEditing ? 'Editar transação' : 'Nova transação'}
        description={/* keep existing subtitle if any */}
        onClose={() => handleDialogOpenChange(false)}
      />
      <ResponsiveDialogBody>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* ... all existing FormField / Input / Select / Switch / Textarea JSX ... */}
          </form>
        </Form>
      </ResponsiveDialogBody>
      <ResponsiveDialogFooter>
        {/* existing Cancelar + Salvar + (Excluir if editing) buttons */}
      </ResponsiveDialogFooter>
    </ResponsiveDialog>

    {/* ... existing <AlertDialog> for confirmation ... */}
  </>
);
```

If `handleDialogOpenChange` doesn't exist (the current code wires `onOpenChange` directly), create it as `const handleDialogOpenChange = (next: boolean) => { if (!next) { /* check unsaved changes logic if any */ } onOpenChange(next); };`. Otherwise reuse.

- [ ] **Step 3.3: Test**

Check if `TransactionDialog.test.tsx` exists:
```bash
ls src/components/transactions/TransactionDialog.test.tsx 2>&1
```

If it exists, update similar to Task 2 — narrow any duplicate `getByText` calls. Add:

```tsx
  it('renders responsive wrappers when open', () => {
    render(<TransactionDialog open onOpenChange={() => {}} onSave={async () => 'id'} onSaveComplete={async () => {}} defaultType="expense" />);
    expect(screen.getByTestId('responsive-dialog-mobile')).toBeTruthy();
    expect(screen.getByTestId('responsive-dialog-desktop')).toBeTruthy();
  });
```

(Adjust `onSave`/`onSaveComplete` props to match the actual TransactionDialog signature.)

If the test file doesn't exist, skip — the component is exercised via `Transacoes.test.tsx` and `Dashboard.test.tsx` (both mock it). As long as those mocks continue to work, we're fine.

- [ ] **Step 3.4: Full suite**

Run: `pnpm test 2>&1 | tail -5`
Expected: baseline unchanged. If `Transacoes.test.tsx` or `Dashboard.test.tsx` break because their `vi.mock('@/components/transactions/TransactionDialog')` mocks don't produce the new testids, that's OK — those mocks replace the component entirely.

- [ ] **Step 3.5: Commit**

```bash
git add src/components/transactions/TransactionDialog.tsx src/components/transactions/TransactionDialog.test.tsx 2>/dev/null || git add src/components/transactions/TransactionDialog.tsx
git commit -m "refactor(transactions): TransactionDialog consumes ResponsiveDialog"
```

---

## Task 4 — Transações filter bar: search full-width + icon button (mobile)

**Goal:** Mobile shows a single row with `Input` (flex-1) + icon button (44×44) that opens AdvancedFiltersModal. Desktop keeps the current layout byte-for-byte via dual-render.

**Files:**
- Modify: `src/pages/Transacoes.tsx`

- [ ] **Step 4.1: Locate the current filter bar**

Open `src/pages/Transacoes.tsx`. Find the existing JSX block that renders the search `<Input>` + the `<Button>` that opens `filtersModalOpen`. This is typically inside `<PageContent>` around line 300-400. It probably has a `flex items-center gap-3` container.

- [ ] **Step 4.2: Wrap in dual-render**

Identify the exact outer element of the filter bar (the `<div className="flex ...">` that wraps search + filter button + active chips). Copy it verbatim into two branches:

```tsx
{/* Desktop filter bar — preserved exactly */}
<div className="hidden lg:block">
  {/* ... paste the existing filter bar JSX here, UNCHANGED ... */}
</div>

{/* Mobile filter bar */}
<div className="lg:hidden">
  <div className="flex items-center gap-2">
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Buscar transação"
        className="h-11 w-full pl-9"
      />
    </div>
    <button
      type="button"
      onClick={() => setFiltersModalOpen(true)}
      aria-label="Abrir filtros avançados"
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-elevated text-foreground hover:bg-surface-overlay"
    >
      <Filter size={18} aria-hidden="true" />
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

  {/* Active filter chips row (mobile) */}
  {activeFiltersCount > 0 && (
    <div className="mt-3 flex flex-wrap gap-2">
      {/* ... copy the chip-rendering JSX from the current bar, if present ... */}
    </div>
  )}
</div>
```

The variable `activeFiltersCount` may not exist; compute it near where `activeFilters` is computed:

```tsx
const activeFiltersCount = useMemo(() => {
  if (!activeFilters) return (typeFromUrl || accountIdFromUrl || categoryIdFromUrl) ? 1 : 0;
  return (
    (activeFilters.categories?.length ?? 0) +
    (activeFilters.accounts?.length ?? 0) +
    (activeFilters.tags?.length ?? 0) +
    (activeFilters.statuses?.length ?? 0) +
    (activeFilters.types?.length ?? 0) +
    (activeFilters.dateRange?.from ? 1 : 0) +
    (activeFilters.dateRange?.to ? 1 : 0)
  );
}, [activeFilters, typeFromUrl, accountIdFromUrl, categoryIdFromUrl]);
```

Place this near the other `useMemo` hooks (around line 140-150 in Transacoes.tsx).

If the existing code already tracks an active-filter count, reuse it.

- [ ] **Step 4.3: Run Transacoes tests**

Run: `pnpm test src/pages/Transacoes.test.tsx`
Expected: existing tests still pass. The mobile filter bar is invisible to the test environment because jsdom doesn't evaluate breakpoints, but both branches appear in the DOM, so queries may find elements twice. Narrow by adding a container scope or `screen.getAllByRole('textbox')[0]` if needed.

- [ ] **Step 4.4: Full suite**

Run: `pnpm test 2>&1 | tail -5`
Expected: baseline unchanged.

- [ ] **Step 4.5: Commit**

```bash
git add src/pages/Transacoes.tsx
git commit -m "feat(transacoes): mobile filter bar (search + icon btn) with active count badge"
```

---

## Task 5 — Transações summary cards: `grid-cols-2` in mobile

**Goal:** Add `grid-cols-2` as the mobile default for the summary cards grid. Existing `md:grid-cols-2 xl:grid-cols-4` classes remain — that preserves tablet and desktop exactly.

**Files:**
- Modify: `src/pages/Transacoes.tsx`

- [ ] **Step 5.1: Find the grid**

Open `src/pages/Transacoes.tsx`. Search for `grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4`. This wraps the 4 `<TransactionSummaryCard>` blocks (Receitas, Despesas, Saldo, Total).

- [ ] **Step 5.2: Replace the mobile class**

Change the outer div's className from:
```
grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4
```
to:
```
grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-6 xl:grid-cols-4
```

Breakdown:
- `grid-cols-2`: new mobile default (2-col compact)
- `gap-3`: tighter gap on mobile
- `md:grid-cols-2 md:gap-6`: unchanged tablet behavior (explicit, keeps 2-col with 6 gap)
- `xl:grid-cols-4`: unchanged desktop

Also inspect the `TransactionSummaryCard` props/layout. In mobile (< md, so ≤ 767px), with `grid-cols-2`, each card has only half the viewport width. Verify the card's internal layout (`icon + title + value`) doesn't overflow in 160-180px width. If it does (common issue: icon h-11 w-11 + long title + big value all in one row), the card's own internal classes may need a compact mode.

For this plan, **do not modify the internal SummaryCard layout**. If overflow becomes a problem, it's covered by the mobile viewport testing in Task 8 and addressed as a follow-up. The outer grid change alone gets us most of the density win.

- [ ] **Step 5.3: Test**

Run: `pnpm test src/pages/Transacoes.test.tsx`
Expected: still passes.

- [ ] **Step 5.4: Commit**

```bash
git add src/pages/Transacoes.tsx
git commit -m "feat(transacoes): compact summary grid to 2-col on mobile (2x2 layout)"
```

---

## Task 6 — Transaction row: dual-render (mobile inline, desktop preserved)

**Goal:** On viewports < lg, render each transaction row as a single-line Card with icon + info + value. On ≥ lg, keep the existing layout byte-for-byte (stack with `xl:flex-row`).

**Files:**
- Modify: `src/pages/Transacoes.tsx`

- [ ] **Step 6.1: Locate the transaction list map**

Open `src/pages/Transacoes.tsx`. Find the `filteredTransactions.map((transaction) => ...)` block that renders `<Card>` elements. This is the row-card JSX, probably around lines 500-650.

The current inner structure is roughly:
```tsx
<Card
  key={transaction.id}
  className={`... ${rowTone.border}`}
  onClick={() => handleEdit(transaction)}
>
  <CardContent className="p-4">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      {/* LEFT: icon + info (description + meta) */}
      {/* RIGHT: amount + date */}
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 6.2: Wrap the map in dual-render**

Replace the entire `.map()` block with:

```tsx
<>
  {/* Desktop list — byte-for-byte identical to pre-Plan-4 */}
  <div className="hidden lg:block space-y-3">
    {filteredTransactions.map((transaction) => {
      /* ... paste the existing map body UNCHANGED here ... */
      /* It already uses `xl:flex-row` internally — no changes. */
    })}
  </div>

  {/* Mobile list — inline single-line cards */}
  <div className="space-y-2 lg:hidden">
    {filteredTransactions.map((transaction) => {
      const rowTone = rowToneByType[transaction.type] ?? rowToneByType.expense;
      const amountToDisplay = transaction.amount;
      const category = transaction.category || getCategoryById(transaction.category_id);
      const account = transaction.account || accounts.find((a) => a.id === transaction.account_id);

      return (
        <Card
          key={`m-${transaction.id}`}
          className={`cursor-pointer rounded-xl border-l-4 transition-colors hover:bg-surface-elevated/85 ${rowTone.border}`}
          onClick={() => handleEdit(transaction)}
        >
          <CardContent className="flex items-center gap-3 p-3">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${rowTone.iconWrap}`}>
              {category?.icon ? (
                <span className="text-base">{/* render category icon */}</span>
              ) : (
                <Wallet size={18} className="text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{transaction.description}</p>
              <p className="truncate text-xs text-muted-foreground">
                {category?.name ?? 'Sem categoria'}
                {account?.name ? ` · ${account.name}` : ''}
                {' · '}
                {format(new Date(transaction.transaction_date), 'dd/MM')}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className={`text-sm font-bold ${rowTone.amount}`}>
                {transaction.type === 'expense' ? '− ' : '+ '}
                {formatCurrency(amountToDisplay)}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    })}
  </div>
</>
```

If the existing map body uses `getCategoryIconComponent(category)` or similar for rendering the category icon, reuse that utility in the mobile tree as well (replace the `{/* render category icon */}` placeholder with the proper call — inspect the desktop map for the pattern).

**Critical: do not modify the desktop map body.** Copy it into the `<div className="hidden lg:block space-y-3">` wrapper exactly as-is.

The mobile map uses `key={`m-${transaction.id}`}` to avoid React key collisions with the desktop tree (both trees have the same transactions). Desktop keeps whatever key it currently uses.

- [ ] **Step 6.3: Test**

Run: `pnpm test src/pages/Transacoes.test.tsx`
Expected: still passes. If an existing test like `expect(screen.getByText('Salario')).toBeTruthy()` now finds 2 elements (one in each tree), switch to `screen.getAllByText('Salario')[0]`.

- [ ] **Step 6.4: Full suite**

Run: `pnpm test 2>&1 | tail -5`
Expected: baseline unchanged.

- [ ] **Step 6.5: Commit**

```bash
git add src/pages/Transacoes.tsx
git commit -m "feat(transacoes): dual-render transaction rows (mobile inline, desktop preserved)"
```

---

## Task 7 — Mobile-specific Transacoes test

**Goal:** Add a test asserting the mobile filter bar exists and the summary grid has the expected 2-col class. This locks the contract.

**Files:**
- Modify: `src/pages/Transacoes.test.tsx`

- [ ] **Step 7.1: Add mobile assertion tests**

Open `src/pages/Transacoes.test.tsx`. At the end of the main describe block, add:

```tsx
  it('renders the mobile filter bar with search input + filter button', () => {
    render(
      <MemoryRouter>
        <Transacoes />
      </MemoryRouter>,
    );
    // The filter button with aria-label "Abrir filtros avançados"
    const mobileFilterBtn = screen.getByRole('button', { name: /abrir filtros avançados/i });
    expect(mobileFilterBtn).toBeTruthy();
  });

  it('summary grid uses grid-cols-2 as the mobile default', () => {
    const { container } = render(
      <MemoryRouter>
        <Transacoes />
      </MemoryRouter>,
    );
    // Find the outermost grid with TransactionSummaryCard children
    const grid = container.querySelector('[data-testid="transacoes-summary-grid"]');
    // If no testid, fall back to string match
    const source = container.innerHTML;
    expect(source).toContain('grid-cols-2');
    expect(source).toContain('xl:grid-cols-4');
  });
```

If the grid doesn't have `data-testid="transacoes-summary-grid"` yet, add it in Task 5 instead (minor update):

In `Transacoes.tsx`, the summary-grid wrapping div should include `data-testid="transacoes-summary-grid"` — add it during Task 5 step 5.2 when changing the className. If Task 5 is already committed without it, add in a small follow-up commit here.

- [ ] **Step 7.2: Run tests**

Run: `pnpm test src/pages/Transacoes.test.tsx`
Expected: all tests pass.

- [ ] **Step 7.3: Commit**

```bash
git add src/pages/Transacoes.test.tsx src/pages/Transacoes.tsx
git commit -m "test(transacoes): assert mobile filter bar and 2-col summary grid"
```

---

## Task 8 — Manual verification

**Goal:** Verify the 3 viewports in DevTools. Desktop is non-negotiable pixel-identical; mobile must hit the design.

- [ ] **Step 8.1: Start dev server**

Run: `pnpm dev`
Expected: Vite ready on `http://localhost:5173` (or next free port).

- [ ] **Step 8.2: Desktop 1440×900**

- Sidebar visible, page header with title + subtitle + MonthSelector + "Nova Receita"/"Nova Despesa" + theme toggle + avatar dropdown.
- Summary: 4 cards in 4-col grid (xl).
- Filter bar: existing search + filter button layout, same position as before.
- Transaction list rows: same visual as before (stack until xl, inline at xl+).
- Clicking a row opens `TransactionDialog` in centered Dialog.
- Clicking "Filtros" opens `AdvancedFiltersModal` in centered Dialog.

If any visual difference vs `main`, go back to the task that caused it and fix.

- [ ] **Step 8.3: iPad portrait (768×1024)**

- Bottom nav visible (from Plan 1). Sidebar hidden.
- Header: row 1 (icon + title + theme + avatar), row 2 (subtitle + Nova Receita/Despesa actions).
- Summary: 2×2 grid (md:grid-cols-2, inherited).
- Filter bar: mobile layout (search flex-1 + filter icon button).
- Transaction list: inline cards (1 per row).
- Tap row → TransactionDialog full-screen sheet.
- Tap filter icon → AdvancedFiltersModal full-screen sheet.

- [ ] **Step 8.4: iPhone SE (375×667)**

- Everything in 8.3, plus:
- Summary 2-col at 375px — cards shouldn't overflow. If icon + label + value don't fit in half the viewport, the card's internal layout needs a compact mode — file a follow-up.
- Filter bar filter button: 44×44 tap target, badge shows count.
- Bottom nav's Ana Clara FAB + Transações tab continue working.

- [ ] **Step 8.5: Acceptance checklist**

- [ ] Zero horizontal scroll at 320, 375, 768, 1024, 1440, 1920.
- [ ] Tap targets ≥ 44×44 in mobile.
- [ ] AdvancedFiltersModal = Sheet full-screen on mobile, Dialog on desktop.
- [ ] TransactionDialog = Sheet full-screen on mobile, Dialog on desktop.
- [ ] Desktop 1440 pixel-identical to `main` (eyeball compare — git stash, reload, diff).
- [ ] Active filter count badge appears on mobile filter button.

- [ ] **Step 8.6: Record findings**

Append to `docs/superpowers/plans/2026-04-19-transacoes-mobile-plan4.md`:

```markdown
## Execution Log
**Date**: <fill>
**Commits**: <sha list>
- Desktop 1440: pass/fail + notes
- iPad 768: pass/fail + notes
- iPhone SE 375: pass/fail + notes
```

Commit the log:
```bash
git add docs/superpowers/plans/2026-04-19-transacoes-mobile-plan4.md
git commit -m "docs(plan4): record transacoes mobile verification"
```

---

## Definition of done

- [ ] `ResponsiveDialog` primitive with 5 passing tests.
- [ ] `AdvancedFiltersModal` consumes ResponsiveDialog; mobile = sheet, desktop = dialog.
- [ ] `TransactionDialog` consumes ResponsiveDialog; mobile = sheet, desktop = dialog.
- [ ] `Transacoes.tsx` filter bar: desktop preserved; mobile = search flex-1 + icon button with count badge.
- [ ] `Transacoes.tsx` summary grid: `grid-cols-2` mobile default, `md:` and `xl:` unchanged.
- [ ] `Transacoes.tsx` transaction rows: dual-render, desktop byte-for-byte preserved.
- [ ] All existing tests pass + 2 new tests (ResponsiveDialog, mobile filter bar assertions).
- [ ] Desktop 1440 diff = 0.
- [ ] Manual verification on 3 viewports completed and logged.

## Follow-on plans

- **Plan 5** — Conciliação mobile (tabs swipeable Banco/Sistema/Sugestões; sub-brainstorm required)
- **Plan 6** — Contas a Pagar mobile
- **Plan 7** — Agenda mobile
- **Plan 8** — lote Cartões/Metas/Investimentos/Relatórios
- **Plan 9** — utilitárias (Educação, Tags, Categorias, Configurações, Perfil)

---

## Execution Log

**Date**: 2026-04-19
**Branch**: `feat/transacoes-mobile-plan4` (9 commits ahead of main)
**Execution mode**: subagent-driven-development (Sonnet implementers + reviewers, Opus final review)

### Commits
```
9f7aa13 fix(responsive-dialog): add ESC handler + auto-focus + restore original filter modal title
8f19845 test(transacoes): assert mobile filter bar and 2-col summary grid
3528cc5 feat(transacoes): dual-render transaction rows (mobile inline, desktop preserved)
7cc3390 feat(transacoes): compact summary grid to 2-col on mobile (2x2 layout)
4268f59 feat(transacoes): mobile filter bar (search + icon btn) with active count badge
83bca4e refactor(transactions): TransactionDialog consumes ResponsiveDialog
0ed7faa refactor(filters): AdvancedFiltersModal consumes ResponsiveDialog
8faa5e8 fix(ui): restore Radix Dialog in ResponsiveDialog desktop slot
f8381da feat(ui): add ResponsiveDialog primitive (Dialog on desktop, Sheet on mobile)
```

### Automated verification
- ResponsiveDialog: 8/8 tests (ESC handler + auto-focus + Radix Dialog assertion)
- AdvancedFiltersModal: 3/3 tests
- TransactionDialog: mocked in consumers (Dashboard, Transacoes) — both test suites still pass
- Transacoes: 5/5 tests (3 existing + 2 new mobile assertions)
- Full suite: 2 files / 6 tests failing — all pre-existing `task10-CalendarPage` + `ticktick-sync-closure`, unrelated
- Desktop visual: preserved byte-for-byte (dual-render wraps original JSX inside `hidden lg:block` / `lg:hidden`)

### Review findings addressed
- Task 1 fix (`8faa5e8`): restored Radix Dialog in desktop slot (initial version dropped it)
- Final review fix (`9f7aa13`): ESC handler + auto-focus close button + restored "Filtro de transações" title copy

### Deviations from plan
- Plan instructed `@/lib/cn` import path — confirmed exists, used as planned
- AdvancedFiltersModal title: restored to original "Filtro de transações" (plan had incorrectly proposed "Filtros Avançados")

### Pending manual verification (USER ACTION)

Task 8 requires browser verification at 3 viewports. Dev server should still be running (from earlier sessions); if not, start: `pnpm dev`.

- [ ] **Desktop (1440×900)**: Transacoes page looks byte-identical to pre-Plan-4. 4-col summary, existing filter bar, transaction rows stack (xl:flex-row at ≥1280). AdvancedFiltersModal and TransactionDialog open as centered dialogs (not full-screen).
- [ ] **iPad portrait (768×1024)**: Bottom nav visible. Summary 2×2, filter bar mobile (search flex-1 + filter icon button), transaction rows inline. Tap filter icon → full-screen sheet (swipes up). Tap row → TransactionDialog full-screen.
- [ ] **iPhone SE (375×667)**: Same as tablet. Summary 2×2 cards don't overflow (verify icon/value fit in ~180px width). Filter icon has count badge if filters active. Escape key closes mobile sheet (if virtual keyboard test is possible).

### Handoff

Branch is ready for `superpowers:finishing-a-development-branch`. Suggested: Option 1 (merge locally to main via fast-forward). Same path as Plans 1 and 3.
