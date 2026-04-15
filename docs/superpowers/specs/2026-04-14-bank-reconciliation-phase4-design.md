# Bank Reconciliation & Open Finance Intelligence — Phase 4 Spec

**Status:** Draft
**Date:** 2026-04-14
**Parent:** `specs/2026-04-11-accounts-safe-operational-actions-spec.md` (Phase 3)
**Related:** `vision/2026-04-11-ana-clara-cognitive-ux-maturity.md`, Phase 1 + 2 specs
**Scope:** Phase 4 — bank reconciliation across the contas and transações domain
**Principle:** Compare system truth with bank truth; close the gap with confidence, not guessing.

**Visual reference:**
- `tmp/phase4-reconciliation-workspace-mockup.html` — match forte (débito automático)
- `tmp/phase4-reconciliation-workspace-mockup-pix.html` — match ambíguo (PIX sem correspondência)

---

## 1. Objective

Phase 1 proved that Ana Clara can **observe** anomalies in the system.

Phase 2 proved that she can **diagnose** what may be happening through conversation.

Phase 3 proved that she can **correct** the system safely after a concluded diagnosis.

Phase 4 must prove that she can **confront the system with external banking reality** and close divergences between what the user registered and what actually happened in their bank accounts.

**Product direction:**

- Ana Clara now operates with two truths in parallel: internal system state and external bank state.
- She detects where they diverge.
- She proposes reconciliation with visible confidence.
- She asks contextual questions when ambiguity is too high.
- She acts only after explicit confirmation.

**One-line product thesis:**

reconciliation is not import; it is the disciplined comparison of what the system believes with what the bank proves, resolved through confidence-scored matching, contextual questioning, and confirmed action

**Second core sentence:**

the Central de Conciliação is a dedicated operational workspace — not a dashboard card — because reconciliation is a mode of work with its own queue, priority, context, and audit trail

---

## 2. Scope

### 2.1 Included (v1 + v1.5)

**v1 — manual ingestion:**

1. Paste bank statement text (structured or semi-structured)
2. Upload CSV (common bank formats: Itaú, Nubank, C6, Mercado Pago, Santander)
3. Manual single-transaction entry
4. Normalize ingested data into a unified `bank_transactions` internal representation
5. Source-agnostic reconciliation pipeline (same logic regardless of how data entered)

**v1.5 — Pluggy/Open Finance ingestion:**

1. Authenticate via Pluggy API (`POST /auth` with `clientId` + `clientSecret`)
2. Poll transactions via `GET /transactions?accountId=...`
3. Poll accounts and balances via `GET /accounts?itemId=...`
4. Poll investments via `GET /investments?itemId=...` (read-only, for future phases)
5. Polling via Supabase Edge Function + pg_cron (no webhooks; `webhookUrl` stays `null`)
6. Feed into the same `bank_transactions` pipeline as v1

**Reconciliation capabilities (both v1 and v1.5):**

1. Detect divergences between bank transactions and system records (`payable_bills`, `transactions`, `accounts`)
2. Score match candidates with explicit confidence
3. Surface divergences in a prioritized inbox
4. Show bank vs system comparison side by side
5. Present Ana Clara's hypothesis, confidence level, and contextual question when needed
6. Propose resolution with explicit confirmation
7. Execute the reconciliation decision through controlled paths (`link`, `reject`, `defer`, `classify`), while financial mutations remain separate safe actions governed by the Phase 3 protocol
8. Preserve full audit trail for every reconciliation decision
9. Track connection health and surface stale connections as structural risk

### 2.2 Not included

- Cartões de crédito reconciliation (future expansion of the same surface)
- Investment reconciliation beyond read-only balance check
- Metas / goals domain
- Cross-domain bundled reconciliation (e.g., reconcile + transfer + goal allocation in one step)
- Automatic reconciliation without confirmation (even high-confidence matches require explicit confirm in v1)
- Payment execution (reconciliation is not payment; these are separate actions)
- Pluggy webhooks (polling only; webhook support is a future optimization)
- n8n workflows (Edge Functions only)
- Browser-based bank scraping

