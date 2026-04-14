# Accounts Safe Operational Actions Spec

**Status:** Draft
**Date:** 2026-04-11
**Parent:** `specs/2026-04-11-accounts-diagnostic-conversations-spec.md`
**Related:** `specs/2026-04-11-accounts-diagnostic-ux-spec.md`
**Scope:** Phase 3 for contas diagnostic UX on WhatsApp, restricted to the contas domain
**Principle:** Act now only with confirmation, traceability, and control.

---

## 1. Objective

Phase 1 proved that Ana Clara can observe.

Phase 2 proved that Ana Clara can diagnose.

Phase 3 must prove that she can **correct the system safely** when, and only when, the ambiguity has already been reduced enough to support one coherent mutation.

**Product direction:**

- now Ana Clara may act
- but only after explicit preview
- explicit confirmation
- controlled execution
- post-write verification
- audit trail

**One-line product thesis:**

safe action does not arise from the anomaly itself; it arises from a concluded diagnosis that reduced ambiguity to one coherent mutation

**Second core sentence:**

every safe action is its own contract of preview, confirmation, execution, verification, and audit

---

## 2. Scope

This phase is **contas-only**.

Included anomalies:

1. `overdue_without_settlement`
2. `zeroed_bill`
3. `paid_inconsistent`
4. `zero_balance_account`

Included capabilities:

1. Propose a single safe action after diagnosis is sufficiently resolved
2. Show exact preview before mutation
3. Require explicit confirmation
4. Persist a dedicated pending action context
5. Execute the mutation through controlled mutation paths
6. Re-read system state and verify post-write correctness
7. Log a complete audit trail
8. Return precise success, decline, defer, abort, or failure messaging

Not included:

- cartões
- metas
- investimentos
- cross-domain actions
- silent correction
- automatic repair
- mutation from raw anomaly without concluded diagnosis
- bundling multiple independent mutations into one confirmation step
- destructive delete flows as default behavior

---

## 3. Hard boundaries

These are non-negotiable.

### 3.1 No safe action without concluded diagnosis

If the diagnosis remains ambiguous, Ana Clara must stay in diagnosis.

She may not open safe action if:

- there are still two or more plausible actions
- a required field remains unresolved
- the user answer reopens the ambiguity
- the target entity is not confidently identified

### 3.2 No action without preview

No mutation may be proposed for confirmation until the user has seen the exact preview for the current mutation.

### 3.3 No mutation without explicit confirmation

Ana Clara may never infer confirmation.

Not allowed:

- implicit "yes"
- convenience interpretation
- auto-execution after diagnosis
- generic "vou resolver isso"

### 3.4 One mutation per confirmation step

Each safe action context carries one safe mutation only.

Not allowed:

- "mark as paid + reschedule" in one confirm
- "adjust balance + deactivate account" in one confirm
- "cancel current bill + disable recurrence" in one confirm

### 3.5 No destructive behavior by default

Prefer:

- status transitions
- deactivation
- recurrence shutdown
- field correction

Avoid:

- hard delete
- destructive overwrite when reversible alternatives exist

If a future phase ever requires a destructive exception, that exception must have its own dedicated spec.

### 3.6 No safe action completion without full audit trail

If the audit trail is incomplete, the safe action is not considered finalized.

This is a product and engineering rule, not just a logging preference.

---

## 4. Product thesis for Phase 3

Observation says:

- "I saw something."

Diagnosis says:

- "I think I understand what is happening."

Safe action must say:

- "I know exactly what I am about to change."
- "I showed you before changing it."
- "I changed it only after you confirmed."
- "I verified that the system now matches what I promised."

The user should feel:

- "She did not guess."
- "She showed me exactly what would change."
- "She changed only what I confirmed."
- "If something went wrong, the system would know that too."

---

## 5. State model

### 5.1 State flow

```text
DIAGNOSIS_CONCLUDED
  |
  +--> SAFE_ACTION_ELIGIBLE
          |
          v
  SAFE_ACTION_PREVIEW_SHOWN
          |
          v
  SAFE_ACTION_AWAITING_CONFIRMATION
          |
          +--> SAFE_ACTION_EXECUTING
          |        |
          |        +--> SAFE_ACTION_SUCCEEDED
          |        +--> SAFE_ACTION_FAILED
          |
          +--> SAFE_ACTION_DECLINED
          +--> SAFE_ACTION_DEFERRED
          +--> SAFE_ACTION_ABORTED
```

