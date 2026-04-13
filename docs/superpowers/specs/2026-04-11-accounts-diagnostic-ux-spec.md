# Accounts Diagnostic UX Spec

**Status:** Draft
**Date:** 2026-04-11
**Parent:** `vision/2026-04-11-ana-clara-cognitive-ux-maturity.md`
**Scope:** Contas a pagar (payable_bills) + contas bancarias (accounts) -- WhatsApp channel first, app surface later
**Principle:** Observation before diagnosis. Diagnosis before action. Action only with explicit confirmation.

---

## 1. Problem statement

Ana Clara already has full read access to `payable_bills`, `credit_card_invoices`, `accounts`, and related tables. She can list, create, and mark bills as paid.

But she does not yet **interpret** what she sees. She displays data without questioning its health.

**Concrete symptoms today:**

- Bills with `amount = 0` or `amount IS NULL` are listed without comment
- Bills with `status = 'pending'` and `due_date` in the past appear in lists but with no diagnostic language
- Bills marked `paid` with `paid_amount = 0` or no `paid_at` are silently accepted
- Recurring bills that stopped generating new occurrences are invisible
- Bank accounts with `current_balance = 0` across all accounts raise no flag
- No proactive "health check" capability exists

**User impact:** The system looks polished but the user cannot trust that Ana Clara actually understands their financial state. The UI promises intelligence; the behavior delivers listing.

---

## 2. Goal

Make Ana Clara capable of **observing, diagnosing, and (with confirmation) correcting** account and bill health issues, following the same semantic patterns established for calendar.

**User perception target:**

- "She noticed something was wrong before I did."
- "She explained why she was asking."
- "She fixed it safely after I confirmed."

---

## 3. Architecture: three layers

Every diagnostic capability in this spec must be cleanly separable into three layers. This is not optional.

### Layer 1 -- Observation

**What it does:** Reads system state and surfaces anomalies to the user without judgment or action.

**Risk level:** Zero. Read-only. Cannot break anything.

**Examples:**
- "Essa conta 'Aluguel' esta com valor R$ 0,00. Pode ser que esteja faltando o valor."
- "Voce tem 3 contas vencidas sem registro de pagamento."
- "A fatura do cartao Itau vence em 2 dias e ainda esta aberta."

**Engineering:** Pure query + template. No state mutation. Can be added to existing listing flows or triggered proactively.

### Layer 2 -- Diagnosis

**What it does:** Interprets the anomaly, formulates a hypothesis, and asks the user a clarifying question.

**Risk level:** Low. Still read-only, but now the system is making an inference.

**Examples:**
- "Essa conta 'Celular' esta marcada como pendente mas ja venceu ha 6 dias. Ela foi paga e so faltou registrar, ou esta realmente atrasada?"
- "O valor da conta 'Netflix' esta zerado. Qual e o valor correto?"
- "Sua conta bancaria 'NuConta' esta com saldo R$ 0,00 ha mais de 30 dias. Essa conta ainda esta ativa?"

**Engineering:** Query + inference rules + template with embedded question. May use `conversation_context` to track the diagnostic flow state. Memory can store diagnostic conclusions as `note` type.

### Layer 3 -- Safe action

**What it does:** After user confirmation, modifies system state.

**Risk level:** Medium to high. Must have explicit confirmation, clear description of what will change, and audit trail.

**Requirements:**
- User must confirm with explicit "sim" / "nao" (reuse calendar confirmation pattern)
- The confirmation message must show exactly what will be changed
- Every mutation must be logged via `logAgentAction`
- Prefer idempotent operations
- Never delete data; prefer status transitions

**Examples:**
- "Vou atualizar o valor da conta 'Netflix' para R$ 57,00. Confirma? (sim/nao)"
- "Vou marcar a conta 'Celular' como paga em 05/04. Confirma? (sim/nao)"
- "Vou desativar a conta 'NuConta'. Confirma? (sim/nao)"

**Engineering:** Confirmation context type + pending payload (same pattern as `awaiting_calendar_create_confirm`). After confirmation, mutate via existing RPC/table ops + `logAgentAction`.

---

## 4. Anomaly catalog

These are the specific anomalies Ana Clara should detect, **in strict severity order**. When multiple anomalies exist, they must be surfaced in this order. The ranking reflects real financial impact to the user, not technical complexity.

| Severity | Anomaly | Rationale |
|----------|---------|-----------|
| S1 (critical) | Overdue without settlement | Real money at risk: late fees, credit score, service interruption |
| S2 (high) | Zeroed bill pending/overdue | Likely data gap blocking accurate financial view |
| S3 (medium) | Paid with inconsistent data | Record integrity; does not block payments but erodes trust |
| S4 (medium) | Stale recurring bill | Silent gap; user may miss upcoming obligation |
| S5 (low) | All accounts at zero balance | Likely stale data, not emergency |
| S6 (low) | Credit card invoice approaching | Informational/proactive; not an anomaly per se |

