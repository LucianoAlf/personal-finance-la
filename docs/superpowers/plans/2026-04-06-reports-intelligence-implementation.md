# Reports Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `/relatorios` placeholder with a real, multi-source reporting hub backed by a canonical reports context that also supports PDF export and report-oriented Ana Clara/scheduled summaries.

**Architecture:** Build one shared backend `report intelligence context` that aggregates accounts, transactions, cards, goals, payable bills, and investment summary into a deterministic snapshot with provenance metadata. The `/relatorios` page, PDF export, and report-like scheduled messages consume that same snapshot, while Ana Clara continues to use multiple domain contexts across the app rather than reports becoming her only source of truth.

**Tech Stack:** React, TypeScript, Supabase Edge Functions, Supabase Postgres/RPC, TanStack Query, Recharts, jsPDF, Vitest

---

## File Structure

**Create:**
- `src/utils/reports/intelligence-contract.ts` - shared report context types and quality helpers
- `src/utils/reports/intelligence-contract.test.ts` - contract-level unit tests
- `src/utils/reports/view-model.ts` - pure UI mapping helpers for report sections
- `src/utils/reports/view-model.test.ts` - tests for section rendering rules
- `src/utils/reports/pdfExport.ts` - reports PDF export using canonical report context
- `src/utils/reports/pdfExport.test.ts` - tests for export section builders
- `src/hooks/useReportsIntelligence.ts` - frontend hook that fetches canonical report context
- `src/components/reports/ReportsPeriodFilter.tsx` - report-specific period selector
- `src/components/reports/ReportsEmptyState.tsx` - real empty-state based on context sufficiency
- `src/components/reports/ReportsOverviewCards.tsx` - top KPIs
- `src/components/reports/ReportsSpendingSection.tsx` - expense composition section
- `src/components/reports/ReportsTrendSection.tsx` - 12-month income/expense/net trends
- `src/components/reports/ReportsBalanceSheetSection.tsx` - assets/liabilities/net worth
- `src/components/reports/ReportsObligationsSection.tsx` - payable bills + cards pressure block
- `src/components/reports/ReportsGoalsSection.tsx` - goals progress block
- `src/components/reports/ReportsInvestmentsSection.tsx` - investment summary block
- `src/components/reports/ReportsAnaSection.tsx` - Ana Clara interpretation block
- `src/components/reports/ReportsExportButton.tsx` - wired export action
- `supabase/functions/_shared/report-intelligence.ts` - canonical reports context builder
- `supabase/functions/_shared/report-renderers.ts` - deterministic report message and PDF/export summary helpers
- `supabase/functions/report-intelligence/index.ts` - edge function that returns canonical report context

**Modify:**
- `src/pages/Reports.tsx` - replace hardcoded placeholder UI
- `src/hooks/useAnaDashboardInsights.ts` - optionally read report-oriented summary metadata where useful for broader Ana context
- `src/components/payable-bills/ExportButton.tsx` - align PDF export pattern with shared helpers if needed
- `supabase/functions/send-daily-summary/index.ts` - use shared report renderers/context for report-like summaries
- `supabase/functions/send-weekly-summary/index.ts` - use shared report renderers/context for report-like summaries
- `supabase/functions/send-monthly-summary/index.ts` - use shared report renderers/context for report-like summaries
- `supabase/functions/send-overdue-bill-alerts/index.ts` - enrich overdue alerts with report context summary framing

**Reuse without rewriting core ownership:**
- `src/hooks/useAnalytics.ts`
- `src/hooks/useBillReports.ts`
- `src/hooks/useGoalsQuery.ts`
- `src/hooks/useAccountsQuery.ts`
- `src/hooks/useTransactionsQuery.ts`
- `supabase/functions/_shared/investment-intelligence.ts`
- `supabase/migrations/20251209_expand_bill_analytics.sql`

---

### Task 1: Define the reports intelligence contract

**Files:**
- Create: `src/utils/reports/intelligence-contract.ts`
- Test: `src/utils/reports/intelligence-contract.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';

import {
  getReportQualityLabel,
  hasRenderableReportData,
  isReportSectionReliable,
  type ReportIntelligenceContext,
} from '@/utils/reports/intelligence-contract';

describe('reports intelligence contract', () => {
  it('marks sections reliable only when complete and non-unavailable', () => {
    expect(
      isReportSectionReliable({
        source: 'database_state',
        completeness: 'complete',
      })
    ).toBe(true);

    expect(
      isReportSectionReliable({
        source: 'unavailable',
        completeness: 'unavailable',
      })
    ).toBe(false);
  });

  it('provides quality labels for the reports UI', () => {
    expect(getReportQualityLabel('database_state')).toBe('Dados do banco');
    expect(getReportQualityLabel('internal_calculation')).toBe('Cálculo interno');
  });

  it('treats the page as renderable when at least one strong section has data', () => {
    const context = {
      overview: { hasSufficientData: true },
      quality: {
        overview: { source: 'database_state', completeness: 'complete' },
        cashflow: { source: 'database_state', completeness: 'complete' },
      },
    } as ReportIntelligenceContext;

    expect(hasRenderableReportData(context)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test "src/utils/reports/intelligence-contract.test.ts"`