### 5.2 State meanings

- `DIAGNOSIS_CONCLUDED`: a likely interpretation was reached, but safe action may still be unavailable
- `SAFE_ACTION_ELIGIBLE`: exactly one coherent mutation is available
- `SAFE_ACTION_PREVIEW_SHOWN`: preview was rendered for that mutation
- `SAFE_ACTION_AWAITING_CONFIRMATION`: waiting for explicit confirmation of that preview
- `SAFE_ACTION_EXECUTING`: mutation is being performed
- `SAFE_ACTION_SUCCEEDED`: mutation executed and post-write verification matched the promised state
- `SAFE_ACTION_FAILED`: mutation attempted, but execution or post-write verification failed
- `SAFE_ACTION_DECLINED`: user explicitly refused the proposed mutation
- `SAFE_ACTION_DEFERRED`: user chose to postpone the decision
- `SAFE_ACTION_ABORTED`: system canceled the action before completion due to loss of eligibility, conflict, context shift, or validation failure

### 5.3 Important modeling rule

`SAFE_ACTION_ELIGIBLE` is **not** the automatic next state after `DIAGNOSIS_CONCLUDED`.

It exists only when all eligibility criteria are satisfied.

### 5.4 Confirmation as transition, not durable state

`SAFE_ACTION_CONFIRMED` is not required as a durable state in this phase.

Default expectation:

- `SAFE_ACTION_AWAITING_CONFIRMATION`
- explicit valid confirmation arrives
- transition immediately to `SAFE_ACTION_EXECUTING`

If implementation later requires a durable pre-execution checkpoint for async execution or retry control, that should be introduced intentionally, not by default.

---

## 6. Context model

### 6.1 Dedicated context type

Safe action must use a dedicated context, separate from diagnosis:

- recommended semantic type: `awaiting_accounts_safe_action_confirm`

This is structurally important.

Diagnosis context and safe action context must not be conflated.

### 6.2 Pending action payload

```typescript
interface PendingAccountsSafeAction {
  anomalyType:
    | 'overdue_without_settlement'
    | 'zeroed_bill'
    | 'paid_inconsistent'
    | 'zero_balance_account';

  actionType:
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

  targetType: 'payable_bill' | 'account' | 'recurrence_config';
  targetId: string;

  before: Record<string, unknown>;
  after: Record<string, unknown>;

  effectSummary: string;

  diagnosticBasis: {
    conclusionKey: string;
    conclusionText: string;
    source:
      | 'passive_listing'
      | 'explicit_health_check'
      | 'direct_diagnostic_prompt';
  };

  confirmationPrompt: string;
  confirmationSource?:
    | 'explicit_yes'
    | 'explicit_confirm_phrase'
    | 'button_confirm'
    | 'reply_to_preview';
  confirmationText?: string;

  idempotencyKey: string;
  surfacedAt: string;
  previewExpiresAt: string;
  confirmedAt?: string;
}
```

### 6.3 Contract rules

- `before` and `after` must reflect the real fields that will be audited
- `after` cannot include unresolved values
- `confirmationText` is mandatory in the audit trail once the user confirms
- `confirmationSource` records how confirmation was interpreted
- `idempotencyKey` must exist before execution begins

### 6.4 Confirmation fields semantics

The three confirmation-related fields must not be conflated:

| Field | Meaning |
|-------|---------|
| `confirmationPrompt` | the exact preview/confirmation text shown to the user |
| `confirmationText` | the raw text received from the user in response |
| `confirmationSource` | how the system interpreted the confirmation path |

### 6.5 Target type validation

`targetType` must reflect the real persistence surface.

This means:

- `payable_bill` is valid only if the mutation targets `payable_bills`
- `account` is valid only if the mutation targets `accounts`
- `recurrence_config` is valid only if the implementation confirms that recurrence shutdown is actually persisted there