The diagnostic block appended to listings must respect this order. S1 anomalies always appear first. If multiple anomalies share the same severity, sort by `due_date` ascending (most urgent first).

### 4.1 Overdue without settlement (S1 -- critical)

**Detection:** `payable_bills` where `status = 'pending'` AND `due_date < today` AND `paid_at IS NULL`

**Observation:** "A conta '{description}' venceu em {due_date} e nao tem registro de pagamento."

**Diagnosis:** "Essa conta esta realmente atrasada, ou voce ja pagou e so faltou registrar aqui?"

**Actions available:**
- Mark as paid (user provides or confirms date)
- Keep as overdue (acknowledged)
- Reschedule due date

### 4.2 Zeroed bill (S2 -- high)

**Detection:** `payable_bills` where `(amount IS NULL OR amount = 0)` AND `status IN ('pending', 'overdue')`

**Observation:** "A conta '{description}' ({provider_name}) com vencimento em {due_date} esta com valor zerado."

**Diagnosis:** "Pode ser que o valor ainda nao foi informado, ou que essa conta ja foi quitada. Qual e o valor correto, ou posso marcar como paga?"

**Actions available:**
- Update amount (user provides value)
- Mark as paid (if user confirms it was already paid)
- Cancel (if the bill no longer applies)

### 4.3 Paid with inconsistent data (S3 -- medium)

**Detection:** `payable_bills` where `status = 'paid'` AND (`paid_amount IS NULL OR paid_amount = 0` OR `paid_at IS NULL`)

**Observation:** "A conta '{description}' esta marcada como paga, mas {missing_detail}."

**Diagnosis:** "Parece que faltou completar o registro. Qual foi o valor pago / quando foi pago?"

**Actions available:**
- Update paid_amount
- Update paid_at
- Both

### 4.4 Stale recurring bill (S4 -- medium)

**Detection:** `payable_bills` where `is_recurring = true` AND no child bill exists with `due_date` in current or next month

**Observation:** "A conta recorrente '{description}' nao gerou parcela para este mes."

**Diagnosis:** "Pode ser que a recorrencia parou ou precisa ser recriada. Quer que eu gere a proxima parcela?"

**Actions available:**
- Generate next occurrence
- Deactivate recurrence

### 4.5 All accounts at zero balance (S5 -- low)

**Detection:** All rows in `accounts` where `is_active = true` have `current_balance = 0`

**Observation:** "Todas as suas contas bancarias estao com saldo zerado. Pode ser que os saldos precisem ser atualizados."

**Diagnosis:** "Quer atualizar o saldo de alguma conta?"

**Actions available:**
- Update balance for specific account

### 4.6 Credit card invoice approaching due date (S6 -- low, proactive)

**Detection:** `credit_card_invoices` where `due_date` is within 3 days AND `status != 'paid'`

**Observation:** "A fatura do cartao {card_name} no valor de R$ {amount} vence em {due_date}."

**Diagnosis:** Only if amount seems anomalous relative to recent history.

---

## 5. Trigger points

### 5.1 Passive (piggyback on existing flows)

When the user asks "contas a pagar" or any listing intent, Ana Clara runs the anomaly detection **after** the normal listing and appends a diagnostic section if issues are found. Subject to anti-fatigue rules (section 11.3): max 3, severity-ordered, session cooldown, acknowledged-anomaly cooldown.

**Format:**

```
[normal listing]

---
Notei algumas coisas:

⚠️ A conta 'Celular' venceu ha 6 dias sem registro de pagamento.
⚠️ A conta 'Netflix' esta com valor zerado.

Quer que eu investigue? (sim/nao)
```

Note: overdue (S1) appears before zeroed (S2) per severity ranking.

### 5.2 Active (user asks directly)

The user says something like: "analisa minhas contas", "tem algo errado nas contas?", "faz um checkup".

Ana Clara runs the full anomaly catalog and returns a structured health report.

### 5.3 Proactive (future, Phase 2+)

Ana Clara notices anomalies during other flows (e.g., generating a summary, morning briefing) and surfaces them contextually.

---

## 6. Response templates

### 6.1 Design principles (inherited from calendar polish)

- Fixed information order: description -> amount -> due date -> status -> diagnostic note
- Emoji semantic hierarchy consistent with calendar: warning for anomalies, not decoration
- Actor display name when referencing the user
- First-person normalization in participant-like fields
- Explicit state in every response (observation vs question vs confirmation)

### 6.2 Template: anomaly observation block

