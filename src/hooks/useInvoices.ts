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

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchInvoices();
    fetchInvoicesDetailed();

    const subscription = supabase
      .channel('invoices_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_card_invoices',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchInvoices();
          fetchInvoicesDetailed();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, cardId]);

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
  };
}