---

## 3. Hard boundaries

These are non-negotiable.

### 3.1 Reconciliation is not payment

Linking a bank transaction to a system record is a classification/matching act. Marking a bill as paid, transferring funds, or updating balances are separate safe actions that follow their own preview/confirm/verify/audit protocol (as established in Phase 3).

Reconciliation may produce a confirmed link/classification decision, but any financial state mutation (for example: mark bill as paid, update balances, or change payable state) remains governed by the Phase 3 safe-action protocol.

### 3.2 No automatic reconciliation without confirmation

Even when confidence is 99%, v1 requires the user to confirm before the system writes the reconciliation link.

This restriction applies to reconciliation writes only.

Allowed automation:

- automatic ingestion
- automatic normalization
- automatic candidate scoring
- automatic prioritization
- automatic case generation
- automatic category suggestion

Not allowed:

- silent linking
- silent relinking
- silent rejection
- silent reconciliation completion

### 3.3 Confidence must always be visible

Every match suggestion must display its confidence score and the reasoning behind it. "Trust me" is not acceptable. The user must be able to see why Ana Clara thinks a bank transaction matches a system record.

### 3.4 Source-agnostic pipeline

Once a bank transaction enters the system — whether from CSV paste, manual entry, or Pluggy API — it flows through the same normalization, matching, and reconciliation logic. There is no separate "manual reconciliation" vs "Pluggy reconciliation" path.

### 3.5 Stale connections are structural risk, not just inbox items

A stale Pluggy connection degrades the reliability of all matches for that account. The system must surface this prominently (header/KPI level), not bury it in the inbox alongside regular divergences.

Operational consequence:

- matches tied to a stale item must carry an explicit reliability warning
- confidence scores for that item must be degraded or capped
- stale-derived cases must be visually distinguishable from healthy-source cases

### 3.6 No reconciliation completion without audit trail

Every reconciliation decision (confirm, reject, defer, re-classify) must be persisted with: actor, timestamp, confidence at decision time, source of bank data, and the specific system record linked. If audit persistence fails, the reconciliation is not considered finalized.

### 3.7 Matching must not mutate financial state

The matching/scoring engine is read-only. It proposes candidates and scores them. It never writes to `payable_bills`, `accounts`, or `transactions`. Writes happen only through the reconciliation action path after confirmation.

---

## 4. Product thesis for Phase 4

Phases 1-3 said:

- "I can see what is in the system."
- "I can understand what may be wrong."
- "I can fix it safely when you confirm."

Phase 4 must say:

- "I can also see what happened in your bank."
- "I can tell you where the system and the bank disagree."
- "I can explain why I think they match — or why I am not sure."
- "I will ask you when I need context, not guess."
- "When you confirm, I will link them and keep the record."

The user should feel:

- "She knows what actually happened, not just what I typed."
- "She found the gap before I did."
- "She explained her reasoning, not just her conclusion."
- "When she was unsure, she asked instead of guessing."
- "My financial system is finally aligned with reality."

---

## 5. Divergence taxonomy

These are the divergence types the system must detect, classify, and surface in the inbox.

### 5.1 Transaction without correspondence (`unmatched_bank_transaction`)

Bank has a transaction; system has no matching record.

Subtypes:
- PIX without match (ambiguous: could be payment, transfer, or personal expense)
- Debit without match (likely a bill payment not yet registered)
- Credit without match (income or refund not registered)

Ana Clara behavior: propose hypotheses with confidence per hypothesis. Ask contextual question when confidence is low ("Was this a bill payment or a personal transfer?").

### 5.2 Bill pending but already paid in bank (`pending_bill_paid_in_bank`)

System shows a `payable_bill` as pending; bank shows a matching outflow.

Ana Clara behavior: high-confidence match when amount + description + date window align. Propose reconciliation: link transaction to bill and suggest marking as paid (separate safe action).

### 5.3 Amount divergence (`amount_mismatch`)

