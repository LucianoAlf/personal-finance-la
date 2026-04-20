# CreditCards Mobile Design (Plan 6)

**Date:** 2026-04-19
**Page:** `src/pages/CreditCards.tsx` ("Cartões de Crédito")
**Scope:** Mobile-first responsive redesign of CreditCards page + sub-components.
**Constraint:** Desktop (`≥ lg`) MUST remain pixel-identical. All changes use `<md:` / `<lg:`-only classes or dual-render (`hidden lg:block` + `lg:hidden`).

---

## 1. Goals

- Make the CreditCards page usable on mobile (375px+) without horizontal scroll, with proper touch targets (≥44px), readable typography (≥14px body), and the existing brand visual language.
- Reuse patterns established in Plans 1–5 (mobile shell, sliding-pill tabs, ResponsiveDialog, dual-render filter bar, table→cards alternative, compact 2×2 summary cards).
- Preserve desktop pixel-identically.

## 2. Non-Goals

- No data-model or backend changes.
- No changes to dialog form fields, validation, or business logic.
- No changes to `CreditCardAlerts` (already mobile-OK — vertical stack).
- No changes to `DeleteInvoiceDialog` (Radix AlertDialog is already mobile-friendly).

---

## 3. Block-by-block design

### 3.1 Page shell — `src/pages/CreditCards.tsx`

**Padding:** `space-y-6 p-6` → `space-y-4 p-4 md:space-y-6 md:p-6`. Mobile gets tighter rhythm; desktop unchanged via `md:` overrides.

**Header:** No changes. Already responsive from Plan 3 (icon+title row1 / actions row2 mobile, single row desktop). The two action buttons (Nova Compra + Novo Cartão) flow naturally into the actions row.

### 3.2 StatCards (Limite Total / Usado / Disponível / Faturas do Mês)

**Current:** `grid grid-cols-1 md:grid-cols-4 gap-6`
**New:** `grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6`

- 2×2 on mobile, 1×4 on desktop (unchanged).
- StatCard already has the compact internal pattern from Plan 3 (icon h-8, p-3, `hidden md:block` subtitle/badge). No StatCard changes needed.
- The 4th card's subtitle (`{monthName} • {count} {cartão|cartões}`) is hidden via `hidden md:block` already (Plan 3 compact). On mobile only the value+title show.

### 3.3 4-tab TabsList (Cartões / Faturas / Análises / Histórico)

**Current desktop:** elaborate rounded `grid-cols-4` pill bar with shadows, ring, surface bg per tab.

**New mobile (`<md:`):** sliding-pill pattern from Plan 5, adapted for 4 tabs.

- Mobile renders a separate `TabsList` (`flex md:hidden ...`) with absolute pill divider:
  ```
  width: calc((100% - 0.5rem) / 4)
  transform: translateX( 0% | 100% | 200% | 300% )
  ```
- Triggers: `flex-1`, `bg-transparent hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none`, with `relative z-10`.
- Pill: `pointer-events-none absolute top-1 bottom-1 left-1 z-0 rounded-full bg-primary shadow-sm transition-transform duration-300 ease-out`.
- Mobile tabs show **icon + label 9px** (icon 15×15 + `<span>` 9px bold below) to fit 4 in narrow viewport — descritivo e acessível. Active label inherits `text-primary-foreground` from pill bg.
- Desktop renders the original `TabsList` (`hidden md:grid ...`) untouched.

> **Visual decision (confirmed):** B — ícone + label 9px.

### 3.4 `CreditCardList` — `src/components/credit-cards/CreditCardList.tsx`

