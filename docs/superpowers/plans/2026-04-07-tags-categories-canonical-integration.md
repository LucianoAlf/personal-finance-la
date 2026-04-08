# Tags and Categories Canonical Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tags and categories canonical, persistent, and consistently usable across the app, WhatsApp/Ana Clara flows, Open Finance ingestion, and all operational transaction entry points.

**Architecture:** `categories` becomes the canonical transaction taxonomy for the entire platform, with one shared categorization service used by app writes, WhatsApp processing, and any Open Finance importer. `tags` remain user-defined semantic labels, but tag persistence moves behind a unified routing layer that knows whether the target row lives in `transactions`, `credit_card_transactions`, or `payable_bills`. Ana Clara consumes the same canonical taxonomy context rather than parallel category maps or ad-hoc joins.

**Tech Stack:** React, TypeScript, Supabase Postgres, Supabase Edge Functions, TanStack Query, Vitest

---

## File Structure

**Create:**
- `src/utils/categorization/canonical-taxonomy.ts` - frontend helpers for canonical category/tag decisions
- `src/utils/categorization/canonical-taxonomy.test.ts` - unit tests for canonical taxonomy helpers
- `src/utils/tags/tag-assignment.ts` - frontend routing helper for assigning tags by entity type
- `src/utils/tags/tag-assignment.test.ts` - unit tests for tag assignment routing
- `supabase/functions/_shared/canonical-categorization.ts` - backend category resolution shared by WhatsApp/Ana/Open Finance writers
- `supabase/functions/_shared/canonical-tag-context.ts` - backend tag catalog + user tag facts for Ana/WhatsApp
- `supabase/migrations/20260407_canonical_tags_categories.sql` - schema hardening, indexes, constraints, and optional RPCs/views
- `docs/superpowers/specs/2026-04-07-tags-categories-canonical-design.md` - design/spec snapshot for future reference

**Modify:**
- `src/components/categories/CreateCategoryDialog.tsx`
- `src/components/categories/DeleteCategoryDialog.tsx`
- `src/components/categories/CategoryTransactionsDialog.tsx`
- `src/hooks/useCategories.ts`
- `src/hooks/useCategoryStats.ts`
- `src/hooks/useTags.ts`
- `src/hooks/useCreditCardTags.ts`
- `src/hooks/useTransactions.ts`
- `src/hooks/useTransactionsQuery.ts`
- `src/pages/Transacoes.tsx`
- `src/components/transactions/TransactionDialog.tsx`
- `src/components/transactions/FilterSelects.tsx`
- `src/components/transactions/AdvancedFiltersModal.tsx`
- `src/components/credit-cards/PurchaseDialog.tsx`
- `src/components/credit-cards/PurchaseForm.tsx`
- `src/hooks/usePayableBills.ts`
- `src/components/payable-bills/BillDialog.tsx`
- `src/components/payable-bills/TagSelector.tsx`
- `src/pages/Categories.tsx`
- `src/pages/Tags.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/dashboard/TransactionItem.tsx`
- `src/components/dashboard/charts/ExpensesByCategoryChart.tsx`
- `supabase/functions/categorize-transaction/index.ts`
- `supabase/functions/process-whatsapp-message/transaction-mapper.ts`
- `supabase/functions/process-whatsapp-message/nlp-classifier.ts`
- `supabase/functions/process-whatsapp-message/context-manager.ts`
- `supabase/functions/process-whatsapp-message/contas-pagar.ts`
- `supabase/functions/process-whatsapp-message/insights-ana-clara.ts`
- `supabase/functions/ana-dashboard-insights/index.ts`
- `supabase/functions/_shared/report-intelligence.ts`

**Reuse without creating new ownership:**
- `src/types/categories.ts`
- `src/types/tags.ts`
- `src/types/transactions.ts`
- `src/constants/master-categories.ts` (either deprecate or convert to seed/reference only)
- `supabase/functions/shared/mappings.ts`
- `docs/AUDITORIA_ARQUITETURA_CATEGORIAS.md`
- `docs/AUDITORIA_SESSAO3_CATEGORIAS.md`
- `docs/AUDITORIA_PARTE1_DATABASE.md`

---

## Phase Overview

### Phase 1: Canonical taxonomy and schema hardening
Unify category/tag ownership, stop parallel definitions, and create safe backend primitives.

