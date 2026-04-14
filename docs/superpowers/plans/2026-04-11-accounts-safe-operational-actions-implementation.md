# Accounts Safe Operational Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 3 safe operational actions for the contas domain so Ana Clara can propose, preview, confirm, execute, verify, and audit one safe mutation at a time after a concluded diagnosis.

**Architecture:** Keep the current three-layer split intact: `accounts-diagnostic.ts` remains observation, `accounts-diagnostic-conversations.ts` remains diagnosis, and a new safe-action layer handles eligibility, preview payloads, confirmation semantics, and expiry rules only. `accounts-safe-action-executor.ts` owns pre-write validation, the actual mutation path, post-write verification, and audit logging; no financial mutation may happen outside that executor. Reuse existing mutation helpers only through executor-owned wrappers so no mutation can bypass preview, explicit confirmation, idempotency, or verification.

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), `conversation_context`, `agent_action_log` via `logAgentAction()`, Deno tests, Vitest structural/template tests, Supabase SQL migrations.

---

## File Structure

**Create:**
- `supabase/functions/process-whatsapp-message/accounts-safe-actions.ts`
  Safe-action contract layer only: payload types, eligibility rules, preview builders, preview expiry, and confirmation parsing. This file must not execute writes or embed executor behavior.
- `supabase/functions/process-whatsapp-message/accounts-safe-actions.test.ts`
  Pure Deno tests for eligibility, payload building, preview expiry, confirmation semantics, and idempotency envelope generation.
- `supabase/functions/process-whatsapp-message/accounts-safe-action-executor.ts`
  Controlled mutation executor only: pre-write validation, actual write path selection, post-write verification, audit logging, and idempotent replay handling.
- `supabase/functions/process-whatsapp-message/accounts-safe-action-executor.test.ts`
  Deno tests using fake Supabase to prove one-action-only execution, pre-write aborts, post-write success/failure, and no duplicate writes on replay.
- `supabase/functions/process-whatsapp-message/__tests__/accounts-safe-action-templates.test.ts`
  Vitest snapshot/regression coverage for preview, success, decline, defer, abort, and failure copy.
- `supabase/functions/process-whatsapp-message/__tests__/context-manager-accounts-safe-action.test.ts`
  Structural test locking the new context type and routing branch.
- `supabase/functions/process-whatsapp-message/__tests__/index-accounts-safe-action-context.test.ts`
  Structural test locking `contextType` persistence order in `index.ts`.
- `supabase/migrations/20260411170001_add_awaiting_accounts_safe_action_confirm_enum.sql`
  Adds the new safe-action conversation enum value.

**Modify:**
- `supabase/functions/process-whatsapp-message/accounts-diagnostic-conversations.ts`
  Expose enough concluded diagnosis data to feed a single safe action proposal.
- `supabase/functions/process-whatsapp-message/accounts-response-templates.ts`
  Add field-accurate safe-action preview/result templates.
- `supabase/functions/process-whatsapp-message/context-manager.ts`
  Add `awaiting_accounts_safe_action_confirm`, safe-action routing, preview expiry handling, and clean transitions back to diagnosis.
- `supabase/functions/process-whatsapp-message/contas-pagar.ts`
  Reuse only mature bill mutation primitives when the tests prove they fit Phase 3 semantics. Do not move orchestration, eligibility, preview, or audit rules here. If a recurring-bill shutdown helper is needed, keep it as a narrow data adapter used only by the executor and pointed at the real `payable_bills` parent template surface (`is_recurring`, `next_occurrence_date`).
- `supabase/functions/process-whatsapp-message/ana-clara-core-executor.ts`
  Bridge concluded diagnosis into safe-action eligibility and preview messages when exactly one coherent mutation exists.
- `supabase/functions/process-whatsapp-message/index.ts`
  Preserve `contextType || step` priority for safe-action contexts in the contas branch.

**Do not modify unless the tests force it:**
- `supabase/functions/_shared/agent-memory.ts`
  Reuse `logAgentAction()` as-is first; only extend it if the audit payload truly cannot fit in `details`.

**Hard execution rule:**
- No mutation outside `accounts-safe-action-executor.ts`
- Existing helpers may be reused only when called by the executor
- Every safe action must map to one explicit executor write path
- `contas-pagar.ts` may expose narrow persistence adapters, but must not become a second safe-action orchestration layer

## Operational Phases

### Phase 0: Contract RED tests

- Lock context type, preview contract, decline/defer/abort/fail semantics, confirmation parser boundaries, and expiry behavior in tests before any implementation.

### Phase 1: Eligibility and preview payloads

- Implement the minimal contract seed in `accounts-safe-actions.ts`, then expand to the real anomaly/action matrix from the spec.

### Phase 2: Executor and mutation safety

- Implement `accounts-safe-action-executor.ts` with pre-write validation, one-path-per-action mutation routing, idempotent replay, post-write verification, and audit logging.

### Phase 3: Integration

- Wire the concluded diagnosis into preview generation, safe-action context persistence, and explicit confirmation handling in `ana-clara-core-executor.ts`, `context-manager.ts`, and `index.ts`.

### Phase 4: Deployment and safety validation

- Run targeted verification, validate the enum migration path, deploy, and execute the mandatory smoke matrix including stale confirmation, replay safety, and abort-without-write cases.

---

### Task 1: Lock the Safe-Action Contract

**Files:**
- Create: `supabase/functions/process-whatsapp-message/accounts-safe-actions.ts`
- Test: `supabase/functions/process-whatsapp-message/accounts-safe-actions.test.ts`
- Test: `supabase/functions/process-whatsapp-message/__tests__/accounts-safe-action-templates.test.ts`

- [ ] **Step 1: Write the failing contract tests**

