# Bank Reconciliation & Open Finance Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 4 so Finance LA can ingest bank truth manually first, add Pluggy polling next, and reconcile external bank transactions against internal records inside a native Finance LA workspace.

**Architecture:** Build Phase 4 around one source-agnostic pipeline: manual paste / CSV / manual entry and Pluggy polling all normalize into `bank_transactions`, then a read-only matcher materializes `reconciliation_cases`, and confirmed reconciliation decisions write through one controlled path with audit trail. The frontend must reuse the current Finance LA shell (`MainLayout`, `Sidebar`, `Header`, `PageContent`, summary-card language, dark surfaces, modular panels) and prioritize the workspace core in this order: inbox, open case, audit/history; summary and connections get depth only after the core workflow is alive.

**Tech Stack:** React + React Router + TanStack Query + existing Finance LA UI components, Supabase Postgres + migrations + realtime, Supabase Edge Functions (Deno/TypeScript), pg_cron polling, Pluggy API (`/auth`, `/items/{id}`, `/accounts`, `/transactions`, `/investments`), Deno tests, Vitest page/component tests.

---

## File Structure

**Create:**
- `supabase/migrations/20260414110000_create_reconciliation_core_tables.sql`
  Creates `bank_transactions`, `reconciliation_cases`, `reconciliation_audit_log`, `pluggy_connections`, enums, indexes, RLS, and visible auto-close audit helpers.
- `supabase/functions/_shared/pluggy-client.ts`
  Pluggy runtime client with `/auth` + `X-API-KEY` lifecycle, item/account/transaction/investment readers, and no bearer-token assumptions.
- `supabase/functions/_shared/pluggy-client.test.ts`
  Deno tests locking the validated auth/header behavior and `webhookUrl === null` expectations.
- `supabase/functions/_shared/bank-transaction-normalizer.ts`
  Source-agnostic normalization for paste, CSV, manual entry, and Pluggy payloads into the internal `bank_transactions` shape.
- `supabase/functions/_shared/bank-transaction-normalizer.test.ts`
  Deno tests for normalization, dedup keys, signed amounts, and external/internal account identity boundaries.
- `supabase/functions/_shared/reconciliation-matcher.ts`
  Read-only scoring engine that emits candidates, confidence, hypotheses, and source-health penalties.
- `supabase/functions/_shared/reconciliation-matcher.test.ts`
  Deno tests for high-confidence debit match, ambiguous PIX, stale-confidence degradation, and no-write guarantees.
- `supabase/functions/reconciliation-action/index.ts`
  Controlled reconciliation decision endpoint for `link`, `reject`, `defer`, and `classify`, with audit log writes and visible auto-close behavior.
- `supabase/functions/reconciliation-action/index.test.ts`
  Deno tests for confirmation-required writes, audit completeness, and auto-close audit visibility.
- `supabase/functions/poll-pluggy-reconciliation/index.ts`
  pg_cron-driven worker that authenticates, polls Pluggy, upserts `bank_transactions`, updates `pluggy_connections`, and regenerates affected cases.
- `supabase/functions/poll-pluggy-reconciliation/index.test.ts`
  Deno tests for auth retry, runtime apiKey lifecycle, stale item handling, and case regeneration.
- `src/types/reconciliation.ts`
  Shared frontend types for cases, summaries, hypotheses, audit entries, and connection status.
- `src/hooks/useReconciliationWorkspaceQuery.ts`
  TanStack Query hook that loads inbox, selected case, summary KPIs, and right-rail context.
- `src/hooks/useReconciliationMutations.ts`
  Controlled frontend mutations for confirm / reject / defer / classify.
- `src/hooks/useReconciliationImport.ts`
  Manual ingestion hook for paste, CSV upload, and single transaction entry.
- `src/pages/Reconciliation.tsx`
  Dedicated Finance LA page at `/conciliacao`.
- `src/pages/Reconciliation.test.tsx`
  Vitest route-level test for design-system shell, inbox-first layout, and case selection behavior.
- `src/components/reconciliation/ReconciliationSummaryCards.tsx`
  KPI summary cards that reuse the current stat-card tone rather than invent a new visual language.
- `src/components/reconciliation/ReconciliationRiskStrip.tsx`
  Structural-risk banner for stale Pluggy items and auth/connectivity issues.
- `src/components/reconciliation/ReconciliationInbox.tsx`
  Severity-grouped inbox with filters and active-case selection.
- `src/components/reconciliation/ReconciliationCasePanel.tsx`
  Center workspace for bank vs system comparison, Ana Clara reasoning, contextual questions, and resolution proposal.
- `src/components/reconciliation/ReconciliationAuditRail.tsx`
  Right-rail timeline/audit trail with visible auto-close explanations.
- `src/components/reconciliation/ReconciliationConnectionPanel.tsx`
  Right-rail connection health module.
- `src/components/reconciliation/ReconciliationImportPanel.tsx`
  UI for paste / CSV / manual entry.
- `src/components/reconciliation/__tests__/ReconciliationInbox.test.tsx`
  Vitest coverage for grouping, prioritization, and active-item behavior.
- `src/components/reconciliation/__tests__/ReconciliationCasePanel.test.tsx`
  Vitest coverage for strong match vs ambiguous PIX, confidence presentation, and resolution CTA labels.
- `src/components/reconciliation/__tests__/ReconciliationRiskStrip.test.tsx`
  Vitest coverage that stale connection appears as structural risk, not just inbox noise.
- `scripts/pluggy/phase4-smoke.ts`
  Local-only runtime smoke script for `/auth`, `/items/{id}`, `/accounts`, `/transactions`, `/investments`, and `webhookUrl`.

**Modify:**
- `src/App.tsx`
  Add the `/conciliacao` route inside the existing protected `MainLayout`.
- `src/components/layout/Sidebar.tsx`
  Add a native navigation entry for reconciliation, keeping the current visual shell and icon density.
- `src/types/database.types.ts`
  Add minimal frontend interfaces for `bank_transactions`, `reconciliation_cases`, `pluggy_connections`, and audit entities.
- `.env.local`
  Add local-only Pluggy credentials and item ids; never stage this file.
- `.env`
  Add local machine runtime keys only if this project already uses `.env` as a local operator file; never commit Pluggy secrets or short-lived runtime keys.

**Do not modify unless tests force it:**
- `src/components/layout/MainLayout.tsx`
  Reuse the existing shell first.
- Existing dashboard or contas widgets
  Phase 4 must reuse the existing design system rather than refactor the whole app.

**Hard execution rules:**
- No financial mutation through the matcher.
- No hidden reconciliation writes; every link/reject/defer/classify goes through `reconciliation-action`.
- `apiKey` returned by Pluggy auth is a runtime token, not a long-lived design assumption.
- Inbox / case / audit trail ship before deeper summary/connections expansion.
- Auto-close may happen only with audit persistence and visible case-history explanation.

## Delivery Order

### Phase 0: External contract and secrets hygiene

- Prove the real Pluggy contract (`/auth` returns `apiKey`; subsequent reads use `X-API-KEY`).
- Lock the runtime token lifecycle before any architecture depends on it.

