import { describe, expect, it } from 'vitest';

import {
  getSectionProvenanceLabel,
  isMarketSectionReliable,
  summarizeQualityMatrix,
  type InvestmentIntelligenceContext,
} from '@/utils/investments/intelligence-contract';

describe('investment intelligence contract helpers', () => {
  it('treats external market sections as reliable only when complete', () => {
    expect(
      isMarketSectionReliable({
        source: 'external_market',
        completeness: 'complete',
      })
    ).toBe(true);

    expect(
      isMarketSectionReliable({
        source: 'external_market',
        completeness: 'partial',
      })
    ).toBe(false);
  });

  it('returns user-facing provenance labels', () => {
    expect(getSectionProvenanceLabel('database_state')).toBe('Dados do banco');
    expect(getSectionProvenanceLabel('ai_interpretation')).toBe('Interpretação da Ana Clara');
  });

  it('summarizes the context quality matrix from canonical sections', () => {
    const context = {
      quality: {
        portfolio: { source: 'database_state', completeness: 'complete' },
        market: { source: 'external_market', completeness: 'partial' },
        planning: { source: 'internal_calculation', completeness: 'complete' },
        opportunities: { source: 'internal_calculation', completeness: 'complete' },
        rebalance: { source: 'internal_calculation', completeness: 'complete' },
        gamification: { source: 'database_state', completeness: 'complete' },
        ana: { source: 'ai_interpretation', completeness: 'partial' },
      },
    } as InvestmentIntelligenceContext;

    expect(summarizeQualityMatrix(context)).toEqual([
      'portfolio:database_state:complete',
      'market:external_market:partial',
      'planning:internal_calculation:complete',
      'opportunities:internal_calculation:complete',
      'rebalance:internal_calculation:complete',
      'gamification:database_state:complete',
      'ana:ai_interpretation:partial',
    ]);
  });
});
