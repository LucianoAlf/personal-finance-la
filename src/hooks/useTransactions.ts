import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { processGamificationEvent } from '@/lib/gamification';
import type { CanonicalTaggableEntityType } from '@/types/categories';
import type { Transaction, TransactionType } from '@/types/transactions';
import { replaceCanonicalTagAssignments } from '@/utils/tags/tag-assignment';
import {
  buildCreditCardTransactionTagMap,
  mapCreditCardTransactionRow,
  type CreditCardLedgerRow,
  type CreditCardTagRow,
} from '@/utils/transactions/creditCardLedgerMapping';

type LedgerTag = NonNullable<Transaction['tags']>[number];

export {
  buildCreditCardTransactionTagMap,
  mapCreditCardTransactionRow,
} from '@/utils/transactions/creditCardLedgerMapping';

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
  const realtimeChannelNameRef = useRef(`all_transactions_realtime_${crypto.randomUUID()}`);

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

      // Buscar transações de cartão e hidratar tags reais para a lista unificada.
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

      if (ccError) {
        console.error('Erro ao buscar transações de cartão:', ccError);
        setTransactions(transactionsWithTags);
        return;
      }

      const creditCardIds = (ccData || []).map((cc: any) => cc.id);
      let creditCardTagsByTransactionId: Record<string, LedgerTag[]> = {};

      if (creditCardIds.length > 0) {
        const { data: ccTagRows, error: ccTagError } = await supabase
          .from('credit_card_transaction_tags')
          .select('credit_card_transaction_id, tag:tags(id, name, color)')
          .in('credit_card_transaction_id', creditCardIds);

        if (ccTagError) {
          console.error('Erro ao buscar tags das transações de cartão:', ccTagError);
        } else {
          creditCardTagsByTransactionId = buildCreditCardTransactionTagMap(
            ((ccTagRows ?? []) as unknown) as CreditCardTagRow[],
          );
        }
      }

      const creditCardTransactions = (ccData || []).map((cc: any) =>
        mapCreditCardTransactionRow(cc as CreditCardLedgerRow, creditCardTagsByTransactionId),
      );

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
      await processGamificationEvent('create_transaction');
      
      return data;
    } catch (err) {
      console.error('Erro ao adicionar transação:', err);
      setError(err instanceof Error ? err.message : 'Erro ao adicionar transação');
      throw err;
    }
  };

  // Atualizar transação (detecta automaticamente se é cartão ou normal)
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      setError(null);

      // Verificar se é transação de cartão de crédito
      const transacao = transactions.find(t => t.id === id);
      const isCartao = transacao?.credit_card_id || (transacao as any)?.payment_method === 'credit';

      if (isCartao) {
        // Atualizar na tabela credit_card_transactions
        const ccUpdates: Record<string, any> = {};
        if (updates.description !== undefined) ccUpdates.description = updates.description;
        if (updates.category_id !== undefined) ccUpdates.category_id = updates.category_id;
        if (updates.transaction_date !== undefined) ccUpdates.purchase_date = updates.transaction_date;

        const isInstallmentGroup = Boolean(
          transacao?.installment_group_id &&
          transacao?.total_installments &&
          transacao.total_installments > 1
        );

        if (updates.amount !== undefined) {
          if (isInstallmentGroup) {
            const totalInstallments = transacao?.total_installments || 1;
            const totalAmount = Number(updates.amount);
            ccUpdates.total_amount = totalAmount;
            ccUpdates.amount = Math.round((totalAmount / totalInstallments) * 100) / 100;
          } else {
            ccUpdates.amount = updates.amount;
            ccUpdates.total_amount = updates.amount;
          }
        }

        let updateQuery = supabase
          .from('credit_card_transactions')
          .update(ccUpdates);

        if (isInstallmentGroup) {
          updateQuery = updateQuery.eq('installment_group_id', transacao!.installment_group_id);
        } else {
          updateQuery = updateQuery.eq('id', id);
        }

        const { error: updateError } = await updateQuery;

        if (updateError) {
          console.error('❌ Erro ao atualizar transação de cartão:', updateError);
          throw updateError;
        }
        console.log('✅ Transação de cartão atualizada:', id);
      } else {
        // Atualizar na tabela transactions (normal)
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) {
          console.error('❌ Erro ao atualizar transação normal:', updateError);
          throw updateError;
        }
        console.log('✅ Transação normal atualizada:', id);
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

      const transacao = transactions.find(t => t.id === id);
      const isCartao = transacao?.credit_card_id || (transacao as any)?.payment_method === 'credit';

      let deleteError = null;

      if (isCartao) {
        let deleteQuery = supabase
          .from('credit_card_transactions')
          .delete();

        if (transacao?.installment_group_id && transacao.total_installments && transacao.total_installments > 1) {
          deleteQuery = deleteQuery.eq('installment_group_id', transacao.installment_group_id);
        } else {
          deleteQuery = deleteQuery.eq('id', id);
        }

        const { error } = await deleteQuery;
        deleteError = error;
      } else {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);
        deleteError = error;
      }

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

  const saveTagsForCanonicalEntity = async (
    entityType: CanonicalTaggableEntityType,
    entityId: string,
    tagIds: string[],
  ) => {
    try {
      await replaceCanonicalTagAssignments(supabase, {
        entityType,
        entityId,
        tagIds,
      });
    } catch (err) {
      console.error('Erro ao salvar tags da entidade:', err);
      throw err;
    }
  };

  /** @deprecated Use {@link saveTagsForCanonicalEntity} with `entityType: 'transaction'`. */
  const saveTransactionTags = async (transactionId: string, tagIds: string[]) => {
    await saveTagsForCanonicalEntity('transaction', transactionId, tagIds);
  };

  // Effect para buscar transações e configurar realtime
  useEffect(() => {
    let isActive = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive) return;

      fetchTransactions();

      if (!user) return;

      realtimeChannel = supabase
        .channel(realtimeChannelNameRef.current)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchTransactions();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'credit_card_transactions',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchTransactions();
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('Realtime[all_transactions] channel error');
          }
        });
    };

    setupRealtime();

    return () => {
      isActive = false;
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
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
    saveTagsForCanonicalEntity,
  };
};