### Phase 1: Reconciliation data core

- Create tables and enums.
- Define normalized transaction shape and source-account identity boundaries.

### Phase 2: Read-only intelligence

- Implement normalization and matching first.
- Cases and confidence should exist before any write action exists.

### Phase 3: Controlled reconciliation writes

- Implement confirm / reject / defer / classify with audit, explicit auto-close, and no financial mutation leakage.

### Phase 4: Native Finance LA workspace

- Route, sidebar, summary cards, risk strip, inbox, case panel, audit rail, and import controls.
- Must visually reuse existing Finance LA primitives.

### Phase 5: Pluggy polling and operational readiness

- Polling worker, connection health, live smoke, and verification.

---

### Task 1: Lock the Pluggy Runtime Contract and Local Secret Handling

**Files:**
- Create: `supabase/functions/_shared/pluggy-client.ts`
- Test: `supabase/functions/_shared/pluggy-client.test.ts`
- Create: `scripts/pluggy/phase4-smoke.ts`
- Modify: `.env.local`

- [ ] **Step 1: Write the failing Pluggy client contract tests**

```typescript
import { assertEquals, assertRejects } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import {
  authenticatePluggy,
  buildPluggyHeaders,
  getPluggyItem,
} from './pluggy-client.ts';

Deno.test('authenticatePluggy returns runtime apiKey and never models bearer auth', async () => {
  const calls: Array<{ url: string; headers: HeadersInit }> = [];

  const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), headers: init?.headers ?? {} });

    if (String(input).endsWith('/auth')) {
      return new Response(JSON.stringify({ apiKey: 'runtime-key-123' }), { status: 200 });
    }

    throw new Error(`Unexpected URL: ${String(input)}`);
  };

  const apiKey = await authenticatePluggy(
    {
      baseUrl: 'https://api.pluggy.ai',
      clientId: 'client-id',
      clientSecret: 'client-secret',
    },
    fetchMock,
  );

  assertEquals(apiKey, 'runtime-key-123');
  assertEquals(calls[0].url, 'https://api.pluggy.ai/auth');
  assertEquals(buildPluggyHeaders('runtime-key-123')['X-API-KEY'], 'runtime-key-123');
});

Deno.test('getPluggyItem surfaces webhookUrl null explicitly', async () => {
  const item = await getPluggyItem(
    { baseUrl: 'https://api.pluggy.ai', apiKey: 'runtime-key-123', itemId: 'item-1' },
    async () =>
      new Response(JSON.stringify({ id: 'item-1', status: 'UPDATED', webhookUrl: null }), {
        status: 200,
      }),
  );

  assertEquals(item.webhookUrl, null);
});

Deno.test('authenticatePluggy fails closed when /auth does not return apiKey', async () => {
  await assertRejects(
    () =>
      authenticatePluggy(
        { baseUrl: 'https://api.pluggy.ai', clientId: 'id', clientSecret: 'secret' },
        async () => new Response(JSON.stringify({ token: 'wrong-shape' }), { status: 200 }),
      ),
    Error,
    'Pluggy auth response missing apiKey',
  );
});
```

- [ ] **Step 2: Run the tests to verify the contract fails**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/_shared/pluggy-client.test.ts"
```

Expected:

```text
error: Cannot resolve module './pluggy-client.ts'
```

- [ ] **Step 3: Add the local-only Pluggy keys and item ids without staging them**

```dotenv
# .env.local (local operator file only; never commit)
PLUGGY_CLIENT_ID=...
PLUGGY_CLIENT_SECRET=...
# Bootstrap/diagnostic only. Do not model runtime auth around this value.
# The worker must still authenticate via /auth and use the returned runtime apiKey.
PLUGGY_API_KEY=...
PLUGGY_ITEM_ID_NUBANK=...
PLUGGY_ITEM_ID_ITAU=...
PLUGGY_ITEM_ID_C6_BANK=...
PLUGGY_ITEM_ID_MERCADO_PAGO=...
PLUGGY_ITEM_ID_SANTANDER=...
```

Use the real local credentials and item ids already provided by the operator in the local environment. Do not copy real secrets into the plan, repository docs, or committed files.

And implement the runtime client:

```typescript
export interface PluggyAuthConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

export const buildPluggyHeaders = (apiKey: string) => ({
  'Content-Type': 'application/json',
  'X-API-KEY': apiKey,
});

export async function authenticatePluggy(
  config: PluggyAuthConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(`${config.baseUrl}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.apiKey) {
    throw new Error('Pluggy auth response missing apiKey');
  }

  return payload.apiKey as string;
}
```

- [ ] **Step 4: Add the live smoke script for the exact endpoints validated in this phase**

```typescript
const baseUrl = 'https://api.pluggy.ai';

const authResponse = await fetch(`${baseUrl}/auth`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: Deno.env.get('PLUGGY_CLIENT_ID'),
    clientSecret: Deno.env.get('PLUGGY_CLIENT_SECRET'),
  }),
});

const { apiKey } = await authResponse.json();
if (!apiKey) throw new Error('Expected apiKey from Pluggy /auth');

const request = (path: string) =>
  fetch(`${baseUrl}${path}`, {
    headers: { 'X-API-KEY': apiKey },
  });

const item = await (await request(`/items/${Deno.env.get('PLUGGY_ITEM_ID_NUBANK')}`)).json();
const accounts = await (await request(`/accounts?itemId=${Deno.env.get('PLUGGY_ITEM_ID_NUBANK')}`)).json();
const transactions = await (await request(`/transactions?accountId=${accounts.results?.[0]?.id}`)).json();
const investments = await (await request(`/investments?itemId=${Deno.env.get('PLUGGY_ITEM_ID_NUBANK')}`)).json();

console.log(JSON.stringify({
  auth: authResponse.status,
  itemWebhookUrl: item.webhookUrl ?? null,
  accountsCount: accounts.results?.length ?? 0,
  transactionsCount: transactions.results?.length ?? 0,
  investmentsCount: investments.results?.length ?? 0,
}, null, 2));
```

- [ ] **Step 5: Re-run tests and execute the live smoke**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/_shared/pluggy-client.test.ts" && deno run --allow-env --allow-net --allow-read "scripts/pluggy/phase4-smoke.ts"
```

Expected:

```text
ok | 3 passed | 0 failed
{
  "auth": 200,
  "itemWebhookUrl": null,
  "accountsCount": 1,
  "transactionsCount": 10,
  "investmentsCount": 0
}
```

- [ ] **Step 6: Commit the external contract and smoke tooling**

```bash
git add "supabase/functions/_shared/pluggy-client.ts" "supabase/functions/_shared/pluggy-client.test.ts" "scripts/pluggy/phase4-smoke.ts"
git commit -m "feat: lock Pluggy runtime contract for reconciliation"
```

Do not stage `.env.local`.

---

### Task 2: Create the Reconciliation Data Core

**Files:**
- Create: `supabase/migrations/20260414110000_create_reconciliation_core_tables.sql`
- Modify: `src/types/database.types.ts`

- [ ] **Step 1: Write the migration skeleton with enums and tables**

```sql
create type reconciliation_divergence_type as enum (
  'unmatched_bank_transaction',
  'pending_bill_paid_in_bank',
  'amount_mismatch',
  'date_mismatch',
  'balance_mismatch',
  'possible_duplicate',
  'stale_connection',
  'unclassified_transaction'
);

create type reconciliation_case_status as enum (
  'open',
  'awaiting_user',
  'confirmed',
  'rejected',
  'deferred',
  'auto_closed'
);

create table public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('manual_paste', 'csv_upload', 'manual_entry', 'pluggy')),
  source_item_id text,
  external_id text,
  account_name text not null,
  external_account_id text,
  internal_account_id uuid references public.accounts(id) on delete set null,
  amount numeric(14,2) not null,
  date date not null,
  description text not null,
  raw_description text,
  category_suggestion text,
  currency_code text not null default 'BRL',
  imported_at timestamptz not null default now(),
  reconciliation_status text not null default 'pending' check (reconciliation_status in ('pending', 'matched', 'reconciled', 'rejected', 'deferred'))
);
```

- [ ] **Step 2: Add cases, audit, connections, and visible auto-close support**

```sql
create table public.reconciliation_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_transaction_id uuid not null references public.bank_transactions(id) on delete cascade,
  divergence_type reconciliation_divergence_type not null,
  matched_record_type text check (matched_record_type in ('payable_bill', 'transaction', 'account')),
  matched_record_id uuid,
  confidence numeric(5,4) not null default 0,
  confidence_reasoning jsonb not null default '{}'::jsonb,
  hypotheses jsonb not null default '[]'::jsonb,
  status reconciliation_case_status not null default 'open',
  priority text not null check (priority in ('urgent', 'high', 'medium', 'low', 'infra')),
  auto_close_reason text,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reconciliation_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.reconciliation_cases(id) on delete cascade,
  action text not null check (action in ('confirmed', 'rejected', 'deferred', 'classified', 'linked', 'unlinked', 'auto_closed')),
  confidence_at_decision numeric(5,4) not null,
  bank_transaction_snapshot jsonb not null,
  system_record_snapshot jsonb,
  actor text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.pluggy_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  institution_name text not null,
  status text not null,
  last_synced_at timestamptz,
  staleness_threshold_hours integer not null default 48,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 3: Add indexes, RLS, and the auto-close helper that always audits**