Bank transaction and system record match on description/date but differ in amount.

Ana Clara behavior: surface both amounts side by side. Ask which is correct. Propose update to the system record if the bank amount is authoritative.

### 5.4 Date divergence (`date_mismatch`)

Bank transaction and system record match on amount/description but differ in date (e.g., due date vs actual payment date).

Ana Clara behavior: surface both dates. Explain that payment date often differs from due date. Propose linking with the actual payment date from bank data.

### 5.5 Balance inconsistency (`balance_mismatch`)

Sum of system-side transactions for an account does not match the bank-reported balance.

Ana Clara behavior: show system balance vs bank balance. Identify the delta. Link to unmatched transactions that may explain the gap.

### 5.6 Possible duplicate (`possible_duplicate`)

Two or more bank transactions (or system records) appear to represent the same event.

Ana Clara behavior: surface both records side by side. Ask user to confirm whether this is a genuine duplicate or two separate transactions.

### 5.7 Stale connection (`stale_connection`)

A Pluggy item has not synced within the expected window (configurable, default: 48h).

Ana Clara behavior: this is not a regular reconciliation case but a structural risk. Surface at the header/KPI level with a reauthorization CTA. Warn that matches for this account may be stale, and reduce or cap confidence for all cases tied to that source until the connection is healthy again.

### 5.8 Unclassified transaction (`unclassified_transaction`)

Bank transaction was ingested but has no category assignment in the system.

Ana Clara behavior: suggest category based on description heuristics and existing canonical categorization patterns. Ask for confirmation.

---

## 6. Architecture

### 6.1 Workspace layout (Inbox-first — Option A)

Validated through mockups. The Central de Conciliação is a dedicated page with:

**Top bar:** branding, section navigation (Resumo / Inbox / Histórico / Conexões), ingestion actions (Colar extrato / Upload CSV / Sincronizar Pluggy).

**Risk strip (conditional):** appears only when structural risks exist (stale connections, auth failures). Not an inbox item — a system-level warning with CTA.

**KPI summary:** 5 cards — saldo sistema vs banco, pendências abertas, matches de alta confiança, conexões em risco, fonte ativa.

**Three-column layout:**
- Left (340px): **inbox priorizada**, grouped by severity (urgente / alta / média / infraestrutura), with filters (fonte, tipo, prioridade, confiança, conta).
- Center (flex): **caso aberto** — banco vs sistema side by side, Ana Clara cognitive panel (hypothesis, confidence, contextual question, "what I need from you"), resolution proposal with CTAs (confirmar / rejeitar / adiar), guardrails strip.
- Right (300px): **contexto do caso** (fonte, conta, janela, risco), **timeline / audit trail** (detected → suggested → confirmed → reconciled), **status de conexão**.

### 6.2 Design system alignment

This page must reuse the existing Finance LA design system. Phase 4 may introduce a new workflow, but it may not introduce a parallel visual language.

Formal product rules:

1. Reuse the current dark-mode visual language already established across Dashboard, Contas, Cartões, and Investimentos.
2. Reuse the same structural shell where applicable: sidebar, header, summary cards, modular panels, spacing rhythm, and visual density.
3. Keep typography, contrast, iconography, border treatment, and glow hierarchy aligned with the existing Finance LA UI.
4. Ana Clara must appear as an integrated cognitive layer inside the Finance LA workspace, not as a detached mini-app or separate assistant surface.
5. Mockups and wireframes for Phase 4 must be evaluated against the current product UI, not in isolation.
6. The Central de Conciliação must feel like a native extension of Finance LA, not a prototype bolted onto it.

### 6.3 Ana Clara's role inside the case

Ana Clara is not a sidebar or a chat bubble. She is a **structured cognitive panel** within the case workspace:

1. **"O que eu acho"** — plain-language assessment of what the divergence means.
2. **"Hipóteses"** — when ambiguity exists, she lists hypotheses with explicit confidence percentages (e.g., "38% transferência, 27% pagamento não lançado, 35% sem match ainda").
3. **"Por que"** — reasoning: which signals led to this assessment (amount match, description similarity, date proximity, absence of candidates).
4. **"Pergunta contextual"** — when confidence is below threshold, she asks a specific question instead of guessing (e.g., "Esse PIX foi para pagar uma conta cadastrada ou foi transferência para pessoa?").
5. **"O que preciso de você"** — clear statement of what user input is needed to proceed.

This panel occupies ~60% of the bottom area of the case workspace (more than the resolution panel) to reflect that it is the product differentiator.

### 6.4 Ingestion pipeline (source-agnostic)

```text
CSV / Paste / Manual entry
        |
        v
  [Normalizer]  <--- Pluggy API poller (v1.5)
        |
        v
  bank_transactions (unified internal table)
        |
        v
  [Matching engine] --- reads payable_bills, transactions, accounts
        |
        v
  reconciliation_cases (inbox items with scores)
        |
        v
  Central de Conciliação UI
```

All sources converge at `bank_transactions`. The matching engine is stateless and read-only against financial tables. Writes only happen through the reconciliation action path.

### 6.5 Matching engine

The matching engine scores candidate pairs (bank transaction ↔ system record) using:

1. **Amount similarity** — exact match, within tolerance (e.g., R$ 0.10 for rounding), or percentage deviation.
2. **Date proximity** — same day, within N-day window (configurable, default: 7 days for due date vs payment date).
3. **Description similarity** — keyword overlap, canonical category alignment, beneficiary name matching.
4. **Account alignment** — bank account matches the account associated with the system record.
5. **Historical patterns** — if this payee/amount/day-of-month has been reconciled before, boost confidence.
6. **Source health modifier** — if the source connection is stale or degraded, reduce or cap the maximum confidence regardless of content similarity.

Output: a scored list of candidates per bank transaction, or `no_match` when nothing clears the minimum threshold.

Confidence thresholds (configurable):
- `>= 0.85`: high confidence (surface as strong suggestion)
- `0.50 - 0.84`: medium confidence (surface with reasoning, may need question)
- `< 0.50`: low confidence (surface as "sem match" or "precisa de contexto")

### 6.6 Pluggy integration (v1.5)

**Auth flow (validated integration pattern):** `POST https://api.pluggy.ai/auth` with body `{ clientId, clientSecret }` → receive `apiKey` → use `X-API-KEY: <apiKey>` in subsequent API calls. Do not model this phase around `Authorization: Bearer`; the validated path for this project uses `X-API-KEY`.

**Polling strategy:** Supabase Edge Function triggered by pg_cron (interval configurable, default: every 6 hours). Each run:
1. Authenticate
2. For each configured item (`PLUGGY_ITEM_ID_*`): fetch `/accounts?itemId=...`, fetch `/transactions?accountId=...` (date-windowed, last N days)
3. Normalize into `bank_transactions`
4. Run matching engine
5. Surface new/updated reconciliation cases

**Connection health:** check item status via `GET /items/{id}`. If `status` is not `UPDATED` or `lastUpdatedAt` exceeds staleness threshold, surface as `stale_connection`.

**No webhooks:** `webhookUrl` remains `null`. Polling is the only ingestion trigger.

**Environment variables:**
- `PLUGGY_CLIENT_ID`
- `PLUGGY_CLIENT_SECRET`
- `PLUGGY_API_KEY`
- `PLUGGY_ITEM_ID_NUBANK`
- `PLUGGY_ITEM_ID_ITAU`
- `PLUGGY_ITEM_ID_C6_BANK`
- `PLUGGY_ITEM_ID_MERCADO_PAGO`
- `PLUGGY_ITEM_ID_SANTANDER`

---

## 7. Data model (conceptual)

These are the new tables/entities Phase 4 introduces. Exact column types are for the implementation plan.

### 7.1 `bank_transactions`

Unified representation of a transaction from any external source.

