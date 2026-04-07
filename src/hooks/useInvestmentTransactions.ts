import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { InvestmentTransaction, CreateTransactionInput } from '@/types/database.types';
import { toast } from 'sonner';
import { processGamificationEvent } from '@/lib/gamification';

interface UseInvestmentTransactionsOptions {
  investmentId?: string;
  autoLoad?: boolean;
}

export function useInvestmentTransactions(options: UseInvestmentTransactionsOptions = {}) {
  const { investmentId, autoLoad = true } = options;
  
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('investment_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (investmentId) {
        query = query.eq('investment_id', investmentId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setTransactions(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar transações';
      setError(message);
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [investmentId]);

  // Add transaction
  const addTransaction = useCallback(async (transaction: CreateTransactionInput) => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Insert transaction
      const { data: newTransaction, error: insertError } = await supabase
        .from('investment_transactions')
        .insert({
          ...transaction,
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Refresh transactions
      await fetchTransactions();
      await processGamificationEvent('investment_activity');

      toast.success('Transação adicionada com sucesso!');
      return newTransaction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar transação';
      toast.error(message);
      console.error('Error adding transaction:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTransactions]);

  // Delete transaction
  const deleteTransaction = useCallback(async (id: string) => {
    try {
      setLoading(true);

      const { error: deleteError } = await supabase
        .from('investment_transactions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Refresh transactions
      await fetchTransactions();
      await processGamificationEvent('investment_activity');

      toast.success('Transação deletada com sucesso!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar transação';
      toast.error(message);
      console.error('Error deleting transaction:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTransactions]);

  // Computed values
  const totalBuy = useMemo(() => 
    transactions
      .filter(t => t.transaction_type === 'buy')
      .reduce((sum, t) => sum + (t.total_value || 0), 0),
    [transactions]
  );

  const totalSell = useMemo(() => 
    transactions
      .filter(t => t.transaction_type === 'sell')
      .reduce((sum, t) => sum + (t.total_value || 0), 0),
    [transactions]
  );

  const totalDividends = useMemo(() => 
    transactions
      .filter(t => t.transaction_type === 'dividend')
      .reduce((sum, t) => sum + (t.total_value || 0), 0),
    [transactions]
  );

  const transactionsByType = useMemo(() => {
    const grouped: Record<string, InvestmentTransaction[]> = {};
    
    transactions.forEach(t => {
      const type = t.transaction_type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(t);
    });
    
    return grouped;
  }, [transactions]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      fetchTransactions();
    }
  }, [autoLoad, fetchTransactions]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('investment_transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investment_transactions',
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    addTransaction,
    deleteTransaction,
    refresh: fetchTransactions,
    // Computed
    totalBuy,
    totalSell,
    totalDividends,
    transactionsByType,
    // Counts
    buyCount: transactionsByType.buy?.length || 0,
    sellCount: transactionsByType.sell?.length || 0,
    dividendCount: transactionsByType.dividend?.length || 0,
    splitCount: transactionsByType.split?.length || 0,
  };
}
