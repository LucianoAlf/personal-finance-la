# Accounts Diagnostic Conversations Spec

**Status:** Draft
**Date:** 2026-04-11
**Parent:** `specs/2026-04-11-accounts-diagnostic-ux-spec.md`
**Scope:** Phase 2 for contas diagnostic UX on WhatsApp
**Principle:** Observation first. Diagnosis second. Safe action still out of scope.

---

## 1. Objective

Teach Ana Clara to conduct the right diagnostic conversation after noticing an anomaly.

Phase 1 proved that she can:

- list
- notice
- prioritize

Phase 2 must prove that she can:

- interpret what may be happening
- ask the right question
- keep the conversation state clear
- stop before mutating anything

**One-line product direction:** now is the time to make Ana Clara ask well before letting her act.

---

## 2. Scope

This phase is limited to **diagnostic conversations** in the contas domain.

Included:

1. Diagnostic question flows for:
   - overdue without settlement
   - zeroed bill
   - paid with inconsistent data
   - bank account with zero balance / probably stale account
2. Explicit conversation states for diagnosis
3. Short-lived conversation context to track the current diagnostic thread
4. Optional read-only diagnostic memory of conclusions
5. Response templates for:
   - diagnosis invitation
   - focused diagnostic question
   - diagnostic conclusion
   - defer / acknowledge / not sure

Not included:

- any financial mutation
- any implicit correction
- any correction confirmation flow
- any update to `payable_bills`, `accounts`, `credit_card_invoices`, or related financial tables
- cross-domain expansion to cards, goals, or investments

---

## 3. Product thesis

Observation alone says: "I saw something."

Diagnosis must say: "I think I understand what may be happening, and here is the most useful question to resolve that ambiguity."

The user should feel:

- "Ela percebeu o problema."
- "Ela entendeu a hipótese certa."
- "Ela perguntou exatamente o que faltava."

The user should **not** feel:

- pressured into action
- surprised by system changes
- trapped in a rigid form flow

---

## 4. Hard boundaries

These are non-negotiable for Phase 2.

### 4.1 No financial mutation

No reachable code path in this phase may:

- `INSERT`, `UPDATE`, `DELETE`, or `UPSERT` financial records
- call mutative RPCs
- call `marcarComoPago`
- call account/bill creation helpers
- call bill/account edit helpers

### 4.2 Action remains out of scope

Ana Clara may explain what seems to be wrong and what the likely resolution would be, but she must stop before proposing execution.

Allowed:

- "Parece que essa conta foi paga e so faltou registrar."
- "Pode ser que o valor ainda nao tenha sido informado."

Not allowed:

- "Posso marcar como paga agora?"
- "Vou corrigir isso pra voce."
- "Confirma que eu atualizo?"

### 4.3 Diagnosis may write only conversational state

Allowed writes in this phase are restricted to:

- `conversation_context` for diagnosis flow state
- optional memory notes that store the diagnostic conclusion

No financial data writes.

---

## 5. Supported anomalies in Phase 2

### 5.1 Overdue without settlement

**Observation already exists:**

- "A conta 'Celular' venceu em 05/04 e ainda nao tem pagamento registrado."

**Diagnostic goal:**

Differentiate between:

- it was paid, but the system is outdated
- it is really still overdue

**Primary question:**

- "Essa conta foi paga e so faltou registrar, ou ela ainda esta em aberto?"

**Expected answer shapes:**

- paid already
- still overdue
- not sure

### 5.2 Zeroed bill

**Observation already exists:**

- "A conta 'Internet Casa 7 Link' com vencimento em 25/04 esta com valor zerado."

**Diagnostic goal:**

Differentiate between:

- value not filled in yet
- bill already settled
- bill no longer applies

**Primary question:**

- "Esse valor ainda nao foi informado, ou essa conta ja foi quitada?"

**Fallback question when user confirms missing value:**

- "Qual e o valor correto dessa conta?"

### 5.3 Paid with inconsistent data

**Observation to add in this phase:**

- "A conta 'X' esta marcada como paga, mas o registro esta incompleto."

**Diagnostic goal:**

Differentiate whether the missing field is:

- paid amount
- payment date
- both

**Primary question:**

- "Faltou o valor pago, a data do pagamento, ou os dois?"

