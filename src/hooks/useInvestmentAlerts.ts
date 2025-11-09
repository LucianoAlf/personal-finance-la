import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface InvestmentAlert {
  id: string;
  user_id: string;
  investment_id: string | null;
  ticker: string;
  alert_type: 'price_above' | 'price_below' | 'percent_change';
  target_value: number;
  current_value: number | null;
  is_active: boolean;
  last_checked: string | null;
  triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAlertInput {
  investment_id?: string;
  ticker: string;
  alert_type: 'price_above' | 'price_below' | 'percent_change';
  target_value: number;
}

export function useInvestmentAlerts() {
  const [alerts, setAlerts] = useState<InvestmentAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('investment_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAlerts(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar alertas';
      setError(message);
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add alert
  const addAlert = useCallback(async (alert: CreateAlertInput) => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: insertError } = await supabase
        .from('investment_alerts')
        .insert({
          ...alert,
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchAlerts();
      toast.success('Alerta criado com sucesso!');
      
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar alerta';
      toast.error(message);
      console.error('Error adding alert:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts]);

  // Delete alert
  const deleteAlert = useCallback(async (id: string) => {
    try {
      setLoading(true);

      const { error: deleteError } = await supabase
        .from('investment_alerts')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchAlerts();
      toast.success('Alerta deletado com sucesso!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar alerta';
      toast.error(message);
      console.error('Error deleting alert:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts]);

  // Toggle alert active status
  const toggleAlert = useCallback(async (id: string, isActive: boolean) => {
    try {
      setLoading(true);

      const { error: updateError } = await supabase
        .from('investment_alerts')
        .update({ is_active: isActive })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchAlerts();
      toast.success(`Alerta ${isActive ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar alerta';
      toast.error(message);
      console.error('Error toggling alert:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts]);

  // Update alert
  const updateAlert = useCallback(async (
    id: string,
    updates: Partial<CreateAlertInput>
  ) => {
    try {
      setLoading(true);

      const { error: updateError } = await supabase
        .from('investment_alerts')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchAlerts();
      toast.success('Alerta atualizado com sucesso!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar alerta';
      toast.error(message);
      console.error('Error updating alert:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts]);

  // Auto-load on mount
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('investment_alerts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investment_alerts',
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  // Computed values
  const activeAlerts = alerts.filter((alert) => alert.is_active);
  const triggeredAlerts = alerts.filter((alert) => alert.triggered_at !== null);

  return {
    alerts,
    activeAlerts,
    triggeredAlerts,
    loading,
    error,
    addAlert,
    deleteAlert,
    toggleAlert,
    updateAlert,
    refresh: fetchAlerts,
  };
}
