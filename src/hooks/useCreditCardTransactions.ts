import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import {
  CreditCardTransaction,
  CreateCreditCardTransactionInput,
  CreateInstallmentInput,
} from '@/types/database.types';
import { generateInstallments } from '@/utils/creditCardUtils';

export function useCreditCardTransactions(cardId?: string, invoiceId?: string) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<CreditCardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar transações
  const fetchTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('credit_card_transactions')
        .select('*')
        .eq('user_id', user.id);

      if (cardId) {
        query = query.eq('credit_card_id', cardId);
      }

      if (invoiceId) {
        query = query.eq('invoice_id', invoiceId);
      }

      const { data, error: fetchError } = await query.order('purchase_date', {
        ascending: false,
      });

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao buscar transações:', err);
    } finally {
      setLoading(false);
    }
  };

  // Criar transação simples
  const createTransaction = async (
    input: CreateCreditCardTransactionInput
  ): Promise<CreditCardTransaction | null> => {
    if (!user) return null;

    try {
      // Buscar fatura aberta do cartão
      const { data: invoice, error: invoiceError } = await supabase
        .from('credit_card_invoices')
        .select('id')
        .eq('credit_card_id', input.credit_card_id)
        .eq('status', 'open')
        .single();

      if (invoiceError && invoiceError.code !== 'PGRST116') throw invoiceError;

      const { data, error: createError } = await supabase
        .from('credit_card_transactions')
        .insert({
          user_id: user.id,
          ...input,
          invoice_id: invoice?.id || null,
          is_installment: false,
        })
        .select()
        .single();

      if (createError) throw createError;

      await fetchTransactions();
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao criar transação:', err);
      return null;
    }
  };

  // Criar transação parcelada
  const createInstallmentTransaction = async (
    input: CreateInstallmentInput
  ): Promise<CreditCardTransaction[] | null> => {
    if (!user) return null;

    try {
      // Buscar dados do cartão
      const { data: card, error: cardError } = await supabase
        .from('credit_cards')
        .select('closing_day')
        .eq('id', input.credit_card_id)
        .single();

      if (cardError) throw cardError;

      // Gerar plano de parcelas
      const installmentPlan = generateInstallments(
        input.amount,
        input.total_installments,
        input.purchase_date,
        card.closing_day
      );

      // Gerar UUID para agrupar parcelas
      const groupId = crypto.randomUUID();

      // Criar todas as parcelas
      const installments = installmentPlan.map((plan, index) => ({
        user_id: user.id,
        credit_card_id: input.credit_card_id,
        description: input.description,
        amount: plan.amount,
        purchase_date: input.purchase_date,
        category_id: input.category_id,
        establishment: input.establishment,
        notes: input.notes,
        is_installment: true,
        installment_number: plan.installment_number,
        total_installments: input.total_installments,
        installment_group_id: groupId,
      }));

      const { data, error: createError } = await supabase
        .from('credit_card_transactions')
        .insert(installments)
        .select();

      if (createError) throw createError;

      await fetchTransactions();
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao criar transação parcelada:', err);
      return null;
    }
  };

  // Atualizar transação
  const updateTransaction = async (
    id: string,
    updates: Partial<CreditCardTransaction>
  ): Promise<CreditCardTransaction | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('credit_card_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchTransactions();
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao atualizar transação:', err);
      return null;
    }
  };

  // Deletar transação
  const deleteTransaction = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('credit_card_transactions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchTransactions();
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao deletar transação:', err);
      return false;
    }
  };

  // Deletar grupo de parcelas
  const deleteInstallmentGroup = async (groupId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('credit_card_transactions')
        .delete()
        .eq('installment_group_id', groupId);

      if (deleteError) throw deleteError;

      await fetchTransactions();
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao deletar grupo de parcelas:', err);
      return false;
    }
  };

  // Buscar parcelas de um grupo
  const getInstallmentsByGroup = (groupId: string): CreditCardTransaction[] => {
    return transactions
      .filter(t => t.installment_group_id === groupId)
      .sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0));
  };

  // Calcular total por categoria
  const getTotalByCategory = (): Record<string, number> => {
    const totals: Record<string, number> = {};

    transactions.forEach(t => {
      const categoryId = t.category_id || 'sem_categoria';
      totals[categoryId] = (totals[categoryId] || 0) + t.amount;
    });

    return totals;
  };

  // Calcular total por mês
  const getTotalByMonth = (): Record<string, number> => {
    const totals: Record<string, number> = {};

    transactions.forEach(t => {
      const month = new Date(t.purchase_date).toISOString().slice(0, 7); // YYYY-MM
      totals[month] = (totals[month] || 0) + t.amount;
    });

    return totals;
  };

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchTransactions();

    const subscription = supabase
      .channel('cc_transactions_changes')
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
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, cardId, invoiceId]);

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    createTransaction,
    createInstallmentTransaction,
    updateTransaction,
    deleteTransaction,
    deleteInstallmentGroup,
    getInstallmentsByGroup,
    getTotalByCategory,
    getTotalByMonth,
  };
}