```typescript
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import {
  buildPendingAccountsSafeAction,
  getSafeActionEligibility,
  isExpiredSafeActionPreview,
  parseSafeActionConfirmation,
} from './accounts-safe-actions.ts';

const overdue = {
  type: 'overdue_without_settlement',
  severity: 'S1',
  billId: 'bill-1',
  description: 'Celular (1/12)',
  providerName: null,
  amount: 99,
  dueDate: '2026-04-05',
  status: 'pending',
  statusLabel: 'Pendente',
  diagnosticNote: "A conta 'Celular (1/12)' venceu em 05/04 e ainda nao tem pagamento registrado.",
} as const;

Deno.test('getSafeActionEligibility returns not eligible until there is one coherent action', () => {
  assertEquals(
    getSafeActionEligibility({
      anomaly: overdue,
      diagnosticConclusion: { kind: 'still_open' },
      resolvedFields: {},
    }),
    { eligible: false, reason: 'missing_required_fields' },
  );
});

Deno.test('getSafeActionEligibility keeps reason values inside the expected contract set', () => {
  const allowedReasons = [
    'missing_required_fields',
    'multiple_plausible_actions',
    'target_not_confidently_identified',
    'diagnosis_not_concluded',
    'unsupported_action_for_conclusion',
  ];

  const result = getSafeActionEligibility({
    anomaly: overdue,
    diagnosticConclusion: { kind: 'still_open' },
    resolvedFields: {},
  });

  assertEquals(allowedReasons.includes(result.reason ?? ''), true);
});

Deno.test('buildPendingAccountsSafeAction captures field-accurate before/after and audit basis', () => {
  const pending = buildPendingAccountsSafeAction({
    anomaly: overdue,
    actionType: 'reschedule_due_date',
    targetType: 'payable_bill',
    targetId: 'bill-1',
    before: { due_date: '2026-04-05', status: 'pending' },
    after: { due_date: '2026-04-20' },
    effectSummary: 'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
    diagnosticBasis: {
      conclusionKey: 'still_open',
      conclusionText: 'essa conta continua em aberto segundo o usuario',
      source: 'explicit_health_check',
    },
    confirmationPrompt: "Vou reagendar o vencimento da conta 'Celular (1/12)' de 05/04 para 20/04. Confirma? (sim/nao)",
    previewExpiresAt: '2026-04-11T18:00:00.000Z',
  });

  assertEquals(pending.actionType, 'reschedule_due_date');
  assertEquals(pending.before.due_date, '2026-04-05');
  assertEquals(pending.after.due_date, '2026-04-20');
  assertEquals(typeof pending.idempotencyKey, 'string');
});

Deno.test('parseSafeActionConfirmation separates explicit yes, defer, decline, and ambiguity', () => {
  assertEquals(parseSafeActionConfirmation('sim').kind, 'confirm');
  assertEquals(parseSafeActionConfirmation('confirmo').kind, 'confirm');
  assertEquals(parseSafeActionConfirmation('sim, confirmo').kind, 'confirm');
  assertEquals(parseSafeActionConfirmation('depois vejo').kind, 'defer');
  assertEquals(parseSafeActionConfirmation('nao').kind, 'decline');
  assertEquals(parseSafeActionConfirmation('ok, pode fazer').kind, 'ambiguous');
  assertEquals(parseSafeActionConfirmation('acho que sim').kind, 'ambiguous');
});

Deno.test('isExpiredSafeActionPreview expires by time and stale before snapshot', () => {
  assertEquals(
    isExpiredSafeActionPreview({
      now: '2026-04-11T19:00:00.000Z',
      previewExpiresAt: '2026-04-11T18:00:00.000Z',
      beforeSnapshotStillMatches: true,
      sameContext: true,
    }),
    true,
  );
});

Deno.test('isExpiredSafeActionPreview expires when the before snapshot no longer matches', () => {
  assertEquals(
    isExpiredSafeActionPreview({
      now: '2026-04-11T17:00:00.000Z',
      previewExpiresAt: '2026-04-11T18:00:00.000Z',
      beforeSnapshotStillMatches: false,
      sameContext: true,
    }),
    true,
  );
});

Deno.test('isExpiredSafeActionPreview expires when context has shifted', () => {
  assertEquals(
    isExpiredSafeActionPreview({
      now: '2026-04-11T17:00:00.000Z',
      previewExpiresAt: '2026-04-11T18:00:00.000Z',
      beforeSnapshotStillMatches: true,
      sameContext: false,
    }),
    true,
  );
});
```

- [ ] **Step 2: Run the contract tests to verify RED**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/process-whatsapp-message/accounts-safe-actions.test.ts"
```

Expected:

```text
FAIL Module not found "supabase/functions/process-whatsapp-message/accounts-safe-actions.ts"
```

- [ ] **Step 3: Write the minimal safe-action contract implementation**

```typescript
import type { AccountsObservationPresentation } from './accounts-response-templates.ts';

export type AccountsSafeActionType =
  | 'mark_as_paid'
  | 'reschedule_due_date'
  | 'update_amount'
  | 'cancel_one_off_bill'
  | 'disable_recurrence'
  | 'cancel_current_occurrence'
  | 'update_paid_amount'
  | 'update_paid_at'
  | 'update_paid_record'
  | 'adjust_account_balance'
  | 'deactivate_account';

export type SafeActionEligibilityReason =
  | 'missing_required_fields'
  | 'multiple_plausible_actions'
  | 'target_not_confidently_identified'
  | 'diagnosis_not_concluded'
  | 'unsupported_action_for_conclusion';

export interface PendingAccountsSafeAction {
  anomalyType: AccountsObservationPresentation['type'];
  actionType: AccountsSafeActionType;
  targetType: 'payable_bill' | 'account';
  targetId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  effectSummary: string;
  diagnosticBasis: {
    conclusionKey: string;
    conclusionText: string;
    source: 'passive_listing' | 'explicit_health_check' | 'direct_diagnostic_prompt';
  };
  confirmationPrompt: string;
  confirmationSource?: 'explicit_yes' | 'explicit_confirm_phrase' | 'button_confirm' | 'reply_to_preview';
  confirmationText?: string;
  idempotencyKey: string;
  surfacedAt: string;
  previewExpiresAt: string;
  confirmedAt?: string;
}

// This builder creates the pre-confirmation pending payload only.
// confirmationSource, confirmationText, and confirmedAt are attached later after explicit confirmation.

export function getSafeActionEligibility(params: {
  anomaly: AccountsObservationPresentation;
  diagnosticConclusion: { kind: string };
  resolvedFields: Record<string, unknown>;
}): { eligible: boolean; reason?: SafeActionEligibilityReason } {
  // Minimal contract seed only. Task 3 expands this into the full anomaly/action matrix from the spec.
  if (params.diagnosticConclusion.kind === 'still_open' && !params.resolvedFields.newDueDate) {
    return { eligible: false, reason: 'missing_required_fields' };
  }
  return { eligible: true };
}