Key fields:
- `id` (uuid)
- `user_id` (references auth.users)
- `source` (enum: `manual_paste`, `csv_upload`, `manual_entry`, `pluggy`)
- `source_item_id` (nullable, Pluggy item id or CSV batch id)
- `external_id` (nullable, Pluggy transaction id or endToEndId for deduplication)
- `account_name` (text, human-readable)
- `external_account_id` (nullable, external source account id such as Pluggy account id)
- `internal_account_id` (nullable, references internal `accounts` only after a reliable mapping exists)
- `amount` (numeric, signed: negative for outflow)
- `date` (date)
- `description` (text)
- `raw_description` (text, original before normalization)
- `category_suggestion` (nullable, from Pluggy or heuristics)
- `currency_code` (default: BRL)
- `imported_at` (timestamptz)
- `reconciliation_status` (enum: `pending`, `matched`, `reconciled`, `rejected`, `deferred`)

### 7.2 `reconciliation_cases`

Each case is one divergence surfaced in the inbox.

Key fields:
- `id` (uuid)
- `user_id`
- `bank_transaction_id` (references `bank_transactions`)
- `divergence_type` (enum: per taxonomy in section 5)
- `matched_record_type` (nullable, enum: `payable_bill`, `transaction`, `account`)
- `matched_record_id` (nullable, uuid)
- `confidence` (numeric 0-1)
- `confidence_reasoning` (jsonb, structured explanation)
- `hypotheses` (jsonb, array of `{label, confidence, reasoning}`)
- `status` (enum: `open`, `awaiting_user`, `confirmed`, `rejected`, `deferred`)
- `priority` (enum: `urgent`, `high`, `medium`, `low`, `infra`)
- `resolved_at` (nullable, timestamptz)
- `resolved_by` (nullable, text: user or `ana_clara`)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 7.3 `reconciliation_audit_log`

Every reconciliation decision.

Key fields:
- `id` (uuid)
- `user_id`
- `case_id` (references `reconciliation_cases`)
- `action` (enum: `confirmed`, `rejected`, `deferred`, `reclassified`, `linked`, `unlinked`)
- `confidence_at_decision` (numeric)
- `bank_transaction_snapshot` (jsonb)
- `system_record_snapshot` (jsonb)
- `actor` (text)
- `notes` (nullable, text)
- `created_at` (timestamptz)

### 7.4 `pluggy_connections`

Track Pluggy item health per user.

Key fields:
- `id` (uuid)
- `user_id`
- `item_id` (text, Pluggy item id)
- `institution_name` (text)
- `status` (text, from Pluggy API)
- `last_synced_at` (nullable, timestamptz)
- `staleness_threshold_hours` (integer, default 48)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

---

## 8. WhatsApp vs Central de Conciliação

### 8.1 What makes sense on WhatsApp

- Quick alerts: "encontrei 3 divergências novas na conciliação. quer ver?"
- Single high-confidence confirmations: "Achei que o débito de R$ 320 no Itaú é a Amil. Posso conciliar?"
- Status checks: "como tá minha conciliação?" → summary response
- Contextual question responses: user answers Ana Clara's question via WhatsApp, answer feeds back into the case

### 8.2 What makes sense on the dedicated page

- Reviewing multiple cases in sequence (inbox workflow)
- Comparing bank vs system side by side with full detail
- Reviewing hypotheses with confidence levels
- Batch operations (future)
- Audit trail inspection
- Connection health management
- CSV/paste ingestion
- Filtering and prioritization

### 8.3 How they complement each other

WhatsApp is the **notification and quick-action** channel. The Central de Conciliação is the **operational workspace**. Ana Clara speaks the same language in both, but the page is where volume work happens. WhatsApp can deep-link to a specific case in the Central.

---

## 9. Guardrails