### 5.4 Zero balance account

**Observation to add in this phase:**

- "A conta bancaria 'NuConta' esta com saldo zerado."

**Diagnostic goal:**

Differentiate between:

- stale but still active account
- intentionally inactive account
- low confidence false positive

**Primary question:**

- "Essa conta ainda esta ativa no seu dia a dia?"

---

## 6. Trigger model

### 6.1 Passive continuation from observation

When Ana Clara surfaces a passive observation block and the user responds with interest, she may enter diagnosis.

Typical triggers:

- `sim`
- `investiga`
- `pode ver`
- `o que houve?`
- `qual delas?`

Behavior:

- focus on the most urgent unresolved anomaly first
- ask one question at a time
- keep the state explicit

### 6.2 Direct diagnostic prompts

The user may ask directly for interpretation, for example:

- `o que tem de errado nessas contas?`
- `qual parece ser o problema?`
- `me explica isso`

Behavior:

- Ana Clara may skip the general observation recap
- jump into the highest-priority anomaly and ask the diagnostic question

### 6.3 Health-check follow-up

After an explicit health-check, the user may reply:

- `vamos ver a primeira`
- `fala da mais urgente`
- `me explica a da netflix`

Behavior:

- resolve the target anomaly by index, urgency, or description
- open a focused diagnosis thread for that anomaly only

---

## 7. Conversation model

### 7.1 States

```
IDLE
  |
  v
OBSERVATION_SHOWN
  |
  v
DIAGNOSIS_INVITED
  |
  v
DIAGNOSIS_ACTIVE
  |
  +--> DIAGNOSIS_CLARIFYING
  |
  +--> DIAGNOSIS_CONCLUDED
  |
  +--> DIAGNOSIS_DEFERRED
  |
  +--> IDLE
```

### 7.2 State meanings

- `OBSERVATION_SHOWN`: anomalies were surfaced, no follow-up yet
- `DIAGNOSIS_INVITED`: Ana Clara is waiting for the user to pick whether to investigate
- `DIAGNOSIS_ACTIVE`: one anomaly is under discussion
- `DIAGNOSIS_CLARIFYING`: Ana Clara asked a follow-up because the reply was ambiguous
- `DIAGNOSIS_CONCLUDED`: a likely interpretation was reached
- `DIAGNOSIS_DEFERRED`: user chose to postpone or acknowledged without continuing

### 7.3 Context payload

```typescript
interface PendingAccountDiagnosisPayload {
  anomalyType:
    | 'overdue_without_settlement'
    | 'zeroed_bill'
    | 'paid_inconsistent'
    | 'zero_balance_account';
  billId?: string;
  accountId?: string;
  questionKey: string;
  hypothesisOptions: string[];
  surfacedAt: string;
  source: 'passive_listing' | 'explicit_health_check' | 'direct_diagnostic_prompt';
  chatJid?: string;
}
```

This context exists to track the conversation, not to authorize mutations.

---

## 8. Response contract

Every response in this phase must make the state legible.

### 8.1 Diagnosis invitation

Used after a passive observation block when Ana Clara wants to invite investigation.

```text
Notei alguns pontos que merecem atencao.

Se quiser, eu posso te ajudar a entender o que pode estar acontecendo na mais urgente.
```

### 8.2 Focused diagnostic question

```text
Notei um ponto que merece atencao:

⚠️ *Celular (1/12)*
💰 R$ 99,00
📅 Vencimento: 05/04
📊 Status: Pendente
💬 A conta 'Celular (1/12)' venceu em 05/04 e ainda nao tem pagamento registrado.

Minha leitura aqui:
Pode ser que ela ja tenha sido paga e so faltou registrar, ou que ainda esteja em aberto.

O que aconteceu nesse caso?
```

### 8.3 Clarifying question

```text
Entendi. So pra eu ler isso direito:

ela foi paga e faltou registrar, ou ainda esta pendente?
```

### 8.4 Diagnostic conclusion

```text
Entendi.

Entao a leitura mais provavel aqui e:
essa conta ja foi paga e o sistema ficou sem esse registro.
```

### 8.5 Deferred ending

```text
Perfeito.

Deixo isso sinalizado aqui como um ponto que vale revisar depois.
```

