import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import {
  CreditCardInvoice,
  InvoiceDetailed,
  CreateInvoiceInput,
  InvoiceFilters,
  InvoiceStatus,
} from '@/types/database.types';
import { calculateClosingDate, calculateDueDate } from '@/utils/creditCardUtils';

export function useInvoices(cardId?: string) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<CreditCardInvoice[]>([]);
  const [invoicesDetailed, setInvoicesDetailed] = useState<InvoiceDetailed[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<CreditCardInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar faturas
  const fetchInvoices = async (filters?: InvoiceFilters) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('user_id', user.id);

      if (filters?.cardId || cardId) {
        query = query.eq('credit_card_id', filters?.cardId || cardId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.startDate) {
        query = query.gte('reference_month', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('reference_month', filters.endDate.toISOString());
      }

      const { data, error: fetchError } = await query.order('reference_month', {
        ascending: false,
      });

      if (fetchError) throw fetchError;
      setInvoices(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao buscar faturas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Buscar faturas detalhadas (com view)
  const fetchInvoicesDetailed = async (filters?: InvoiceFilters) => {
    if (!user) return;

    try {
      let query = supabase
        .from('v_invoices_detailed')
        .select('*')
        .eq('user_id', user.id);

      if (filters?.cardId || cardId) {
        query = query.eq('credit_card_id', filters?.cardId || cardId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error: fetchError } = await query.order('reference_month', {
        ascending: false,
      });

      if (fetchError) throw fetchError;
      setInvoicesDetailed(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar faturas detalhadas:', err);
    }
  };

  // Buscar fatura por ID
  const getInvoiceById = async (id: string): Promise<CreditCardInvoice | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      return data;
    } catch (err: any) {
      console.error('Erro ao buscar fatura:', err);
      return null;
    }
  };

  // Buscar fatura atual (aberta) de um cartão
  const getCurrentInvoice = async (creditCardId: string): Promise<CreditCardInvoice | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('credit_card_id', creditCardId)
        .eq('status', 'open')
        .single();

      if (fetchError) {
        // Se não encontrar fatura aberta, retorna null (não é erro)
        if (fetchError.code === 'PGRST116') return null;
        throw fetchError;
      }

      setCurrentInvoice(data);
      return data;
    } catch (err: any) {
      console.error('Erro ao buscar fatura atual:', err);
      return null;
    }
  };

  // Buscar faturas por status
  const getInvoicesByStatus = async (status: InvoiceStatus): Promise<CreditCardInvoice[]> => {
    await fetchInvoices({ status });
    return invoices.filter(inv => inv.status === status);
  };

  // Gerar fatura mensal
  const generateMonthlyInvoice = async (
    creditCardId: string,
    referenceMonth: Date
  ): Promise<CreditCardInvoice | null> => {
    if (!user) return null;

    try {
      // Buscar dados do cartão
      const { data: card, error: cardError } = await supabase
        .from('credit_cards')
        .select('closing_day, due_day')
        .eq('id', creditCardId)
        .single();

      if (cardError) throw cardError;

      const closingDate = calculateClosingDate(referenceMonth, card.closing_day);
      const dueDate = calculateDueDate(referenceMonth, card.due_day);

      const { data, error: createError } = await supabase
        .from('credit_card_invoices')
        .insert({
          credit_card_id: creditCardId,
          user_id: user.id,
          reference_month: referenceMonth.toISOString().split('T')[0],
          closing_date: closingDate.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          status: 'open',
        })
        .select()
        .single();

      if (createError) throw createError;

      await fetchInvoices();
      await fetchInvoicesDetailed();
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao gerar fatura:', err);
      return null;
    }
  };

  // Fechar fatura
  const closeInvoice = async (invoiceId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('credit_card_invoices')
        .update({ status: 'closed' })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      await fetchInvoices();
      await fetchInvoicesDetailed();
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao fechar fatura:', err);
      return false;
    }
  };

  // Calcular total de uma fatura
  const getInvoiceTotal = (invoiceId: string): number => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    return invoice?.total_amount || 0;
  };

  // Calcular total de faturas abertas
  const getOpenInvoicesTotal = (): number => {
    return invoices
      .filter(inv => inv.status === 'open' || inv.status === 'closed')
      .reduce((sum, inv) => sum + inv.total_amount, 0);
  };

  // Pagar fatura
  const payInvoice = async (data: {
    invoice_id: string;
    account_id: string;
    amount: number;
    payment_date: string;
    payment_type: 'total' | 'minimum' | 'partial';
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Buscar fatura
      const invoice = await getInvoiceById(data.invoice_id);
      if (!invoice) {
        throw new Error('Fatura não encontrada');
      }

      // 2. Validar valor do pagamento
      if (data.amount <= 0) {
        throw new Error('Valor do pagamento deve ser maior que zero');
      }

      if (data.amount > invoice.remaining_amount) {
        throw new Error('Valor do pagamento não pode ser maior que o saldo restante');
      }

      // 3. Buscar saldo da conta
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('balance')
        .eq('id', data.account_id)
        .single();

      if (accountError) throw accountError;

      if (account.balance < data.amount) {
        throw new Error('Saldo insuficiente na conta');
      }

      // 4. Criar pagamento
      const { error: paymentError } = await supabase
        .from('credit_card_payments')
        .insert({
          invoice_id: data.invoice_id,
          user_id: user!.id,
          account_id: data.account_id,
          amount: data.amount,
          payment_date: data.payment_date,
          payment_type: data.payment_type,
          notes: data.notes,
        });

      if (paymentError) throw paymentError;

      // 5. Atualizar saldo da conta (débito)
      const { error: accountUpdateError } = await supabase
        .from('accounts')
        .update({ balance: account.balance - data.amount })
        .eq('id', data.account_id);

      if (accountUpdateError) throw accountUpdateError;

      // 6. Criar transação de débito na conta
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user!.id,
          account_id: data.account_id,
          type: 'expense',
          description: `Pagamento de fatura - ${invoice.reference_month}`,
          amount: data.amount,
          date: data.payment_date,
          category_id: null, // Ou criar categoria específica para pagamento de cartão
          is_paid: true,
          notes: data.notes,
        });

      if (transactionError) throw transactionError;

      // 7. Atualizar fatura
      const newPaidAmount = invoice.paid_amount + data.amount;
      const newRemainingAmount = invoice.total_amount - newPaidAmount;
      const newStatus: InvoiceStatus = 
        newRemainingAmount <= 0 ? 'paid' : 
        newPaidAmount > 0 ? 'partial' : 
        invoice.status;

      const { error: invoiceUpdateError } = await supabase
        .from('credit_card_invoices')
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          status: newStatus,
          payment_date: newStatus === 'paid' ? data.payment_date : invoice.payment_date,
          payment_account_id: data.account_id,
        })
        .eq('id', data.invoice_id);

      if (invoiceUpdateError) throw invoiceUpdateError;

      // 8. Atualizar listas
      await fetchInvoices();
      await fetchInvoicesDetailed();

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao pagar fatura:', err);
      return { success: false, error: err.message };
    }
  };

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchInvoices();
    fetchInvoicesDetailed();

    const subscription = supabase
      .channel(`invoices_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_card_invoices',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 Fatura alterada:', payload);
          fetchInvoices();
          fetchInvoicesDetailed();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, cardId]);

  return {
    invoices,
    invoicesDetailed,
    currentInvoice,
    loading,
    error,
    fetchInvoices,
    fetchInvoicesDetailed,
    getInvoiceById,
    getCurrentInvoice,
    getInvoicesByStatus,
    generateMonthlyInvoice,
    closeInvoice,
    getInvoiceTotal,
    getOpenInvoicesTotal,
    payInvoice,
  };
}
