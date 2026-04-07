import { describe, expect, it } from 'vitest';

import { buildReportsPdfSections } from '@/utils/reports/pdfExport';
import {
  createEmptyReportContext,
  type ReportIntelligenceContext,
} from '@/utils/reports/intelligence-contract';

describe('reports pdf export helpers', () => {
  it('builds deterministic sections before the Ana narrative block', () => {
    const context = {
      overview: {
        financialScore: 82,
        savingsRate: 24.5,
        netWorth: 15619,
        goalsReached: 1,
        activeGoals: 2,
      },
      ana: {
        summary: 'Seu mês foi consistente.',
        insights: [],
        risks: [],
        recommendations: [],
        nextBestActions: [],
      },
      quality: {
        overview: { source: 'database_state', completeness: 'complete' },
        cashflow: { source: 'unavailable', completeness: 'unavailable' },
        spending: { source: 'unavailable', completeness: 'unavailable' },
        balanceSheet: { source: 'unavailable', completeness: 'unavailable' },
        obligations: { source: 'unavailable', completeness: 'unavailable' },
        goals: { source: 'database_state', completeness: 'complete' },
        investments: { source: 'unavailable', completeness: 'unavailable' },
        ana: { source: 'ai_interpretation', completeness: 'complete' },
      },
    } as ReportIntelligenceContext;

    const sections = buildReportsPdfSections(context);

    expect(sections[0].title).toBe('Resumo Executivo');
    expect(sections[sections.length - 1].title).toBe('Leitura da Ana Clara');
  });

  it('omits unavailable deterministic overview rows and sections instead of inventing zero summaries', () => {
    const context = {
      ...createEmptyReportContext(),
      ana: {
        summary: 'Seu mês foi consistente.',
        insights: [],
        risks: [],
        recommendations: [],
        nextBestActions: [],
      },
      quality: {
        ...createEmptyReportContext().quality,
        ana: { source: 'ai_interpretation', completeness: 'complete' },
      },
    } as ReportIntelligenceContext;

    const sections = buildReportsPdfSections(context);
    const overviewSection = sections.find((section) => section.title === 'Resumo Executivo');

    expect(overviewSection).toBeUndefined();
    expect(
      sections.some((section) =>
        section.rows.some(([, value]) => value.includes('0 de 0')),
      ),
    ).toBe(false);
    expect(sections[sections.length - 1].title).toBe('Leitura da Ana Clara');
  });

  it('omits populated sections when canonical quality marks them unavailable', () => {
    const context = {
      ...createEmptyReportContext(),
      spending: {
        categoryBreakdown: [
          {
            categoryId: 'food',
            categoryName: 'Alimentação',
            amount: 450,
            share: 35,
            transactionCount: 8,
          },
        ],
        topCategories: [
          {
            categoryId: 'food',
            categoryName: 'Alimentação',
            amount: 450,
            share: 35,
            transactionCount: 8,
          },
        ],
        monthOverMonthChanges: [],
        uncategorizedShare: 5,
      },
      ana: {
        summary: 'Narrativa não canônica.',
        insights: [],
        risks: [],
        recommendations: [],
        nextBestActions: [],
      },
      quality: {
        ...createEmptyReportContext().quality,
        spending: { source: 'unavailable', completeness: 'unavailable' },
        ana: { source: 'unavailable', completeness: 'unavailable' },
      },
    } as ReportIntelligenceContext;

    const sections = buildReportsPdfSections(context);

    expect(sections.find((section) => section.title === 'Composição de Gastos')).toBeUndefined();
    expect(sections.find((section) => section.title === 'Leitura da Ana Clara')).toBeUndefined();
  });
});