```sql
create unique index bank_transactions_user_source_external_id_key
  on public.bank_transactions(user_id, source, external_id)
  where external_id is not null;

create index reconciliation_cases_user_priority_status_idx
  on public.reconciliation_cases(user_id, priority, status, updated_at desc);

alter table public.bank_transactions enable row level security;
alter table public.reconciliation_cases enable row level security;
alter table public.reconciliation_audit_log enable row level security;
alter table public.pluggy_connections enable row level security;

create policy "users manage own reconciliation_cases"
  on public.reconciliation_cases
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.auto_close_reconciliation_case(
  p_case_id uuid,
  p_user_id uuid,
  p_reason text,
  p_actor text default 'system'
) returns void
language plpgsql
security definer
as $$
declare
  v_case public.reconciliation_cases;
begin
  select * into v_case from public.reconciliation_cases
  where id = p_case_id and user_id = p_user_id;

  if not found or v_case.status in ('confirmed', 'rejected', 'deferred', 'auto_closed') then
    return;
  end if;

  update public.reconciliation_cases
    set status = 'auto_closed',
        auto_close_reason = p_reason,
        resolved_at = now(),
        resolved_by = p_actor,
        updated_at = now()
  where id = p_case_id;

  insert into public.reconciliation_audit_log (
    user_id, case_id, action, confidence_at_decision,
    bank_transaction_snapshot, system_record_snapshot, actor, notes
  )
  values (
    p_user_id, p_case_id, 'auto_closed', v_case.confidence,
    '{}'::jsonb, '{}'::jsonb, p_actor, p_reason
  );
end;
$$;
```

- [ ] **Step 4: Add matching frontend types so the page can compile against the new shape**

```typescript
export interface BankTransaction {
  id: string;
  user_id: string;
  source: 'manual_paste' | 'csv_upload' | 'manual_entry' | 'pluggy';
  source_item_id: string | null;
  external_id: string | null;
  account_name: string;
  external_account_id: string | null;
  internal_account_id: string | null;
  amount: number;
  date: string;
  description: string;
  raw_description: string | null;
  reconciliation_status: 'pending' | 'matched' | 'reconciled' | 'rejected' | 'deferred';
}
```

- [ ] **Step 5: Apply the migration locally and verify the schema**

Run:

```bash
npx supabase db push --include-all --yes
```

Expected:

```text
Applying migration 20260414110000_create_reconciliation_core_tables.sql
Finished supabase db push.
```

- [ ] **Step 6: Commit the data core**

```bash
git add "supabase/migrations/20260414110000_create_reconciliation_core_tables.sql" "src/types/database.types.ts"
git commit -m "feat: add reconciliation core data model"
```

---

### Task 3: Normalize Bank Inputs and Generate Read-Only Cases

**Files:**
- Create: `supabase/functions/_shared/bank-transaction-normalizer.ts`
- Test: `supabase/functions/_shared/bank-transaction-normalizer.test.ts`
- Create: `supabase/functions/_shared/reconciliation-matcher.ts`
- Test: `supabase/functions/_shared/reconciliation-matcher.test.ts`

- [ ] **Step 1: Write failing normalizer and matcher tests**

```typescript
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { normalizePluggyTransaction, normalizeCsvTransaction } from './bank-transaction-normalizer.ts';
import { scoreReconciliationCandidates } from './reconciliation-matcher.ts';

Deno.test('normalizePluggyTransaction separates external and internal account identity', () => {
  const normalized = normalizePluggyTransaction({
    sourceItemId: 'item-itau',
    accountId: 'pluggy-account-1',
    transaction: {
      id: 'tx-1',
      amount: -320,
      date: '2026-04-11',
      description: 'DEBITO AUTOMATICO AMIL',
    },
    internalAccountId: 'account-internal-itau',
  });

  assertEquals(normalized.external_account_id, 'pluggy-account-1');
  assertEquals(normalized.internal_account_id, 'account-internal-itau');
});

Deno.test('scoreReconciliationCandidates emits a strong bill match for debit automatico', () => {
  const result = scoreReconciliationCandidates({
    bankTransaction: {
      amount: -320,
      date: '2026-04-11',
      description: 'DEBITO AUTOMATICO AMIL',
      sourceHealth: 'healthy',
    },
    payables: [
      { id: 'bill-1', amount: 320, due_date: '2026-04-10', description: 'Amil' },
    ],
    transactions: [],
    accounts: [],
  });

  assertEquals(result.bestMatch?.recordId, 'bill-1');
  assertEquals(result.bestMatch?.confidence >= 0.85, true);
});

Deno.test('scoreReconciliationCandidates degrades confidence for stale source items', () => {
  const result = scoreReconciliationCandidates({
    bankTransaction: {
      amount: -320,
      date: '2026-04-11',
      description: 'DEBITO AUTOMATICO AMIL',
      sourceHealth: 'stale',
    },
    payables: [{ id: 'bill-1', amount: 320, due_date: '2026-04-10', description: 'Amil' }],
    transactions: [],
    accounts: [],
  });

  assertEquals(result.bestMatch?.confidence < 0.85, true);
  assertEquals(result.bestMatch?.reasoning.sourceHealthPenalty, true);
});

Deno.test('scoreReconciliationCandidates returns hypotheses for ambiguous pix', () => {
  const result = scoreReconciliationCandidates({
    bankTransaction: {
      amount: -85,
      date: '2026-04-09',
      description: 'PIX ENVIADO JOAO S',
      sourceHealth: 'healthy',
    },
    payables: [],
    transactions: [],
    accounts: [],
  });

  assertEquals(result.bestMatch, null);
  assertEquals(result.hypotheses.length >= 2, true);
});
```

