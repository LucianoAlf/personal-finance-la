import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ✅ Buscar cartões de crédito
const fetchCreditCards = async (): Promise<any[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  if (error) throw error;
  return data || [];
};

// ✅ Hook com React Query (cache automático)
export const useCreditCardsQuery = () => {
  const query = useQuery({
    queryKey: ['creditCards'],
    queryFn: fetchCreditCards,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

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