export function buildPendingAccountsSafeAction(
  params: Omit<PendingAccountsSafeAction, 'anomalyType' | 'idempotencyKey' | 'surfacedAt'> & { anomaly: AccountsObservationPresentation },
): PendingAccountsSafeAction {
  return {
    anomalyType: params.anomaly.type,
    actionType: params.actionType,
    targetType: params.targetType,
    targetId: params.targetId,
    before: params.before,
    after: params.after,
    effectSummary: params.effectSummary,
    diagnosticBasis: params.diagnosticBasis,
    confirmationPrompt: params.confirmationPrompt,
    previewExpiresAt: params.previewExpiresAt,
    surfacedAt: new Date().toISOString(),
    idempotencyKey: crypto.randomUUID(),
  };
}

export function parseSafeActionConfirmation(text: string): { kind: 'confirm' | 'decline' | 'defer' | 'ambiguous' } {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  // Deliberately conservative: borderline phrases like "ok, pode fazer" stay ambiguous in this phase.
  if (normalized === 'sim' || normalized === 'confirmo' || normalized === 'sim, confirmo') return { kind: 'confirm' };
  if (normalized === 'nao') return { kind: 'decline' };
  if (normalized.includes('depois')) return { kind: 'defer' };
  return { kind: 'ambiguous' };
}

export function isExpiredSafeActionPreview(params: {
  now: string;
  previewExpiresAt: string;
  beforeSnapshotStillMatches: boolean;
  sameContext: boolean;
}): boolean {
  return new Date(params.now) > new Date(params.previewExpiresAt) || !params.beforeSnapshotStillMatches || !params.sameContext;
}
```

- [ ] **Step 4: Run the contract tests to verify GREEN**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/process-whatsapp-message/accounts-safe-actions.test.ts"
```

Expected:

```text
ok | 7 passed | 0 failed
```

- [ ] **Step 5: Freeze the safe-action template wording**

```typescript
import { describe, expect, it } from 'vitest';

import {
  templateAccountsSafeActionPreview,
  templateAccountsSafeActionAbort,
  templateAccountsSafeActionDecline,
  templateAccountsSafeActionDefer,
  templateAccountsSafeActionFailure,
  templateAccountsSafeActionSuccess,
} from '../accounts-response-templates.ts';

describe('accounts safe action templates', () => {
  it('renders a field-accurate preview', () => {
    const msg = templateAccountsSafeActionPreview({
      title: "Vou reagendar o vencimento da conta 'Celular (1/12)'.",
      changes: ['• due_date: 05/04 -> 20/04'],
      effectSummary: 'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
    });

    expect(msg).toContain('Confirma? (sim/nao)');
    expect(msg).toContain('• due_date: 05/04 -> 20/04');
  });

  it('renders field-accurate previews for mark_as_paid, update_paid_record, and deactivate_account', () => {
    expect(
      templateAccountsSafeActionPreview({
        title: "Vou marcar a conta 'Celular (1/12)' como paga.",
        changes: ['• status: pending -> paid', '• paid_amount: não informado -> R$ 99,00', '• paid_at: não informado -> 11/04'],
        effectSummary: 'Ela deixa de aparecer como pendente e passa a ficar registrada como paga.',
      }),
    ).toContain('• status: pending -> paid');

    expect(
      templateAccountsSafeActionPreview({
        title: "Vou completar o registro da conta 'Academia'.",
        changes: ['• paid_amount: não informado -> R$ 120,00', '• paid_at: não informado -> 10/04'],
        effectSummary: 'O registro pago continua pago, mas agora fica completo.',
      }),
    ).toContain('• paid_at: não informado -> 10/04');

    expect(
      templateAccountsSafeActionPreview({
        title: "Vou desativar a conta 'NuConta'.",
        changes: ['• is_active: true -> false'],
        effectSummary: 'Ela deixa de aparecer como conta ativa, sem apagar o histórico.',
      }),
    ).toContain('• is_active: true -> false');
  });

  it('renders success, decline, defer, abort, and failure variants', () => {
    expect(templateAccountsSafeActionSuccess(['• due_date: 05/04 -> 20/04'], ['• ela volta a vencer em 20/04'])).toContain('Pronto.');
    expect(templateAccountsSafeActionDecline()).toContain('Nao alterei nada');
    expect(templateAccountsSafeActionDefer()).toContain('Nao alterei nada agora');
    expect(templateAccountsSafeActionAbort()).toContain('Parei essa acao antes de alterar o sistema');
    expect(templateAccountsSafeActionFailure()).toContain('Nao consegui concluir essa alteracao com seguranca');
  });
});
```

- [ ] **Step 6: Run the template tests**

Run:

```bash
npx vitest run "supabase/functions/process-whatsapp-message/__tests__/accounts-safe-action-templates.test.ts"
```

Expected:

```text
Test Files  1 passed
Tests  3 passed
```

- [ ] **Step 7: Commit**

```bash
git add "supabase/functions/process-whatsapp-message/accounts-safe-actions.ts" "supabase/functions/process-whatsapp-message/accounts-safe-actions.test.ts" "supabase/functions/process-whatsapp-message/__tests__/accounts-safe-action-templates.test.ts" "supabase/functions/process-whatsapp-message/accounts-response-templates.ts"
git commit -m "feat: add safe action contracts for contas"
```

### Task 2: Add Safe-Action Context and Enum

**Files:**
- Create: `supabase/migrations/20260411170001_add_awaiting_accounts_safe_action_confirm_enum.sql`
- Modify: `supabase/functions/process-whatsapp-message/context-manager.ts`
- Test: `supabase/functions/process-whatsapp-message/__tests__/context-manager-accounts-safe-action.test.ts`
- Test: `supabase/functions/process-whatsapp-message/__tests__/index-accounts-safe-action-context.test.ts`

- [ ] **Step 1: Write the failing structural tests for the new context**

```typescript
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('accounts safe action context wiring', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const contextManagerPath = join(dir, '..', 'context-manager.ts');
  const indexPath = join(dir, '..', 'index.ts');
  const contextSrc = readFileSync(contextManagerPath, 'utf8');
  const indexSrc = readFileSync(indexPath, 'utf8');

  it('adds awaiting_accounts_safe_action_confirm to ContextType and FLOW_CONTEXT_TYPES', () => {
    expect(contextSrc).toContain("'awaiting_accounts_safe_action_confirm'");
  });

  it('routes the new context through its own handler branch', () => {
    expect(contextSrc).toContain("if (contextType === 'awaiting_accounts_safe_action_confirm')");
  });

  it('keeps contextType ahead of step when persisting contas contexts', () => {
    expect(indexSrc).toContain("const contextStep = (resultado.dados?.contextType || resultado.dados?.step) as ContextType;");
  });
});
```

