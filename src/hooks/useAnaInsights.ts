// SPRINT 4 DIA 3: Hook para Ana Clara Insights
import { useMemo } from 'react';
import { calculatePortfolioHealthScore } from '@/utils/portfolioHealthScore';
import { useAllocationTargets } from './useAllocationTargets';
import type { Investment } from '@/types/database.types';
import type { HealthScoreBreakdown, HealthInsight } from '@/utils/portfolioHealthScore';

export interface AnaInsights {
  healthScore: number;
  breakdown: HealthScoreBreakdown;
  insight: HealthInsight;
  isLoading: boolean;
}

export function useAnaInsights(investments: Investment[]): AnaInsights {
  const { targets, loading: targetsLoading } = useAllocationTargets();

  const { healthScore, breakdown, insight } = useMemo(() => {
    const result = calculatePortfolioHealthScore(investments, targets);

    return {
      healthScore: result.breakdown.total,
      breakdown: result.breakdown,
      insight: result.insight,
    };
  }, [investments, targets]);

  return {
    healthScore,
    breakdown,
    insight,
    isLoading: targetsLoading,
  };
}