1. **Conciliar is not pagar.** Linking a bank transaction to a system record is classification. Payment is a separate safe action.
2. **Matching never auto-writes.** The scoring engine proposes; the user confirms.
3. **Confidence is always visible.** No hidden scores. The user sees what Ana Clara sees.
4. **Sensitive actions require confirmation.** Linking, relinking, rejecting, and reclassifying all require explicit user action.
5. **Audit trail is mandatory.** Every decision is persisted with full context. If audit fails, the action does not finalize.
6. **Stale connections are infrastructure risk.** They are not buried in the inbox; they are surfaced at system level.
7. **Source-agnostic.** CSV, paste, manual, Pluggy — all flow through the same pipeline.
8. **No guessing.** When Ana Clara is unsure, she asks a contextual question. She does not fabricate confidence.

---

## 10. Roadmap

### v1 — Manual reconciliation workspace

- Central de Conciliação page (inbox-first layout)
- CSV upload and paste ingestion
- Manual single-transaction entry
- Normalization into `bank_transactions`
- Matching engine with confidence scoring
- Divergence detection and inbox prioritization
- Ana Clara cognitive panel (hypothesis, confidence, question, resolution)
- Reconciliation actions (confirm, reject, defer) with audit trail
- KPI summary and basic filtering

### v1.5 — Pluggy/Open Finance ingestion

- Pluggy API integration (auth, items, accounts, transactions)
- Polling Edge Function + pg_cron
- Connection health tracking (`pluggy_connections`)
- Stale connection detection and risk-strip UI
- Same reconciliation pipeline, now fed automatically

### v2 — Intelligent matching and batch operations

- Historical pattern learning (boost confidence from past reconciliations)
- Batch confirmation mode (resolve multiple high-confidence cases in sequence)
- WhatsApp notification bridge (alert + quick-confirm for high-confidence matches)
- Improved category suggestion using canonical categorization patterns

### v3 — Extended domains

- Credit card invoice reconciliation
- Investment balance verification (read-only comparison with Pluggy data)
- Cross-account transfer detection (PIX between own accounts)

### v4 — Proactive reconciliation intelligence

- Scheduled reconciliation runs with proactive notifications
- Anomaly patterns across time (recurring mismatches, seasonal gaps)
- Financial health score derived from reconciliation completeness

---

## 11. Success criteria

Phase 4 is considered successful when:

1. A user can paste a bank statement or upload a CSV and see divergences surfaced in the inbox within seconds.
2. Each divergence shows bank vs system comparison, Ana Clara's hypothesis with confidence, and a clear resolution path.
3. When Ana Clara is unsure, she asks a specific contextual question instead of guessing.
4. Every reconciliation decision (confirm, reject, defer) is audited with full context.
5. The system handles at least 100 bank transactions per import without degradation.
6. Stale connections are visibly surfaced as structural risk, not just inbox noise.
7. The same UI and logic works regardless of whether data came from CSV or Pluggy.
8. No financial mutation occurs without explicit user confirmation.

---

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Pluggy API rate limits or downtime | Polling with exponential backoff; manual ingestion always available as fallback |
| Low matching accuracy on PIX (generic descriptions) | Contextual questioning; historical pattern learning in v2 |
| Inbox overwhelm with too many cases | Priority-grouped inbox; filters; batch mode in v2 |
| User confusion between reconciliation and payment | Guardrail copy in UI; separate action flows; "conciliar is not pagar" |
| Stale Pluggy items causing false divergences | Stale detection at infrastructure level; suppress matches for stale accounts |
| CSV format variability across banks | Pluggable normalizers per institution; graceful degradation with raw import |
| Audit trail performance at scale | Append-only log table; periodic archival if needed |

---

## 13. Open questions for implementation

1. Should the matching engine run on ingestion (eager) or on page load (lazy)? Recommendation: eager on ingestion, with cache invalidation when system records change.
2. Should `bank_transactions` deduplicate on `external_id` or allow manual duplicates with a merge flow? Recommendation: deduplicate on `(user_id, source, external_id)` when `external_id` is not null.
3. Should the confidence threshold for "high confidence" be a system default or per-user configurable? Recommendation: system default in v1, per-user in v2.
4. Should reconciliation cases auto-close when the underlying system record changes (e.g., bill marked as paid independently)? Recommendation: yes, with audit entry explaining the auto-close reason.