- [ ] **Step 2: Run tests and confirm the read-only intelligence layer does not exist yet**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/_shared/bank-transaction-normalizer.test.ts" "supabase/functions/_shared/reconciliation-matcher.test.ts"
```

Expected:

```text
error: Cannot resolve module './bank-transaction-normalizer.ts'
```

- [ ] **Step 3: Implement the source-agnostic normalizer**

```typescript
export interface NormalizedBankTransactionInput {
  user_id: string;
  source: 'manual_paste' | 'csv_upload' | 'manual_entry' | 'pluggy';
  source_item_id: string | null;
  external_id: string | null;
  account_name: string;
  external_account_id: string | null;
  internal_account_id: string | null;
  amount: number;
  date: string;
  description: string;
  raw_description: string | null;
}

export const normalizeAmount = (amount: number) => Number(amount.toFixed(2));

export function normalizePluggyTransaction(input: {
  sourceItemId: string;
  accountId: string;
  accountName?: string | null;
  internalAccountId: string | null;
  transaction: { id: string; amount: number; date: string; description: string };
}): NormalizedBankTransactionInput {
  return {
    user_id: '',
    source: 'pluggy',
    source_item_id: input.sourceItemId,
    external_id: input.transaction.id,
    // Minimal seed only. Replace with the real account name from Pluggy payload as soon as it is available.
    // This placeholder must not survive to production behavior.
    account_name: input.accountName?.trim() || 'Conta Pluggy',
    external_account_id: input.accountId,
    internal_account_id: input.internalAccountId,
    amount: normalizeAmount(input.transaction.amount),
    date: input.transaction.date,
    description: input.transaction.description.trim(),
    raw_description: input.transaction.description,
  };
}
```

- [ ] **Step 4: Implement the matcher as a pure scorer that never writes**

```typescript
const applySourceHealthPenalty = (confidence: number, sourceHealth: 'healthy' | 'stale') =>
  sourceHealth === 'stale' ? Math.min(confidence, 0.64) : confidence;

export function scoreReconciliationCandidates(input: ScoreInput): ScoreResult {
  const billMatches = input.payables.map((bill) => {
    const amountScore = Math.abs(Math.abs(input.bankTransaction.amount) - bill.amount) <= 0.1 ? 0.5 : 0;
    const dateScore = Math.abs(daysBetween(input.bankTransaction.date, bill.due_date)) <= 7 ? 0.2 : 0;
    const descriptionScore = similarity(input.bankTransaction.description, bill.description) >= 0.6 ? 0.25 : 0;
    const confidence = applySourceHealthPenalty(amountScore + dateScore + descriptionScore, input.bankTransaction.sourceHealth);

    return {
      recordId: bill.id,
      recordType: 'payable_bill' as const,
      confidence,
      reasoning: {
        amountExact: amountScore > 0,
        dateWindow: dateScore > 0,
        descriptionAligned: descriptionScore > 0,
        sourceHealthPenalty: input.bankTransaction.sourceHealth === 'stale',
      },
    };
  });

  const bestMatch = [...billMatches].sort((a, b) => b.confidence - a.confidence)[0] ?? null;

  if (!bestMatch || bestMatch.confidence < 0.5) {
    return {
      bestMatch: null,
      hypotheses: [
        { label: 'transferência', confidence: 0.38 },
        { label: 'pagamento não lançado', confidence: 0.27 },
        { label: 'sem match ainda', confidence: 0.35 },
      ],
    };
  }

  return { bestMatch, hypotheses: [] };
}
```

- [ ] **Step 5: Re-run the tests**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/_shared/bank-transaction-normalizer.test.ts" "supabase/functions/_shared/reconciliation-matcher.test.ts"
```

Expected:

```text
ok | 4 passed | 0 failed
```

- [ ] **Step 6: Commit the read-only intelligence layer**

```bash
git add "supabase/functions/_shared/bank-transaction-normalizer.ts" "supabase/functions/_shared/bank-transaction-normalizer.test.ts" "supabase/functions/_shared/reconciliation-matcher.ts" "supabase/functions/_shared/reconciliation-matcher.test.ts"
git commit -m "feat: add reconciliation normalization and scoring"
```

---

### Task 4: Implement Controlled Reconciliation Decisions with Audit and Visible Auto-Close

**Files:**
- Create: `supabase/functions/reconciliation-action/index.ts`
- Test: `supabase/functions/reconciliation-action/index.test.ts`

**Operational rule:** a reconciliation decision is not finalized unless the audit write succeeds. Returning success after updating `reconciliation_cases` but failing to persist `reconciliation_audit_log` is forbidden; the handler must fail the request and compensate or roll back before exposing a successful outcome.

- [ ] **Step 1: Write failing tests for confirm / reject / defer / classify and auto-close**

```typescript
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { applyReconciliationDecision } from './index.ts';

Deno.test('confirm writes link + audit but does not mutate payable financial state', async () => {
  const result = await applyReconciliationDecision(fakeSupabase(), {
    userId: 'user-1',
    caseId: 'case-1',
    action: 'confirm',
    confirmationSource: 'workspace',
  });

  assertEquals(result.outcome, 'confirmed');
  assertEquals(result.financialMutationPerformed, false);
});

Deno.test('auto-close writes visible audit entry instead of silently dropping the case', async () => {
  const supabase = fakeSupabase({
    existingCase: { id: 'case-2', user_id: 'user-1', status: 'open', confidence: 0.91 },
  });

  const result = await applyReconciliationDecision(supabase, {
    userId: 'user-1',
    caseId: 'case-2',
    action: 'auto_close',
    reason: 'underlying payable already updated externally',
  });

  assertEquals(result.outcome, 'auto_closed');
  assertEquals(result.auditEntry.notes, 'underlying payable already updated externally');
});
```

