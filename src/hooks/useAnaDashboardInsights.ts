// WIDGET ANA CLARA DASHBOARD - Hook
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getPreferences } from '@/hooks/useAnaPreferences';
import { logInsights } from '@/hooks/useAnaInsightsHistory';
import type { DashboardInsightsResponse } from '@/types/ana-insights.types';
import { getUserSafeEdgeErrorMessage } from '@/utils/edgeFunctionError';

interface UseAnaDashboardInsightsReturn {
  insights: DashboardInsightsResponse | null;
  healthScore: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  meta?: any;
}

function buildEmptyInsights() {
  return {
    primary: {
      priority: 'info' as const,
      type: 'savings_tip' as const,
      headline: 'Dados insuficientes para gerar insights',
      description: 'Comece registrando transações, contas, metas ou investimentos para a Ana Clara analisar seu momento financeiro.',
      action: {
        label: 'Ver transações',
        route: '/transacoes',
      },
    },
    secondary: [],
    healthScore: 0,
    motivationalQuote: 'Cada registro de hoje ajuda a construir clareza para as próximas decisões.',
    meta: {
      hasSufficientData: false,
    },
  };
}

export function useAnaDashboardInsights(
  userId: string,
  autoRefresh: boolean = true
): UseAnaDashboardInsightsReturn {
  const [insights, setInsights] = useState<DashboardInsightsResponse | null>(null);
  const [healthScore, setHealthScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);

  // ✅ Cache local no navegador (para render instantânea)
  const CACHE_KEY = `ana_dashboard_insights_v2_${userId || 'anonymous'}`;
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

  const fetchInsights = useCallback(async (showSpinner: boolean = true) => {
    try {
      if (showSpinner) {
        setIsLoading(true);
      }
      setError(null);

      console.log('[useAnaDashboardInsights] Invocando Edge Function...');

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error: fnError } = await supabase.functions.invoke('ana-dashboard-insights', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: { preferences: getPreferences(), forceRefresh: true },
      });

      if (data && typeof data === 'object' && data !== null) {
        const errObj = (data as { error?: unknown }).error;
        if (errObj && typeof errObj === 'object' && errObj !== null && 'userMessage' in errObj) {
          const um = (errObj as { userMessage: string }).userMessage;
          if (typeof um === 'string' && um.trim()) {
            throw new Error(um.trim());
          }
        }
      }

      if (fnError) {
        console.error('[useAnaDashboardInsights] Erro na Edge Function:', fnError, data);
        throw new Error(
          getUserSafeEdgeErrorMessage(data, fnError, 'Erro ao buscar insights'),
        );
      }

      if (!data) {
        throw new Error('Nenhum dado retornado');
      }

      console.log('[useAnaDashboardInsights] Insights recebidos:', data);

      setInsights(data);
      setHealthScore(data.healthScore || 0);
      setMeta(data.meta || null);

      // ✅ Persistir no cache local com timestamp
      try {
        const payload = {
          ts: Date.now(),
          data,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      } catch {}

      // Registrar histórico local (apenas o principal)
      try {
        logInsights({
          timestamp: new Date().toISOString(),
          priority: data.primary.priority,
          type: data.primary.type,
          headline: data.primary.headline,
          description: data.primary.description,
        });
      } catch {}

      // Notificação push para critical
      try {
        if (data.primary.priority === 'critical' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('Alerta crítico • Ana Clara', {
              body: data.primary.headline,
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        }
      } catch {}

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[useAnaDashboardInsights] Erro:', errorMessage);
      setError(errorMessage);

      const emptyInsights = buildEmptyInsights();
      setInsights(emptyInsights);
      setHealthScore(emptyInsights.healthScore);
      setMeta(emptyInsights.meta);
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  // Auto-refresh a cada 5 minutos
  useEffect(() => {
    if (!userId) {
      const emptyInsights = buildEmptyInsights();
      setInsights(emptyInsights);
      setHealthScore(emptyInsights.healthScore);
      setMeta(emptyInsights.meta);
      setIsLoading(false);
      return;
    }

    // Reidratar cache apenas como fallback curto; a busca forcada prevalece
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as { ts: number; data: DashboardInsightsResponse };
        const fresh = Date.now() - cached.ts < CACHE_TTL_MS;
        if (cached?.data && fresh) {
          setInsights(cached.data);
          setHealthScore((cached.data as any).healthScore || 0);
          setMeta((cached.data as any).meta || null);
          setIsLoading(false); // não mostrar skeleton
        }
      }
    } catch {}

    // Buscar em background para garantir dados atuais apos limpezas/mudancas no banco
    fetchInsights(false);

    if (autoRefresh) {
      const interval = setInterval(() => {
        console.log('[useAnaDashboardInsights] Auto-refresh...');
        fetchInsights(false);
      }, 5 * 60 * 1000); // 5 minutos

      return () => clearInterval(interval);
    }
  }, [fetchInsights, autoRefresh]);

  return {
    insights,
    healthScore,
    isLoading,
    error,
    refresh: fetchInsights,
    meta,
  };
}
