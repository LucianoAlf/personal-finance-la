import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Transaction, TransactionType } from '@/types/transactions';

interface TransactionFilters {
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  isPaid?: boolean;
}

// ✅ Função para buscar transações (otimizada com 1 query)
const fetchTransactions = async (filters?: TransactionFilters): Promise<Transaction[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('transactions')
    .select(`
      *,
      category:categories(id, name, icon, color),
      account:accounts!account_id(id, name),
      transaction_tags(
        tag:tags(id, name, color)
      )
    `)
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  // Aplicar filtros
  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.accountId) query = query.eq('account_id', filters.accountId);
  if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters?.startDate) query = query.gte('transaction_date', filters.startDate);
  if (filters?.endDate) query = query.lte('transaction_date', filters.endDate);
  if (filters?.isPaid !== undefined) query = query.eq('is_paid', filters.isPaid);

  const { data, error } = await query;

  if (error) throw error;

  // Mapear tags
  return (data || []).map(transaction => ({
    ...transaction,
    tags: transaction.transaction_tags?.map((tt: any) => tt.tag).filter(Boolean) || []
  }));
};

// ✅ Hook com React Query (cache automático)
export const useTransactionsQuery = (filters?: TransactionFilters) => {
  const queryClient = useQueryClient();

  // Query principal com placeholderData para mostrar cache instantaneamente
  const query = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetchTransactions(filters),
    staleTime: 5 * 60 * 1000, // 5min
    placeholderData: (previousData) => previousData, // ✅ Mostra dados antigos instantaneamente
  });

  // Mutation para adicionar transação
  const addMutation = useMutation({
    mutationFn: async (newTransaction: Partial<Transaction>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...newTransaction, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidar cache para refetch
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Mutation para atualizar transação
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Transaction> }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Mutation para deletar transação
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  return {
    transactions: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addTransaction: addMutation.mutate,
    updateTransaction: updateMutation.mutate,
    deleteTransaction: deleteMutation.mutate,
  };
};