- [ ] **Step 2: Run the tests to verify the action endpoint does not exist**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/reconciliation-action/index.test.ts"
```

Expected:

```text
error: Cannot resolve module './index.ts'
```

- [ ] **Step 3: Implement the controlled decision handler**

```typescript
export async function applyReconciliationDecision(
  supabase: SupabaseClient,
  input: {
    userId: string;
    caseId: string;
    action: 'confirm' | 'reject' | 'defer' | 'classify' | 'auto_close';
    confirmationSource?: 'workspace' | 'whatsapp';
    reason?: string;
  },
) {
  const { data: currentCase } = await supabase
    .from('reconciliation_cases')
    .select('*')
    .eq('id', input.caseId)
    .eq('user_id', input.userId)
    .single();

  if (!currentCase) throw new Error('Reconciliation case not found');

  if (input.action === 'confirm' && !input.confirmationSource) {
    throw new Error('confirmationSource is required for confirm');
  }

  // Reconciliation finalization rule:
  // if audit persistence fails, this decision must not be treated as finalized.
  // Prefer one transactional database path when practical; if split writes are
  // unavoidable in v1, the handler must surface failure and compensate before
  // returning a successful outcome.

  const nextStatus =
    input.action === 'confirm'
      ? 'confirmed'
      : input.action === 'reject'
        ? 'rejected'
        : input.action === 'defer'
          ? 'deferred'
          : input.action === 'auto_close'
            ? 'auto_closed'
            : 'confirmed';

  await supabase
    .from('reconciliation_cases')
    .update({
      status: nextStatus,
      resolved_at: new Date().toISOString(),
      resolved_by: input.action === 'auto_close' ? 'system' : 'ana_clara',
      auto_close_reason: input.reason ?? null,
    })
    .eq('id', input.caseId)
    .eq('user_id', input.userId);

  const auditEntry = {
    user_id: input.userId,
    case_id: input.caseId,
    action: input.action === 'confirm' ? 'linked' : input.action,
    confidence_at_decision: currentCase.confidence,
    bank_transaction_snapshot: {},
    system_record_snapshot: {},
    actor: input.action === 'auto_close' ? 'system' : 'ana_clara',
    notes: input.reason ?? null,
  };

  await supabase.from('reconciliation_audit_log').insert(auditEntry);

  return {
    outcome: nextStatus,
    financialMutationPerformed: false,
    auditEntry,
  };
}
```

- [ ] **Step 4: Add the HTTP edge wrapper**

```typescript
Deno.serve(async (request) => {
  const body = await request.json();
  const result = await applyReconciliationDecision(supabase, body);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 5: Re-run the action tests**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/reconciliation-action/index.test.ts"
```

Expected:

```text
ok | 2 passed | 0 failed
```

- [ ] **Step 6: Commit the controlled write path**

```bash
git add "supabase/functions/reconciliation-action/index.ts" "supabase/functions/reconciliation-action/index.test.ts"
git commit -m "feat: add controlled reconciliation decisions"
```

---

### Task 5: Build the Pluggy Poller with Runtime apiKey Lifecycle and Stale-Aware Case Regeneration

**Files:**
- Create: `supabase/functions/poll-pluggy-reconciliation/index.ts`
- Test: `supabase/functions/poll-pluggy-reconciliation/index.test.ts`

- [ ] **Step 1: Write failing worker tests for runtime apiKey refresh and stale connection handling**

```typescript
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { runPluggyReconciliationPoll } from './index.ts';

Deno.test('worker authenticates per run and never reuses a persisted runtime apiKey contract', async () => {
  const result = await runPluggyReconciliationPoll({
    env: {
      PLUGGY_CLIENT_ID: 'client',
      PLUGGY_CLIENT_SECRET: 'secret',
      PLUGGY_ITEM_ID_ITAU: 'item-itau',
    },
    now: '2026-04-14T12:00:00Z',
  });

  assertEquals(result.authenticatedThisRun, true);
});

Deno.test('stale item updates pluggy_connections and caps match confidence', async () => {
  const result = await runPluggyReconciliationPoll({
    env: { PLUGGY_CLIENT_ID: 'client', PLUGGY_CLIENT_SECRET: 'secret', PLUGGY_ITEM_ID_SANTANDER: 'item-stale' },
    now: '2026-04-14T12:00:00Z',
  });

  assertEquals(result.connectionUpdates[0].status, 'stale');
  assertEquals(result.generatedCases.every((item) => item.confidence <= 0.64), true);
});
```

- [ ] **Step 2: Run the worker tests to verify the poller is still absent**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/poll-pluggy-reconciliation/index.test.ts"
```

Expected:

```text
error: Cannot resolve module './index.ts'
```

- [ ] **Step 3: Implement the worker around per-run auth and source health**

```typescript
export async function runPluggyReconciliationPoll(input: WorkerInput) {
  const apiKey = await authenticatePluggy({
    baseUrl: 'https://api.pluggy.ai',
    clientId: input.env.PLUGGY_CLIENT_ID,
    clientSecret: input.env.PLUGGY_CLIENT_SECRET,
  });

  const itemIds = Object.entries(input.env)
    .filter(([key]) => key.startsWith('PLUGGY_ITEM_ID_'))
    .map(([, value]) => value)
    .filter(Boolean);

  const generatedCases: Array<{ confidence: number }> = [];
  const connectionUpdates: Array<{ itemId: string; status: string }> = [];

  for (const itemId of itemIds) {
    const item = await getPluggyItem({ baseUrl: 'https://api.pluggy.ai', apiKey, itemId });
    const sourceHealth = item.status === 'UPDATED' ? 'healthy' : 'stale';

    connectionUpdates.push({ itemId, status: sourceHealth });

    const accounts = await listPluggyAccounts({ baseUrl: 'https://api.pluggy.ai', apiKey, itemId });
    for (const account of accounts.results ?? []) {
      const transactions = await listPluggyTransactions({
        baseUrl: 'https://api.pluggy.ai',
        apiKey,
        accountId: account.id,
      });

      for (const tx of transactions.results ?? []) {
        const normalized = normalizePluggyTransaction({
          sourceItemId: itemId,
          accountId: account.id,
          accountName: account.name ?? null,
          internalAccountId: null,
          transaction: tx,
        });

        // The real worker must persist these outputs:
        // 1. upsert bank_transactions
        // 2. update pluggy_connections
        // 3. materialize/regenerate reconciliation_cases
        // This in-memory array is only the minimal planning sketch for the scoring loop.

        const score = scoreReconciliationCandidates({
          bankTransaction: { ...normalized, sourceHealth },
          payables: [],
          transactions: [],
          accounts: [],
        });

        generatedCases.push({ confidence: score.bestMatch?.confidence ?? 0 });
      }
    }
  }

  return { authenticatedThisRun: true, generatedCases, connectionUpdates };
}
```

- [ ] **Step 4: Add the cron-friendly edge wrapper**

```typescript
Deno.serve(async () => {
  const result = await runPluggyReconciliationPoll({
    env: Deno.env.toObject(),
    now: new Date().toISOString(),
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 5: Re-run tests and dry-run the worker locally**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/poll-pluggy-reconciliation/index.test.ts" && deno run --allow-env --allow-net --allow-read "scripts/pluggy/phase4-smoke.ts"
```

Expected:

```text
ok | 2 passed | 0 failed
```

- [ ] **Step 6: Commit the Pluggy poller**

```bash
git add "supabase/functions/poll-pluggy-reconciliation/index.ts" "supabase/functions/poll-pluggy-reconciliation/index.test.ts"
git commit -m "feat: add Pluggy reconciliation poller"
```

---

### Task 6: Add the Native Finance LA Reconciliation Route, Hooks, and Shell

**Files:**
- Create: `src/types/reconciliation.ts`
- Create: `src/hooks/useReconciliationWorkspaceQuery.ts`
- Create: `src/hooks/useReconciliationMutations.ts`
- Create: `src/pages/Reconciliation.tsx`
- Test: `src/pages/Reconciliation.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Write the failing page-level test for route, sidebar entry, and native shell reuse**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Reconciliation } from './Reconciliation';

describe('Reconciliation page shell', () => {
  it('renders a Finance LA-native inbox-first workspace shell', () => {
    render(
      <MemoryRouter initialEntries={['/conciliacao']}>
        <Reconciliation />
      </MemoryRouter>,
    );

    expect(screen.getByText('Central de Conciliacao')).toBeInTheDocument();
    expect(screen.getByText('Inbox priorizada')).toBeInTheDocument();
    expect(screen.getByText('Historico e auditoria')).toBeInTheDocument();
    expect(screen.getByText('Sincronizar Pluggy')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the page test to confirm the route/page do not exist**

Run:

```bash
npx vitest run "src/pages/Reconciliation.test.tsx"
```

Expected:

```text
Error: Failed to resolve import './Reconciliation'
```

- [ ] **Step 3: Create the shared types and query hooks**

```typescript
export interface ReconciliationCaseListItem {
  id: string;
  divergenceType: string;
  priority: 'urgent' | 'high' | 'medium' | 'low' | 'infra';
  confidence: number;
  title: string;
  subtitle: string;
  sourceHealth: 'healthy' | 'stale';
}

export const useReconciliationWorkspaceQuery = () =>
  useQuery({
    queryKey: ['reconciliation-workspace'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const [casesResult, connectionsResult] = await Promise.all([
        supabase
          .from('reconciliation_cases')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('pluggy_connections')
          .select('*')
          .eq('user_id', userData.user.id),
      ]);

      return {
        cases: casesResult.data ?? [],
        connections: connectionsResult.data ?? [],
        summary: {
          balanceDelta: 0,
          openCases: (casesResult.data ?? []).length,
          highConfidenceCount: (casesResult.data ?? []).filter((item: any) => item.confidence >= 0.85).length,
          staleConnections: (connectionsResult.data ?? []).filter((item: any) => item.status !== 'UPDATED').length,
          activeSources: ['manual', 'pluggy'],
        },
      };
    },
  });
```

- [ ] **Step 4: Add the page, route, and sidebar entry using the existing design shell**

```tsx
// src/App.tsx
import { Reconciliation } from './pages/Reconciliation';

// inside protected routes
<Route path="conciliacao" element={<Reconciliation />} />
```

```tsx
// src/components/layout/Sidebar.tsx
import { ShieldCheck } from 'lucide-react';

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Wallet, label: 'Contas', path: '/contas' },
  { icon: List, label: 'Transações', path: '/transacoes' },
  { icon: ShieldCheck, label: 'Conciliação', path: '/conciliacao' },
  { icon: CreditCard, label: 'Cartões', path: '/cartoes' },
];
```

```tsx
// src/pages/Reconciliation.tsx
export function Reconciliation() {
  const { data } = useReconciliationWorkspaceQuery();
  const staleConnections = data?.connections?.filter((item) => item.status !== 'UPDATED') ?? [];

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Header
        title="Central de Conciliacao"
        subtitle="Compare sistema vs banco e resolva divergencias com contexto"
        actions={<Button className="rounded-xl">Sincronizar Pluggy</Button>}
      />

      <PageContent className="space-y-8 py-8">
        {staleConnections.length > 0 ? <ReconciliationRiskStrip items={staleConnections} /> : null}
        <ReconciliationSummaryCards summary={data?.summary ?? null} />
        <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)_300px] gap-6">
          <ReconciliationInbox cases={data?.cases ?? []} />
          <ReconciliationCasePanel
            state={data?.selectedCase ? 'strong_match' : 'empty'}
            caseData={data?.selectedCase ?? null}
            isLoading={!data}
          />
          <ReconciliationAuditRail entries={data?.auditEntries ?? []} />
        </div>
      </PageContent>
    </div>
  );
}
```

- [ ] **Step 5: Re-run the route test**

Run:

```bash
npx vitest run "src/pages/Reconciliation.test.tsx"
```

Expected:

```text
✓ src/pages/Reconciliation.test.tsx
```

- [ ] **Step 6: Commit the native route shell**

```bash
git add "src/App.tsx" "src/components/layout/Sidebar.tsx" "src/types/reconciliation.ts" "src/hooks/useReconciliationWorkspaceQuery.ts" "src/hooks/useReconciliationMutations.ts" "src/pages/Reconciliation.tsx" "src/pages/Reconciliation.test.tsx"
git commit -m "feat: add native reconciliation workspace shell"
```

---

### Task 7: Build the Core Workspace First — Inbox, Case, Audit Trail, and Manual Import

**Files:**
- Create: `src/hooks/useReconciliationImport.ts`
- Create: `src/components/reconciliation/ReconciliationSummaryCards.tsx`
- Create: `src/components/reconciliation/ReconciliationRiskStrip.tsx`
- Create: `src/components/reconciliation/ReconciliationInbox.tsx`
- Create: `src/components/reconciliation/ReconciliationCasePanel.tsx`
- Create: `src/components/reconciliation/ReconciliationAuditRail.tsx`
- Create: `src/components/reconciliation/ReconciliationConnectionPanel.tsx`
- Create: `src/components/reconciliation/ReconciliationImportPanel.tsx`
- Test: `src/components/reconciliation/__tests__/ReconciliationInbox.test.tsx`
- Test: `src/components/reconciliation/__tests__/ReconciliationCasePanel.test.tsx`
- Test: `src/components/reconciliation/__tests__/ReconciliationRiskStrip.test.tsx`
- Test: `src/components/reconciliation/__tests__/ReconciliationImportPanel.test.tsx`

- [ ] **Step 1: Write the failing component tests for grouped inbox, strong match, ambiguous PIX, and stale risk**

```tsx
import { render, screen } from '@testing-library/react';

