// FASE 1: Ana Clara com GPT-4 Real - Hook atualizado
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePortfolioMetrics } from './usePortfolioMetrics';
import { useAllocationTargets } from './useAllocationTargets';
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
  
  const [gptInsights, setGptInsights] = useState<AnaInsightsGPT | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function fetchGPTInsights() {
      // Só buscar se tiver investimentos e valor
      if (investments.length === 0 || metrics.currentValue === 0) {
        setIsLoading(false);
        return;
      }

      // Se já está carregando, não fazer nova requisição
      if (isLoading) {
        console.log('[useAnaInsights] Já está carregando, ignorando...');
        return;
      }

      try {
        setIsLoading(true);
        setError(undefined);

        const portfolio = {
          totalInvested: metrics.totalInvested,
          currentValue: metrics.currentValue,
          totalReturn: metrics.totalReturn,
          returnPercentage: metrics.returnPercentage,
          allocation: metrics.allocation,
          investments: investments.map(inv => {
            const currentValue = inv.current_value || (inv.quantity * (inv.current_price || inv.purchase_price));
            const totalInvested = inv.total_invested || (inv.quantity * inv.purchase_price);
            const returnPercentage = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;
            
            return {
              ticker: inv.ticker || inv.name,
              type: inv.type,
              quantity: inv.quantity,
              returnPercentage,
              dividendYield: inv.dividend_yield,
              currentPrice: inv.current_price,
              purchasePrice: inv.purchase_price,
            };
          }),
          targets: targets.map(t => ({
            assetClass: t.asset_class,
            targetPercentage: t.target_percentage,
          })),
        };

        console.log('[useAnaInsights] 🚀 Invocando Edge Function (com cache)...');

        const { data, error: invokeError } = await supabase.functions.invoke(
          'ana-investment-insights',
          { body: { portfolio, forceRefresh: false } }
        );

        if (!isMounted) return;

        if (invokeError) {
          throw new Error(invokeError.message || 'Erro ao buscar insights');
        }

        if (!data) {
          throw new Error('Nenhum dado retornado');
        }

        // Se a resposta contém um erro
        if (data.error) {
          throw new Error(data.error);
        }

        console.log('[useAnaInsights] ✅ Insights recebidos');
        setGptInsights(data as AnaInsightsGPT);
        setIsLoading(false);

      } catch (err) {
        if (!isMounted) return;
        console.error('[useAnaInsights] Erro:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setIsLoading(false);
      }
    }

    // Debounce de 500ms para evitar múltiplas chamadas
    timeoutId = setTimeout(() => {
      fetchGPTInsights();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [investments.length, metrics.currentValue]);

  // Calcular breakdown básico localmente (fallback)
  const breakdown = {
    diversification: Math.min(30, Object.keys(metrics.allocation).filter(k => metrics.allocation[k].percentage > 0).length * 6),
    concentration: investments.length > 0 ? Math.min(25, 25 - Math.max(0, (Math.max(...investments.map(inv => (inv.current_value || 0) / metrics.currentValue * 100)) - 20))) : 0,
    returns: Math.min(25, Math.max(0, (metrics.returnPercentage + 10) * 1.25)),
    risk: 20, // placeholder
    total: gptInsights?.healthScore || 0,
  };

  return {
    healthScore: gptInsights?.healthScore || 0,
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
