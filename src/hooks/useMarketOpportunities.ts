// SPRINT 4 DIA 1: Hook para Investment Radar
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { normalizeInvestmentCategory, toAllocationBucket } from '@/utils/investments/contracts';
import { shouldRefreshOpportunityFeed } from '@/utils/investments/overview';

export interface MarketOpportunity {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  confidence_score: number;
  asset_class: string;
  expected_return?: number;
  risk_level: string;
  expires_at: string;
  dismissed_at?: string;
  created_at: string;
}

function inferAssetClass(opportunity: any): string {
  if (opportunity.asset_class) {
    return opportunity.asset_class;
  }

  const ticker = String(opportunity.ticker || '').toUpperCase();

  if (ticker.includes('BTC') || ticker.includes('ETH')) return 'cripto';
  if (ticker.includes('IVVB') || ticker.includes('SPY') || ticker.includes('QQQ')) return 'internacional';
  if (ticker.includes('IPCA') || ticker.includes('SELIC') || ticker.includes('PRE')) return 'renda_fixa';
  if (ticker.endsWith('11')) return 'fiis';

  return toAllocationBucket(normalizeInvestmentCategory(null, 'stock'));
}

function inferRiskLevel(opportunityType: string, confidenceScore: number): string {
  if (opportunityType === 'sell_signal') return 'high';
  if (opportunityType === 'dividend_alert') return 'low';
  if (confidenceScore >= 85) return 'low';
  if (confidenceScore >= 65) return 'medium';
  return 'high';
}

function mapOpportunity(row: any): MarketOpportunity {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.opportunity_type,
    title: row.title,
    description: row.description || row.ana_clara_insight || 'Sem descrição disponível',
    confidence_score: Number(row.confidence_score || 0),
    asset_class: inferAssetClass(row),
    expected_return: row.expected_return ?? undefined,
    risk_level: inferRiskLevel(row.opportunity_type, Number(row.confidence_score || 0)),
    expires_at: row.expires_at,
    dismissed_at: row.dismissed_at ?? undefined,
    created_at: row.created_at,
  };
}

export function useMarketOpportunities() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const refreshAttemptedRef = useRef(false);

  useEffect(() => {
    refreshAttemptedRef.current = false;
  }, [user?.id]);

  const generateOpportunities = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) return;

    try {
      setGenerating(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-opportunities`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao gerar oportunidades');
      }

      const result = await response.json();

      if (!options?.silent) {
        toast.success(`${result.opportunities?.length || 0} oportunidades encontradas!`);
      }

      await fetchOpportunities();
    } catch (error) {
      console.error('Erro ao gerar oportunidades:', error);
      if (!options?.silent) {
        toast.error('Erro ao gerar oportunidades');
      }
    } finally {
      setGenerating(false);
    }
  }, [user]);

  // Fetch oportunidades ativas
  const fetchOpportunities = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [
        { data, error },
        { data: latestInvestment, error: latestInvestmentError },
      ] = await Promise.all([
        supabase
          .from('market_opportunities')
          .select('*')
          .eq('user_id', user.id)
          .is('dismissed_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('confidence_score', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('investments')
          .select('updated_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (error) throw error;
      if (latestInvestmentError) throw latestInvestmentError;

      const latestOpportunityCreatedAt = (data || []).reduce<string | null>((latest, row) => {
        if (!latest) return row.created_at;
        return new Date(row.created_at).getTime() > new Date(latest).getTime() ? row.created_at : latest;
      }, null);

      if (
        !refreshAttemptedRef.current &&
        shouldRefreshOpportunityFeed({
          latestInvestmentUpdatedAt: latestInvestment?.updated_at ?? null,
          latestOpportunityCreatedAt,
        })
      ) {
        refreshAttemptedRef.current = true;
        await generateOpportunities({ silent: true });
        return;
      }

      setOpportunities((data || []).map(mapOpportunity));
    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error);
      toast.error('Erro ao carregar oportunidades');
    } finally {
      setLoading(false);
    }
  }, [generateOpportunities, user]);

  // Dismiss (ignorar) oportunidade
  const dismissOpportunity = useCallback(async (opportunityId: string) => {
    try {
      const { error } = await supabase
        .from('market_opportunities')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', opportunityId);

      if (error) throw error;

      // Remover da lista local
      setOpportunities(prev => prev.filter(opp => opp.id !== opportunityId));

      toast.success('Oportunidade ignorada');
    } catch (error) {
      console.error('Erro ao dismissar oportunidade:', error);
      toast.error('Erro ao ignorar oportunidade');
    }
  }, []);

  // Realtime subscription para novas oportunidades
  useEffect(() => {
    if (!user) return;

    fetchOpportunities();

    const channel = supabase
      .channel('market_opportunities_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_opportunities',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newOpportunity = mapOpportunity(payload.new);

          // Adicionar à lista se não estiver dismissed
          if (!newOpportunity.dismissed_at) {
            setOpportunities(prev => [newOpportunity, ...prev]);
            
            // Notificação toast
            toast.success(`Nova oportunidade: ${newOpportunity.title}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Apenas user.id para evitar loop

  return {
    opportunities,
    loading,
    generating,
    generateOpportunities,
    dismissOpportunity,
    refetch: fetchOpportunities,
  };
}