- [ ] **Step 2: Run the structural tests to verify RED**

Run:

```bash
npx vitest run "supabase/functions/process-whatsapp-message/__tests__/context-manager-accounts-safe-action.test.ts" "supabase/functions/process-whatsapp-message/__tests__/index-accounts-safe-action-context.test.ts"
```

Expected:

```text
FAIL expected context-manager.ts to contain awaiting_accounts_safe_action_confirm
```

- [ ] **Step 2.5: Treat the enum migration as sensitive before writing it**

Run:

```bash
git diff -- "supabase/migrations" && npx vitest run "supabase/functions/process-whatsapp-message/__tests__/context-manager-accounts-safe-action.test.ts" "supabase/functions/process-whatsapp-message/__tests__/index-accounts-safe-action-context.test.ts"
```

Expected:

```text
- confirms whether another recent enum/context migration touched the same area
- structural tests stay red for the expected missing-context reason, not for unrelated breakage
```

- [ ] **Step 3: Add the enum migration and context type**

```sql
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'awaiting_accounts_safe_action_confirm';
```

```typescript
export type ContextType =
  | 'idle'
  | 'editing_transaction'
  | 'creating_transaction'
  | 'confirming_action'
  | 'multi_step_flow'
  | 'accounts_diagnostic_context'
  | 'awaiting_accounts_safe_action_confirm'
  | 'awaiting_calendar_create_confirm';

const FLOW_CONTEXT_TYPES: ContextType[] = [
  'creating_transaction',
  'editing_transaction',
  'confirming_action',
  'multi_step_flow',
  'accounts_diagnostic_context',
  'awaiting_accounts_safe_action_confirm',
  'awaiting_calendar_create_confirm',
];
```

- [ ] **Step 4: Add the dedicated safe-action routing branch**

```typescript
if (contextType === 'awaiting_accounts_safe_action_confirm') {
  const pending = contexto.context_data as PendingAccountsSafeAction;
  const resolution = handleAccountsSafeActionReply({
    pending,
    userText: texto,
  });

  if (resolution.nextState === 'SAFE_ACTION_ABORTED' || resolution.nextState === 'SAFE_ACTION_DECLINED' || resolution.nextState === 'SAFE_ACTION_DEFERRED') {
    await limparContexto(userId);
    return resolution.message;
  }

  await salvarContexto(userId, 'awaiting_accounts_safe_action_confirm', resolution.contextData, phone);
  return resolution.message;
}
```

- [ ] **Step 5: Re-run the structural tests to verify GREEN**

Run:

```bash
npx vitest run "supabase/functions/process-whatsapp-message/__tests__/context-manager-accounts-safe-action.test.ts" "supabase/functions/process-whatsapp-message/__tests__/index-accounts-safe-action-context.test.ts"
```

Expected:

```text
Test Files  2 passed
Tests  3 passed
```

- [ ] **Step 6: Commit**

```bash
git add "supabase/migrations/20260411170001_add_awaiting_accounts_safe_action_confirm_enum.sql" "supabase/functions/process-whatsapp-message/context-manager.ts" "supabase/functions/process-whatsapp-message/__tests__/context-manager-accounts-safe-action.test.ts" "supabase/functions/process-whatsapp-message/__tests__/index-accounts-safe-action-context.test.ts"
git commit -m "feat: add safe action context for contas"
```

### Task 3: Implement Eligibility, Previews, and Diagnosis-to-Action Bridging

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/accounts-safe-actions.ts`
- Modify: `supabase/functions/process-whatsapp-message/accounts-diagnostic-conversations.ts`
- Modify: `supabase/functions/process-whatsapp-message/accounts-response-templates.ts`
- Modify: `supabase/functions/process-whatsapp-message/ana-clara-core-executor.ts`
- Test: `supabase/functions/process-whatsapp-message/accounts-safe-actions.test.ts`
- Test: `supabase/functions/process-whatsapp-message/accounts-diagnostic-conversations.test.ts`

- [ ] **Step 1: Write failing eligibility tests for each anomaly/action pair**

```typescript
Deno.test('zeroed_bill only becomes eligible for update_amount when value is explicitly resolved', () => {
  const zeroed = {
    type: 'zeroed_bill',
    severity: 'S2',
    billId: 'bill-2',
    description: 'Internet Casa 7 Link',
    providerName: null,
    amount: null,
    dueDate: '2026-04-25',
    status: 'pending',
    statusLabel: 'Pendente',
    diagnosticNote: "A conta 'Internet Casa 7 Link' com vencimento em 25/04 esta com valor zerado.",
  } as const;

  assertEquals(
    getSafeActionEligibility({
      anomaly: zeroed,
      diagnosticConclusion: { kind: 'value_missing' },
      resolvedFields: {},
    }),
    { eligible: false, reason: 'missing_required_fields' },
  );

  assertEquals(
    getSafeActionEligibility({
      anomaly: zeroed,
      diagnosticConclusion: { kind: 'value_missing' },
      resolvedFields: { amount: 120 },
    }).eligible,
    true,
  );
});

Deno.test('zero balance account can produce either adjust balance or deactivate account, but never both at once', () => {
  const activeConclusion = getSafeActionEligibility({
    anomaly: {
      type: 'zero_balance_account',
      severity: 'S5',
      billId: null,
      accountId: 'account-1',
      description: 'NuConta',
      providerName: null,
      amount: 0,
      dueDate: null,
      status: 'active',
      statusLabel: 'Saldo zerado',
      diagnosticNote: "A conta bancaria 'NuConta' esta com saldo zerado.",
    },
    diagnosticConclusion: { kind: 'account_still_active' },
    resolvedFields: { current_balance: 5221 },
  });

  assertEquals(activeConclusion.actionType, 'adjust_account_balance');
});
```

- [ ] **Step 2: Run Deno tests to verify RED**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/process-whatsapp-message/accounts-safe-actions.test.ts" "supabase/functions/process-whatsapp-message/accounts-diagnostic-conversations.test.ts"
```

Expected:

```text
FAIL expected eligibility rules to return actionType or missing_required_fields
```

- [ ] **Step 3: Extend the domain layer to return one coherent action only**