### Phase 2: App persistence and operational UX
Make every create/edit/filter/list surface actually persist and display tags/categories correctly.

### Phase 3: Analytics, dashboards, and drill-downs
Ensure stats, charts, filters, and management pages use the same underlying taxonomy.

### Phase 4: Ana Clara, WhatsApp, and Open Finance ingestion
Make backend conversational and importer flows consume the exact same category/tag logic as the app.

### Phase 5: Verification and rollout
Run targeted regression checks, data validation, and post-migration sanity checks.

---

### Task 1: Define the canonical taxonomy contract

**Files:**
- Create: `src/utils/categorization/canonical-taxonomy.ts`
- Test: `src/utils/categorization/canonical-taxonomy.test.ts`
- Modify: `src/types/categories.ts`
- Modify: `src/types/tags.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';

import {
  getCanonicalCategorySource,
  getCategoryTypeForManagerTab,
  shouldTreatMasterCategoriesAsSeedOnly,
} from '@/utils/categorization/canonical-taxonomy';

describe('canonical taxonomy', () => {
  it('treats database categories as the runtime source of truth', () => {
    expect(getCanonicalCategorySource()).toBe('database');
  });

  it('maps manager tabs to real category types', () => {
    expect(getCategoryTypeForManagerTab('expenses')).toBe('expense');
    expect(getCategoryTypeForManagerTab('income')).toBe('income');
  });

  it('marks static master categories as seed-only metadata', () => {
    expect(shouldTreatMasterCategoriesAsSeedOnly()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/utils/categorization/canonical-taxonomy.test.ts`

Expected: FAIL because the canonical taxonomy module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```typescript
export function getCanonicalCategorySource(): 'database' {
  return 'database';
}

export function getCategoryTypeForManagerTab(tab: 'expenses' | 'income'): 'expense' | 'income' {
  return tab === 'income' ? 'income' : 'expense';
}

export function shouldTreatMasterCategoriesAsSeedOnly(): boolean {
  return true;
}
```

- [ ] **Step 4: Extend the contract for downstream consumers**

Add and document:
- `CanonicalEntityType = 'transaction' | 'credit_card_transaction' | 'payable_bill'`
- `CanonicalCategoryAssignmentInput`
- `CanonicalTagAssignmentInput`
- helpers for choosing the correct entity/junction path

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/utils/categorization/canonical-taxonomy.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/categorization/canonical-taxonomy.ts src/utils/categorization/canonical-taxonomy.test.ts src/types/categories.ts src/types/tags.ts
git commit -m "refactor: define canonical taxonomy contract"
```

---

### Task 2: Harden the database model for canonical categories and tag assignment

**Files:**
- Create: `supabase/migrations/20260407_canonical_tags_categories.sql`
- Modify: `docs/AUDITORIA_PARTE1_DATABASE.md`
- Modify: `docs/AUDITORIA_ARQUITETURA_CATEGORIAS.md`

- [ ] **Step 1: Write the migration checklist as assertions**

The migration must ensure:
- `categories` remains the canonical category table for `transactions`, `credit_card_transactions`, `payable_bills`, and `financial_goals`
- unique safety on user tags: `unique(user_id, lower(name))`
- index support for `transaction_tags(transaction_id, tag_id)`, `credit_card_transaction_tags(credit_card_transaction_id, tag_id)`, and `bill_tags(bill_id, tag_id)`
- optional SQL helpers/RPCs for replacing tag assignments atomically per entity
- no new parallel category tables

- [ ] **Step 2: Implement the migration**

Include SQL like:

```sql
create unique index if not exists idx_tags_user_name_unique
on public.tags (user_id, lower(name));

create index if not exists idx_transaction_tags_transaction_id
on public.transaction_tags (transaction_id);

create index if not exists idx_credit_card_transaction_tags_transaction_id
on public.credit_card_transaction_tags (credit_card_transaction_id);

