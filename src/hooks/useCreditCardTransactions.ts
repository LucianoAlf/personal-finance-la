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
      .channel(`credit_card_transactions_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_card_transactions',
        },
        (payload) => {
          const uid = user?.id;
          const newRow: any = (payload as any).new;
          const oldRow: any = (payload as any).old;
          if (newRow?.user_id !== uid && oldRow?.user_id !== uid) return; // filtro no cliente
          console.log('🔄 Transação alterada:', payload);
          fetchTransactions();
        }
      )
      .subscribe((status) => {
        console.log('🛰️ Realtime[transactions] status:', status);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, cardId, invoiceId]);

  // Criar compra (com ou sem parcelamento)
  const createPurchase = async (data: {
    credit_card_id: string;
    description: string;
    amount: number;
    purchase_date: string;
    category_id: string;
    installments: number;
    merchant?: string;
    notes?: string;
  }): Promise<{ success: boolean; invoiceId?: string }> => {
    try {
      const purchaseDate = new Date(data.purchase_date);
      const installmentGroupId = crypto.randomUUID();
      let firstInvoiceId: string | undefined;

      // Buscar informações do cartão
      const { data: card, error: cardError } = await supabase
        .from('credit_cards')
        .select('closing_day, due_day')
        .eq('id', data.credit_card_id)
        .single();

      if (cardError) throw cardError;

      // Criar parcelas
      const installments = [];
      const installmentAmount = data.amount / data.installments;

      for (let i = 1; i <= data.installments; i++) {
        // Calcular mês da fatura (compra + i-1 meses)
        const dueDate = new Date(purchaseDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        
        const referenceMonth = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-01`;

        // Buscar ou criar fatura para este mês
        let { data: invoice, error: invoiceError } = await supabase
          .from('credit_card_invoices')
          .select('id')
          .eq('credit_card_id', data.credit_card_id)
          .eq('reference_month', referenceMonth)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Se não existe, criar fatura
        if (invoiceError || !invoice) {
          const closingDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), card.closing_day);
          const dueDate2 = new Date(dueDate.getFullYear(), dueDate.getMonth(), card.due_day);

          const { data: newInvoice, error: createInvoiceError } = await supabase
            .from('credit_card_invoices')
            .insert({
              user_id: user!.id,
              credit_card_id: data.credit_card_id,
              reference_month: referenceMonth,
              closing_date: closingDate.toISOString().split('T')[0],
              due_date: dueDate2.toISOString().split('T')[0],
              status: 'open',
              total_amount: 0,
              paid_amount: 0,
            })
            .select()
            .single();

          if (createInvoiceError) {
            // Conflito de unicidade (duplicada) – buscar a mais recente
            if ((createInvoiceError as any).code === '23505') {
              const { data: existing } = await supabase
                .from('credit_card_invoices')
                .select('id')
                .eq('credit_card_id', data.credit_card_id)
                .eq('reference_month', referenceMonth)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              if (!existing) throw createInvoiceError;
              invoice = existing;
            } else {
              throw createInvoiceError;
            }
          } else {
            invoice = newInvoice;
          }
        }

        // Guardar o invoice_id da primeira parcela
        if (i === 1) {
          firstInvoiceId = invoice.id;
        }

        installments.push({
          user_id: user!.id,
          credit_card_id: data.credit_card_id,
          invoice_id: invoice.id,
          description: data.description,
          amount: installmentAmount,
          purchase_date: purchaseDate.toISOString().split('T')[0],
          category_id: data.category_id,
          establishment: data.merchant || null,
          installment_number: i,
          total_installments: data.installments,
          installment_group_id: data.installments > 1 ? installmentGroupId : null,
          notes: data.notes || null,
        });
      }

      // Inserir todas as parcelas
      const { error: insertError } = await supabase
        .from('credit_card_transactions')
        .insert(installments);

      if (insertError) throw insertError;

      await fetchTransactions();
      return { success: true, invoiceId: firstInvoiceId };
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao criar compra:', err);
      return { success: false };
    }
  };

  // Realtime subscription para transações
  useEffect(() => {
    if (!user) return;

    fetchTransactions();

    const subscription = supabase
      .channel(`credit_card_transactions_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_card_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 Transação alterada:', payload);
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, cardId, invoiceId]);

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    createTransaction,
    createInstallmentTransaction,
    createPurchase,
    updateTransaction,
    deleteTransaction,
    deleteInstallmentGroup,
    getInstallmentsByGroup,
    getTotalByCategory,
    getTotalByMonth,
  };
}
