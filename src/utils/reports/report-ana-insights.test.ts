import { describe, expect, it } from 'vitest';

import {
  buildFallbackReportAnaSection,
  parseReportAnaResponse,
} from '../../../supabase/functions/_shared/report-ana.ts';
import {
  createEmptyReportContext,
  type ReportIntelligenceContext,
} from '@/utils/reports/intelligence-contract';

describe('report ana insights', () => {
  it('parses a structured Ana Clara payload even when wrapped in markdown fences', () => {
    const section = parseReportAnaResponse(`
\`\`\`json
{
  "summary": "Sua leitura do período está estável.",
  "insights": ["Receitas superaram despesas."],
  "risks": ["Uso do cartão merece acompanhamento."],
  "recommendations": ["Mantenha o ritmo de economia."],
  "nextBestActions": ["Revisar orçamento do próximo mês."]
}
\`\`\`
`);

    expect(section).toEqual({
      summary: 'Sua leitura do período está estável.',
      insights: ['Receitas superaram despesas.'],
      risks: ['Uso do cartão merece acompanhamento.'],
      recommendations: ['Mantenha o ritmo de economia.'],
      nextBestActions: ['Revisar orçamento do próximo mês.'],
    });
  });

  it('builds a deterministic fallback narrative from the canonical reports context', () => {
    const context: ReportIntelligenceContext = {
      ...createEmptyReportContext(),
      overview: {
        financialScore: 78,
        savingsRate: 22,
        netWorth: 9256,
        goalsReached: 0,
        activeGoals: 2,
        hasSufficientData: true,
      },
      cashflow: {
        incomeTotal: 5000,
        expenseTotal: 1200,
        netTotal: 3800,
        monthlySeries: [],
        largestIncomeMonth: null,
        largestExpenseMonth: null,
        averageMonthlySavingsRate: 22,
        trend: 'stable' as const,
      },
      quality: {
        ...createEmptyReportContext().quality,
        overview: { source: 'internal_calculation', completeness: 'complete' },
        cashflow: { source: 'internal_calculation', completeness: 'complete' },
        balanceSheet: { source: 'internal_calculation', completeness: 'complete' },
      },
    };

    const section = buildFallbackReportAnaSection(context);

    expect(section.summary).toContain('patrimônio');
    expect(section.insights.length).toBeGreaterThan(0);
    expect(section.nextBestActions.length).toBeGreaterThan(0);
  });
});