**Already responsive:** `grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.

**Mobile polish:**
- "Adicionar Cartão" placeholder card: change `min-h-[400px]` → `min-h-[180px] md:min-h-[400px]`. Reduces wasted vertical space on mobile.
- Empty state (no cards yet): `py-16` → `py-10 md:py-16`, `mb-6 h-24 w-24` icon → `mb-4 h-16 w-16 md:mb-6 md:h-24 md:w-24`, `text-2xl` heading → `text-xl md:text-2xl`.
- Skeleton placeholder grid: same gap/min-height adjustments.

**Card action buttons (mobile):**
Each existing card has 5 actions. On mobile, render them as a **2×2 grid + 1 full-width row**:
```
[ Pagar Fatura ] [ Nova Compra ]
[ Ver Detalhes ] [ Editar      ]
[      Arquivar (full width)   ]
```
Use `grid grid-cols-2 gap-2 md:flex md:flex-row` on the button container. Arquivar: `col-span-2 md:col-span-1`. Desktop keeps the original flex-row layout unchanged via `md:flex md:flex-row`.

> **Visual decision (confirmed):** A — todas as ações visíveis (2×2 + Arquivar).

### 3.5 `InvoiceList` filter bar — `src/components/invoices/InvoiceList.tsx`

**Current:** flex-row of 4 filter buttons (open/closed/overdue/paid, each with count chip) + search input. Already wraps below `xl`.

**Mobile dual-render (`<lg:`):**
- **Horizontal scroll pill row** (`flex gap-2 overflow-x-auto scrollbar-none`): 4 pill buttons (Abertas / Fechadas / Vencidas / Pagas), each with icon + label + count chip. Active pill: `bg-primary text-primary-foreground`. Inactive: `bg-surface border-border/70`.
- Below the pills: search input full-width (`flex-1`).
- No filter sheet — all filters always visible via horizontal scroll.
- Active filter = single pill highlighted; no multi-select (same as desktop).

**Desktop (`hidden lg:flex` on the original filter row):** untouched.

> **Visual decision (confirmed):** A — pills deslizáveis na horizontal.

**Cards grid:** `grid-cols-1 xl:grid-cols-2` already mobile-first. Inside each invoice card, verify no horizontal overflow at 375px. If invoice action buttons (Pagar / Detalhes) overflow, stack with `flex-col sm:flex-row`.

### 3.6 `InvoiceHistory` — `src/components/invoices/InvoiceHistory.tsx`

Likely table-based (full file not yet inspected; will check during implementation). Apply Plan 5 `BillHistoryTable` pattern with **compact row** layout:
- Table renders desktop-only (`hidden lg:block`).
- Mobile renders card list (`lg:hidden`): each row = **compact single-line card**:
  ```
  [ card name       ] [ Paga badge ] [ R$ valor ]
    Mês Ano
  ```
  Row: `flex items-center gap-3 bg-surface rounded-[14px] p-3`. Card name + month in left flex-1, status badge, value right-aligned.
- Actions (Detalhes / Excluir) via swipe gesture OR long-press context menu — implemented as icon buttons (`...`) on the right, shown on tap.
- Date filter chips, if present, get horizontal scroll treatment.

> **Visual decision (confirmed):** A — linha compacta, ações via swipe/tap.

### 3.7 `AnalyticsTab` — `src/components/analytics/AnalyticsTab.tsx`

- Verify all Recharts use `ResponsiveContainer` with explicit `aspect` (e.g., `aspect={1.6}` or `height={220}` mobile / `height={320}` desktop).
- Padding `p-6` on chart cards → `p-3 md:p-6` to give the chart more horizontal space on mobile.
- Multi-column grids (e.g., `md:grid-cols-2`) for chart pairs are already mobile-first.

### 3.8 Dialog migrations to `ResponsiveDialog`

The following dialogs become `ResponsiveDialog` consumers (Plan 4 primitive: Dialog desktop / full-screen overlay mobile via ModeContext):

- `CreditCardDialog` (form: name, brand, limit, due_day, closing_day, color)
- `PurchaseDialog` (form: card, description, amount, installments, category, etc.)
- `CreditCardDetailsDialog` (read-only details with embedded credit-card visual)
- `InvoiceDetailsDialog` (line items + summary)
- `InvoicePaymentDialog` (form: payment type, amount, account, etc.)

**Migration rules (per Plan 4):**
- Replace `<Dialog>` + `<DialogContent>` with `<ResponsiveDialog>`.
- Title goes via `title` prop. The Plan 4 primitive renders desktop `DialogContent` unchanged; mobile renders full-screen overlay with sticky top bar (`< Voltar` / title) and content area scrollable.
- Form submit buttons remain in the dialog body or a sticky bottom bar; if the form already has its own footer, leave it (mobile overlay's bottom area scrolls into view via the form).
- Use existing `BillDialog` (from Plan 5) as reference for `form="<form-id>"` link pattern when the submit button needs to live in a sticky footer.

`DeleteInvoiceDialog` stays as `AlertDialog` (Radix already mobile-OK).

### 3.9 `CreditCardAlerts` — no changes

Vertical stack of `<Alert>` cards. Already mobile-friendly. Padding/spacing already use `space-y-3` and rounded corners that fit narrow viewports.

---

## 4. Files touched

**Page:**
- `src/pages/CreditCards.tsx` — padding, StatCard grid, sliding-pill mobile TabsList.

**Components:**
- `src/components/credit-cards/CreditCardList.tsx` — `<md:` polish (placeholder min-h, empty state).
- `src/components/credit-cards/CreditCardDialog.tsx` — `ResponsiveDialog`.
- `src/components/credit-cards/PurchaseDialog.tsx` — `ResponsiveDialog`.
- `src/components/credit-cards/CreditCardDetailsDialog.tsx` — `ResponsiveDialog`.
- `src/components/invoices/InvoiceList.tsx` — mobile filter bar dual-render.
- `src/components/invoices/InvoiceDetailsDialog.tsx` — `ResponsiveDialog`.
- `src/components/invoices/InvoicePaymentDialog.tsx` — `ResponsiveDialog`.
- `src/components/invoices/InvoiceHistory.tsx` — table → mobile cards dual-render.
- `src/components/analytics/AnalyticsTab.tsx` — chart container padding/sizing.

**New components (if needed):**
- `src/components/invoices/InvoiceFiltersSheet.tsx` — wraps the 4 status toggles in a `ResponsiveDialog`. Modeled on Plan 5 `BillFiltersSheet`.
- `src/components/invoices/InvoiceHistoryMobileCards.tsx` — mobile card list alternative to the desktop table. Modeled on Plan 5 `BillHistoryTable` mobile branch.

**Tests:**
- `src/pages/CreditCards.test.tsx` — extend with mobile rendering tests (sliding pill, mobile filter bar, mobile invoice cards).
- New test files for any new components.

---

## 5. Testing strategy

Per Plan 1–5 baseline:
- 3 pre-existing failing test files (calendar/ticktick) — confirmed baseline. Plan 6 must not introduce new failures beyond baseline.
- Use `matchMedia` mock + `lg:hidden` / `hidden lg:block` queries to assert mobile vs desktop trees.
- For sliding pill: assert `transform` style matches active tab (0% / 100% / 200% / 300%).
- For dialog migration: smoke-test that mobile overlay renders the title and a close/back button (`getByLabelText(/fechar|voltar/i)`).
- Avoid `getByRole('button')` ambiguity — use `getByLabelText` or `getAllBy*[index]` due to dual-render.

---

## 6. Risks & open questions

- **InvoiceHistory complexity:** file is 248 lines; if it has its own period filter, sorting, or pagination, the mobile alternative may need its own sub-design. Defer specifics to implementation; if scope balloons, split into a sub-component (already planned: `InvoiceHistoryMobileCards`).
- **InvoicePaymentDialog (384 lines):** form-heavy with conditional sections (Tipo de Pagamento, etc.). Migration to `ResponsiveDialog` should preserve all conditional rendering. Use `form="invoice-payment-form"` link pattern if a sticky footer is needed.
- **AnalyticsTab charts:** if charts use fixed widths (not `ResponsiveContainer`), need refactor. Verify during implementation.
- **CreditCardDetailsDialog credit-card visual:** the embedded card mockup uses `md:grid-cols-[1fr_auto]`. On mobile <md, grid stacks. Verify the card mockup itself fits 375px width without horizontal scroll.

---

## 7. Out of scope

- New features (sharing, exporting, OFX import, etc.).
- Performance optimization (virtualized lists, etc.) — defer to a later plan if needed.
- Dark-mode tweaks beyond what already exists.
- Conciliação page (deferred to Plan 12).