If recurrence is stored elsewhere, the contract must be updated before implementation.

Implementation must confirm the actual persistence surface before coding recurrence shutdown behavior.

No conceptual placeholder may survive into implementation pretending to be a real persistence target.

---

## 7. Preview contract

### 7.1 Required preview structure

Every preview must include:

1. what record will change
2. what field(s) will change
3. current value(s)
4. new value(s)
5. effect expected on the user-facing system
6. explicit request for confirmation

The primary source of truth for success remains the persisted state.
User-facing effect is a required consequence to describe, not the primary verification source.

### 7.2 Format principles

- preview must be field-accurate
- preview must be semantically narrow
- preview must not hide multiple unrelated effects in generic language
- preview must use the same clarity standard as calendar confirmations

### 7.3 Preview examples

**Mark as paid**

```text
Vou marcar a conta 'Celular (1/12)' como paga.

• status: Pendente -> Paga
• paid_at: vazio -> 11/04
• paid_amount: vazio -> R$ 99,00

Efeito esperado: essa conta sai da lista de pendentes e passa a constar como quitada.

Confirma? (sim/nao)
```

**Reschedule due date**

```text
Vou reagendar o vencimento da conta 'Celular (1/12)'.

• due_date: 05/04 -> 20/04

Efeito esperado: ela deixa de aparecer como vencida agora e passa a vencer na nova data.

Confirma? (sim/nao)
```

**Complete paid record**

```text
Vou completar o registro da conta 'Plano de saude' com:

• paid_amount: vazio -> R$ 320,00
• paid_at: vazio -> 10/04

Efeito esperado: o registro de pagamento fica completo e coerente.

Confirma? (sim/nao)
```

### 7.4 Preview truthfulness rule

Preview may only show values that are already resolved.

Preview may never:

- invent `paid_at`
- infer `paid_amount` for convenience
- propose a new due date that is not yet explicitly known and validated
- imply bundled side effects not shown in the field list

---

## 8. Preview expiry rules

Preview cannot remain valid forever.

### 8.1 Expiry conditions

A confirmation becomes invalid if any of the following happens before execution:

1. preview TTL expires
2. user changes subject in a way that abandons the safe action thread
3. a new safe action preview is shown
4. the target record changes and the `before` snapshot is no longer current
5. the diagnostic conclusion is no longer sufficient for that mutation

### 8.2 Spec rule

The implementation may choose the exact TTL, but the spec requires that expiry be enforced by:

- time
- context change
- state change of the target record

### 8.3 Product behavior on expired confirmation

If the user confirms after expiry:

- do not execute
- explain that the preview is no longer current
- require a fresh preview before confirming again

---

## 9. Confirmation contract

### 9.1 Confirmation required

Valid confirmation must be explicit and refer to the current preview.

Allowed sources in this phase:

- `explicit_yes`
- `explicit_confirm_phrase`
- `reply_to_preview`

`button_confirm` may be reserved for future surfaces, but the enum should already allow it if product wants forward compatibility.

### 9.2 Invalid confirmation

These are not valid confirmations:

- vague assent
- out-of-context "sim"
- repeated stale confirmation after preview expiry
- confirmation after topic switch
- confirmation that reopens ambiguity

### 9.3 Behavior if ambiguity reopens

If the user reply reintroduces ambiguity:

- do not execute
- leave safe action
- return to clarification or diagnosis

---

## 10. Action catalog by anomaly

### 10.1 `overdue_without_settlement`

Allowed actions:

- `mark_as_paid`
- `reschedule_due_date`

Eligibility rules:

- `mark_as_paid` only when diagnosis concluded the bill was already paid
- `reschedule_due_date` only when diagnosis concluded it is still open and the user explicitly supplied a valid new due date
- if both actions remain plausible, stay in diagnosis

Critical guardrail:

- `paid_at` and `paid_amount` may not be filled by convenience
- every written value must already be resolved by the user or by a concluded diagnostic step

### 10.2 `zeroed_bill`

Allowed actions:

- `update_amount`
- `mark_as_paid`
- `cancel_one_off_bill`
- `disable_recurrence`
- `cancel_current_occurrence` when explicitly needed for recurring cases

Eligibility rules:

- `update_amount` only when diagnosis concluded that the value is missing and the correct amount is known
- `mark_as_paid` only when diagnosis concluded that the bill was already settled and required paid fields are resolved
- `cancel_one_off_bill` only for one-off bills that no longer apply
- `disable_recurrence` only for recurring items that should stop generating future occurrences
- `cancel_current_occurrence` and `disable_recurrence` are separate actions unless product later defines a bundled contract explicitly

One-off vs recurring rule:

- one-off bill -> standard safe action is `status = cancelled`
- recurring bill -> standard safe action is disabling future recurrence

Historical data must be preserved.

### 10.3 `paid_inconsistent`

Allowed actions:

- `update_paid_amount`
- `update_paid_at`
- `update_paid_record`

Eligibility rules:

- only fields explicitly resolved may be written
- if only one field is closed, only that action may be proposed
- `update_paid_record` is valid only when both `paid_amount` and `paid_at` are already resolved

Field-accurate confirmation rule:

- no generic "fix record" confirmation is allowed

### 10.4 `zero_balance_account`

Allowed actions:

- `adjust_account_balance`
- `deactivate_account`

Eligibility rules:

- `adjust_account_balance` only when diagnosis concluded the account is still active and the new balance is known
- `deactivate_account` only when diagnosis concluded the account is no longer in use
- never combine these two in one confirmation

Surface effect rule for deactivation:

Success and preview must explain that:

- the account leaves active account lists
- it no longer participates in active-balance diagnostics
- historical records remain preserved

---

## 11. Execution contract

### 11.1 Pre-write validation

Immediately before execution, the system must validate:

1. pending action still exists
2. preview has not expired
3. target record still matches the `before` snapshot in the fields that matter
4. action remains eligible
5. idempotency key has not already been consumed for an equivalent successful execution

If any of these fails before writing:

- do not mutate
- end in `SAFE_ACTION_ABORTED`

`fields that matter` means exactly the fields used to determine:

- eligibility for this safe action
- the preview before/after contract for this safe action

Irrelevant drift outside those fields must not automatically abort the action.

### 11.2 Idempotency

Required behavior:

- repeated confirmation with same `idempotencyKey` must not duplicate effect
- duplicate webhook or retry must resolve safely
- replay outcome must be either:
  - idempotent success, or
  - explicit block

### 11.3 Real mutation only through explicit path

Mutation must happen only in the safe action executor.

Acceptable mutation paths must be explicit in implementation:

- dedicated safe action helpers
- controlled direct updates
- explicitly approved RPCs

The implementation plan must name which path is used per action.

Not allowed:

- hidden writes inside diagnosis
- writes piggybacked on templates
- silent mutation from follow-up interpretation

---

## 12. Post-write verification

`SAFE_ACTION_SUCCEEDED` only exists after post-write verification.

### 12.1 Verification checklist

After writing, the system must re-read the affected persistence surface and verify:

1. the target record still exists if expected to exist
2. the fields listed in `after` match the stored values
3. fields not listed for change did not unexpectedly drift in the same transaction
4. the expected product effect is now true at system-state level

Verification priority:

1. persisted state first
2. user-facing effect second

Surface effect may be checked as a consequence, but may not replace persisted-state verification.

### 12.2 Success rule

If the mutation responds "ok" but the re-read does not match the previewed result:

- do not mark `SAFE_ACTION_SUCCEEDED`
- use `SAFE_ACTION_FAILED` or `SAFE_ACTION_ABORTED` depending on the failure mode

This is a hard rule.

---

## 13. Result contracts

### 13.1 `SAFE_ACTION_SUCCEEDED`

Requirements:

- write completed
- verification matched
- audit trail completed

Response must explain:

- what changed
- what did not change when relevant
- whether anything remains pending

### 13.2 `SAFE_ACTION_FAILED`

Use when:

- write attempted and returned error
- write returned success but post-write verification failed
- post-write verification itself failed technically after a write attempt

Response must say:

- the system could not conclude the action safely
- the user should not assume the promised change fully happened

Decision rule:

- `FAILED` means the system crossed into execution or post-write verification and something technical failed

### 13.3 `SAFE_ACTION_ABORTED`