create index if not exists idx_bill_tags_bill_id
on public.bill_tags (bill_id);
```

If the project prefers RPCs over multi-step client writes, add explicit functions such as:
- `replace_transaction_tags(p_transaction_id uuid, p_tag_ids uuid[])`
- `replace_credit_card_transaction_tags(p_credit_card_transaction_id uuid, p_tag_ids uuid[])`
- `replace_bill_tags(p_bill_id uuid, p_tag_ids uuid[])`

- [ ] **Step 3: Document canonical ownership**

Update docs to state clearly:
- runtime source of truth for categories = `public.categories`
- runtime source of truth for tags = `public.tags`
- assignment storage depends on entity junction table
- static category constants are seed/reference material only

- [ ] **Step 4: Verify migration SQL in staging/local**

Run:
- `supabase db lint`
- `supabase db push` or the project’s normal migration apply workflow

Expected: migration applies without destructive changes.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260407_canonical_tags_categories.sql docs/AUDITORIA_PARTE1_DATABASE.md docs/AUDITORIA_ARQUITETURA_CATEGORIAS.md
git commit -m "db: harden canonical tags and categories schema"
```

---

### Task 3: Fix category management so it reflects the real system

**Files:**
- Modify: `src/components/categories/CreateCategoryDialog.tsx`
- Modify: `src/pages/Categories.tsx`
- Modify: `src/hooks/useCategories.ts`
- Modify: `src/hooks/useCategoryStats.ts`
- Modify: `src/components/categories/CategoryTransactionsDialog.tsx`
- Test: `src/utils/categorization/canonical-taxonomy.test.ts`

- [ ] **Step 1: Write the failing test for category type preservation**

```typescript
it('preserves income type when creating or editing a category from the income manager tab', () => {
  expect(getCategoryTypeForManagerTab('income')).toBe('income');
});
```

- [ ] **Step 2: Fix create/edit type propagation**

Change `CreateCategoryDialog` so it receives the active manager type and saves:

```typescript
const categoryData = {
  name,
  color,
  icon,
  keywords: keywordsArray,
  type: activeType,
  parent_id: null,
};
```

Do not infer or hardcode `'expense'`.

- [ ] **Step 3: Rebuild category stats over the full ledger**

Replace the card-only query in `useCategoryStats.ts` with an aggregate that includes:
- `transactions`
- `credit_card_transactions`
- optionally `payable_bills` and `financial_goals` in separate counts if the UI wants broader “usage”

The minimum acceptable behavior is: management stats must represent the same category universe the app uses operationally.

- [ ] **Step 4: Fix category drill-down**

`CategoryTransactionsDialog` must show ledger entries from both:
- `transactions`
- `credit_card_transactions`

and label the source so the user understands what kind of record they are viewing.

- [ ] **Step 5: Verify**

Run:
- `pnpm exec vitest run src/utils/categorization/canonical-taxonomy.test.ts`
- `pnpm exec tsc -b --pretty false`

Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/categories/CreateCategoryDialog.tsx src/pages/Categories.tsx src/hooks/useCategories.ts src/hooks/useCategoryStats.ts src/components/categories/CategoryTransactionsDialog.tsx src/utils/categorization/canonical-taxonomy.test.ts
git commit -m "fix: align category management with canonical taxonomy"
```

---

### Task 4: Make tag persistence correct for every transaction write path

**Files:**
- Create: `src/utils/tags/tag-assignment.ts`
- Create: `src/utils/tags/tag-assignment.test.ts`
- Modify: `src/components/transactions/TransactionDialog.tsx`
- Modify: `src/hooks/useTransactions.ts`
- Modify: `src/hooks/useCreditCardTags.ts`
- Modify: `src/pages/Transacoes.tsx`
- Modify: `src/components/credit-cards/PurchaseDialog.tsx`

- [ ] **Step 1: Write the failing tests for tag routing**

```typescript
import { describe, expect, it } from 'vitest';

import { getTagAssignmentTarget } from '@/utils/tags/tag-assignment';

