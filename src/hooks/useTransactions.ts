import { useState, useEffect } from 'react';
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

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar todas as transações com relacionamentos
  const fetchTransactions = async (filters?: TransactionFilters) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(id, name, icon, color),
          account:accounts!account_id(id, name)
        `)
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Aplicar filtros se fornecidos
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.accountId) {
        query = query.eq('account_id', filters.accountId);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }
      if (filters?.isPaid !== undefined) {
        query = query.eq('is_paid', filters.isPaid);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('❌ Erro ao buscar transações:', fetchError);
        throw fetchError;
      }

      // Buscar tags para cada transação
      if (data && data.length > 0) {
        const transactionIds = data.map(t => t.id);
        
        const { data: tagsData } = await supabase
          .from('transaction_tags')
          .select(`
            transaction_id,
            tag:tags(id, name, color)
          `)
          .in('transaction_id', transactionIds);

        // Mapear tags para cada transação
        const transactionsWithTags = data.map(transaction => ({
          ...transaction,
          tags: tagsData
            ?.filter(tt => tt.transaction_id === transaction.id)
            .map(tt => tt.tag)
            .filter(Boolean) || []
        }));

        setTransactions(transactionsWithTags);
      } else {
        setTransactions(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar transações:', err);
      setError('Erro ao carregar transações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Criar transação
  const addTransaction = async (
    transactionData: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Usuário não autenticado ao criar transação');
        throw new Error('Usuário não autenticado');
      }

      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Recarregar transações para incluir a nova com joins
      await fetchTransactions();
      
      return data;
    } catch (err) {
      console.error('Erro ao adicionar transação:', err);
      setError(err instanceof Error ? err.message : 'Erro ao adicionar transação');
      throw err;
    }
  };

  // Atualizar transação
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      await fetchTransactions();
    } catch (err) {
      console.error('Erro ao atualizar transação:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar transação');
      throw err;
    }
  };

  // Deletar transação
  const deleteTransaction = async (id: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      await fetchTransactions();
    } catch (err) {
      console.error('Erro ao deletar transação:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar transação');
      throw err;
    }
  };

  // Buscar transações do mês atual
  const getMonthlyTransactions = (): Transaction[] => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    return transactions.filter((t) => {
      return t.transaction_date >= startOfMonth && t.transaction_date <= endOfMonth;
    });
  };

  // Calcular total de receitas
  const getTotalIncome = (filtered = false): number => {
    const txs = filtered ? getMonthlyTransactions() : transactions;
    return txs
      .filter((t) => t.type === 'income' && t.is_paid)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  // Calcular total de despesas
  const getTotalExpenses = (filtered = false): number => {
    const txs = filtered ? getMonthlyTransactions() : transactions;
    return txs
      .filter((t) => t.type === 'expense' && t.is_paid)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  // Calcular saldo (receitas - despesas)
  const getBalance = (filtered = false): number => {
    return getTotalIncome(filtered) - getTotalExpenses(filtered);
  };

  // Calcular % de economia
  const getSavingsPercentage = (filtered = false): number => {
    const income = getTotalIncome(filtered);
    if (income === 0) return 0;
    
    const balance = getBalance(filtered);
    return (balance / income) * 100;
  };

  // Buscar transações por conta
  const getTransactionsByAccount = (accountId: string): Transaction[] => {
    return transactions.filter((t) => t.account_id === accountId);
  };

  // Buscar transações por categoria
  const getTransactionsByCategory = (categoryId: string): Transaction[] => {
    return transactions.filter((t) => t.category_id === categoryId);
  };

  // Buscar transações por tipo
  const getTransactionsByType = (type: TransactionType): Transaction[] => {
    return transactions.filter((t) => t.type === type);
  };

  // Buscar transações pendentes (não pagas)
  const getPendingTransactions = (): Transaction[] => {
    return transactions.filter((t) => !t.is_paid);
  };

  // Salvar tags de uma transação
  const saveTransactionTags = async (transactionId: string, tagIds: string[]) => {
    try {
      // Remover todas as tags existentes
      await supabase
        .from('transaction_tags')
        .delete()
        .eq('transaction_id', transactionId);

      // Adicionar novas tags
      if (tagIds.length > 0) {
        const { error: insertError } = await supabase
          .from('transaction_tags')
          .insert(
            tagIds.map((tagId) => ({
              transaction_id: transactionId,
              tag_id: tagId,
            }))
          );

        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error('Erro ao salvar tags da transação:', err);
      throw err;
    }
  };

  // Effect para buscar transações e configurar realtime
  useEffect(() => {
    fetchTransactions();

    // Configurar Realtime subscription
    const channel = supabase
      .channel('transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getMonthlyTransactions,
    getTotalIncome,
    getTotalExpenses,
    getBalance,
    getSavingsPercentage,
    getTransactionsByAccount,
    getTransactionsByCategory,
    getTransactionsByType,
    getPendingTransactions,
    saveTransactionTags,
  };
};