```typescript
export function getSafeActionEligibility(params: {
  anomaly: AccountsObservationPresentation;
  diagnosticConclusion: { kind: string };
  resolvedFields: Record<string, unknown>;
}): { eligible: boolean; actionType?: AccountsSafeActionType; reason?: string } {
  const { anomaly, diagnosticConclusion, resolvedFields } = params;

  if (anomaly.type === 'overdue_without_settlement' && diagnosticConclusion.kind === 'paid_already') {
    if (!resolvedFields.paid_at || resolvedFields.paid_amount == null) {
      return { eligible: false, reason: 'missing_required_fields' };
    }
    return { eligible: true, actionType: 'mark_as_paid' };
  }

  if (anomaly.type === 'overdue_without_settlement' && diagnosticConclusion.kind === 'still_open') {
    if (!resolvedFields.new_due_date) {
      return { eligible: false, reason: 'missing_required_fields' };
    }
    return { eligible: true, actionType: 'reschedule_due_date' };
  }

  if (anomaly.type === 'zeroed_bill' && diagnosticConclusion.kind === 'value_missing') {
    if (resolvedFields.amount == null) return { eligible: false, reason: 'missing_required_fields' };
    return { eligible: true, actionType: 'update_amount' };
  }

  if (anomaly.type === 'zero_balance_account' && diagnosticConclusion.kind === 'account_inactive') {
    return { eligible: true, actionType: 'deactivate_account' };
  }

  return { eligible: false, reason: 'no_single_coherent_action' };
}
```

- [ ] **Step 4: Bridge concluded diagnosis into preview generation**

```typescript
export function buildSafeActionPreviewFromDiagnosis(params: {
  anomaly: AccountsObservationPresentation;
  diagnosticConclusion: { kind: string; text: string };
  resolvedFields: Record<string, unknown>;
}): PendingAccountsSafeAction | null {
  const eligibility = getSafeActionEligibility(params);
  if (!eligibility.eligible || !eligibility.actionType) return null;

  if (eligibility.actionType === 'update_amount') {
    return buildPendingAccountsSafeAction({
      anomaly: params.anomaly,
      actionType: 'update_amount',
      targetType: 'payable_bill',
      targetId: params.anomaly.billId!,
      before: { amount: params.anomaly.amount },
      after: { amount: params.resolvedFields.amount },
      effectSummary: 'A conta continua pendente, mas agora com o valor correto no sistema.',
      diagnosticBasis: {
        conclusionKey: params.diagnosticConclusion.kind,
        conclusionText: params.diagnosticConclusion.text,
        source: 'explicit_health_check',
      },
      confirmationPrompt: `Vou atualizar o valor da conta '${params.anomaly.description}' para R$ ${Number(params.resolvedFields.amount).toFixed(2).replace('.', ',')}. Confirma? (sim/nao)`,
      previewExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  }

  return null;
}
```

- [ ] **Step 5: Re-run the Deno tests to verify GREEN**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/process-whatsapp-message/accounts-safe-actions.test.ts" "supabase/functions/process-whatsapp-message/accounts-diagnostic-conversations.test.ts"
```

Expected:

```text
ok | 2 passed | 0 failed
```

- [ ] **Step 6: Commit**

```bash
git add "supabase/functions/process-whatsapp-message/accounts-safe-actions.ts" "supabase/functions/process-whatsapp-message/accounts-diagnostic-conversations.ts" "supabase/functions/process-whatsapp-message/accounts-safe-actions.test.ts" "supabase/functions/process-whatsapp-message/accounts-diagnostic-conversations.test.ts" "supabase/functions/process-whatsapp-message/accounts-response-templates.ts" "supabase/functions/process-whatsapp-message/ana-clara-core-executor.ts"
git commit -m "feat: bridge diagnosis conclusions into safe action previews"
```

### Task 4: Build the Controlled Mutation Executor

**Files:**
- Create: `supabase/functions/process-whatsapp-message/accounts-safe-action-executor.ts`
- Test: `supabase/functions/process-whatsapp-message/accounts-safe-action-executor.test.ts`
- Modify: `supabase/functions/process-whatsapp-message/contas-pagar.ts`

- [ ] **Step 1: Write executor tests for pre-write abort, idempotent replay, and post-write success**

```typescript
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { executePendingAccountsSafeAction } from './accounts-safe-action-executor.ts';

Deno.test('aborts before writing when the before snapshot no longer matches relevant fields', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [{ id: 'bill-1', due_date: '2026-04-22', status: 'pending' }],
  });

  const result = await executePendingAccountsSafeAction(fake, {
    actionType: 'reschedule_due_date',
    targetType: 'payable_bill',
    targetId: 'bill-1',
    before: { due_date: '2026-04-05', status: 'pending' },
    after: { due_date: '2026-04-20' },
    effectSummary: 'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
    diagnosticBasis: {
      conclusionKey: 'still_open',
      conclusionText: 'essa conta continua em aberto segundo o usuario',
      source: 'explicit_health_check',
    },
    confirmationPrompt: "Vou reagendar o vencimento da conta 'Celular (1/12)' de 05/04 para 20/04. Confirma? (sim/nao)",
    confirmationText: 'sim',
    confirmationSource: 'explicit_yes',
    idempotencyKey: 'same-key',
    surfacedAt: '2026-04-11T10:00:00.000Z',
    previewExpiresAt: '2026-04-11T11:00:00.000Z',
  });

  assertEquals(result.finalState, 'SAFE_ACTION_ABORTED');
  assertEquals(fake.updateCalls.length, 0);
});

Deno.test('succeeds only after re-reading the persisted record and matching after fields', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [{ id: 'bill-1', due_date: '2026-04-05', status: 'pending' }],
  });

  const result = await executePendingAccountsSafeAction(fake, pendingRescheduleAction);

  assertEquals(result.finalState, 'SAFE_ACTION_SUCCEEDED');
  assertEquals(fake.updateCalls.length, 1);
  assertStringIncludes(result.message, 'Pronto.');
});