Use when the system cancels before completion because:

- eligibility was lost
- the target changed
- the preview expired
- final validation failed before the write
- context moved to another topic or invalid state

Decision rule:

- `ABORTED` means the system stopped before completing the mutation because it decided it was no longer safe to proceed

### 13.4 `SAFE_ACTION_DECLINED`

Use when:

- user explicitly rejects the mutation

Rules:

- nothing is changed
- no hidden financial write
- the same action should not be aggressively reoffered without a new trigger

### 13.5 `SAFE_ACTION_DEFERRED`

Use when:

- user asks to decide later

Rules:

- nothing is changed
- no hidden financial write
- optional lightweight memory is allowed only if the implementation explicitly defines it

---

## 14. Audit trail

### 14.1 Required fields

Every safe action must produce an audit record with:

- `anomalyType`
- `actionType`
- `targetType`
- `targetId`
- `before`
- `after`
- `effectSummary`
- `diagnosticBasis`
- `confirmationPrompt`
- `confirmationSource`
- `confirmationText`
- `idempotencyKey`
- `executionResult`
- `postWriteVerification`
- `finalState`
- timestamps for preview, confirmation, execution, and verification

### 14.2 Why this is mandatory

The audit trail must be able to answer:

1. why was this action proposed?
2. what exactly was previewed?
3. what exactly did the user confirm?
4. what actually changed?
5. did the persisted state match the promise?

### 14.3 Completion rule

Without a complete audit trail, safe action completion is not valid.

This rule should appear in both product and engineering sections of the implementation plan.

---

## 15. Response contracts

### 15.1 Preview shown

```text
Notei um ajuste seguro que eu posso fazer:

[preview field list]

Efeito esperado:
[effect]

Confirma? (sim/nao)
```

### 15.2 Success

```text
Pronto.

Ficou assim:
• [field change applied]

Efeito no sistema:
• [surface impact]
```

### 15.3 Decline

```text
Perfeito.

Nao alterei nada nessa conta.
```

### 15.4 Defer

```text
Perfeito.

Nao alterei nada agora. Se quiser, a gente retoma isso depois.
```

### 15.5 Abort

```text
Parei essa acao antes de alterar o sistema, porque o contexto mudou ou o dado ja nao bate mais com o preview anterior.

Se quiser, eu monto um preview novo.
```

### 15.6 Failure

```text
Nao consegui concluir essa alteracao com seguranca.

Prefiro nao te dizer que deu certo antes de conferir o estado final.
```

---

## 16. Engineering guidance

### 16.1 Preferred architecture

Phase 3 should use:

- action per anomaly
- state-specific flow
- small shared core for preview, confirmation, audit, idempotency, and verification

Do not center the design around a generic action engine too early.

### 16.2 Reuse expectations

Reuse:

- Phase 1 anomaly selection and ordering
- Phase 2 diagnosis conclusions
- explicit state semantics
- confirmation patterns already validated in calendar where relevant

Do not:

- rebuild observation
- merge diagnosis and mutation back together
- widen scope to other domains

---

## 17. Acceptance criteria

Phase 3 is complete only when:

1. every supported mutation is proposed only after a concluded diagnosis
2. only one safe action is carried by a confirmation context at a time
3. every action shows exact preview with before/after/effect
4. explicit confirmation is required and stale confirmation is rejected
5. execution is idempotent under retry or duplicate confirmation
6. post-write verification is mandatory before success
7. audit trail includes both `confirmationText` and `confirmationSource`
8. no action is considered finalized without complete audit data
9. decline, defer, abort, fail, and success have distinct semantics
10. no silent mutation happens in diagnosis or observation layers

---

## 18. Out of scope

Still out of scope after this spec:

- bulk multi-record corrections in one confirmation
- cross-domain cascades
- autonomous repair loops
- hidden follow-up mutations
- destructive delete as normal operator behavior

---

## 19. Final note

Phase 3 should not be treated as "continuing the conversation".

It is a **microprotocol for safe mutation**.

That protocol must be:

- explicit
- narrow
- previewed
- confirmed
- verified
- audited

If any of those are weak, the phase fails its purpose.
