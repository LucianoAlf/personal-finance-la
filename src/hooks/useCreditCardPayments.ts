import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CreditCardPayment } from '@/types/database.types';

export function useCreditCardPayments() {
  const [payments, setPayments] = useState<CreditCardPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todos os pagamentos do usuário
  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: fetchError } = await supabase
        .from('credit_card_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false });

      if (fetchError) throw fetchError;

      setPayments(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao buscar pagamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Buscar pagamentos de uma fatura específica
  const fetchPaymentsByInvoice = async (invoiceId: string): Promise<CreditCardPayment[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: fetchError } = await supabase
        .from('credit_card_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false });

      if (fetchError) throw fetchError;

      return data || [];
    } catch (err: any) {
      console.error('Erro ao buscar pagamentos da fatura:', err);
      return [];
    }
  };

  // Calcular total pago de uma fatura
  const getTotalPaid = async (invoiceId: string): Promise<number> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: fetchError } = await supabase
        .from('credit_card_payments')
        .select('amount')
        .eq('invoice_id', invoiceId)
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      return (data || []).reduce((sum, payment) => sum + Number(payment.amount), 0);
    } catch (err: any) {
      console.error('Erro ao calcular total pago:', err);
      return 0;
    }
  };

  // Calcular saldo restante de uma fatura
  const getRemainingAmount = async (invoiceId: string, totalAmount: number): Promise<number> => {
    const totalPaid = await getTotalPaid(invoiceId);
    return Math.max(0, totalAmount - totalPaid);
  };

  // Criar novo pagamento
  const createPayment = async (data: {
    invoice_id: string;
    account_id: string;
    amount: number;
    payment_date: string;
    payment_type: 'total' | 'minimum' | 'partial';
    notes?: string;
  }): Promise<{ success: boolean; payment?: CreditCardPayment }> => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar pagamento
      const { data: payment, error: insertError } = await supabase
        .from('credit_card_payments')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Atualizar lista local
      await fetchPayments();

      return { success: true, payment };
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao criar pagamento:', err);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Buscar pagamentos com informações da conta
  const fetchPaymentsWithAccount = async (invoiceId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: fetchError } = await supabase
        .from('credit_card_payments')
        .select(`
          *,
          account:accounts(id, name, type, bank, icon, color)
        `)
        .eq('invoice_id', invoiceId)
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false });

      if (fetchError) throw fetchError;

      return data || [];
    } catch (err: any) {
      console.error('Erro ao buscar pagamentos com conta:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return {
    payments,
    loading,
    error,
    fetchPayments,
    fetchPaymentsByInvoice,
    getTotalPaid,
    getRemainingAmount,
    createPayment,
    fetchPaymentsWithAccount,
  };
}