Deno.test('returns idempotent success on duplicate confirmation replay', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [{ id: 'bill-1', due_date: '2026-04-05', status: 'pending' }],
    agent_action_log: [{ action_type: 'accounts_safe_action', details: { idempotencyKey: 'same-key', finalState: 'SAFE_ACTION_SUCCEEDED' } }],
  });

  const replayAction = {
    actionType: 'reschedule_due_date',
    targetType: 'payable_bill',
    targetId: 'bill-1',
    before: { due_date: '2026-04-05', status: 'pending' },
    after: { due_date: '2026-04-20' },
    effectSummary: 'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
    diagnosticBasis: {
      conclusionKey: 'still_open',
      conclusionText: 'essa conta continua em aberto segundo o usuario',
      source: 'explicit_health_check',
    },
    confirmationPrompt: "Vou reagendar o vencimento da conta 'Celular (1/12)' de 05/04 para 20/04. Confirma? (sim/nao)",
    confirmationText: 'sim',
    confirmationSource: 'explicit_yes',
    idempotencyKey: 'same-key',
    surfacedAt: '2026-04-11T10:00:00.000Z',
    previewExpiresAt: '2026-04-11T11:00:00.000Z',
  };

  const result = await executePendingAccountsSafeAction(fake, replayAction);

  assertEquals(result.finalState, 'SAFE_ACTION_SUCCEEDED');
  assertEquals(result.idempotentReplay, true);
  assertEquals(fake.updateCalls.length, 0);
});
```

- [ ] **Step 2: Run the executor tests to verify RED**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/process-whatsapp-message/accounts-safe-action-executor.test.ts"
```

Expected:

```text
FAIL Module not found "supabase/functions/process-whatsapp-message/accounts-safe-action-executor.ts"
```

- [ ] **Step 3: Implement the controlled executor**

```typescript
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { logAgentAction } from '../_shared/agent-memory.ts';
import type { PendingAccountsSafeAction } from './accounts-safe-actions.ts';
import { marcarComoPago } from './contas-pagar.ts';

export async function executePendingAccountsSafeAction(
  supabase: SupabaseClient,
  pending: PendingAccountsSafeAction,
): Promise<{ finalState: string; message: string; idempotentReplay?: boolean }> {
  const replay = await findExistingActionByIdempotencyKey(supabase, pending.idempotencyKey);
  if (replay?.finalState === 'SAFE_ACTION_SUCCEEDED') {
    return { finalState: 'SAFE_ACTION_SUCCEEDED', message: 'Pronto.', idempotentReplay: true };
  }

  const current = await loadCurrentTargetRecord(supabase, pending);
  if (!matchesRelevantBeforeFields(current, pending.before, pending.actionType)) {
    return { finalState: 'SAFE_ACTION_ABORTED', message: 'Parei essa acao antes de alterar o sistema porque os dados mudaram desde o preview.' };
  }

  await runMutation(supabase, pending);

  const verified = await verifyAfterFields(supabase, pending);
  if (!verified.ok) {
    await logSafeAction(supabase, pending, 'SAFE_ACTION_FAILED', verified);
    return { finalState: 'SAFE_ACTION_FAILED', message: 'Nao consegui concluir essa alteracao com seguranca.' };
  }

  await logSafeAction(supabase, pending, 'SAFE_ACTION_SUCCEEDED', verified);
  return { finalState: 'SAFE_ACTION_SUCCEEDED', message: 'Pronto.' };
}
```

- [ ] **Step 4: Implement concrete mutation helpers in `contas-pagar.ts`**

Use `contas-pagar.ts` only for narrow persistence adapters. If these wrappers start accumulating Phase 3 orchestration or branching logic, move them back into `accounts-safe-action-executor.ts` instead of growing `contas-pagar.ts`.

```typescript
export async function atualizarContaPagarSegura(
  userId: string,
  billId: string,
  patch: Partial<Pick<ContaPagar, 'amount' | 'due_date' | 'status' | 'paid_amount' | 'paid_at'>>,
): Promise<{ sucesso: boolean; registro?: ContaPagar; mensagem?: string }> {
  const supabase = getSupabase();
  const payload = Object.assign({ updated_at: new Date().toISOString() }, patch);
  const { data, error } = await supabase
    .from('payable_bills')
    .update(payload)
    .eq('id', billId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) return { sucesso: false, mensagem: 'Erro ao atualizar conta.' };
  return { sucesso: true, registro: data as ContaPagar };
}

export async function desativarRecorrenciaContaSegura(
  userId: string,
  billId: string,
): Promise<{ sucesso: boolean; registro?: ContaPagar; mensagem?: string }> {
  return await atualizarContaPagarSegura(userId, billId, {
    is_recurring: false as never,
    next_occurrence_date: null as never,
  });
}

export async function atualizarContaBancariaSegura(
  userId: string,
  accountId: string,
  patch: { current_balance?: number; is_active?: boolean },
): Promise<{ sucesso: boolean; registro?: Record<string, unknown>; mensagem?: string }> {
  const supabase = getSupabase();
  const payload = Object.assign({ updated_at: new Date().toISOString() }, patch);
  const { data, error } = await supabase
    .from('accounts')
    .update(payload)
    .eq('id', accountId)
    .eq('user_id', userId)
    .select('id, name, current_balance, is_active')
    .single();

  if (error) return { sucesso: false, mensagem: 'Erro ao atualizar conta bancaria.' };
  return { sucesso: true, registro: data as Record<string, unknown> };
}
```

- [ ] **Step 5: Re-run executor tests to verify GREEN**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/process-whatsapp-message/accounts-safe-action-executor.test.ts"
```

Expected:

```text
ok | 3 passed | 0 failed
```

- [ ] **Step 6: Commit**

```bash
git add "supabase/functions/process-whatsapp-message/accounts-safe-action-executor.ts" "supabase/functions/process-whatsapp-message/accounts-safe-action-executor.test.ts" "supabase/functions/process-whatsapp-message/contas-pagar.ts"
git commit -m "feat: add controlled contas safe action executor"
```

### Task 5: Integrate End-to-End Safe Action Flow

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/context-manager.ts`
- Modify: `supabase/functions/process-whatsapp-message/ana-clara-core-executor.ts`
- Modify: `supabase/functions/process-whatsapp-message/index.ts`
- Test: `supabase/functions/process-whatsapp-message/accounts-diagnostic-conversations.test.ts`
- Test: `supabase/functions/process-whatsapp-message/__tests__/context-manager-accounts-safe-action.test.ts`

- [ ] **Step 1: Write the failing context transition tests**

