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

      // ✅ OTIMIZADO: Buscar transações COM tags em 1 query (elimina N+1)
      // Adicionar timestamp para evitar cache
      const timestamp = new Date().getTime();
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

      // ✅ OTIMIZADO: Tags já vêm na query principal
      const transactionsWithTags = (data || []).map(transaction => ({
        ...transaction,
        tags: transaction.transaction_tags?.map((tt: any) => tt.tag).filter(Boolean) || []
      }));

      // Se filtro é 'income', não incluir transações de cartão
      if (filters?.type === 'income') {
        setTransactions(transactionsWithTags);
        return;
      }

      // ✅ BUSCAR TRANSAÇÕES DE CARTÃO EM PARALELO (já iniciou acima)
      const { data: ccData, error: ccError } = await supabase
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
          is_installment,
          installment_number,
          total_installments,
          installment_group_id,
          total_amount,
          category:categories(id, name, icon, color),
          credit_card:credit_cards(id, name, color)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ccError) {
        console.error('Erro ao buscar transações de cartão:', ccError);
        setTransactions(transactionsWithTags);
        return;
      }

      console.log('📊 Transações de cartão encontradas:', ccData?.length || 0);
      
      // Mapear transações de cartão para o formato de Transaction
      const creditCardTransactions = (ccData || []).map((cc: any) => ({
        id: cc.id,
        user_id: cc.user_id,
        account_id: null,
        category_id: cc.category_id,
        type: 'expense' as const,
        amount: cc.amount,
        description: cc.description,
        transaction_date: cc.purchase_date,
        is_paid: false,
        is_recurring: false,
        recurrence_type: null,
        recurrence_end_date: null,
        attachment_url: null,
        notes: null,
        source: 'manual' as const,
        whatsapp_message_id: null,
        transfer_to_account_id: null,
        created_at: cc.created_at,
        updated_at: cc.created_at,
        status: 'completed',
        temp_id: null,
        confirmed_at: null,
        payment_method: 'credit',
        category: cc.category,
        account: cc.credit_card ? { id: cc.credit_card.id, name: `💳 ${cc.credit_card.name}` } : null,
        tags: [],
        credit_card_id: cc.credit_card_id,
        credit_card_name: cc.credit_card?.name,
        // Campos de parcelamento
        is_installment: cc.is_installment || false,
        installment_number: cc.installment_number,
        total_installments: cc.total_installments,
        installment_group_id: cc.installment_group_id,
        total_amount: cc.total_amount,
      }));

      // Combinar e ordenar
      const allTransactions = [...transactionsWithTags, ...creditCardTransactions];
      allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);
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

    // ✅ OTIMIZADO: Um único canal com múltiplas tabelas para resposta mais rápida
    const realtimeChannel = supabase
      .channel('all_transactions_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          console.log('🔄 Realtime IMEDIATO: transação normal', payload.eventType);
          fetchTransactions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_card_transactions',
        },
        (payload) => {
          console.log('🔄 Realtime IMEDIATO: transação de cartão', payload.eventType);
          fetchTransactions();
        }
      )
      .subscribe((status) => {
        console.log('🛰️ Realtime[all_transactions] status:', status);
      });

    // Cleanup
    return () => {
      supabase.removeChannel(realtimeChannel);
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