Expected: FAIL because the reports contract module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```typescript
export type ReportQualitySource =
  | 'database_state'
  | 'internal_calculation'
  | 'external_market'
  | 'ai_interpretation'
  | 'unavailable';

export type ReportQualityCompleteness = 'complete' | 'partial' | 'unavailable';

export interface ReportSectionQuality {
  source: ReportQualitySource;
  completeness: ReportQualityCompleteness;
}

export interface ReportIntelligenceContext {
  overview?: { hasSufficientData: boolean };
  quality: Record<string, ReportSectionQuality>;
}

export function isReportSectionReliable(section: ReportSectionQuality) {
  return section.source !== 'unavailable' && section.completeness === 'complete';
}

export function getReportQualityLabel(source: ReportQualitySource) {
  const labels: Record<ReportQualitySource, string> = {
    database_state: 'Dados do banco',
    internal_calculation: 'Cálculo interno',
    external_market: 'Mercado externo',
    ai_interpretation: 'Interpretação da Ana Clara',
    unavailable: 'Indisponível',
  };

  return labels[source];
}

export function hasRenderableReportData(context: ReportIntelligenceContext) {
  return Boolean(
    context.overview?.hasSufficientData ||
      Object.values(context.quality || {}).some(isReportSectionReliable)
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test "src/utils/reports/intelligence-contract.test.ts"`

Expected: PASS

---

### Task 2: Build the shared backend report context and edge function

**Files:**
- Create: `supabase/functions/_shared/report-intelligence.ts`
- Create: `supabase/functions/report-intelligence/index.ts`
- Modify: `src/utils/reports/intelligence-contract.ts`
- Test: `src/utils/reports/intelligence-contract.test.ts`

- [ ] **Step 1: Extend the contract test with required sections**

```typescript
it('requires the canonical reports sections used by UI and exports', () => {
  const sections = [
    'overview',
    'cashflow',
    'spending',
    'balanceSheet',
    'obligations',
    'goals',
    'investments',
    'ana',
    'quality',
  ];

  const context = createEmptyReportContext();

  expect(Object.keys(context)).toEqual(expect.arrayContaining(sections));
  expect(context.quality.overview).toEqual({
    source: 'unavailable',
    completeness: 'unavailable',
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test "src/utils/reports/intelligence-contract.test.ts"`

Expected: FAIL because `createEmptyReportContext()` and the full section shape do not exist.

- [ ] **Step 3: Implement the contract shape and backend builder**

Add the contract factory:

```typescript
export function createEmptyReportContext(): ReportIntelligenceContext {
  return {
    overview: { hasSufficientData: false },
    cashflow: null,
    spending: null,
    balanceSheet: null,
    obligations: null,
    goals: null,
    investments: null,
    ana: null,
    quality: {
      overview: { source: 'unavailable', completeness: 'unavailable' },
      cashflow: { source: 'unavailable', completeness: 'unavailable' },
      spending: { source: 'unavailable', completeness: 'unavailable' },
      balanceSheet: { source: 'unavailable', completeness: 'unavailable' },
      obligations: { source: 'unavailable', completeness: 'unavailable' },
      goals: { source: 'unavailable', completeness: 'unavailable' },
      investments: { source: 'unavailable', completeness: 'unavailable' },
      ana: { source: 'unavailable', completeness: 'unavailable' },
    },
  };
}
```

Create the shared builder skeleton:

```typescript
export async function buildReportIntelligenceContext({
  supabase,
  userId,
  startDate,
  endDate,
  supabaseUrl,
}: {
  supabase: any;
  userId: string;
  startDate: string;
  endDate: string;
  supabaseUrl?: string;
}) {
  const context = createReportContextBase(startDate, endDate);

  const [accounts, transactions, goals, cardTransactions, cardInvoices, payableBills] = await Promise.all([
    fetchAccounts(supabase, userId),
    fetchTransactions(supabase, userId, startDate, endDate),
    fetchGoals(supabase, userId),
    fetchCardTransactions(supabase, userId, startDate, endDate),
    fetchCardInvoices(supabase, userId, startDate, endDate),
    fetchBillAnalytics(supabase, userId, startDate, endDate),
  ]);

  const investmentSummary = supabaseUrl
    ? await fetchInvestmentReportSummary(supabase, userId, startDate, endDate, supabaseUrl)
    : null;

  return finalizeReportContext({
    context,
    accounts,
    transactions,
    goals,
    cardTransactions,
    cardInvoices,
    payableBills,
    investmentSummary,
  });
}
```

Expose it through an edge function:

```typescript
serve(async (req) => {
  const { startDate, endDate } = await req.json();
  const supabase = createClient(supabaseUrl, supabaseKey);
  const userId = await resolveUserIdFromRequest(req, supabase);

  const context = await buildReportIntelligenceContext({
    supabase,
    userId,
    startDate,
    endDate,
    supabaseUrl,
  });

  return json(context);
});
```

- [ ] **Step 4: Run the focused test to verify the contract passes**

Run: `pnpm test "src/utils/reports/intelligence-contract.test.ts"`

Expected: PASS

---

### Task 3: Add frontend view-model helpers and wire a real `/relatorios`

**Files:**
- Create: `src/utils/reports/view-model.ts`
- Create: `src/utils/reports/view-model.test.ts`
- Create: `src/hooks/useReportsIntelligence.ts`
- Create: `src/components/reports/ReportsPeriodFilter.tsx`
- Create: `src/components/reports/ReportsEmptyState.tsx`
- Create: `src/components/reports/ReportsOverviewCards.tsx`
- Create: `src/components/reports/ReportsSpendingSection.tsx`
- Create: `src/components/reports/ReportsTrendSection.tsx`
- Create: `src/components/reports/ReportsBalanceSheetSection.tsx`
- Create: `src/components/reports/ReportsObligationsSection.tsx`
- Create: `src/components/reports/ReportsGoalsSection.tsx`
- Create: `src/components/reports/ReportsInvestmentsSection.tsx`
- Create: `src/components/reports/ReportsAnaSection.tsx`
- Modify: `src/pages/Reports.tsx`

- [ ] **Step 1: Write the failing view-model test**

