# Reports Intelligence Design

## Goal
Transform `src/pages/Reports.tsx` from a static placeholder into a real financial reporting hub backed by live data, while making reports a robust consultation surface for `Ana Clara`, scheduled summaries, and future WhatsApp/email report delivery.

## Product Positioning
The reports page is **not** the single core of Ana Clara.

Ana Clara will continue consuming multiple truth sources across the app:

- goals
- payable bills
- investments
- cards
- accounts
- transactions
- future memory/context layers

The reports domain becomes one of those truth sources, but a particularly strong one because it consolidates broad household financial context in one normalized place.

## Current State
The existing route `/relatorios` is a frontend placeholder:

- hardcoded KPIs
- hardcoded empty state
- decorative PDF button
- no hooks
- no Supabase queries
- no chart implementation

Meanwhile, real analytics already exist elsewhere:

- account balances via `accounts.current_balance`
- income/expense flows via `transactions`
- card/category/trend analytics via `useAnalytics`
- goals via `financial_goals`
- payable bill analytics via `get_bill_analytics`
- dashboard health score via `ana-dashboard-insights`
- investment intelligence via the investments canonical context

This means the problem is not missing data. The problem is missing architecture and integration.

## Architecture Decision
Adopt a **multi-source intelligence architecture**:

- Reports gets its own canonical backend context.
- Ana Clara consumes reports context alongside other domain contexts.
- Scheduled report delivery reuses reports context where appropriate.
- Reports does not replace other domain truth sources.

In practice:

1. `report intelligence context` is the source of truth for the reports page and report exports.
2. Ana Clara can query this reports context when the question or scheduled narrative is report-oriented.
3. Ana Clara still consults goals, investments, bills, cards, and other contexts directly when needed.

## Canonical Reports Model
Introduce a backend-generated `report intelligence context`.

### Top-level sections
- `overview`
- `cashflow`
- `spending`
- `balanceSheet`
- `obligations`
- `goals`
- `investments`
- `ana`
- `quality`

### `overview`
High-level financial posture for the selected period.

Fields:
- `financialScore`
- `savingsRate`
- `netWorth`
- `goalsReached`
- `activeGoals`
- `hasSufficientData`

### `cashflow`
Income, expenses, and net flow over time.

Fields:
- `incomeTotal`
- `expenseTotal`
- `netTotal`
- `monthlySeries`
- `largestIncomeMonth`
- `largestExpenseMonth`
- `averageMonthlySavingsRate`
- `trend`

### `spending`
Expense concentration and category behavior.

Fields:
- `categoryBreakdown`
- `topCategories`
- `monthOverMonthChanges`
- `uncategorizedShare`

### `balanceSheet`
Household financial position.

Fields:
- `totalAssets`
- `totalLiabilities`
- `netWorth`
- `netWorthHistory`
- `assetBreakdown`
- `liabilityBreakdown`

### `obligations`
Short-term financial pressure from cards and payable bills.

Fields:
- `openBillsCount`
- `overdueBillsCount`
- `pendingBillsAmount`
- `creditCardUsed`
- `creditCardLimit`
- `creditCardUtilization`
- `forecastNextMonths`

### `goals`
Progress and execution status for goals.

Fields:
- `active`
- `completed`
- `atRisk`
- `progressByGoal`
- `completionRate`

### `investments`
Summary projection from the investment intelligence layer.

Fields:
- `portfolioValue`
- `totalReturn`
- `allocationSummary`
- `opportunitySignals`
- `planningHighlights`

This section should consume the investment context rather than recomputing it independently.

### `ana`
Narrative and recommendations for report interpretation.

Fields:
- `summary`
- `insights`
- `risks`
- `recommendations`
- `nextBestActions`

This block is derived from deterministic report facts and must never override them.

### `quality`
Per-section metadata describing provenance and completeness.

Allowed provenance:
- `database_state`
- `internal_calculation`
- `external_market`
- `ai_interpretation`
- `unavailable`

Allowed completeness:
- `complete`
- `partial`
- `unavailable`

