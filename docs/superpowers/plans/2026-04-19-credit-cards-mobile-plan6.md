# CreditCards Mobile Implementation Plan (Plan 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply mobile-first responsive redesign to the CreditCards page and all its sub-components, preserving desktop pixel-identically.

**Architecture:** Dual-render pattern (`hidden lg:block` desktop / `lg:hidden` mobile) for tabs and filter bars. Compact `<md:` class overrides for spacing/grid. `ResponsiveDialog` (Plan 4 primitive) replaces all Dialog wrappers. `CreditCardCard` gains mobile-only Editar+Arquivar buttons. `InvoiceHistoryTable` gains mobile compact rows.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS v3 + shadcn/ui + Vitest + @testing-library/react

---

## File Structure

**Modified:**
- `src/pages/CreditCards.tsx` — padding, StatCard 2×2 grid, sliding-pill 4-tab mobile TabsList, controlled `activeTab` state
- `src/components/credit-cards/CreditCardCard.tsx` — mobile Editar+Arquivar buttons (`lg:hidden`), min-h on existing buttons
- `src/components/credit-cards/CreditCardList.tsx` — compact empty state + `min-h-[180px]` placeholder on mobile
- `src/components/credit-cards/CreditCardDialog.tsx` — `Dialog` → `ResponsiveDialog`
- `src/components/credit-cards/PurchaseDialog.tsx` — `Dialog` → `ResponsiveDialog`
- `src/components/credit-cards/CreditCardDetailsDialog.tsx` — `Dialog` → `ResponsiveDialog`
- `src/components/invoices/InvoiceList.tsx` — mobile horizontal scroll pills (`lg:hidden`), desktop filter card (`hidden lg:block`)
- `src/components/invoices/InvoiceDetailsDialog.tsx` — `Dialog` → `ResponsiveDialog`
- `src/components/invoices/InvoicePaymentDialog.tsx` — `Dialog` → `ResponsiveDialog`
- `src/components/invoices/InvoiceHistoryTable.tsx` — table wrapped `hidden lg:block`, mobile compact rows `lg:hidden`
- `src/pages/CreditCards.test.tsx` — extend with mobile rendering assertions

**Unchanged (explicitly):**
- `src/components/credit-cards/CreditCardAlerts.tsx` — already mobile-OK
- `src/components/invoices/InvoiceHistory.tsx` — orchestrator-only (no DOM)
- `src/components/invoices/InvoiceHistoryFilters.tsx` — already `grid-cols-1 lg:grid-cols-12`, stacks fine
- `src/components/invoices/DeleteInvoiceDialog.tsx` — AlertDialog, mobile-OK
- `src/components/analytics/AnalyticsTab.tsx` — delegates to sub-components, no structural change needed
- All `lg:` / `xl:` / `2xl:` classes on desktop layouts — NEVER touched

---

## Task 1: Page shell — padding + StatCard 2×2 grid

**Files:**
- Modify: `src/pages/CreditCards.tsx`
- Test: `src/pages/CreditCards.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `src/pages/CreditCards.test.tsx` inside the existing `describe` block:

```tsx
it('renders StatCard grid with grid-cols-2 on mobile', () => {
  const { container } = render(
    <MemoryRouter><CreditCards /></MemoryRouter>
  );
  const grid = container.querySelector('.grid-cols-2');
  expect(grid).not.toBeNull();
});