describe('tag assignment routing', () => {
  it('routes bank transactions to transaction_tags', () => {
    expect(getTagAssignmentTarget({ entityType: 'transaction' })).toBe('transaction_tags');
  });

  it('routes credit card transactions to credit_card_transaction_tags', () => {
    expect(getTagAssignmentTarget({ entityType: 'credit_card_transaction' })).toBe('credit_card_transaction_tags');
  });
});
```

- [ ] **Step 2: Implement the routing helper**

```typescript
export function getTagAssignmentTarget(input: {
  entityType: 'transaction' | 'credit_card_transaction' | 'payable_bill';
}) {
  if (input.entityType === 'credit_card_transaction') return 'credit_card_transaction_tags';
  if (input.entityType === 'payable_bill') return 'bill_tags';
  return 'transaction_tags';
}
```

- [ ] **Step 3: Fix new manual transaction tag persistence**

Change the transaction create flow so:
- `addTransaction()` returns the inserted row id
- `TransactionDialog` (or `Transacoes.handleSave`) persists selected tags immediately after creation using the inserted id
- success toast is shown only after the main row and tags succeed

This must remove the current false comment about “saving after refresh”.

- [ ] **Step 4: Fix editing of card transaction tags**

When editing a row that originated from `credit_card_transactions`, write through the card tag junction instead of `transaction_tags`.

- [ ] **Step 5: Normalize the purchase dialog**

Keep `PurchaseDialog` as the correct reference implementation for card tag persistence and refactor shared logic so the bank/manual and card flows no longer diverge.

- [ ] **Step 6: Verify**

Run:
- `pnpm exec vitest run src/utils/tags/tag-assignment.test.ts`
- `pnpm exec tsc -b --pretty false`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/utils/tags/tag-assignment.ts src/utils/tags/tag-assignment.test.ts src/components/transactions/TransactionDialog.tsx src/hooks/useTransactions.ts src/hooks/useCreditCardTags.ts src/pages/Transacoes.tsx src/components/credit-cards/PurchaseDialog.tsx
git commit -m "fix: persist tags across bank and card transaction flows"
```

---

### Task 5: Make unified lists, filters, and dashboards reflect canonical tags/categories

**Files:**
- Modify: `src/hooks/useTransactions.ts`
- Modify: `src/hooks/useTransactionsQuery.ts`
- Modify: `src/components/transactions/FilterSelects.tsx`
- Modify: `src/components/transactions/AdvancedFiltersModal.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/components/dashboard/TransactionItem.tsx`
- Modify: `src/components/dashboard/charts/ExpensesByCategoryChart.tsx`
- Modify: `supabase/functions/_shared/report-intelligence.ts`

- [ ] **Step 1: Load card tags into unified transaction rows**

Update the merged transaction fetch to hydrate `tags` for `credit_card_transactions` instead of forcing:

```typescript
tags: []
```

Use either:
- a direct join if available through PostgREST relationships, or
- a second batched lookup by card transaction ids.

- [ ] **Step 2: Make filters honest**

Ensure tag filters in `Transações` and advanced filters operate on both:
- bank/manual transaction tags
- card transaction tags

Also decide whether account filters should exclude or specially handle card rows; document and implement one consistent rule.

- [ ] **Step 3: Surface tags in dashboard/reports consumers where valuable**

At minimum:
- recent transaction item can display tags when present
- report intelligence can count or summarize top tag usage for Ana context, if useful

Do not overload every chart with tags, but make the shared context available.

- [ ] **Step 4: Verify**

Run:
- `pnpm exec tsc -b --pretty false`
- targeted UI smoke tests for `Dashboard`, `Transações`, and the advanced filter flow

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTransactions.ts src/hooks/useTransactionsQuery.ts src/components/transactions/FilterSelects.tsx src/components/transactions/AdvancedFiltersModal.tsx src/pages/Dashboard.tsx src/components/dashboard/TransactionItem.tsx src/components/dashboard/charts/ExpensesByCategoryChart.tsx supabase/functions/_shared/report-intelligence.ts
git commit -m "fix: align filters and consumers with canonical tags and categories"
```

---

### Task 6: Align payable bills, goals, and deletion/reassignment behavior

**Files:**
- Modify: `src/hooks/usePayableBills.ts`
- Modify: `src/components/payable-bills/BillDialog.tsx`
- Modify: `src/components/payable-bills/TagSelector.tsx`
- Modify: `src/components/categories/DeleteCategoryDialog.tsx`
- Modify: `src/hooks/useGoals.ts`
- Modify: `src/hooks/useGoalsQuery.ts`

- [ ] **Step 1: Inventory all category/tag foreign-key dependents**

Before changing delete/reassign behavior, list the entities that hold `category_id` or tag assignments:
- `transactions`
- `credit_card_transactions`
- `payable_bills`
- `financial_goals`
- relevant budgets/spending limits if category-bound

- [ ] **Step 2: Implement safe category reassignment before delete**

`DeleteCategoryDialog` must offer reassignment or block delete with a clear reason for every dependent entity, not just card purchases.

- [ ] **Step 3: Confirm bills use the canonical category/tag model**

Ensure `BillDialog` and `usePayableBills` read/write the same tag and category structures expected by the rest of the app. If `bill_tags` is the canonical junction, write to it explicitly rather than relying on ambiguous implicit behavior.

- [ ] **Step 4: Verify**

Run manual checks for:
- delete category with existing usage
- recategorize bills/goals/transactions
- create/edit payable bill with tags and category

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePayableBills.ts src/components/payable-bills/BillDialog.tsx src/components/payable-bills/TagSelector.tsx src/components/categories/DeleteCategoryDialog.tsx src/hooks/useGoals.ts src/hooks/useGoalsQuery.ts
git commit -m "fix: align dependent entities with canonical category lifecycle"
```