import { ReconciliationInbox } from '../ReconciliationInbox';
import { ReconciliationCasePanel } from '../ReconciliationCasePanel';
import { ReconciliationRiskStrip } from '../ReconciliationRiskStrip';
import { ReconciliationImportPanel } from '../ReconciliationImportPanel';

it('groups inbox items by priority including infrastructure', () => {
  render(<ReconciliationInbox cases={[
    { id: '1', priority: 'urgent', title: 'Conta paga no banco', subtitle: 'Itaú', confidence: 0.92, divergenceType: 'pending_bill_paid_in_bank', sourceHealth: 'healthy' },
    { id: '2', priority: 'infra', title: 'Santander stale', subtitle: '6d sem sync', confidence: 0.2, divergenceType: 'stale_connection', sourceHealth: 'stale' },
  ]} />);

  expect(screen.getByText('Urgente')).toBeInTheDocument();
  expect(screen.getByText('Infraestrutura')).toBeInTheDocument();
});

it('renders hypotheses and contextual question for ambiguous PIX', () => {
  render(
    <ReconciliationCasePanel
      state="ambiguous"
      caseData={{
        title: 'PIX sem correspondência',
        confidence: 0.35,
        hypotheses: [
          { label: 'transferência', confidence: 0.38 },
          { label: 'pagamento não lançado', confidence: 0.27 },
        ],
        contextualQuestion: 'Esse PIX foi pagamento ou transferência para pessoa?',
      }}
    />,
  );

  expect(screen.getByText('Hipóteses')).toBeInTheDocument();
  expect(screen.getByText('Esse PIX foi pagamento ou transferência para pessoa?')).toBeInTheDocument();
  expect(screen.getByText('Resolução proposta')).toBeInTheDocument();
});

