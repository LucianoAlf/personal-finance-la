import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface CommittedLimitData {
  currentInvoice: number;
  futureInstallments: number;
  totalCommitted: number;
  availableLimit: number;
  realAvailableLimit: number;
}

interface UseCommittedLimitReturn {
  data: CommittedLimitData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCommittedLimit(creditCardId: string, creditLimit: number): UseCommittedLimitReturn {
  const { user } = useAuth();
  const [data, setData] = useState<CommittedLimitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommittedLimit = async () => {
    if (!user || !creditCardId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Buscar fatura atual (aberta ou fechada não paga)
      const { data: currentInvoice } = await supabase
        .from('credit_card_invoices')
        .select('total_amount, paid_amount, status')
        .eq('credit_card_id', creditCardId)
        .in('status', ['open', 'closed', 'overdue'])
        .order('reference_month', { ascending: false })
        .limit(1)
        .single();

      const currentInvoiceAmount = currentInvoice 
        ? (currentInvoice.total_amount - (currentInvoice.paid_amount || 0))
        : 0;

      // 2. Buscar parcelas futuras (transações parceladas onde current_installment < total_installments)
      const { data: installments } = await supabase
        .from('credit_card_transactions')
        .select('amount, current_installment, total_installments')
        .eq('credit_card_id', creditCardId)
        .eq('user_id', user.id)
        .eq('is_installment', true)
        .not('total_installments', 'is', null);

      // Calcular valor das parcelas futuras
      let futureInstallmentsAmount = 0;
      
      installments?.forEach((tx) => {
        const remaining = (tx.total_installments || 0) - (tx.current_installment || 0);
        if (remaining > 0) {
          futureInstallmentsAmount += tx.amount * remaining;
        }
      });

      // 3. Calcular totais
      const totalCommitted = currentInvoiceAmount + futureInstallmentsAmount;
      const availableLimit = creditLimit - currentInvoiceAmount;
      const realAvailableLimit = creditLimit - totalCommitted;

      setData({
        currentInvoice: currentInvoiceAmount,
        futureInstallments: futureInstallmentsAmount,
        totalCommitted,
        availableLimit,
        realAvailableLimit: Math.max(0, realAvailableLimit),
      });
    } catch (err: any) {
      console.error('Erro ao calcular limite comprometido:', err);
      setError(err.message || 'Erro ao calcular limite');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommittedLimit();
  }, [user, creditCardId, creditLimit]);

  return {
    data,
    loading,
    error,
    refetch: fetchCommittedLimit,
  };
}
