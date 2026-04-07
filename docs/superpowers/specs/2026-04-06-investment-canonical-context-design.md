# Investment Canonical Context Design

## Goal
Unify the investment intelligence stack so `Ana Clara`, `Radar de Oportunidades`, `Rebalanceamento`, `Resumo de investimentos`, `WhatsApp`, and `Email` all consume the same backend-generated context and expose the same facts with explicit data provenance.

## Problem
The current investment experience mixes multiple truth sources:

- `Ana Clara` receives a frontend-assembled payload and enriches it with AI output.
- `Radar de Oportunidades` is generated independently from active investments and allocation rules.
- `Resumo de investimentos` builds its own payload from `v_portfolio_summary`, investments, and dividend transactions.
- `send-opportunity-notification` accepts an arbitrary opportunities array from the caller.
- Some overview widgets use real external data, while others use internal calculations or heuristic analysis.

This creates a premium-looking experience, but not yet a fully trustworthy one. The user wants a premium experience that remains grounded in real, explainable data.

## Product Decision
Adopt notification model `C`:

- Deterministic facts first.
- Ana Clara narrative second.
- Guardrails prevent unsupported claims.

This preserves the premium tone while keeping the most important facts verifiable.

## Canonical Model
Introduce a backend-generated `investment intelligence context` as the single source of truth.

### Top-level sections
- `portfolio`: deterministic portfolio totals and allocation.
- `market`: external benchmark and quote-derived facts that are actually available.
- `planning`: deterministic retirement/goal planning facts.
- `opportunities`: rule-based opportunities derived from the same context.
- `rebalance`: mathematical allocation gap analysis derived from the same context.
- `gamification`: app-state progress data, explicitly labeled as internal app data.
- `ana`: AI narrative strictly grounded in the rest of the payload.
- `quality`: provenance and completeness metadata for each section.

### Provenance model
Every section or field group must expose its source:

- `external_market`
- `internal_calculation`
- `database_state`
- `ai_interpretation`
- `unavailable`

This lets both UI and notifications explain what is real market data, what is app-derived, and what is AI interpretation.

## Backend Boundaries
Create one backend builder responsible for composing the canonical context from database state plus currently available market data.

### Responsibilities
- Read active investments, transactions, goals, allocation targets, snapshots, and notification preferences.
- Resolve canonical portfolio totals using the same pricing logic as the UI.
- Fetch or attach real external benchmarks when available.
- Produce deterministic opportunity and rebalance facts from the same normalized allocation.
- Expose a compact AI-ready context so Ana Clara never needs extra ad-hoc inputs from the frontend.

### Non-responsibilities
- It does not send messages directly.
- It does not invent facts when data is missing.
- It does not silently downgrade unavailable market data into fake placeholders.

## Consumer Contract
All consumers must use the canonical context instead of assembling their own.

### UI consumers
- `AnaInvestmentInsights`
- `OpportunityFeed`
- `SmartRebalanceWidget`
- `BenchmarkComparison`
- future export/report flows

### Notification consumers
- `send-opportunity-notification`
- `send-investment-summary`
- any future scheduled WhatsApp/email investment alerts

## Ana Clara Guardrails
Ana Clara becomes a narrative layer over canonical facts.

### Allowed behavior
- Explain concentration, diversification, allocation drift, planning gaps, and benchmark context using provided fields.
- Recommend next steps derived from rule-backed portfolio conditions.
- Add concise interpretation and prioritization.

### Forbidden behavior
- Invent target prices or returns not present in the canonical payload.
- Mention unavailable benchmarks as if fetched.
- Recommend assets or theses unsupported by the canonical context.
- Contradict deterministic fields already shown in UI or notification copy.

## Notification Model C
Notifications should be structured in three blocks:

1. `Deterministic summary`
2. `Ana Clara interpretation`
3. `Action CTA`

### WhatsApp/email content rules
- Facts must come first and be renderable without AI.
- Ana Clara text must be optional and generated from the same payload.
- If AI is unavailable, the deterministic notification still sends.
- If a section is unavailable, the copy must say so explicitly rather than guessing.

## Error Handling
- Missing market source: mark benchmarks or quote-dependent facts as unavailable.
- Missing planning inputs: expose planning section with partial completeness and no fabricated target.
- AI failure: keep deterministic experience working and omit narrative block.
- Notification render failure: fail the delivery attempt with explicit logging rather than sending inconsistent content.

## Testing Strategy
- Unit tests for canonical context normalization and provenance flags.
- Unit tests for deterministic opportunity and rebalance outputs from fixed portfolio fixtures.
- Contract tests to ensure `Ana`, `Radar`, and notifications read the same canonical fields.
- Integration tests for the notification renderers using a frozen canonical payload.
- E2E validation in the investments overview plus at least one real notification execution path.

## Success Criteria
- The same portfolio state produces the same deterministic facts across UI, AI, and notifications.
- Users can distinguish market data from internal app data.
- Ana Clara remains premium but never outruns the facts.
- WhatsApp/email can be trusted to match what the app shows.