```
⚠️ *{description}*
💰 R$ {amount} (ou "valor zerado")
📅 Vencimento: {due_date}
📊 Status: {status_label}
💬 {diagnostic_note}
```

### 6.3 Template: diagnostic question

```
Notei um problema com essa conta:

⚠️ *{description}*
💰 R$ {amount}
📅 Venceu em {due_date}

{diagnostic_question}
```

### 6.4 Template: correction confirmation

```
Vou fazer a seguinte alteracao:

📝 Conta: *{description}*
✏️ {change_description}

Confirma? (sim/nao)
```

### 6.5 Template: correction success

```
Pronto, atualizei!

📝 *{description}*
✅ {what_changed}
```

---

## 7. Conversation state machine

```
IDLE
  |
  v (anomaly detected during listing or user asks)
OBSERVATION
  |
  v (user says "sim" to investigate)
DIAGNOSIS
  |
  v (user provides answer / confirmation)
  +---> CORRECTION_PENDING (if action needed)
  |       |
  |       v (user confirms)
  |     CORRECTION_DONE --> IDLE
  |       |
  |       v (user declines)
  |     IDLE
  |
  +---> ACKNOWLEDGED (user says "ok" / "entendi") --> IDLE
```

### Context type

Add `awaiting_account_diagnostic_confirm` to `conversation_context` types (same pattern as `awaiting_calendar_create_confirm`).

### Pending payload shape

```typescript
interface PendingAccountDiagnosticPayload {
  anomalyType: 'zeroed_bill' | 'overdue_no_payment' | 'paid_inconsistent' | 'stale_recurring' | 'zero_balance_account';
  billId?: string;
  accountId?: string;
  proposedChange: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  };
  chatJid?: string;
}
```

---

## 8. Implementation approach

### 8.1 What already exists and can be reused

| Capability | Source | Reuse |
|---|---|---|
| Bill listing + query | `contas-pagar.ts` `listarContasPagar` | Add anomaly scan after listing |
| Mark as paid | `contas-pagar.ts` `marcarComoPago` | Wrap with confirmation flow |
| Conversation context | `context-manager.ts` | New context type for diagnostic |
| Confirmation flow | Calendar's `awaiting_calendar_create_confirm` pattern | Mirror for accounts |
| Actor display name | `calendar-handler.ts` `resolveActorDisplayNameForCalendar` | Generalize or duplicate |
| Presentation normalization | `calendar-response-templates.ts` participant helpers | Reuse directly |
| Audit logging | `agent-memory.ts` `logAgentAction` | Use for every correction |
| Memory storage | `agent-memory.ts` `saveMemory` | Store diagnostic conclusions |

### 8.2 What needs to be created

1. **`accounts-diagnostic.ts`** -- anomaly detection queries and diagnostic logic
2. **`accounts-response-templates.ts`** -- dedicated template layer (same pattern as `calendar-response-templates.ts`)
3. **New context type** `awaiting_account_diagnostic_confirm` in context-manager
4. **Migration** to add the new context type to the enum (if needed)
5. **Integration point** in `ana-clara-core-executor.ts` or `contas-pagar.ts` to trigger diagnostics
6. **Tests** -- anomaly detection unit tests, template regression tests, confirmation flow tests

### 8.3 What must NOT change

- Existing bill listing behavior (append diagnostics, do not replace)
- Existing `marcarComoPago` business logic
- Existing routing in `index.ts` / `ana-clara-core-executor.ts`
- Calendar templates or handler
- Any other domain's behavior

---

## 9. Phasing

### Phase 1: Observation only (safest, highest signal)

- Implement anomaly detection queries for 4.1 (overdue without settlement) and 4.2 (zeroed bill)
- Add observation block to listing output
- Add health-check intent ("analisa minhas contas")
- Template layer with consistent formatting
- Tests for detection logic and templates

**Risk:** zero. Read-only. No state mutation.

**Hard boundary:** Phase 1 code must be **brutally read-only**. This means:

- No `INSERT`, `UPDATE`, `DELETE`, or `UPSERT` on any table in any code path reachable from Phase 1
- No `supabase.rpc(...)` calls that mutate state
- No `salvarContexto` with a type that implies pending action (no `awaiting_*` types)
- No "almost correct" -- no functions that accept a mutation parameter but happen to not use it yet
- No `marcarComoPago`, `criarContaDiretamente`, or any write import in the Phase 1 module
- The observation module must be **a separate file** (`accounts-diagnostic.ts`) that does not import write functions

**Why this matters:** Phase 1 has value precisely because it raises perceived intelligence without raising risk. If any mutation leaks in, the entire safety argument collapses. The user starts trusting diagnostic output that could silently change their data. That trust is harder to rebuild than to build.

### Phase 2: Diagnosis + safe correction

