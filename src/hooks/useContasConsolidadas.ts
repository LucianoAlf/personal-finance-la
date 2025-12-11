import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ============================================
// TIPOS: Conta Consolidada (payable_bills + credit_card_invoices)
// ============================================

export interface ContaConsolidada {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  due_date: string;
  bill_type: string;
  status: string;
  is_recurring: boolean;
  is_installment: boolean;
  installment_number: number | null;
  installment_total: number | null;
  created_at: string;
  updated_at: string;
  source_type: 'payable_bill' | 'credit_card_invoice';
  source_id: string;
  credit_card_id: string | null;
  credit_card_name: string | null;
  credit_card_brand: string | null;
}

export interface ContasConsolidadasFilters {
  status?: string[];
  start_date?: string;
  end_date?: string;
}

// ============================================
// HOOK: useContasConsolidadas
// ============================================

export function useContasConsolidadas(filters?: ContasConsolidadasFilters) {
  const { user } = useAuth();
  const [contas, setContas] = useState<ContaConsolidada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar contas consolidadas usando a função SQL
  const fetchContas = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_contas_consolidadas', {
        p_user_id: user.id,
        p_status: filters?.status || ['pending', 'overdue', 'open', 'closed'],
        p_start_date: filters?.start_date || null,
        p_end_date: filters?.end_date || null,
      });

      if (rpcError) {
        console.error('[CONTAS-CONSOLIDADAS] Erro RPC:', rpcError);
        throw rpcError;
      }

      console.log(`[CONTAS-CONSOLIDADAS] ${data?.length || 0} contas encontradas`);
      setContas(data || []);
    } catch (err: any) {
      console.error('[CONTAS-CONSOLIDADAS] Erro:', err);
      setError(err.message || 'Erro ao carregar contas');
      toast.error('Erro ao carregar contas consolidadas');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters?.status, filters?.start_date, filters?.end_date]);

  // Buscar ao montar e quando filtros mudarem
  useEffect(() => {
    fetchContas();
  }, [fetchContas]);

  // Realtime para ambas as tabelas
  useEffect(() => {
    if (!user?.id) return;

    const channelBills = supabase
      .channel(`payable_bills_consolidated_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payable_bills',
        },
        () => {
          console.log('[CONTAS-CONSOLIDADAS] Mudança em payable_bills');
          fetchContas();
        }
      )
      .subscribe();

    const channelInvoices = supabase
      .channel(`invoices_consolidated_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_card_invoices',
        },
        () => {
          console.log('[CONTAS-CONSOLIDADAS] Mudança em credit_card_invoices');
          fetchContas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelBills);
      supabase.removeChannel(channelInvoices);
    };
  }, [user?.id, fetchContas]);

  // Métricas calculadas
  const metricas = {
    total: contas.reduce((sum, c) => sum + Number(c.amount), 0),
    pendentes: contas.filter((c) => c.status === 'pending' || c.status === 'open').length,
    vencidas: contas.filter((c) => c.status === 'overdue').length,
    faturas: contas.filter((c) => c.source_type === 'credit_card_invoice').length,
    contasNormais: contas.filter((c) => c.source_type === 'payable_bill').length,
  };

  return {
    contas,
    loading,
    error,
    refetch: fetchContas,
    metricas,
  };
}
