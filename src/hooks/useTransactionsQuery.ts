import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Transaction, TransactionType } from '@/types/transactions';
import {
  buildCreditCardTransactionTagMap,
  mapCreditCardTransactionRow,
  type CreditCardLedgerRow,
  type CreditCardTagRow,
} from '@/utils/transactions/creditCardLedgerMapping';

interface TransactionFilters {
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  isPaid?: boolean;
}

// ✅ Função para buscar transações normais
const fetchTransactionsNormal = async (filters?: TransactionFilters): Promise<Transaction[]> => {
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
    .order('created_at', { ascending: false })
    .order('transaction_date', { ascending: false });

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

// ✅ Função para buscar transações unificadas (normais + cartão de crédito)
const fetchTransactions = async (filters?: TransactionFilters): Promise<Transaction[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Buscar transações normais
  const normalTransactions = await fetchTransactionsNormal(filters);

  // Buscar transações de cartão de crédito
  let ccQuery = supabase
    .from('credit_card_transactions')
    .select(`
      id,
      user_id,
      category_id,
      amount,
      description,
      purchase_date,
      created_at,
      credit_card_id,
      invoice_id,
      is_installment,
      is_parent_installment,
      installment_number,
      total_installments,
      installment_group_id,
      total_amount,
      category:categories(id, name, icon, color),
      credit_card:credit_cards(id, name, color),
      invoice:credit_card_invoices(reference_month)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Competência do cartão vem da fatura; filtro por data aplica-se depois do mapeamento.
  if (filters?.categoryId) ccQuery = ccQuery.eq('category_id', filters.categoryId);
  
  // Filtro de tipo: se for 'income', não incluir transações de cartão (são sempre despesas)
  if (filters?.type === 'income') {
    return normalTransactions;
  }

  const { data: ccData, error: ccError } = await ccQuery;

  if (ccError) {
    console.error('Erro ao buscar transações de cartão:', ccError);
    return normalTransactions;
  }

  const creditCardIds = (ccData || []).map((cc: { id: string }) => cc.id);
  let creditCardTagsByTransactionId: Record<string, NonNullable<Transaction['tags']>> = {};

  if (creditCardIds.length > 0) {
    const { data: ccTagRows, error: ccTagError } = await supabase
      .from('credit_card_transaction_tags')
      .select('credit_card_transaction_id, tag:tags(id, name, color)')
      .in('credit_card_transaction_id', creditCardIds);

    if (ccTagError) {
      console.error('Erro ao buscar tags das transações de cartão:', ccTagError);
    } else {
      creditCardTagsByTransactionId = buildCreditCardTransactionTagMap(
        (ccTagRows ?? []) as unknown as CreditCardTagRow[],
      );
    }
  }

  let creditCardTransactions: Transaction[] = (ccData || []).map((cc: unknown) =>
    mapCreditCardTransactionRow(cc as CreditCardLedgerRow, creditCardTagsByTransactionId),
  );

  if (filters?.startDate || filters?.endDate) {
    const startYm = filters.startDate ? filters.startDate.slice(0, 7) : null;
    const endYm = filters.endDate ? filters.endDate.slice(0, 7) : null;
    creditCardTransactions = creditCardTransactions.filter((t) => {
      const ym = t.competence_month || t.transaction_date.slice(0, 7);
      if (startYm && ym < startYm) return false;
      if (endYm && ym > endYm) return false;
      return true;
    });
  }

  // Combinar e ordenar por data de criação
  const allTransactions = [...normalTransactions, ...creditCardTransactions];
  allTransactions.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return allTransactions;
};

// ✅ Hook com React Query (cache automático) + Realtime
export const useTransactionsQuery = (filters?: TransactionFilters) => {
  const queryClient = useQueryClient();

  // Query principal com placeholderData para mostrar cache instantaneamente
  const query = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetchTransactions(filters),
    staleTime: 30 * 1000, // 30 segundos (reduzido para atualizar mais rápido)
    placeholderData: (previousData) => previousData, // ✅ Mostra dados antigos instantaneamente
  });

  // ✅ REALTIME: Atualiza automaticamente quando há mudanças no banco
  useEffect(() => {
    // Subscription para transações normais
    const transactionsChannel = supabase
      .channel('transactions_realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          console.log('🔄 Realtime: transação alterada', payload.eventType);
          // Invalidar cache para refetch imediato
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }
      )
      .subscribe();

    // Subscription para transações de cartão de crédito
    const creditCardChannel = supabase
      .channel('credit_card_transactions_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_card_transactions',
        },
        (payload) => {
          console.log('🔄 Realtime: transação de cartão alterada', payload.eventType);
          // Invalidar cache para refetch imediato
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          // Também invalidar queries de cartões
          queryClient.invalidateQueries({ queryKey: ['creditCards'] });
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(creditCardChannel);
    };
  }, [queryClient]);

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
