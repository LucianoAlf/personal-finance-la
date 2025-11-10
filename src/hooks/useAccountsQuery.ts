import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Account } from '@/types/accounts';

// ✅ Buscar contas
const fetchAccounts = async (): Promise<Account[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  if (error) throw error;
  return data || [];
};

// ✅ Hook com React Query (cache automático)
export const useAccountsQuery = () => {
  const query = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    staleTime: 5 * 60 * 1000, // 5min
    placeholderData: (previousData) => previousData, // ✅ Cache instantâneo
  });

  // Calcular saldo total
  const getTotalBalance = (): number => {
    return (query.data || []).reduce((total, account) => 
      total + (Number(account.current_balance) || 0), 0
    );
  };

  return {
    accounts: query.data || [],
    loading: query.isLoading,
    error: query.error,
    getTotalBalance,
    refetch: query.refetch,
  };
};