```typescript
Deno.test('diagnosis-concluded overdue bill opens a safe action preview only when one action is coherent', () => {
  const transition = buildSafeActionPreviewFromDiagnosis({
    anomaly: overdue,
    diagnosticConclusion: { kind: 'paid_already', text: 'essa conta ja foi paga e o sistema ficou sem esse registro.' },
    resolvedFields: { paid_at: '2026-04-11', paid_amount: 99 },
  });

  assertEquals(transition?.actionType, 'mark_as_paid');
  assertStringIncludes(transition?.confirmationPrompt ?? '', 'Confirma? (sim/nao)');
});

it('routes awaiting_accounts_safe_action_confirm through executor/decline/defer/abort handling', () => {
  const branch = src.slice(
    src.indexOf("if (contextType === 'awaiting_accounts_safe_action_confirm')"),
    src.indexOf("if (contextType === 'transaction_registered')"),
  );

  expect(branch).toContain('executePendingAccountsSafeAction');
  expect(branch).toContain('parseSafeActionConfirmation');
});
```

- [ ] **Step 2: Run targeted tests to verify RED**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/process-whatsapp-message/accounts-diagnostic-conversations.test.ts" && npx vitest run "supabase/functions/process-whatsapp-message/__tests__/context-manager-accounts-safe-action.test.ts"
```

Expected:

```text
FAIL expected safe action preview builder and executor branch to exist
```

- [ ] **Step 3: Integrate safe-action preview creation after diagnosis conclusion**

```typescript
const safeAction = buildSafeActionPreviewFromDiagnosis({
  anomaly: diagnosticContext.anomaly,
  diagnosticConclusion: {
    kind: parsed.kind,
    text: conclusionText,
  },
  resolvedFields: extractResolvedSafeActionFields(userText, diagnosticContext),
});

if (safeAction) {
  await salvarContexto(userId, 'awaiting_accounts_safe_action_confirm', safeAction, phone);
  return templateAccountsSafeActionPreview({
    title: `Vou aplicar a acao segura para '${safeAction.targetId}'.`,
    changes: Object.entries(safeAction.after).map(([field, value]) => {
      const beforeValue = safeAction.before[field];
      return `• ${field}: ${String(beforeValue)} -> ${String(value)}`;
    }),
    effectSummary: safeAction.effectSummary,
  });
}
```

- [ ] **Step 4: Integrate confirmation, decline, defer, abort, and execution in the context manager**

```typescript
if (contextType === 'awaiting_accounts_safe_action_confirm') {
  const pending = contexto.context_data as PendingAccountsSafeAction;
  const parsed = parseSafeActionConfirmation(texto);

  if (parsed.kind === 'decline') {
    await limparContexto(userId);
    return templateAccountsSafeActionDecline();
  }

  if (parsed.kind === 'defer') {
    await limparContexto(userId);
    return templateAccountsSafeActionDefer();
  }

  if (parsed.kind !== 'confirm') {
    await salvarContexto(userId, 'awaiting_accounts_safe_action_confirm', {
      ...pending,
      clarificationRequestedAt: new Date().toISOString(),
    }, phone);
    return templateAccountsDiagnosticClarifyingQuestion('so pra eu confirmar: voce quer que eu aplique essa alteracao, ou prefere deixar para depois?');
  }

  const result = await executePendingAccountsSafeAction(getSupabase(), {
    actionType: pending.actionType,
    anomalyType: pending.anomalyType,
    targetType: pending.targetType,
    targetId: pending.targetId,
    before: pending.before,
    after: pending.after,
    effectSummary: pending.effectSummary,
    diagnosticBasis: pending.diagnosticBasis,
    confirmationPrompt: pending.confirmationPrompt,
    idempotencyKey: pending.idempotencyKey,
    surfacedAt: pending.surfacedAt,
    previewExpiresAt: pending.previewExpiresAt,
    confirmationSource: 'explicit_yes',
    confirmationText: texto,
    confirmedAt: new Date().toISOString(),
  });

  await limparContexto(userId);
  return result.message;
}
```

- [ ] **Step 5: Re-run the targeted tests to verify GREEN**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/process-whatsapp-message/accounts-diagnostic-conversations.test.ts" "supabase/functions/process-whatsapp-message/accounts-safe-actions.test.ts" "supabase/functions/process-whatsapp-message/accounts-safe-action-executor.test.ts" && npx vitest run "supabase/functions/process-whatsapp-message/__tests__/accounts-safe-action-templates.test.ts" "supabase/functions/process-whatsapp-message/__tests__/context-manager-accounts-safe-action.test.ts" "supabase/functions/process-whatsapp-message/__tests__/index-accounts-safe-action-context.test.ts"
```

Expected:

```text
All targeted Deno tests pass
All targeted Vitest tests pass
```

- [ ] **Step 6: Commit**

```bash
git add "supabase/functions/process-whatsapp-message/context-manager.ts" "supabase/functions/process-whatsapp-message/ana-clara-core-executor.ts" "supabase/functions/process-whatsapp-message/index.ts" "supabase/functions/process-whatsapp-message/accounts-diagnostic-conversations.test.ts" "supabase/functions/process-whatsapp-message/__tests__/context-manager-accounts-safe-action.test.ts"
git commit -m "feat: wire contas safe actions into diagnosis flow"
```

### Task 6: Verify, Apply Migration, and Smoke the Full Protocol

**Files:**
- Modify: `docs/superpowers/specs/2026-04-11-accounts-safe-operational-actions-spec.md` (only if implementation reveals a real schema mismatch)
- Test: existing targeted suites above

- [ ] **Step 1: Run the full targeted verification set**

Run:

```bash
deno test --allow-env --no-check "supabase/functions/process-whatsapp-message/accounts-safe-actions.test.ts" "supabase/functions/process-whatsapp-message/accounts-safe-action-executor.test.ts" "supabase/functions/process-whatsapp-message/accounts-diagnostic-conversations.test.ts" "supabase/functions/process-whatsapp-message/accounts-diagnostic.test.ts" "supabase/functions/process-whatsapp-message/ana-clara-core-executor.test.ts"
npx vitest run "supabase/functions/process-whatsapp-message/__tests__/accounts-safe-action-templates.test.ts" "supabase/functions/process-whatsapp-message/__tests__/context-manager-accounts-safe-action.test.ts" "supabase/functions/process-whatsapp-message/__tests__/index-accounts-safe-action-context.test.ts"
```

Expected:

```text
All targeted Deno tests pass
All targeted Vitest tests pass
```

- [ ] **Step 2: Check lints on the touched files**

Run:

```bash
# Use Cursor ReadLints on:
# - accounts-safe-actions.ts
# - accounts-safe-action-executor.ts
# - accounts-response-templates.ts
# - accounts-diagnostic-conversations.ts
# - context-manager.ts
# - contas-pagar.ts
# - ana-clara-core-executor.ts
# - index.ts
```

