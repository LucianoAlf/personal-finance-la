# Reports Final 100 Percent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining reports gaps by persisting a daily consolidated net-worth snapshot, using that history in `/relatorios`, and generating Ana Clara's report narrative from the same deterministic snapshot.

**Architecture:** Extend the existing `portfolio_snapshots` flow into a household balance snapshot with assets, liabilities, net worth, and composition breakdowns. The reports builder will read persisted snapshots for balance-sheet history and summary values, while the Ana Clara report block will be generated on demand from the canonical report context and optionally cached, never treated as the source of truth.

**Tech Stack:** Supabase Postgres migrations, Supabase Edge Functions, React, TypeScript, TanStack Query, Vitest

---

## File Structure

**Create:**
- `supabase/migrations/20260406173000_expand_portfolio_snapshots_to_household_net_worth.sql` - adds consolidated balance-sheet columns and cache key support
- `src/hooks/useReportAnaInsights.ts` - frontend hook for on-demand Ana report narrative
- `supabase/functions/ana-report-insights/index.ts` - on-demand Ana Clara narrative for reports
- `src/utils/reports/report-ana-insights.test.ts` - tests for report Ana formatting / cache contract if needed

**Modify:**
- `supabase/functions/create-portfolio-snapshot/index.ts` - persist consolidated household snapshot, not only investments
- `supabase/functions/_shared/report-intelligence.ts` - consume persisted balance snapshots and expose real `netWorthHistory`
- `src/utils/reports/intelligence-contract.ts` - extend report balance history point if needed
- `src/utils/reports/report-intelligence-builder.test.ts` - add regressions for snapshot-backed balance sheet history
- `src/components/reports/ReportsAnaSection.tsx` - load and render on-demand Ana Clara reading
- `src/pages/Reports.tsx` - pass period into Ana section if required
- `src/utils/reports/pdfExport.ts` - export Ana narrative when available from the same snapshot-based context

---

## Execution Tasks

### Task 1: Persist consolidated household snapshots
- Add migration columns for `total_assets`, `total_liabilities`, `net_worth`, `asset_breakdown`, and `liability_breakdown`.
- Update `create-portfolio-snapshot` to calculate household assets/liabilities using accounts, investments, payable bills, and current card usage for the snapshot date.
- Preserve existing portfolio fields so investments notifications keep working.

### Task 2: Use persisted snapshots in reports balance sheet
- Add failing tests first for snapshot-backed `netWorthHistory` and summary values.
- Update `report-intelligence` to fetch `portfolio_snapshots` for the selected period.
- Build `balanceSheet` from the latest snapshot at or before `endDate` plus the historical points inside the selected range.
- Keep quality metadata honest when only one consolidated snapshot exists.

### Task 3: Generate Ana Clara reading on demand from the same snapshot
- Reuse the canonical report context as the only input to the report narrative.
- Create `ana-report-insights` with optional cache semantics using `ana_insights_cache` and a distinct `insight_type`.
- Add a frontend hook and wire `ReportsAnaSection` to request the narrative only when deterministic report data exists.
- Keep deterministic sections renderable even if Ana generation fails.

### Task 4: Verify end to end
- Run focused tests during each red/green cycle.
- Run full `pnpm test`.
- Run `pnpm exec tsc -b --pretty false`.
- Deploy `create-portfolio-snapshot`, `report-intelligence`, and `ana-report-insights`.
- Trigger a fresh snapshot generation and validate `/relatorios` and PDF output against the updated context.