---

### Task 7: Build one backend categorization service for app, WhatsApp, and Open Finance

**Files:**
- Create: `supabase/functions/_shared/canonical-categorization.ts`
- Modify: `supabase/functions/categorize-transaction/index.ts`
- Modify: `supabase/functions/process-whatsapp-message/transaction-mapper.ts`
- Modify: `supabase/functions/process-whatsapp-message/nlp-classifier.ts`
- Modify: `supabase/functions/process-whatsapp-message/context-manager.ts`
- Modify: `supabase/functions/process-whatsapp-message/contas-pagar.ts`
- Modify: `supabase/functions/shared/mappings.ts`

- [ ] **Step 1: Write the failing backend test or harness case**

At minimum document and automate cases like:

```typescript
[
  { text: 'mercado 120', expectedCategory: 'Alimentação', expectedType: 'expense' },
  { text: 'salário 5000', expectedCategory: 'Salário', expectedType: 'income' },
  { text: 'tv 2000 em 10x no Nubank', expectedCategory: 'Eletrodomésticos', expectedType: 'expense' },
]
```

- [ ] **Step 2: Implement shared category resolution**

The shared service must:
- normalize user text
- map NLP/Open Finance labels to canonical category names
- resolve the correct `categories.id` by user/system and type
- provide deterministic fallback to `Outros` / `Outras Receitas`
- never hardcode category ids in conversational writers

- [ ] **Step 3: Stop category logic from fragmenting**

Refactor `categorize-transaction`, `transaction-mapper`, and related WhatsApp code to call the shared service instead of each maintaining their own mapping and fallback logic.

- [ ] **Step 4: Define the Open Finance ingestion boundary**

If the Open Finance importer exists later or outside this repo, the contract must be:
- raw event in
- canonical category resolution using `_shared/canonical-categorization.ts`
- optional tag suggestions from description/user profile
- insert into `transactions` with canonical `category_id`

Document this boundary so future ingestion does not reintroduce parallel category maps.

- [ ] **Step 5: Verify**

Run:
- function-level tests if available
- targeted edge-function smoke calls in local/staging

Expected: same text should resolve to the same category whether it came from app/manual, WhatsApp, or importer.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/canonical-categorization.ts supabase/functions/categorize-transaction/index.ts supabase/functions/process-whatsapp-message/transaction-mapper.ts supabase/functions/process-whatsapp-message/nlp-classifier.ts supabase/functions/process-whatsapp-message/context-manager.ts supabase/functions/process-whatsapp-message/contas-pagar.ts supabase/functions/shared/mappings.ts
git commit -m "refactor: unify backend category resolution"
```

---

### Task 8: Expose canonical category and tag context to Ana Clara and WhatsApp summaries

**Files:**
- Create: `supabase/functions/_shared/canonical-tag-context.ts`
- Modify: `supabase/functions/process-whatsapp-message/insights-ana-clara.ts`
- Modify: `supabase/functions/ana-dashboard-insights/index.ts`
- Modify: `supabase/functions/_shared/report-intelligence.ts`

- [ ] **Step 1: Define the Ana taxonomy payload**

The shared payload should include:
- top spending categories by period
- top recurring categories
- uncategorized transaction count
- most-used tags
- recent new tags/categories created by the user
- category confidence/fallback rate from WhatsApp/Open Finance ingestion

- [ ] **Step 2: Implement the shared builder**

Create one backend helper that returns deterministic taxonomy facts for Ana:

```typescript
{
  topExpenseCategories: [...],
  topIncomeCategories: [...],
  topTags: [...],
  uncategorizedCount: 0,
  fallbackCategoryCount: 0,
}
```

- [ ] **Step 3: Update Ana Clara consumers**

Use that shared payload in:
- WhatsApp transaction interpretation and follow-up suggestions
- dashboard insights
- report intelligence narrative inputs

This lets Ana say things like:
- “Seus lançamentos via Open Finance estão caindo muito em ‘Outros’; vale revisar sua taxonomia”
- “A tag ‘mercado’ virou um padrão forte; posso sugerir automação”

- [ ] **Step 4: Verify**

Run a smoke validation that Ana payloads still resolve and that no consumer expects the old parallel shape.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/canonical-tag-context.ts supabase/functions/process-whatsapp-message/insights-ana-clara.ts supabase/functions/ana-dashboard-insights/index.ts supabase/functions/_shared/report-intelligence.ts
git commit -m "feat: expose canonical taxonomy context to Ana Clara"
```