Expected:

```text
No new linter errors in touched files
```

- [ ] **Step 3: Apply the enum migration**

Before pushing, verify the enum path is still safe:

```bash
git diff -- "supabase/migrations/20260411170001_add_awaiting_accounts_safe_action_confirm_enum.sql"
npx vitest run "supabase/functions/process-whatsapp-message/__tests__/context-manager-accounts-safe-action.test.ts" "supabase/functions/process-whatsapp-message/__tests__/index-accounts-safe-action-context.test.ts"
```

Expected:

```text
- migration file is exactly the intended enum addition
- structural context tests are green before deploy
```

Run:

```bash
npx supabase db push --include-all --yes
```

Expected:

```text
Applying migration 20260411170001_add_awaiting_accounts_safe_action_confirm_enum.sql
Finished supabase db push.
```

- [ ] **Step 4: Deploy the function**

Run:

```bash
npx supabase functions deploy process-whatsapp-message --yes
```

Expected:

```text
Deployed Functions on project; process-whatsapp-message updated successfully.
```

- [ ] **Step 5: Smoke the full protocol on WhatsApp**

Run the following minimum smoke matrix on the production test number:

```text
1. overdue_without_settlement -> mark_as_paid
   contas a pagar
   investiga
   foi paga
   [informar data e valor se faltarem]
   sim

2. overdue_without_settlement -> reschedule_due_date
   contas a pagar
   investiga
   ainda está em aberto
   quero empurrar
   [informar nova data válida]
   sim

3. zeroed_bill -> update_amount
   analisa minhas contas
   fala da conta zerada
   faltou o valor
   [informar valor]
   sim

4. zeroed_bill -> cancel_one_off_bill
   analisa minhas contas
   fala da conta zerada
   essa conta não se aplica mais
   sim

5. zero_balance_account -> adjust_account_balance
   analisa minhas contas
   fala da nuconta
   ela ainda está ativa
   [informar saldo correto]
   sim

6. zero_balance_account -> deactivate_account
   analisa minhas contas
   fala da nuconta
   não uso mais
   sim

7. stale confirmation
   gerar preview
   invalidar preview por tempo ou mudança de snapshot
   sim

8. duplicate confirmation / replay
   gerar preview
   sim
   reenviar o mesmo "sim"

9. topic switch -> abort without write
   gerar preview
   quanto eu tenho na nubank?

10. post-write mismatch
    simular via teste controlado ou ambiente fake uma escrita com releitura divergente
```

Expected:

```text
- preview appears before every mutation
- every preview is field-accurate
- explicit confirmation is required
- duplicate confirmation does not double-apply
- stale confirmation is rejected without mutation
- success only appears after mutation + verification
- topic switch aborts or exits the safe-action thread without mutation
- post-write mismatch returns failure and never returns success
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/plans/2026-04-11-accounts-safe-operational-actions-implementation.md docs/superpowers/specs/2026-04-11-accounts-safe-operational-actions-spec.md
git add supabase/functions/process-whatsapp-message supabase/migrations/20260411170001_add_awaiting_accounts_safe_action_confirm_enum.sql
git commit -m "feat: implement safe operational actions for contas"
```

Do not stage `supabase/.temp/` or other editor-local files.

---

## Smoke baseline: dedicated user (production)

Phase 3 full matrix was validated on a **dedicated production user** so we never invented or rewrote real customer data to close cases.

### Identity

| Field | Value |
| --- | --- |
| User id | `6b868284-cfb3-46bf-ba32-34c46cbb8283` |
| Email | `phase3-smoke-20260414@example.com` |
| WhatsApp (E.164) | `5521990000001` |

**Prerequisite:** before the first successful confirmation, ensure this user has an `agent_identity` row (e.g. via `ensure_agent_identity` or the same path used for normal onboarding). Without it, confirm paths can fail with 500 until identity exists.

### Anomalies exercised (see spec §2)

| Spec anomaly | Safe actions exercised on the baseline |
| --- | --- |
| `overdue_without_settlement` | `mark_as_paid`, `reschedule_due_date` |
| `zeroed_bill` | `update_amount`, `cancel_one_off_bill` |
| `paid_inconsistent` | `update_paid_amount` |
| `zero_balance_account` | `adjust_account_balance`, `deactivate_account` |

**Protocol / cross-cutting:** preview before write, explicit confirm, stale confirmation rejection, duplicate confirm / idempotency, topic switch without write, post-write verification (including date-field normalization such as `paid_at` vs calendar date).

### Seeded records

Data was seeded **explicitly** for this user: accounts and `payable_bills` (and related rows as required by the app) using identifiable **“Smoke …”** naming so diagnostics could target stable entities. Exact row ids are **environment-specific**; reuse by **user id + fixture names** (or re-seed in non-prod from a future script if you need a clean slate).

### Reusing this baseline safely

- Prefer **read-only** replays when checking copy and routing; remember that successful mutations **change** balances, dates, and flags—re-run diagnosis if previews look stale.
- Do not use this user for unrelated experiments without accepting **state drift**; for repeated end-to-end regression, either tolerate mutated state or restore from a documented seed script later.
- Idempotent confirms should **not** double-apply; if an action already landed, expect deferral or safe no-op semantics per executor rules.

### Retention

**Do not delete** these fixtures in routine cleanup. They are intentional validation assets. If removal is ever required, export identifiers and document the last known good state first.

---

## Self-Review

### Spec coverage

- Observation/diagnosis/action separation: covered by Tasks 1, 3, and 5
- One coherent action only: covered by Task 3 tests and domain implementation
- Explicit preview/confirmation: covered by Tasks 1 and 5
- Audit trail and idempotency: covered by Task 4
- Post-write verification: covered by Task 4
- Enum/context wiring: covered by Task 2
- Production migration/deploy/smoke: covered by Task 6

### Placeholder scan

- No unresolved placeholder markers remain in the executable steps
- The recurring target is concretely anchored to the parent `payable_bills` mutation surface used by `generate_recurring_bills()`
- `targetType` is intentionally limited to `payable_bill` and `account` in code tasks until implementation proves a separate persisted recurrence entity exists

### Type consistency

- `PendingAccountsSafeAction`, `AccountsSafeActionType`, and `awaiting_accounts_safe_action_confirm` are introduced once and reused consistently
- `SAFE_ACTION_FAILED` and `SAFE_ACTION_ABORTED` are kept distinct in every task