```typescript
import { describe, expect, it } from 'vitest';

import { buildReportsOverviewCards } from '@/utils/reports/view-model';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';

describe('reports view model', () => {
  it('maps canonical overview into the top cards', () => {
    const context = {
      overview: {
        financialScore: 82,
        savingsRate: 24.5,
        netWorth: 15619,
        goalsReached: 1,
        activeGoals: 2,
        hasSufficientData: true,
      },
      quality: {
        overview: { source: 'database_state', completeness: 'complete' },
      },
    } as ReportIntelligenceContext;

    expect(buildReportsOverviewCards(context)).toEqual([
      expect.objectContaining({ title: 'Score Financeiro', value: '82' }),
      expect.objectContaining({ title: 'Taxa de Economia', value: '24.5%' }),
      expect.objectContaining({ title: 'Patrimônio Líquido', value: 'R$ 15.619,00' }),
      expect.objectContaining({ title: 'Metas Alcançadas', value: '1' }),
    ]);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `pnpm test "src/utils/reports/view-model.test.ts"`

Expected: FAIL because the view-model helper does not exist.

- [ ] **Step 3: Implement the view model, hook, and page wiring**

Create the view model:

```typescript
export function buildReportsOverviewCards(context: ReportIntelligenceContext) {
  return [
    {
      title: 'Score Financeiro',
      value: String(context.overview?.financialScore ?? 0),
      subtitle: getQualitySubtitle(context.quality.overview),
    },
    {
      title: 'Taxa de Economia',
      value: `${(context.overview?.savingsRate ?? 0).toFixed(1)}%`,
      subtitle: getQualitySubtitle(context.quality.cashflow),
    },
    {
      title: 'Patrimônio Líquido',
      value: formatCurrency(context.overview?.netWorth ?? 0),
      subtitle: getQualitySubtitle(context.quality.balanceSheet),
    },
    {
      title: 'Metas Alcançadas',
      value: String(context.overview?.goalsReached ?? 0),
      subtitle: `${context.overview?.activeGoals ?? 0} metas ativas`,
    },
  ];
}
```

Create the query hook:

```typescript
export function useReportsIntelligence(period: { startDate: string; endDate: string }) {
  return useQuery({
    queryKey: ['report-intelligence', period.startDate, period.endDate],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('report-intelligence', {
        body: period,
      });

      if (error) throw error;
      return data as ReportIntelligenceContext;
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

Replace `Reports.tsx` with canonical sections:

```tsx
export function Reports() {
  const [period, setPeriod] = useState(getDefaultReportsPeriod());
  const { data: context, isLoading, error } = useReportsIntelligence(period);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Relatórios"
        subtitle="Análises detalhadas da sua vida financeira"
        icon={<BarChart3 size={24} />}
        actions={<ReportsExportButton context={context} period={period} disabled={!context} />}
      />

      <div className="p-6 space-y-6">
        <ReportsPeriodFilter value={period} onChange={setPeriod} />
        <ReportsOverviewCards context={context} loading={isLoading} />
        <ReportsSpendingSection context={context} loading={isLoading} />
        <ReportsTrendSection context={context} loading={isLoading} />
        <ReportsBalanceSheetSection context={context} loading={isLoading} />
        <ReportsObligationsSection context={context} loading={isLoading} />
        <ReportsGoalsSection context={context} loading={isLoading} />
        <ReportsInvestmentsSection context={context} loading={isLoading} />
        <ReportsAnaSection context={context} loading={isLoading} />
        {!isLoading && context && !hasRenderableReportData(context) ? <ReportsEmptyState /> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the focused view-model test**

Run: `pnpm test "src/utils/reports/view-model.test.ts"`

Expected: PASS

---

### Task 4: Implement PDF export from the canonical reports context

**Files:**
- Create: `src/utils/reports/pdfExport.ts`
- Create: `src/utils/reports/pdfExport.test.ts`
- Create: `src/components/reports/ReportsExportButton.tsx`
- Modify: `src/pages/Reports.tsx`

- [ ] **Step 1: Write the failing PDF export test**

```typescript
import { describe, expect, it } from 'vitest';

import { buildReportsPdfSections } from '@/utils/reports/pdfExport';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';

describe('reports pdf export helpers', () => {
  it('builds deterministic sections before the Ana narrative block', () => {
    const context = {
      overview: { financialScore: 82, savingsRate: 24.5, netWorth: 15619, goalsReached: 1, activeGoals: 2 },
      ana: { summary: 'Seu mês foi consistente.' },
      quality: {},
    } as ReportIntelligenceContext;

    const sections = buildReportsPdfSections(context);

    expect(sections[0].title).toBe('Resumo Executivo');
    expect(sections[sections.length - 1].title).toBe('Leitura da Ana Clara');
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `pnpm test "src/utils/reports/pdfExport.test.ts"`

Expected: FAIL because the reports PDF helpers do not exist.

- [ ] **Step 3: Implement export helpers and button wiring**

Create the PDF builder:

```typescript
export function buildReportsPdfSections(context: ReportIntelligenceContext) {
  return [
    {
      title: 'Resumo Executivo',
      rows: [
        ['Score Financeiro', String(context.overview?.financialScore ?? 0)],
        ['Taxa de Economia', `${(context.overview?.savingsRate ?? 0).toFixed(1)}%`],
        ['Patrimônio Líquido', formatCurrency(context.overview?.netWorth ?? 0)],
      ],
    },
    {
      title: 'Leitura da Ana Clara',
      rows: [['Resumo', context.ana?.summary ?? 'Sem narrativa adicional disponível.']],
    },
  ];
}

export function exportReportsToPDF(context: ReportIntelligenceContext, label: string) {
  const doc = new jsPDF();
  const sections = buildReportsPdfSections(context);
  sections.forEach((section) => {
    autoTable(doc, { head: [[section.title, 'Valor']], body: section.rows });
  });
  doc.save(`relatorios-${label}.pdf`);
}
```

Wire the button:

```tsx
export function ReportsExportButton({ context, period, disabled }: Props) {
  return (
    <Button
      size="sm"
      disabled={disabled}
      onClick={() => {
        if (!context) return;
        exportReportsToPDF(context, period.label);
      }}
    >
      <Download size={16} className="mr-1" />
      Exportar PDF
    </Button>
  );
}
```

- [ ] **Step 4: Run the focused PDF test**

Run: `pnpm test "src/utils/reports/pdfExport.test.ts"`

Expected: PASS

---

### Task 5: Integrate Ana Clara and scheduled report-like summaries

**Files:**
- Create: `supabase/functions/_shared/report-renderers.ts`
- Modify: `supabase/functions/send-daily-summary/index.ts`
- Modify: `supabase/functions/send-weekly-summary/index.ts`
- Modify: `supabase/functions/send-monthly-summary/index.ts`
- Modify: `supabase/functions/send-overdue-bill-alerts/index.ts`

- [ ] **Step 1: Write the failing renderer test**

```typescript
import { describe, expect, it } from 'vitest';

import { buildDailyReportSummaryMessage } from '@/utils/reports/view-model';

describe('report summary renderer rules', () => {
  it('puts deterministic facts before Ana Clara interpretation', () => {
    const message = buildDailyReportSummaryMessage({
      overview: { netWorth: 15619, savingsRate: 24.5 },
      ana: { summary: 'Bom controle financeiro no período.' },
    } as any);

    expect(message.indexOf('Resumo determinístico')).toBeLessThan(
      message.indexOf('Leitura da Ana Clara')
    );
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `pnpm test "src/utils/reports/view-model.test.ts"`

Expected: FAIL because the report-summary renderer helper does not exist.

- [ ] **Step 3: Implement shared renderers and migrate the summary functions**

Create the renderer:

```typescript
export function renderReportSummaryMessage({
  mode,
  context,
  userName,
}: {
  mode: 'daily' | 'weekly' | 'monthly' | 'overdue';
  context: ReportIntelligenceContext;
  userName: string;
}) {
  return [
    `Olá ${userName}!`,
    '',
    'Resumo determinístico',
    `Patrimônio líquido: ${formatCurrency(context.overview?.netWorth ?? 0)}`,
    `Taxa de economia: ${(context.overview?.savingsRate ?? 0).toFixed(1)}%`,
    '',
    'Leitura da Ana Clara',
    context.ana?.summary ?? 'Sem narrativa adicional disponível.',
  ].join('\n');
}
```

Replace bespoke message assembly in the cron functions:

```typescript
const context = await buildReportIntelligenceContext({
  supabase,
  userId: user.user_id,
  startDate,
  endDate,
  supabaseUrl: SUPABASE_URL,
});

const message = renderReportSummaryMessage({
  mode: 'weekly',
  context,
  userName: userdata.full_name,
});
```

For overdue alerts, keep the bill-specific trigger but prepend the report framing:

```typescript
const alertMessage = renderReportSummaryMessage({
  mode: 'overdue',
  context,
  userName,
});
```

- [ ] **Step 4: Run the focused renderer test**

Run: `pnpm test "src/utils/reports/view-model.test.ts"`

Expected: PASS

---

### Task 6: Verify typecheck, tests, deploy, and real behavior

**Files:**
- Modify only files from prior tasks

- [ ] **Step 1: Run local verification**

Run:
- `pnpm exec tsc -b --pretty false`
- `pnpm test`

Expected:
- TypeScript build passes
- all report-related tests pass

- [ ] **Step 2: Deploy report-related edge functions**

Run:
- `supabase functions deploy report-intelligence --project-ref sbnpmhmvcspwcyjhftlw`
- `supabase functions deploy send-daily-summary --project-ref sbnpmhmvcspwcyjhftlw`
- `supabase functions deploy send-weekly-summary --project-ref sbnpmhmvcspwcyjhftlw`
- `supabase functions deploy send-monthly-summary --project-ref sbnpmhmvcspwcyjhftlw`
- `supabase functions deploy send-overdue-bill-alerts --project-ref sbnpmhmvcspwcyjhftlw`

Expected: successful deploy output for every function changed in this plan.

- [ ] **Step 3: Validate the page with real data**

Browser checklist:
- Open `/relatorios`
- Confirm the empty-state card is gone for users with real data
- Confirm `Score Financeiro`, `Taxa de Economia`, `Patrimônio Líquido`, and `Metas Alcançadas` are no longer hardcoded zeroes
- Confirm charts render from real section data
- Confirm provenance or partial-state messaging appears when a section is incomplete

Expected:
- page reflects live data instead of placeholders

- [ ] **Step 4: Validate PDF export and one scheduled summary path**

Run:
- Click `Exportar PDF` from `/relatorios`
- Manually trigger one report-like summary function in the real environment

Expected:
- PDF downloads successfully
- deterministic facts appear before Ana narrative
- one scheduled summary path uses the report context successfully

## Self-Review

- Spec coverage: the plan covers the canonical report context, multi-source aggregation, reports UI, PDF export, Ana integration, and scheduled report-style summaries.
- Placeholder scan: no `TODO`, `TBD`, or “implement later” steps remain.
- Type consistency: the plan uses the same `ReportIntelligenceContext`, report quality fields, and canonical render flow across UI, export, and cron consumers.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-06-reports-intelligence-implementation.md`.

Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using the plan as checkpoints

Which approach?
