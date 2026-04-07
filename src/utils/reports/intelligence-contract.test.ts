import { describe, expect, it } from 'vitest';

import {
  createEmptyReportContext,
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

  it('treats the page as non-renderable when overview is weak and all sections are unreliable', () => {
    const context = {
      overview: { hasSufficientData: false },
      quality: {
        overview: { source: 'unavailable', completeness: 'unavailable' },
        cashflow: { source: 'internal_calculation', completeness: 'partial' },
      },
    } as ReportIntelligenceContext;

    expect(hasRenderableReportData(context)).toBe(false);
  });

  it('does not treat ana alone as enough to render reports', () => {
    const context = {
      ...createEmptyReportContext(),
      ana: {
        summary: 'Narrativa sem base determinística suficiente.',
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

    expect(hasRenderableReportData(context)).toBe(false);
  });

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
});
