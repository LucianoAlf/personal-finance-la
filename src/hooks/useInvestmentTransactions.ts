import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { InvestmentTransaction, CreateTransactionInput } from '@/types/database.types';
import { toast } from 'sonner';
import { processGamificationEvent } from '@/lib/gamification';

const investmentTxCache = new Map<string, InvestmentTransaction[]>();
const investmentTxRequests = new Map<string, Promise<InvestmentTransaction[]>>();

const investmentTxCacheKey = (userId: string, investmentId?: string) =>
  `${userId}:${investmentId ?? 'all'}`;

const requestInvestmentTransactionsForUser = (
  userId: string,
  investmentId?: string,
): Promise<InvestmentTransaction[]> => {
  const key = investmentTxCacheKey(userId, investmentId);

  const existingRequest = investmentTxRequests.get(key);
  if (existingRequest) {
    return existingRequest;
  }

  const cached = investmentTxCache.get(key);
  if (cached) {
    return Promise.resolve(cached);
  }

  const request = (async (): Promise<InvestmentTransaction[]> => {
    let query = supabase
      .from('investment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (investmentId) {
      query = query.eq('investment_id', investmentId);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    const rows = data || [];
    investmentTxCache.set(key, rows);
    return rows;
  })();

  investmentTxRequests.set(key, request);
  request.finally(() => {
    investmentTxRequests.delete(key);
  });

  return request;
};

interface UseInvestmentTransactionsOptions {
  investmentId?: string;
  autoLoad?: boolean;
}

export function useInvestmentTransactions(options: UseInvestmentTransactionsOptions = {}) {
  const { investmentId, autoLoad = true } = options;
  const { user, loading: authLoading } = useAuth();

  const [transactions, setTransactions] = useState<InvestmentTransaction[]>(() => {
    if (!user?.id) return [];
    return investmentTxCache.get(investmentTxCacheKey(user.id, investmentId)) ?? [];
  });
  const [loading, setLoading] = useState(() => {
    if (!user?.id) return !autoLoad ? false : true;
    return autoLoad && !investmentTxCache.has(investmentTxCacheKey(user.id, investmentId));
  });
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(autoLoad);

  const fetchTransactions = useCallback(async () => {
    if (authLoading) {
      return [];
    }

    if (!user?.id) {
      setTransactions([]);
      setLoading(false);
      setError(null);
      return [];
    }

    setListening(true);

    const key = investmentTxCacheKey(user.id, investmentId);
    const cached = investmentTxCache.get(key);

    try {
      setLoading(!cached);
      setError(null);

      if (cached) {
        setTransactions(cached);
      }

      const resolved = await requestInvestmentTransactionsForUser(user.id, investmentId);
      setTransactions(resolved);
      return resolved;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar transações';
      setError(message);
      console.error('Error fetching transactions:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [authLoading, user?.id, investmentId]);

  const addTransaction = useCallback(
    async (transaction: CreateTransactionInput) => {
      try {
        setLoading(true);

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) throw new Error('Usuário não autenticado');

        const { data: newTransaction, error: insertError } = await supabase
          .from('investment_transactions')
          .insert({
            ...transaction,
            user_id: authUser.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        investmentTxCache.delete(investmentTxCacheKey(authUser.id, investmentId));

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
    },
    [fetchTransactions, investmentId],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      try {
        setLoading(true);

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          investmentTxCache.delete(investmentTxCacheKey(authUser.id, investmentId));
        }

        const { error: deleteError } = await supabase
          .from('investment_transactions')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

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
    },
    [fetchTransactions, investmentId],
  );

  const totalBuy = useMemo(
    () =>
      transactions
        .filter((t) => t.transaction_type === 'buy')
        .reduce((sum, t) => sum + (t.total_value || 0), 0),
    [transactions],
  );

  const totalSell = useMemo(
    () =>
      transactions
        .filter((t) => t.transaction_type === 'sell')
        .reduce((sum, t) => sum + (t.total_value || 0), 0),
    [transactions],
  );

  const totalDividends = useMemo(
    () =>
      transactions
        .filter((t) => t.transaction_type === 'dividend')
        .reduce((sum, t) => sum + (t.total_value || 0), 0),
    [transactions],
  );

  const transactionsByType = useMemo(() => {
    const grouped: Record<string, InvestmentTransaction[]> = {};

    transactions.forEach((t) => {
      const type = t.transaction_type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(t);
    });

    return grouped;
  }, [transactions]);

  useEffect(() => {
    if (authLoading || !autoLoad || !user?.id) {
      return;
    }
    void fetchTransactions();
  }, [authLoading, autoLoad, user?.id, fetchTransactions]);

  useEffect(() => {
    if (!user?.id || !listening) {
      return;
    }

    const channel = supabase
      .channel(`investment_transactions_changes_${user.id}_${investmentId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investment_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          investmentTxCache.delete(investmentTxCacheKey(user.id, investmentId));
          void fetchTransactions();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, listening, investmentId, fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    addTransaction,
    deleteTransaction,
    refresh: fetchTransactions,
    totalBuy,
    totalSell,
    totalDividends,
    transactionsByType,
    buyCount: transactionsByType.buy?.length || 0,
    sellCount: transactionsByType.sell?.length || 0,
    dividendCount: transactionsByType.dividend?.length || 0,
    splitCount: transactionsByType.split?.length || 0,
  };
}