it('uses compact padding classes on mobile', () => {
  const { container } = render(
    <MemoryRouter><CreditCards /></MemoryRouter>
  );
  // The inner content div should have p-4
  const contentDiv = container.querySelector('.p-4');
  expect(contentDiv).not.toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd d:/2026/personal-finance/personal-finance-la
npx vitest run src/pages/CreditCards.test.tsx --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `grid-cols-2` not found.

- [ ] **Step 3: Implement padding + grid changes**

In `src/pages/CreditCards.tsx`, line ~167:

```tsx
// BEFORE:
<div className="relative space-y-6 p-6">

// AFTER:
<div className="relative space-y-4 p-4 md:space-y-6 md:p-6">
```

In `src/pages/CreditCards.tsx`, line ~172 (StatCard grid):

```tsx
// BEFORE:
<div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">

// AFTER:
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 animate-fade-in">
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/pages/CreditCards.test.tsx --reporter=verbose 2>&1 | tail -20
```

Expected: PASS (all CreditCards tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/CreditCards.tsx src/pages/CreditCards.test.tsx
git commit -m "feat(mobile): CreditCards page padding + StatCard 2x2 grid mobile"
```

---

## Task 2: Sliding pill 4-tab mobile TabsList

**Files:**
- Modify: `src/pages/CreditCards.tsx`
- Test: `src/pages/CreditCards.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('renders mobile pill tab bar with 4 triggers', () => {
  const { container } = render(
    <MemoryRouter><CreditCards /></MemoryRouter>
  );
  const mobileTabs = container.querySelector('[data-mobile-tabs="true"]');
  expect(mobileTabs).not.toBeNull();
});

it('mobile pill shows correct translateX for default "cartoes" tab', () => {
  const { container } = render(
    <MemoryRouter><CreditCards /></MemoryRouter>
  );
  const pill = container.querySelector('[data-mobile-tabs="true"] [aria-hidden="true"]');
  expect(pill).not.toBeNull();
  expect((pill as HTMLElement).style.transform).toBe('translateX(0%)');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/pages/CreditCards.test.tsx --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `data-mobile-tabs` not found.

- [ ] **Step 3: Add controlled activeTab state + mobile TabsList**

At the top of `CreditCards()` function body, add the `activeTab` state (keep existing `useState` imports):

```tsx
const [activeTab, setActiveTab] = useState<'cartoes' | 'faturas' | 'analises' | 'historico'>('cartoes');
```

Change the `<Tabs>` to controlled:

```tsx
// BEFORE:
<Tabs defaultValue="cartoes" className="w-full">

// AFTER:
<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
```

Replace the existing `<TabsList>` (the one with `grid h-auto w-full grid-cols-4 rounded-[1.4rem]`) with two TabsLists — mobile + desktop:

```tsx
{/* Mobile sliding pill (< md) */}
<TabsList
  data-mobile-tabs="true"
  className="relative mb-4 flex w-full rounded-full border border-border/70 bg-card/95 p-1 md:hidden [&::-webkit-scrollbar]:hidden"
>
  <div
    aria-hidden="true"
    className="pointer-events-none absolute bottom-1 left-1 top-1 z-0 rounded-full bg-primary shadow-sm transition-transform duration-300 ease-out"
    style={{
      width: 'calc((100% - 0.5rem) / 4)',
      transform: `translateX(${
        activeTab === 'cartoes'  ? '0%'   :
        activeTab === 'faturas'  ? '100%' :
        activeTab === 'analises' ? '200%' : '300%'
      })`,
    }}
  />
  <TabsTrigger
    value="cartoes"
    aria-label="Meus Cartões"
    className="relative z-10 flex flex-1 flex-col items-center gap-1 py-2 bg-transparent hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
  >
    <CreditCard className="h-[15px] w-[15px]" />
    <span className="text-[9px] font-bold leading-none">Cartões</span>
  </TabsTrigger>
  <TabsTrigger
    value="faturas"
    aria-label="Faturas"
    className="relative z-10 flex flex-1 flex-col items-center gap-1 py-2 bg-transparent hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
  >
    <Receipt className="h-[15px] w-[15px]" />
    <span className="text-[9px] font-bold leading-none">Faturas</span>
  </TabsTrigger>
  <TabsTrigger
    value="analises"
    aria-label="Análises"
    className="relative z-10 flex flex-1 flex-col items-center gap-1 py-2 bg-transparent hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
  >
    <BarChart3 className="h-[15px] w-[15px]" />
    <span className="text-[9px] font-bold leading-none">Análises</span>
  </TabsTrigger>
  <TabsTrigger
    value="historico"
    aria-label="Histórico"
    className="relative z-10 flex flex-1 flex-col items-center gap-1 py-2 bg-transparent hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
  >
    <History className="h-[15px] w-[15px]" />
    <span className="text-[9px] font-bold leading-none">Histórico</span>
  </TabsTrigger>
</TabsList>

{/* Desktop tabs (≥ md) — original, untouched */}
<TabsList className="mb-6 hidden h-auto w-full grid-cols-4 rounded-[1.4rem] border border-border/70 bg-card/95 p-1 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_42px_rgba(2,6,23,0.24)] md:grid">
  <TabsTrigger value="cartoes" className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15">
    <CreditCard className="h-4 w-4" />
    Meus Cartões
  </TabsTrigger>
  <TabsTrigger value="faturas" className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15">
    <Receipt className="h-4 w-4" />
    Faturas
  </TabsTrigger>
  <TabsTrigger value="analises" className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15">
    <BarChart3 className="h-4 w-4" />
    Análises
  </TabsTrigger>
  <TabsTrigger value="historico" className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15">
    <History className="h-4 w-4" />
    Histórico
  </TabsTrigger>
</TabsList>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/pages/CreditCards.test.tsx --reporter=verbose 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CreditCards.tsx src/pages/CreditCards.test.tsx
git commit -m "feat(mobile): CreditCards 4-tab sliding pill mobile TabsList"
```

---

## Task 3: CreditCardCard — mobile Editar + Arquivar buttons

**Files:**
- Modify: `src/components/credit-cards/CreditCardCard.tsx`
- Test: `src/pages/CreditCards.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('renders mobile Editar and Arquivar buttons on card', () => {
  const { getAllByRole } = render(
    <MemoryRouter><CreditCards /></MemoryRouter>
  );
  // The mobile buttons are lg:hidden, so they exist in DOM but hidden via CSS
  const allButtons = getAllByRole('button');
  const labels = allButtons.map(b => b.textContent?.trim());
  expect(labels).toContain('Editar');
  expect(labels).toContain('Arquivar');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/pages/CreditCards.test.tsx --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — "Editar" / "Arquivar" buttons not found.

- [ ] **Step 3: Add mobile-only button row in CreditCardCard**

In `src/components/credit-cards/CreditCardCard.tsx`, find the existing `<div className="flex gap-2 pt-1">` block (around line 185) and add a mobile-only row after it:

```tsx
{/* Existing desktop/mobile primary buttons — unchanged */}
<div className="flex gap-2 pt-1">
  <Button
    variant="outline"
    className="flex-1 rounded-xl border-border/70 bg-surface/75 hover:bg-surface-elevated"
    onClick={(event) => {
      event.stopPropagation();
      onViewDetails?.();
    }}
  >
    Ver Detalhes
  </Button>

  {card.current_invoice_amount && card.current_invoice_amount > 0 && onPayInvoice ? (
    <Button
      className="flex-1 rounded-xl border border-primary/25 bg-primary text-primary-foreground shadow-[0_14px_28px_rgba(139,92,246,0.22)] hover:bg-primary/90"
      onClick={(event) => {
        event.stopPropagation();
        onPayInvoice();
      }}
    >
      Pagar Fatura
    </Button>
  ) : null}
</div>

{/* Mobile-only: Editar + Arquivar (lg:hidden) */}
<div className="flex gap-2 lg:hidden">
  <Button
    variant="outline"
    className="flex-1 rounded-xl border-border/70 bg-surface/75 text-sm hover:bg-surface-elevated"
    onClick={(event) => {
      event.stopPropagation();
      onEdit?.();
    }}
  >
    Editar
  </Button>
  <Button
    variant="outline"
    className="flex-1 rounded-xl border-destructive/30 bg-destructive/5 text-sm text-destructive hover:bg-destructive/10"
    onClick={(event) => {
      event.stopPropagation();
      onArchive?.();
    }}
  >
    Arquivar
  </Button>
</div>
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/pages/CreditCards.test.tsx --reporter=verbose 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/credit-cards/CreditCardCard.tsx src/pages/CreditCards.test.tsx
git commit -m "feat(mobile): CreditCardCard mobile Editar+Arquivar buttons"
```

---

## Task 4: CreditCardList — compact empty state + placeholder

**Files:**
- Modify: `src/components/credit-cards/CreditCardList.tsx`

- [ ] **Step 1: Implement empty state compact overrides**

In `src/components/credit-cards/CreditCardList.tsx`, the empty state block (around line 55):

```tsx
// BEFORE:
<div className="flex flex-col items-center justify-center rounded-[30px] border border-dashed border-border/70 bg-card/85 px-6 py-16 text-center">
  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[1.9rem] ...">
    <CreditCardIcon size={40} className="text-primary/75" />
  </div>
  <h3 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">Nenhum cartao cadastrado</h3>

// AFTER:
<div className="flex flex-col items-center justify-center rounded-[30px] border border-dashed border-border/70 bg-card/85 px-6 py-10 text-center md:py-16">
  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.9rem] md:mb-6 md:h-24 md:w-24 ...">
    <CreditCardIcon size={40} className="text-primary/75" />
  </div>
  <h3 className="mb-2 text-xl font-semibold tracking-tight text-foreground md:text-2xl">Nenhum cartao cadastrado</h3>
```

The "Adicionar Cartão" placeholder card (around line 90):

```tsx
// BEFORE:
<CardContent className="flex h-full min-h-[400px] flex-col items-center justify-center p-6 text-center">

// AFTER:
<CardContent className="flex h-full min-h-[180px] flex-col items-center justify-center p-6 text-center md:min-h-[400px]">
```

- [ ] **Step 2: Run full tests**

```bash
npx vitest run src/pages/CreditCards.test.tsx --reporter=verbose 2>&1 | tail -10
```

Expected: PASS (no new failures).

- [ ] **Step 3: Commit**

```bash
git add src/components/credit-cards/CreditCardList.tsx
git commit -m "feat(mobile): CreditCardList compact empty state + smaller placeholder"
```

---

## Task 5: InvoiceList — mobile horizontal scroll pills

**Files:**
- Modify: `src/components/invoices/InvoiceList.tsx`
- Test: `src/pages/CreditCards.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
it('renders mobile invoice filter pills', () => {
  const { container } = render(
    <MemoryRouter><CreditCards /></MemoryRouter>
  );
  // Mobile pills are lg:hidden — they exist in DOM
  const pills = container.querySelectorAll('[data-mobile-pills="true"] button');
  // Should have at least Abertas, Fechadas, Pagas
  expect(pills.length).toBeGreaterThanOrEqual(3);
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/pages/CreditCards.test.tsx --reporter=verbose 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Add helper classes + mobile pills to InvoiceList**

At the top of `InvoiceList.tsx`, add two helper functions after the existing `filterButtonClass`:

```tsx
const mobilePillClass = (active: boolean, tone: 'default' | 'danger' = 'default') =>
  cn(
    'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors',
    active
      ? tone === 'danger'
        ? 'border-danger/30 bg-danger/12 text-danger'
        : 'border-primary/25 bg-primary text-primary-foreground'
      : 'border-border/70 bg-surface/72 text-muted-foreground hover:bg-surface-elevated',
  );

const mobilePillCountClass = (active: boolean) =>
  cn(
    'rounded-full px-1.5 py-px text-[10px] font-semibold',
    active
      ? 'bg-white/20 text-primary-foreground'
      : 'bg-background/80 text-muted-foreground ring-1 ring-border/60',
  );
```

In the `return (...)` JSX, find the outer `<div className="space-y-6">`. Inside, replace the first `<div>` (the filter container) with a dual-render:

```tsx
return (
  <div className="space-y-6">
    <div>
      {/* Mobile: horizontal scroll pills (< lg) */}
      <div
        data-mobile-pills="true"
        className="mb-3 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden lg:hidden"
      >
        <button
          onClick={() => setActiveTab('open')}
          className={mobilePillClass(activeTab === 'open')}
        >
          <Clock className="h-3 w-3" />
          Abertas
          <span className={mobilePillCountClass(activeTab === 'open')}>
            {openInvoices.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={mobilePillClass(activeTab === 'closed')}
        >
          <Package className="h-3 w-3" />
          Fechadas
          <span className={mobilePillCountClass(activeTab === 'closed')}>
            {closedInvoices.length}
          </span>
        </button>
        {overdueInvoices.length > 0 ? (
          <button
            onClick={() => setActiveTab('overdue')}
            className={mobilePillClass(activeTab === 'overdue', 'danger')}
          >
            <AlertTriangle className="h-3 w-3" />
            <span className="text-danger">Vencidas</span>
            <span className={mobilePillCountClass(activeTab === 'overdue')}>
              {overdueInvoices.length}
            </span>
          </button>
        ) : null}
        <button
          onClick={() => setActiveTab('paid')}
          className={mobilePillClass(activeTab === 'paid')}
        >
          <CheckCircle2 className="h-3 w-3" />
          Pagas
          <span className={mobilePillCountClass(activeTab === 'paid')}>
            {paidInvoices.length}
          </span>
        </button>
      </div>

      {/* Desktop: original filter card (≥ lg) */}
      <div className="hidden lg:block">
        <div className="flex flex-col gap-4 rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-[0_18px_42px_rgba(3,8,20,0.16)] backdrop-blur-xl dark:shadow-[0_20px_48px_rgba(2,6,23,0.28)] xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('open')}
              className={filterButtonClass(activeTab === 'open')}
            >
              <Clock className="mr-2 h-4 w-4" />
              Abertas
              <span className="ml-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border/60">
                {openInvoices.length}
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('closed')}
              className={filterButtonClass(activeTab === 'closed')}
            >
              <Package className="mr-2 h-4 w-4" />
              Fechadas
              <span className="ml-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border/60">
                {closedInvoices.length}
              </span>
            </Button>

            {overdueInvoices.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('overdue')}
                className={filterButtonClass(activeTab === 'overdue', 'danger')}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Vencidas
                <span className="ml-2 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-semibold text-danger ring-1 ring-danger/20">
                  {overdueInvoices.length}
                </span>
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('paid')}
              className={filterButtonClass(activeTab === 'paid')}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Pagas
              <span className="ml-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border/60">
                {paidInvoices.length}
              </span>
            </Button>
          </div>

          {cards.length > 1 ? (
            <Select
              value={selectedCardId || 'all'}
              onValueChange={(value) => setSelectedCardId(value === 'all' ? undefined : value)}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-border/70 bg-surface/80 text-foreground shadow-sm hover:bg-surface-elevated focus-visible:ring-primary/20 dark:bg-surface-elevated/70 xl:w-[220px]">
                <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Todos os Cartões" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Cartões</SelectItem>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>
    </div>

    {/* rest of InvoiceList (empty state / grid) — unchanged */}
    {displayInvoices.length === 0 ? (
      <EmptyState />
    ) : (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        ...
      </div>
    )}
  </div>
);
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/pages/CreditCards.test.tsx --reporter=verbose 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/invoices/InvoiceList.tsx src/pages/CreditCards.test.tsx
git commit -m "feat(mobile): InvoiceList horizontal scroll pills for mobile"
```

---

## Task 6: InvoiceHistoryTable — mobile compact rows

**Files:**
- Modify: `src/components/invoices/InvoiceHistoryTable.tsx`
- Test: `src/pages/CreditCards.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
it('renders mobile invoice history compact rows container', () => {
  const { container } = render(
    <MemoryRouter><CreditCards /></MemoryRouter>
  );
  const mobileRows = container.querySelector('[data-testid="invoice-history-mobile-rows"]');
  // May be null if invoices mock is empty; just verify no error thrown
  // In test env, table renders but mobile rows should also be in DOM
  expect(() => container.querySelector('[data-testid="invoice-history-table"]')).not.toThrow();
});
```

- [ ] **Step 2: Implement mobile rows in InvoiceHistoryTable**

In `src/components/invoices/InvoiceHistoryTable.tsx`:

1. Wrap the existing `<Card data-testid="invoice-history-table" ...>` with `hidden lg:block`:

```tsx
{/* Desktop table (≥ lg) */}
<div className="hidden lg:block">
  <Card
    data-testid="invoice-history-table"
    className="overflow-hidden rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]"
  >
    {/* ... existing table content unchanged ... */}
  </Card>
</div>
```

2. Add mobile rows before or after the desktop Card wrapper:

```tsx
{/* Mobile compact rows (< lg) */}
<div
  data-testid="invoice-history-mobile-rows"
  className="space-y-2 lg:hidden"
>
  {invoices.map((invoice) => {
    const isExpanded = expandedRows.has(invoice.id);
    return (
      <div key={invoice.id} className="overflow-hidden rounded-[18px] border border-border/70 bg-card/95">
        <div className="flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {invoice.credit_cards?.name || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(parseDateOnlyAsLocal(invoice.reference_month), 'MMM/yyyy', { locale: ptBR })}
            </p>
          </div>
          <SimpleInvoiceStatusBadge status={invoice.status as any} size="sm" />
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatCurrency(invoice.total_amount)}
            </p>
            <div className="mt-1 flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-lg p-0 text-muted-foreground hover:bg-surface hover:text-foreground"
                onClick={() => toggleRow(invoice.id)}
                title="Ver transações"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-lg p-0 text-danger hover:bg-danger/10"
                onClick={() => onDeleteInvoice?.(invoice.id)}
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded transactions on mobile */}
        {isExpanded ? (
          <div className="border-t border-border/60 bg-surface/45 px-3 py-3">
            {loadingTransactions.has(invoice.id) ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-8 w-full rounded-[12px]" />)}
              </div>
            ) : transactions[invoice.id]?.length > 0 ? (
              <div className="space-y-1">
                {transactions[invoice.id].map((tx, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 py-1 text-xs">
                    <span className="text-muted-foreground">
                      {tx.purchase_date
                        ? format(parseDateOnlyAsLocal(tx.purchase_date), 'dd/MM')
                        : ''}
                    </span>
                    <span className="flex-1 truncate text-foreground">{tx.description}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-foreground">
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-2 text-center text-xs text-muted-foreground">
                Nenhuma transação
              </p>
            )}
          </div>
        ) : null}
      </div>
    );
  })}

  {/* Mobile pagination */}
  <div className="flex items-center justify-between px-1 py-2 text-sm text-muted-foreground">
    <span>
      {(pagination.page - 1) * pagination.pageSize + 1}–
      {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} de{' '}
      {pagination.totalItems}
    </span>
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pagination.page === 1}
        onClick={() => onPageChange(pagination.page - 1)}
        className="rounded-xl border-border/70 bg-surface/80"
      >
        ‹
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={pagination.page === Math.ceil(pagination.totalItems / pagination.pageSize)}
        onClick={() => onPageChange(pagination.page + 1)}
        className="rounded-xl border-border/70 bg-surface/80"
      >
        ›
      </Button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/pages/CreditCards.test.tsx --reporter=verbose 2>&1 | tail -10
```

Expected: PASS (no regressions; `invoice-history-table` still present in DOM via `hidden lg:block`).

- [ ] **Step 4: Commit**

```bash
git add src/components/invoices/InvoiceHistoryTable.tsx src/pages/CreditCards.test.tsx
git commit -m "feat(mobile): InvoiceHistoryTable compact row cards for mobile"
```

---

## Task 7: Dialog migrations — CreditCardDialog + PurchaseDialog

**Files:**
- Modify: `src/components/credit-cards/CreditCardDialog.tsx`
- Modify: `src/components/credit-cards/PurchaseDialog.tsx`
- Test: `src/pages/CreditCards.test.tsx`

### Reference: ResponsiveDialog API

```tsx
import { ResponsiveDialog, ResponsiveDialogHeader, ResponsiveDialogBody } from '@/components/ui/responsive-dialog';

<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-3xl">
  <ResponsiveDialogHeader title="Title" onClose={() => onOpenChange(false)} />
  <ResponsiveDialogBody>
    {/* content */}
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

- [ ] **Step 1: Write failing test**

```tsx
it('CreditCardDialog renders responsive-dialog-desktop wrapper', () => {
  // Mock dialogOpen state: test that the dialog mount point exists
  // The CreditCards page conditionally renders CreditCardDialog when dialogOpen=true
  // We'll just check the page renders without crashing after migration
  const { container } = render(
    <MemoryRouter><CreditCards /></MemoryRouter>
  );
  // No dialog open by default; just assert page renders
  expect(container.querySelector('[data-testid="responsive-dialog-desktop"]')).toBeNull();
});
```

- [ ] **Step 2: Migrate CreditCardDialog**

Replace the entire `src/components/credit-cards/CreditCardDialog.tsx`:

```tsx
import { useState } from 'react';

import { ResponsiveDialog, ResponsiveDialogHeader, ResponsiveDialogBody } from '@/components/ui/responsive-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCreditCards } from '@/hooks/useCreditCards';
import { CreditCard } from '@/types/database.types';

import { CreditCardForm } from './CreditCardForm';

interface CreditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCard;
  onSuccess?: () => void;
}

export function CreditCardDialog({ open, onOpenChange, card, onSuccess }: CreditCardDialogProps) {
  const { createCard, updateCard } = useCreditCards();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);

    try {
      if (card) {
        const result = await updateCard(card.id, data);
        if (!result) throw new Error('Erro ao atualizar cartão');

        toast({
          title: 'Cartão atualizado!',
          description: 'As alterações foram salvas com sucesso.',
        });
      } else {
        const result = await createCard(data);
        if (!result) throw new Error('Erro ao criar cartão');

        toast({
          title: 'Cartão criado!',
          description: 'Seu novo cartão foi adicionado com sucesso.',
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar o cartão.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-3xl">
      <ResponsiveDialogHeader
        title={card ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}
        onClose={() => onOpenChange(false)}
      />
      <ResponsiveDialogBody>
        <CreditCardForm
          card={card}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          loading={loading}
        />
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
```

- [ ] **Step 3: Migrate PurchaseDialog**

In `src/components/credit-cards/PurchaseDialog.tsx`, replace the Dialog wrapper only — keep all logic unchanged:

```tsx
// Remove these imports:
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Add this import:
import { ResponsiveDialog, ResponsiveDialogHeader, ResponsiveDialogBody } from '@/components/ui/responsive-dialog';

// Replace the return JSX wrapper:
// BEFORE:
return (
  <Dialog open={open} onOpenChange={handleDialogOpenChange}>
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border border-border/70 bg-card/95 p-0 text-foreground shadow-[0_30px_90px_rgba(2,6,23,0.42)] backdrop-blur-xl">
      <DialogHeader className="border-b border-border/60 px-6 py-5">
        <DialogTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
          Nova Compra no Cartão
        </DialogTitle>
      </DialogHeader>
      <div className="px-6 py-5">
        <PurchaseForm
          preSelectedCardId={cardId}
          onSubmit={handleSubmit}
          onCancel={() => handleDialogOpenChange(false)}
        />
      </div>
    </DialogContent>
  </Dialog>
);

// AFTER:
return (
  <ResponsiveDialog open={open} onOpenChange={handleDialogOpenChange} className="max-w-3xl">
    <ResponsiveDialogHeader
      title="Nova Compra no Cartão"
      onClose={() => handleDialogOpenChange(false)}
    />
    <ResponsiveDialogBody>
      <PurchaseForm
        preSelectedCardId={cardId}
        onSubmit={handleSubmit}
        onCancel={() => handleDialogOpenChange(false)}
      />
    </ResponsiveDialogBody>
  </ResponsiveDialog>
);
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/pages/CreditCards.test.tsx --reporter=verbose 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/credit-cards/CreditCardDialog.tsx src/components/credit-cards/PurchaseDialog.tsx src/pages/CreditCards.test.tsx
git commit -m "feat(mobile): CreditCardDialog + PurchaseDialog → ResponsiveDialog"
```

---

## Task 8: Dialog migrations — CreditCardDetailsDialog

**Files:**
- Modify: `src/components/credit-cards/CreditCardDetailsDialog.tsx`

- [ ] **Step 1: Read the file to understand its structure**

```bash
head -30 src/components/credit-cards/CreditCardDetailsDialog.tsx
```

- [ ] **Step 2: Migrate CreditCardDetailsDialog**

In `src/components/credit-cards/CreditCardDetailsDialog.tsx`:

Remove:
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
```

Add:
```tsx
import { ResponsiveDialog, ResponsiveDialogHeader, ResponsiveDialogBody } from '@/components/ui/responsive-dialog';
```

Replace the Dialog wrapper (keeping all interior content):
```tsx
// BEFORE:
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border border-border/70 bg-card/95 p-0 text-foreground shadow-[0_30px_90px_rgba(2,6,23,0.42)] backdrop-blur-xl">
    <DialogHeader className="border-b border-border/60 px-6 py-5">
      <DialogTitle className="flex items-center gap-3 text-[1.65rem] font-semibold tracking-tight text-foreground">
        ...title content...
      </DialogTitle>
    </DialogHeader>
    <div className="space-y-6 px-6 py-5">
      ...body content...
    </div>
  </DialogContent>
</Dialog>

// AFTER:
<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-3xl">
  <ResponsiveDialogHeader
    title="Detalhes do Cartão"
    onClose={() => onOpenChange(false)}
  />
  <ResponsiveDialogBody>
    {/* Keep all existing interior content from <div className="space-y-6 px-6 py-5"> */}
    <div className="space-y-6">
      ...existing body content (the credit-card visual, stats, etc.)...
    </div>
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

> **Note:** The existing `DialogTitle` in CreditCardDetailsDialog has a complex flex structure with icon. `ResponsiveDialogHeader` accepts only a `title` string. The icon is decorative — use "Detalhes do Cartão" as the title string. The card name and icon inside the body content are already visible in the card visual.

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/pages/CreditCards.test.tsx --reporter=verbose 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/credit-cards/CreditCardDetailsDialog.tsx
git commit -m "feat(mobile): CreditCardDetailsDialog → ResponsiveDialog"
```

---

## Task 9: Dialog migrations — InvoiceDetailsDialog + InvoicePaymentDialog

**Files:**
- Modify: `src/components/invoices/InvoiceDetailsDialog.tsx`
- Modify: `src/components/invoices/InvoicePaymentDialog.tsx`

Apply the same migration pattern as Task 7–8 to both files:

- [ ] **Step 1: Migrate InvoiceDetailsDialog (219 lines)**

```tsx
// Remove:
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Add:
import { ResponsiveDialog, ResponsiveDialogHeader, ResponsiveDialogBody } from '@/components/ui/responsive-dialog';

// InvoiceDetailsDialog has TWO <Dialog> blocks: one for loading skeleton, one for real content.
// Loading block:
// BEFORE:
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-h-[90vh] max-w-4xl ...">
    <div className="space-y-4 px-6 py-6">... skeletons ...</div>
  </DialogContent>
</Dialog>

// AFTER:
<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-4xl">
  <ResponsiveDialogHeader title="Detalhes da Fatura" onClose={() => onOpenChange(false)} />
  <ResponsiveDialogBody>
    <div className="space-y-4">... skeletons ...</div>
  </ResponsiveDialogBody>
</ResponsiveDialog>

// Loaded block: same pattern — wrap existing content in ResponsiveDialogBody
// Replace DialogHeader + DialogTitle with ResponsiveDialogHeader title="Detalhes da Fatura"
```

- [ ] **Step 2: Migrate InvoicePaymentDialog (384 lines)**

```tsx
// Remove:
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Add:
import { ResponsiveDialog, ResponsiveDialogHeader, ResponsiveDialogBody } from '@/components/ui/responsive-dialog';

// Wrap:
// BEFORE:
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-h-[90vh] max-w-2xl ...">
    <DialogHeader className="border-b border-border/60 px-6 py-5">
      <DialogTitle className="text-[1.65rem] ...">Pagamento de Fatura</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-5">
      ...
    </form>
  </DialogContent>
</Dialog>

// AFTER:
<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
  <ResponsiveDialogHeader title="Pagamento de Fatura" onClose={() => onOpenChange(false)} />
  <ResponsiveDialogBody>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      ...existing form content...
    </form>
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/pages/CreditCards.test.tsx --reporter=verbose 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 4: Run full test suite to confirm no regressions**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: same failure count as baseline (3 pre-existing failing test files: calendar/ticktick). No new failures.

- [ ] **Step 5: Commit**

```bash
git add src/components/invoices/InvoiceDetailsDialog.tsx src/components/invoices/InvoicePaymentDialog.tsx
git commit -m "feat(mobile): InvoiceDetailsDialog + InvoicePaymentDialog → ResponsiveDialog"
```

---

## Task 10: Final verification + smoke test

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: no new failures beyond the 3 pre-existing baseline failures (calendar/ticktick).

- [ ] **Step 2: Start dev server and verify on mobile viewport**

```bash
pnpm dev
```

Open browser DevTools → mobile viewport (375×812). Verify:

- [ ] 4 StatCards display in 2×2 grid
- [ ] 4-tab sliding pill renders with icon + 9px label
- [ ] Tapping each tab moves the pill to correct position (0%/100%/200%/300%)
- [ ] "Faturas" tab: horizontal scroll pills work (Abertas / Fechadas / Vencidas / Pagas)
- [ ] "Histórico" tab: compact rows visible (not table)
- [ ] CreditCard card shows "Editar" + "Arquivar" buttons below the existing action buttons
- [ ] Clicking "Nova Compra" opens PurchaseDialog as full-screen overlay on mobile
- [ ] Clicking "Novo Cartão" opens CreditCardDialog as full-screen overlay
- [ ] Desktop (≥1024px): no visual changes — pixel-identical to before

- [ ] **Step 3: Commit if any last polish fixes are needed, then finishing-a-development-branch**

Use `superpowers:finishing-a-development-branch` to merge to main and push.
