// SPRINT 4 DIA 1: Hook para Investment Radar
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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

export function useMarketOpportunities() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Fetch oportunidades ativas
  const fetchOpportunities = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('market_opportunities')
        .select('*')
        .eq('user_id', user.id)
        .is('dismissed_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('confidence_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setOpportunities(data || []);
    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error);
      toast.error('Erro ao carregar oportunidades');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Gerar novas oportunidades via Edge Function
  const generateOpportunities = useCallback(async () => {
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

      toast.success(`${result.opportunities?.length || 0} oportunidades encontradas!`);

      // Recarregar lista
      await fetchOpportunities();
    } catch (error) {
      console.error('Erro ao gerar oportunidades:', error);
      toast.error('Erro ao gerar oportunidades');
    } finally {
      setGenerating(false);
    }
  }, [user, fetchOpportunities]);

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
          const newOpportunity = payload.new as MarketOpportunity;

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