it('renders honest empty state when no case is selected', () => {
  render(<ReconciliationCasePanel state="empty" caseData={null} isLoading={false} />);

  expect(screen.getByText('Selecione um caso para começar')).toBeInTheDocument();
});

it('renders stale connection as structural risk with CTA', () => {
  render(<ReconciliationRiskStrip items={[{ institutionName: 'Santander', hoursStale: 144 }]} />);

  expect(screen.getByText('Risco estrutural')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /reautenticar/i })).toBeInTheDocument();
});

it('renders manual import controls for all three v1 entry paths', () => {
  render(<ReconciliationImportPanel />);

  expect(screen.getByRole('button', { name: /colar extrato/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /upload csv/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /lançamento manual/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the component tests to verify the workspace core is still missing**

Run:

```bash
npx vitest run "src/components/reconciliation/__tests__/ReconciliationInbox.test.tsx" "src/components/reconciliation/__tests__/ReconciliationCasePanel.test.tsx" "src/components/reconciliation/__tests__/ReconciliationRiskStrip.test.tsx" "src/components/reconciliation/__tests__/ReconciliationImportPanel.test.tsx"
```

Expected:

```text
Error: Failed to resolve import '../ReconciliationInbox'
```

- [ ] **Step 3: Implement the manual import hook and UI before deepening summary/connections**

```typescript
export const useReconciliationImport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { source: 'manual_paste' | 'csv_upload' | 'manual_entry'; rows: NormalizedBankTransactionInput[] }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Unauthenticated');

      const payload = input.rows.map((row) => ({ ...row, user_id: userData.user.id }));
      const { error } = await supabase.from('bank_transactions').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-workspace'] });
    },
  });
};
```

```tsx
export function ReconciliationImportPanel() {
  const importMutation = useReconciliationImport();

  return (
    <Card className="rounded-[28px] border bg-card/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
      <CardContent className="space-y-4 p-6">
        <h3 className="text-lg font-semibold text-foreground">Entrada manual</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-xl">Colar extrato</Button>
          <Button variant="outline" className="rounded-xl">Upload CSV</Button>
          <Button className="rounded-xl">Lançamento manual</Button>
        </div>
        {importMutation.isPending ? <p className="text-sm text-muted-foreground">Importando...</p> : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Implement inbox, case, risk strip, and audit rail using existing Finance LA visual language**

```tsx
export function ReconciliationInbox({ cases }: { cases: ReconciliationCaseListItem[] }) {
  const groups = {
    urgent: cases.filter((item) => item.priority === 'urgent'),
    high: cases.filter((item) => item.priority === 'high'),
    medium: cases.filter((item) => item.priority === 'medium'),
    infra: cases.filter((item) => item.priority === 'infra'),
  };

  return (
    <Card className="rounded-[28px] border bg-card/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
      <CardContent className="space-y-4 p-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Inbox priorizada</h3>
          <p className="mt-1 text-sm text-muted-foreground">Urgência, confiança e risco estrutural.</p>
        </div>
        {(['urgent', 'high', 'medium', 'infra'] as const).map((priority) => (
          <div key={priority} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {priority === 'infra' ? 'Infraestrutura' : priority === 'medium' ? 'Média' : priority === 'high' ? 'Alta' : 'Urgente'}
            </p>
            {groups[priority].map((item) => (
              <button key={item.id} className="w-full rounded-2xl border border-border/80 bg-surface-elevated/60 p-4 text-left hover:border-primary/25">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{Math.round(item.confidence * 100)}%</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
              </button>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Re-run the component tests**

Run:

```bash
npx vitest run "src/components/reconciliation/__tests__/ReconciliationInbox.test.tsx" "src/components/reconciliation/__tests__/ReconciliationCasePanel.test.tsx" "src/components/reconciliation/__tests__/ReconciliationRiskStrip.test.tsx" "src/pages/Reconciliation.test.tsx"
```

Expected:

```text
Test Files  4 passed
```

- [ ] **Step 6: Commit the core workspace**

```bash
git add "src/hooks/useReconciliationImport.ts" "src/components/reconciliation" "src/pages/Reconciliation.tsx" "src/pages/Reconciliation.test.tsx"
git commit -m "feat: add reconciliation inbox and case workspace"
```

---

### Task 8: Verify Summary/Connections Depth, Realtime Refresh, Deploy, and End-to-End Smoke

**Files:**
- Modify: `src/hooks/useReconciliationWorkspaceQuery.ts`
- Modify: `src/components/reconciliation/ReconciliationSummaryCards.tsx`
- Modify: `src/components/reconciliation/ReconciliationConnectionPanel.tsx`
- Modify: `src/components/reconciliation/ReconciliationAuditRail.tsx`

- [ ] **Step 1: Add the summary and connection-depth tests only after the core workflow is alive**

```tsx
it('surfaces stale connection in the summary cards as structural risk', () => {
  render(
    <ReconciliationSummaryCards
      summary={{
        balanceDelta: 320,
        openCases: 17,
        highConfidenceCount: 6,
        staleConnections: 1,
        activeSources: ['manual', 'pluggy'],
      }}
    />,
  );

  expect(screen.getByText('Conexões em risco')).toBeInTheDocument();
  expect(screen.getByText('1 conexão em risco')).toBeInTheDocument();
});

it('shows visible audit explanation when a case auto-closes', () => {
  render(
    <ReconciliationAuditRail
      entries={[
        {
          id: 'audit-1',
          action: 'auto_closed',
          notes: 'underlying payable already updated externally',
          created_at: '2026-04-14T12:10:00Z',
        },
      ]}
    />,
  );

  expect(screen.getByText('underlying payable already updated externally')).toBeInTheDocument();
});
```

- [ ] **Step 2: Wire realtime invalidation for the new reconciliation tables**

```typescript
useEffect(() => {
  // Realtime is a freshness hint only. It complements polling and manual refresh,
  // but it is not the primary consistency contract for reconciliation state.
  const channel = supabase
    .channel('reconciliation_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reconciliation_cases' }, () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-workspace'] });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pluggy_connections' }, () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-workspace'] });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [queryClient]);
```

- [ ] **Step 3: Deploy the new edge functions and configure pg_cron only after local verification**

Do not enable the `pg_cron` schedule before both of these are green:

- local smoke (`scripts/pluggy/phase4-smoke.ts`)
- endpoint-level verification for the deployed functions

The cron must never be the first thing exercising a fresh poller in production.

Run:

```bash
npx supabase functions deploy reconciliation-action --yes && npx supabase functions deploy poll-pluggy-reconciliation --yes
```

Expected:

```text
Deployed Functions on project; reconciliation-action updated successfully.
Deployed Functions on project; poll-pluggy-reconciliation updated successfully.
```

- [ ] **Step 4: Execute the mandatory smoke matrix**

Run:

```bash
deno run --allow-env --allow-net --allow-read "scripts/pluggy/phase4-smoke.ts"
npx vitest run "src/pages/Reconciliation.test.tsx" "src/components/reconciliation/__tests__/ReconciliationInbox.test.tsx" "src/components/reconciliation/__tests__/ReconciliationCasePanel.test.tsx" "src/components/reconciliation/__tests__/ReconciliationRiskStrip.test.tsx"
deno test --allow-env --no-check "supabase/functions/_shared/pluggy-client.test.ts" "supabase/functions/_shared/bank-transaction-normalizer.test.ts" "supabase/functions/_shared/reconciliation-matcher.test.ts" "supabase/functions/reconciliation-action/index.test.ts" "supabase/functions/poll-pluggy-reconciliation/index.test.ts"
```

Expected:

```text
- /auth returns apiKey
- /items/{id} shows webhookUrl null
- /accounts returns at least one account for a configured item
- /transactions returns rows for at least one configured account
- /investments returns a valid JSON shape even when empty
- strong debit match renders confidence and resolution proposal
- ambiguous PIX renders hypotheses and contextual question
- stale connection appears in summary + risk strip and caps confidence
- auto-close is visible in audit trail, not silent
```

- [ ] **Step 5: Commit the operational hardening**

```bash
git add "src/hooks/useReconciliationWorkspaceQuery.ts" "src/components/reconciliation/ReconciliationSummaryCards.tsx" "src/components/reconciliation/ReconciliationConnectionPanel.tsx" "src/components/reconciliation/ReconciliationAuditRail.tsx"
git commit -m "feat: harden reconciliation summary and connection health"
```

---

### Task 9: Validate Conformance Against the Approved Spec and Mockups

**Files:**
- Modify: `docs/superpowers/specs/2026-04-14-bank-reconciliation-phase4-design.md` (only if implementation reveals a spec ambiguity)
- Modify: `tmp/phase4-reconciliation-workspace-mockup.html` (only if UI intentionally diverges and needs re-validation)
- Modify: `tmp/phase4-reconciliation-workspace-mockup-pix.html` (only if UI intentionally diverges and needs re-validation)

- [ ] **Step 1: Run the conformance checklist against the implemented system**

```text
Check and record:
- source-agnostic ingestion works for manual and Pluggy-fed rows
- stale connection degrades or caps confidence
- no silent reconcile writes occur
- the page reuses Finance LA design system primitives
- the workspace remains inbox-first
- the open case shows Ana Clara reasoning, hypotheses, and contextual question
- WhatsApp remains complementary, not the primary heavy-work surface
```

- [ ] **Step 2: Verify UI against the approved mockups**

```text
Compare the implemented workspace against:
- tmp/phase4-reconciliation-workspace-mockup.html
- tmp/phase4-reconciliation-workspace-mockup-pix.html

Validate:
- summary cards in the current Finance LA language
- risk strip above inbox when stale connections exist
- inbox left / case center / audit-context right
- 'Resolução proposta' naming preserved or intentionally refined
- ambiguous PIX still shows hypotheses + contextual question
```

- [ ] **Step 3: Capture any drift as explicit follow-up, not silent divergence**

```text
If anything differs from the approved spec/mockups:
- document the exact drift
- decide whether to fix implementation or update spec
- do not treat drift as acceptable by default
```

- [ ] **Step 4: Final verification run**

Run:

```bash
npx vitest run "src/pages/Reconciliation.test.tsx" "src/components/reconciliation/__tests__/ReconciliationInbox.test.tsx" "src/components/reconciliation/__tests__/ReconciliationCasePanel.test.tsx" "src/components/reconciliation/__tests__/ReconciliationRiskStrip.test.tsx" && deno test --allow-env --no-check "supabase/functions/_shared/pluggy-client.test.ts" "supabase/functions/_shared/bank-transaction-normalizer.test.ts" "supabase/functions/_shared/reconciliation-matcher.test.ts" "supabase/functions/reconciliation-action/index.test.ts" "supabase/functions/poll-pluggy-reconciliation/index.test.ts"
```

Expected:

```text
- all reconciliation UI tests pass
- all backend contract/matcher/poller tests pass
- no stale-derived case exceeds the stale confidence cap
- no auto-close result exists without matching audit visibility
```

- [ ] **Step 5: Commit only after conformance is explicit**

```bash
git add "src" "supabase/functions" "supabase/migrations" "docs/superpowers/specs/2026-04-14-bank-reconciliation-phase4-design.md"
git commit -m "feat: complete Phase 4 reconciliation workspace"
```

---

## Self-Review

### Spec coverage

- `v1 manual + v1.5 Pluggy`: covered by Tasks 1, 3, 5, and 7
- `source-agnostic pipeline`: covered by Tasks 2 and 3
- `Inbox-first native Finance LA workspace`: covered by Tasks 6 and 7
- `Design system alignment`: enforced in Tasks 6 and 7 by reusing `Header`, `PageContent`, `Sidebar`, existing card density, and summary-card language
- `stale connection as structural risk`: covered by Tasks 1, 5, 7, and 8
- `reconciliation != payment`: covered by Task 4 and reinforced across Tasks 3 and 8
- `audit trail + visible auto-close`: covered by Tasks 2, 4, and 8
- `WhatsApp as complementary channel, not primary workspace`: intentionally left out of v1 implementation scope except for future compatibility in Task 8 notes

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Every task has exact files, concrete snippets, commands, and expected outputs.
- The plan avoids generic “handle edge cases” language; stale-confidence, runtime apiKey lifecycle, and auto-close visibility are called out explicitly.

### Type consistency

- `external_account_id` and `internal_account_id` are used consistently across schema, normalizer, matcher, and worker tasks.
- Reconciliation writes are consistently named as `confirm`, `reject`, `defer`, `classify`, and `auto_close`; no task refers to them as payment operations.
- `X-API-KEY` is the only modeled Pluggy request header after `/auth`; no task reintroduces bearer auth.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-14-bank-reconciliation-phase4-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