---

### Task 9: End-to-end verification, migration checks, and cleanup

**Files:**
- Modify: `docs/superpowers/specs/2026-04-07-tags-categories-canonical-design.md`
- Modify: `docs/superpowers/plans/2026-04-07-tags-categories-canonical-integration.md`

- [ ] **Step 1: Run focused verification commands**

Run:
- `pnpm exec vitest run src/utils/categorization/canonical-taxonomy.test.ts src/utils/tags/tag-assignment.test.ts`
- `pnpm exec tsc -b --pretty false`
- `pnpm exec eslint src/components/categories src/components/transactions src/hooks/useTransactions.ts src/hooks/useTransactionsQuery.ts`

- [ ] **Step 2: Perform manual E2E checks**

Validate these scenarios in browser:
1. Create income category from the income tab and verify it appears in transaction selects.
2. Create tag on `/tags`, use it in a new manual transaction, save, reopen, and verify persistence.
3. Create card purchase with tags, verify tags appear in `Transações` and filters.
4. Filter transactions by tag and by category with mixed bank + card data.
5. Delete/reassign category with existing dependencies and verify no orphan behavior.
6. Register a WhatsApp/Open Finance-like text and verify canonical category assignment.

- [ ] **Step 3: Run post-migration SQL sanity checks**

Execute checks such as:

```sql
select count(*) from transaction_tags tt left join transactions t on t.id = tt.transaction_id where t.id is null;
select count(*) from credit_card_transaction_tags ctt left join credit_card_transactions cct on cct.id = ctt.credit_card_transaction_id where cct.id is null;
select type, count(*) from categories group by type;
select count(*) from transactions where category_id is null and type in ('income','expense');
```

- [ ] **Step 4: Deprecate misleading comments and parallel “source of truth” text**

Remove or rewrite comments that claim:
- tags save “after refresh”
- static categories are the only source of truth at runtime
- card-only stats represent category usage globally

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-04-07-tags-categories-canonical-design.md docs/superpowers/plans/2026-04-07-tags-categories-canonical-integration.md
git commit -m "docs: finalize canonical tags and categories rollout plan"
```

---

## Risks and Guardrails

- Do not break historical rows by trying to collapse `transactions` and `credit_card_transactions` into one table in this project; unify behavior first.
- Do not introduce a third tag-assignment path. Every entity must route through a small explicit assignment layer.
- Do not let Ana Clara consume category slugs, legacy English labels, and display names interchangeably. One canonical name/id path only.
- Keep `categories` database-driven at runtime. Static maps may seed or assist NLP, but cannot become a competing source of truth.
- Prefer deterministic category resolution before LLM interpretation whenever a strong keyword/rule match exists.

## Success Criteria

- A tag created anywhere can be reused everywhere it is supposed to apply.
- New and edited transactions persist tags correctly across bank/manual and card flows.
- Category management reflects the real ledger, not only card purchases.
- Income and expense categories remain separated correctly in management and forms.
- WhatsApp/Ana/Open Finance ingestion uses the same category resolution logic as the app.
- Ana Clara can explain user spending using canonical categories and tags without parallel mappings.

## Recommended Execution Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
8. Task 8
9. Task 9

## Self-Review

- Spec coverage: this plan covers app CRUD, filters, dashboard/report consumers, backend conversation flows, and the Open Finance categorization boundary.
- Placeholder scan: no TBD/TODO placeholders remain.
- Scope check: this is one coherent plan because tags/categories/Ana/Open Finance all depend on the same canonical taxonomy decision.
- Ambiguity check: canonical ownership is explicit: categories = `public.categories`, tags = `public.tags`, assignments = per-entity junction tables, Ana consumes shared backend facts.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-07-tags-categories-canonical-integration.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