## Backend Boundaries
Create a shared backend builder for reports.

### Responsibilities
- Collect accounts, transactions, cards, invoices, goals, payable bills, and investment summary.
- Normalize period-based financial facts for the UI.
- Build deterministic summaries for PDF export and scheduled reports.
- Expose provenance/completeness metadata.
- Provide an AI-ready report context for Ana Clara.

### Non-responsibilities
- It does not become the only context Ana Clara uses.
- It does not replace existing investment or bill analytics builders.
- It does not invent values when a domain lacks data.

## Data Source Strategy
Use the strongest existing source for each area instead of forcing everything through one legacy query.

### Reuse candidates
- `accounts` for liquid assets
- `transactions` for income/expense and cashflow
- `credit_card_transactions` and `credit_card_invoices` for card analytics
- `financial_goals` for goals progress
- `get_bill_analytics` for payable bills reporting block
- investment canonical context for the investment block
- `ana-dashboard-insights` patterns for summary AI guardrails

### Aggregation principle
Reports should aggregate domain contexts, not duplicate them blindly.

This keeps reports coherent while preserving clear ownership:
- bills remain owned by bills analytics
- investments remain owned by investment intelligence
- reports stitches these together for a broader family-finance view

## Reports Page UX
The route `/relatorios` should become a real reporting hub.

### Sections
1. Executive summary
2. Expense composition
3. 12-month trends
4. Balance sheet and net worth evolution
5. Obligations and forecast
6. Goals performance
7. Investment summary
8. Ana Clara interpretation

### UI rules
- No hardcoded zeros.
- Empty states must be based on actual data sufficiency.
- Charts only render when their source section is complete or partial with explicit disclosure.
- Provenance messaging should be visible where ambiguity would otherwise exist.

## PDF Export
PDF export must be based on the same reports context used by the page.

### Requirements
- Export button on `/relatorios` must be wired.
- PDF reflects the selected period and current report snapshot.
- PDF uses deterministic data first.
- Ana narrative block is optional and secondary.
- Export should not scrape rendered DOM as the source of truth.

## Ana Clara Integration
Reports is a strong consultation layer for Ana Clara, not her only brain.

### Intended usage
- User asks broad questions like “como foi meu mês?”, “onde estou piorando?”, “qual meu patrimônio líquido?”, “quais categorias mais pesaram?”
- Scheduled daily/weekly/monthly summaries
- Report-oriented WhatsApp/email narratives
- Family-finance performance reviews

### Guardrails
- Ana can summarize and interpret reports context.
- Ana must not claim reports context is the only source she uses.
- When investment or bills detail is needed, she may reference their own domain contexts directly.
- Report narrative must remain aligned with deterministic section data.

## Scheduled Reports
Scheduled report delivery should consume reports context when the job is report-like.

Examples:
- daily report
- weekly report
- monthly report
- payable bills report
- overdue bills alert with report summary framing
- portfolio report summary when the report is portfolio-oriented

This does not mean every message originates from reports context. Domain-specific alerts can still use their native context.

## Error Handling
- If one domain is unavailable, the whole reports page should degrade partially, not collapse entirely.
- Partial sections must be labeled as partial.
- PDF export must omit unavailable sections explicitly rather than fabricating values.
- Ana block may be omitted if AI fails, while deterministic report export still works.

## Testing Strategy
- Unit tests for report context normalization
- Contract tests for provenance/completeness flags
- Integration tests for multi-source aggregation
- PDF export tests against a frozen report context
- E2E coverage for `/relatorios` with real data and empty-state scenarios
- Validation that Ana/report narratives stay aligned with deterministic metrics

## Success Criteria
- `/relatorios` shows real data for users who already have accounts, transactions, goals, bills, or investments.
- PDF export matches the same snapshot shown in the UI.
- Reports becomes a reliable consultation source for Ana Clara.
- Scheduled report messages can reuse the same deterministic report context.
- Reports integrates with the broader Ana architecture without incorrectly becoming its sole source of truth.