- Add diagnostic questions for 4.1 (overdue) and 4.2 (zeroed)
- Implement confirmation flow with `awaiting_account_diagnostic_confirm`
- Wire correction actions (update amount, mark paid, reschedule)
- Audit trail via `logAgentAction`
- Store diagnostic conclusions in memory
- Tests for confirmation flow and state transitions

**Risk:** low-medium. State mutation only after explicit confirmation.

### Phase 3: Broader anomaly coverage

- Add detection for 4.3 (paid inconsistent), 4.4 (stale recurring), 4.5 (zero balances)
- Proactive surfacing during summaries and briefings
- Memory-driven "this bill was zeroed last month too" pattern detection

**Risk:** low. Extension of established patterns.

---

## 10. Semantic consistency with calendar

The accounts diagnostic must follow the same cognitive UX patterns as calendar:

| Pattern | Calendar | Accounts diagnostic |
|---|---|---|
| Confirmation prompt | `Confirma? (sim/nao)` | `Confirma? (sim/nao)` |
| Success message | `Pronto, agendei!` | `Pronto, atualizei!` |
| Found-entity framing | `Achei o evento:` | `Notei um problema:` |
| Optional info order | location -> participants -> duration -> reminders | description -> amount -> due date -> status -> note |
| Actor name resolution | `actorDisplayName` | Same resolution chain |
| Pending context pattern | `awaiting_calendar_create_confirm` | `awaiting_account_diagnostic_confirm` |

---

## 11. Risks

### 11.1 False positives

Ana Clara flags a bill as "zeroed" when the user intentionally left it at zero (e.g., variable bill waiting for invoice).

**Mitigation:** Observation language is always tentative ("pode ser que..."), never accusatory. Diagnosis asks before assuming.

### 11.2 Correction without rollback

If Ana Clara updates a bill amount incorrectly.

**Mitigation:** `logAgentAction` records old and new values. Future: add explicit undo capability.

### 11.3 Diagnostic fatigue

The single biggest UX risk in this spec. If Ana Clara flags everything on every interaction, she becomes a car alarm: technically correct, universally ignored.

**The goal is to seem attentive, not anxious.**

**Hard rules:**

1. **Cap per listing:** Maximum 3 anomalies appended to any single bill listing. Always the top 3 by severity (S1 before S2 before S3). If more exist, end with "e mais {N} itens que merecem atencao. Diga 'analisa minhas contas' para ver tudo."

2. **Cooldown per anomaly:** Once an anomaly has been surfaced and the user acknowledged it (said "ok", "entendi", "depois vejo", or simply moved on), store an `acknowledged_anomaly` memory entry with `memory_type: 'note'` and a 7-day TTL. Do not re-surface the same anomaly (same `bill_id` + same `anomaly_type`) during that window.

3. **Cooldown per session:** If the user has already seen a diagnostic block in the current conversation (within the last 60 minutes per `conversation_context` TTL), do not append another one to subsequent listings in the same session. The user can still trigger a full health check explicitly.

4. **Health check is always full:** When the user explicitly asks "analisa minhas contas" or equivalent, show all anomalies regardless of cooldowns, grouped by severity. This is the "I want the full picture" escape hatch.

5. **Proactive surfacing (Phase 3+ only):** Unsolicited diagnostics (e.g., in morning briefings) must be limited to S1 anomalies only, and at most 1 per proactive message. The user did not ask; respect that.

6. **Tone:** Observation language is always tentative and helpful, never accusatory. "Notei que..." / "Pode ser que..." / "Vale a pena conferir..." -- never "Voce esqueceu de..." / "Esta errado."

**Implementation note after Phase 1:** the cap, ordering, and explicit full health-check are already shipped. Cooldown by memory/session remains open backlog and is tracked explicitly in `specs/2026-04-11-accounts-diagnostic-cooldown-backlog.md`.

### 11.4 Scope creep into card/investment diagnostics

**Mitigation:** This spec covers only `payable_bills` and `accounts`. Card and investment diagnostics get their own specs.

---

## 12. Success criteria

- User sees anomaly observations appended to bill listings when issues exist
- User can trigger a health check and get a structured report
- User can confirm corrections through the same sim/nao pattern as calendar
- Every correction is logged
- No existing listing or payment flow breaks
- Response formatting follows the same semantic hierarchy as calendar
- Tests cover detection logic, templates, and confirmation flow

---

## 13. Derived from

- `vision/2026-04-11-ana-clara-cognitive-ux-maturity.md` (pillars 1-3)
- `specs/2026-04-11-ana-clara-calendar-response-polish-design.md` (semantic patterns)
- `specs/2026-04-11-accounts-diagnostic-conversations-spec.md` (Phase 2 diagnosis-only follow-up)
- Alfredo (OpenClaw) feedback: "separate observation, diagnosis, and correction from the start"
