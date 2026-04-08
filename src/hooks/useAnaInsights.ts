// FASE 1: Ana Clara com GPT-4 Real - Hook atualizado
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserSafeEdgeErrorMessage } from '@/utils/edgeFunctionError';
import { usePortfolioMetrics } from './usePortfolioMetrics';
import { useAllocationTargets } from './useAllocationTargets';
import { useInvestmentGoals } from './useInvestmentGoals';
import type { Investment } from '@/types/database.types';

// Interface para resposta do GPT-4
export interface GPTRecommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AnaInsightsGPT {
  healthScore: number;
  level: 'excellent' | 'good' | 'warning' | 'critical';
  breakdown: {
    diversification: number;
    concentration: number;
    returns: number;
    risk: number;
    total: number;
  };
  mainInsight: string;
  strengths: string[];
  warnings: string[];
  recommendations: GPTRecommendation[];
  nextSteps: string[];
}

export interface AnaInsights {
  healthScore: number;
  level: 'excellent' | 'good' | 'warning' | 'critical';
  insight: {
    level: 'excellent' | 'good' | 'warning' | 'critical';
    message: string;
  };
  breakdown: {
    diversification: number;
    concentration: number;
    returns: number;
    risk: number;
    total: number;
  };
  gptInsights?: AnaInsightsGPT;
  isLoading: boolean;
  error?: string;
}

export function useAnaInsights(investments: Investment[]): AnaInsights {
  const metrics = usePortfolioMetrics(investments);
  const { targets } = useAllocationTargets();
  const { goals: investmentGoals } = useInvestmentGoals();
  const lastFingerprintRef = useRef<string | null>(null);
  const requestFingerprint = useMemo(
    () =>
      JSON.stringify({
        investmentKeys: investments.map((inv) => [
          inv.id,
          inv.current_value,
          inv.total_invested,
          inv.current_price,
          inv.quantity,
        ]),
        targetKeys: targets.map((target) => [target.id, target.asset_class, target.target_percentage]),
        goalKeys: investmentGoals.map((goal) => [goal.id, goal.target_amount, goal.current_amount, goal.target_date]),
      }),
    [investmentGoals, investments, targets]
  );
  
  const [gptInsights, setGptInsights] = useState<AnaInsightsGPT | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    async function fetchGPTInsights() {
      // Só buscar se tiver investimentos e valor
      if (investments.length === 0 || metrics.currentValue === 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(undefined);
        const forceRefresh = lastFingerprintRef.current !== requestFingerprint;

        const { data, error: invokeError } = await supabase.functions.invoke(
          'ana-investment-insights',
          {
            body: {
              forceRefresh,
            },
          }
        );

        if (!isMounted) return;

        if (data && typeof data === 'object' && data !== null) {
          const errObj = (data as { error?: unknown }).error;
          if (errObj && typeof errObj === 'object' && errObj !== null && 'userMessage' in errObj) {
            const um = (errObj as { userMessage: string }).userMessage;
            if (typeof um === 'string' && um.trim()) {
              throw new Error(um.trim());
            }
          }
        }

        if (invokeError) {
          throw new Error(
            getUserSafeEdgeErrorMessage(data, invokeError, 'Erro ao buscar insights'),
          );
        }

        if (!data) {
          throw new Error('Nenhum dado retornado');
        }

        if (data.error) {
          throw new Error(getUserSafeEdgeErrorMessage(data, null, 'Erro ao buscar insights'));
        }

        setGptInsights(data as AnaInsightsGPT);
        lastFingerprintRef.current = requestFingerprint;
        setIsLoading(false);

      } catch (err) {
        if (!isMounted) return;
        console.error('[useAnaInsights] Erro:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setIsLoading(false);
      }
    }

    // Debounce de 500ms para evitar múltiplas chamadas
    const timeoutId = setTimeout(() => {
      fetchGPTInsights();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [investments.length, metrics.currentValue, requestFingerprint]);

  const breakdown = gptInsights?.breakdown || {
    diversification: 0,
    concentration: 0,
    returns: 0,
    risk: 0,
    total: 0,
  };

  return {
    healthScore: gptInsights?.healthScore || breakdown.total,
    level: gptInsights?.level || 'warning',
    insight: {
      level: gptInsights?.level || 'warning',
      message: gptInsights?.mainInsight || 'Carregando análise...',
    },
    breakdown,
    gptInsights,
    isLoading,
    error,
  };
}
