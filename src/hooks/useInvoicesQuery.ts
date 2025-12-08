import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// ✅ Buscar faturas de cartão de crédito
const fetchInvoices = async (): Promise<any[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('credit_card_invoices')
    .select(`
      *,
      credit_card:credit_cards(id, name, brand, last_four_digits, color)
    `)
    .eq('user_id', user.id)
    .order('due_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

// ✅ Hook com React Query (cache automático) + Realtime
export const useInvoicesQuery = () => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['invoices'],
    queryFn: fetchInvoices,
    staleTime: 30 * 1000, // Reduzido para 30 segundos
    placeholderData: (previousData) => previousData,
  });

  // ✅ REALTIME: Atualiza automaticamente quando há mudanças
  useEffect(() => {
    // Subscription para mudanças nas faturas
    const invoicesChannel = supabase
      .channel('invoices_query_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_card_invoices',
        },
        (payload) => {
          console.log('🔄 Realtime: fatura alterada', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }
      )
      .subscribe();

    // Subscription para transações de cartão (atualiza totais das faturas)
    const transactionsChannel = supabase
      .channel('invoices_tx_query_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_card_transactions',
        },
        (payload) => {
          console.log('🔄 Realtime: transação de cartão alterada, atualizando faturas', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(invoicesChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, [queryClient]);

  return {
    invoices: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
