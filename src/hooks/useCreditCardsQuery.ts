import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// ✅ Buscar cartões de crédito (APENAS ATIVOS E NÃO ARQUIVADOS)
const fetchCreditCards = async (): Promise<any[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)      // ✅ Apenas cartões ativos
    .eq('is_archived', false)   // ✅ Não arquivados
    .order('name');

  if (error) throw error;
  return data || [];
};

// ✅ Hook com React Query (cache automático) + Realtime
export const useCreditCardsQuery = () => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['creditCards'],
    queryFn: fetchCreditCards,
    staleTime: 30 * 1000, // Reduzido para 30 segundos
    placeholderData: (previousData) => previousData,
  });

  // ✅ REALTIME: Atualiza automaticamente quando há mudanças
  useEffect(() => {
    // Subscription para mudanças nos cartões
    const cardsChannel = supabase
      .channel('credit_cards_query_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_cards',
        },
        (payload) => {
          console.log('🔄 Realtime: cartão alterado', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['creditCards'] });
        }
      )
      .subscribe();

    // Subscription para transações de cartão (atualiza limites)
    const transactionsChannel = supabase
      .channel('credit_card_tx_query_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_card_transactions',
        },
        (payload) => {
          console.log('🔄 Realtime: transação de cartão alterada', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['creditCards'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cardsChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, [queryClient]);

  // Calcular total usado
  const getTotalUsed = (): number => {
    return (query.data || []).reduce((sum, card) => 
      sum + (card.credit_limit - card.available_limit), 0
    );
  };

  return {
    cards: query.data || [],
    loading: query.isLoading,
    error: query.error,
    getTotalUsed,
    refetch: query.refetch,
  };
};