### 8.6 Tone rules

- tentative, never accusatory
- one hypothesis at a time
- one question at a time
- avoid internal jargon
- avoid bureaucratic phrasing
- no action language in this phase

---

## 9. Hypothesis rules by anomaly

### 9.1 Overdue without settlement

Preferred hypothesis order:

1. paid but missing record
2. still overdue

Reason:

- it is the most useful ambiguity to resolve
- it directly reduces uncertainty without requiring action

### 9.2 Zeroed bill

Preferred hypothesis order:

1. amount not informed yet
2. already settled
3. no longer applies

Reason:

- missing value is the most common and least accusatory interpretation

### 9.3 Paid inconsistent

Preferred hypothesis order:

1. missing payment date
2. missing paid amount
3. both missing

Reason:

- users usually remember the event first, then the exact amount details

### 9.4 Zero balance account

Preferred hypothesis order:

1. still active but stale balance
2. no longer active

Reason:

- keeps the question practical and non-threatening

---

## 10. Memory policy

Phase 2 may store diagnostic conclusions, but only as read-oriented notes.

Allowed:

- "Conta X parece ter sido paga e so faltou registrar."
- "Conta Y ainda esta em aberto segundo o usuario."
- "Conta Z segue ativa, saldo zerado parece stale."

Not allowed:

- auto-updating the bill/account based on that conclusion
- writing future pending corrections

Memory is there to improve continuity, not to trigger silent action.

---

## 11. Anti-fatigue rules for diagnosis

Diagnosis is more cognitively expensive than observation, so stricter guardrails are needed.

1. Ask about only one anomaly at a time.
2. Start with the highest-priority unresolved anomaly.
3. Do not ask a second diagnostic question until the first one is concluded, deferred, or abandoned.
4. If the user gives a low-interest signal like `depois vejo`, stop and defer.
5. If the user switches topic, close the diagnosis thread quietly.
6. Explicit health-check may list many anomalies, but the conversation should still branch into one focused diagnostic thread at a time.

---

## 12. Engineering approach

### 12.1 New module responsibilities

1. `accounts-diagnostic.ts`
   - keep observation detection
   - optionally expose helpers to resolve the next diagnosable anomaly

2. `accounts-diagnostic-conversations.ts`
   - map anomaly -> hypothesis set -> question
   - parse replies into diagnosis outcomes
   - remain strictly non-mutative

3. `accounts-response-templates.ts`
   - add diagnosis invitation / question / conclusion templates

4. `context-manager.ts`
   - add diagnosis-only context type(s)
   - no correction-pending context in this phase

### 12.2 Existing capabilities to reuse

- anomaly ordering from Phase 1
- `conversation_context` infrastructure
- semantic formatting patterns already aligned with calendar
- actor display naming if needed for personalized copy

### 12.3 What must not change

- existing passive listing behavior from Phase 1
- health-check observation output contract
- `marcarComoPago`
- calendar flows
- any safe-action confirmation pattern

---

## 13. Acceptance criteria

Phase 2 is only complete when:

1. Ana Clara can ask a focused diagnostic question for the supported anomalies
2. the diagnostic conversation stays explicitly non-mutative
3. replies are interpreted into clear diagnostic conclusions or defer states
4. only one anomaly is handled at a time
5. existing Phase 1 observation behavior still works
6. tests cover:
   - diagnosis question selection
   - reply interpretation
   - state transitions
   - no-mutation boundaries

---

## 14. Out of scope handoff to Phase 3

Phase 3 starts only after Phase 2 is stable.

Phase 3 will introduce:

- explicit confirmation
- exact change preview
- safe mutation
- audit trail

That must be a separate implementation step.

This spec deliberately stops at:

- "I saw it"
- "I think I understand it"
- "Here is the right question"

It does **not** cross into:

- "I changed it"

---

## 15. Derived from

- `specs/2026-04-11-accounts-diagnostic-ux-spec.md`
- `vision/2026-04-11-ana-clara-cognitive-ux-maturity.md`
- QA feedback after Phase 1 production smoke:
  - "a Ana Clara começou a parar de so listar e começou a ler o sistema"
  - "agora e a hora de fazer a Ana Clara perguntar bem antes de deixa-la agir"
