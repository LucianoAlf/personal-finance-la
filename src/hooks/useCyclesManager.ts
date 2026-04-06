import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type {
  FinancialCycle,
  CreateCycleInput,
  UpdateCycleInput,
  CycleWithStats,
} from '@/types/settings.types';

export function useCyclesManager() {
  const [cycles, setCycles] = useState<FinancialCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<FinancialCycle | null>(null);
  const realtimeChannelNameRef = useRef(`financial-cycles-${crypto.randomUUID()}`);

  // Buscar ciclos do usuário
  const fetchCycles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: fetchError } = await supabase
        .from('financial_cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('day', { ascending: true });

      if (fetchError) throw fetchError;

      setCycles(data || []);
    } catch (err: any) {
      console.error('Error fetching cycles:', err);
      setError(err.message);
      toast.error('Erro ao carregar ciclos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar ciclo
  const createCycle = useCallback(async (input: CreateCycleInput): Promise<FinancialCycle | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: createError } = await supabase
        .from('financial_cycles')
        .insert({
          user_id: user.id,
          name: input.name,
          type: input.type,
          day: input.day,
          active: input.active ?? true,
          description: input.description,
          color: input.color,
          icon: input.icon,
          notify_start: input.notify_start ?? false,
          notify_days_before: input.notify_days_before,
          linked_goals: input.linked_goals,
          auto_actions: input.auto_actions,
        })
        .select()
        .single();

      if (createError) throw createError;

      setCycles((prev) => [...prev, data].sort((a, b) => a.day - b.day));
      toast.success('Ciclo criado com sucesso!');
      return data;
    } catch (err: any) {
      console.error('Error creating cycle:', err);
      toast.error(err.message || 'Erro ao criar ciclo');
      return null;
    }
  }, []);

  // Atualizar ciclo
  const updateCycle = useCallback(async (id: string, input: UpdateCycleInput): Promise<boolean> => {
    try {
      const { data, error: updateError } = await supabase
        .from('financial_cycles')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setCycles((prev) => prev.map((c) => (c.id === id ? data : c)).sort((a, b) => a.day - b.day));
      toast.success('Ciclo atualizado!');
      return true;
    } catch (err: any) {
      console.error('Error updating cycle:', err);
      toast.error(err.message || 'Erro ao atualizar ciclo');
      return false;
    }
  }, []);

  // Deletar ciclo
  const deleteCycle = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('financial_cycles')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setCycles((prev) => prev.filter((c) => c.id !== id));
      toast.success('Ciclo deletado!');
      return true;
    } catch (err: any) {
      console.error('Error deleting cycle:', err);
      toast.error(err.message || 'Erro ao deletar ciclo');
      return false;
    }
  }, []);

  // Toggle ativo/inativo
  const toggleActive = useCallback(async (id: string, active: boolean): Promise<boolean> => {
    return updateCycle(id, { active });
  }, [updateCycle]);

  // Duplicar ciclo
  const duplicateCycle = useCallback(async (id: string): Promise<FinancialCycle | null> => {
    try {
      const cycle = cycles.find((c) => c.id === id);
      if (!cycle) throw new Error('Ciclo não encontrado');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: createError } = await supabase
        .from('financial_cycles')
        .insert({
          user_id: user.id,
          name: `${cycle.name} (Cópia)`,
          type: cycle.type,
          day: cycle.day,
          active: false, // Criar desativado por padrão
          description: cycle.description,
          color: cycle.color,
          icon: cycle.icon,
          notify_start: cycle.notify_start,
          notify_days_before: cycle.notify_days_before,
          linked_goals: cycle.linked_goals,
          auto_actions: cycle.auto_actions,
        })
        .select()
        .single();

      if (createError) throw createError;

      setCycles((prev) => [...prev, data].sort((a, b) => a.day - b.day));
      toast.success('Ciclo duplicado!');
      return data;
    } catch (err: any) {
      console.error('Error duplicating cycle:', err);
      toast.error(err.message || 'Erro ao duplicar ciclo');
      return null;
    }
  }, [cycles]);

  // Computed: Ciclos ativos
  const activeCycles = cycles.filter((c) => c.active);

  // Função auxiliar: Calcular próxima data de ciclo
  const getNextCycleDate = useCallback((cycle: FinancialCycle): Date => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    let nextDate = new Date(currentYear, currentMonth, cycle.day);

    // Se o dia do ciclo já passou neste mês, pegar o próximo mês
    if (currentDay >= cycle.day) {
      nextDate = new Date(currentYear, currentMonth + 1, cycle.day);
    }

    return nextDate;
  }, []);

  // Computed: Próximo ciclo (mais próximo)
  const nextCycle = activeCycles.length > 0
    ? activeCycles.reduce((closest, cycle) => {
        const cycleDate = getNextCycleDate(cycle);
        const closestDate = getNextCycleDate(closest);
        return cycleDate < closestDate ? cycle : closest;
      })
    : null;

  // Computed: Ciclo atual (último que passou)
  const currentCycle = activeCycles.length > 0
    ? activeCycles.reduce((latest, cycle) => {
        const today = new Date();
        const currentDay = today.getDate();
        
        // Se o dia do ciclo já passou neste mês, é candidato a "atual"
        if (cycle.day <= currentDay) {
          if (!latest || cycle.day > latest.day) {
            return cycle;
          }
        }
        return latest;
      }, null as FinancialCycle | null)
    : null;

  // Computed: Ciclos com estatísticas
  const cyclesWithStats: CycleWithStats[] = cycles.map((cycle) => {
    const nextDate = getNextCycleDate(cycle);
    const today = new Date();
    const daysUntilNext = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      ...cycle,
      nextCycleDate: nextDate.toISOString().split('T')[0],
      daysUntilNext,
    };
  });

  // Realtime subscription
  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    fetchCycles();

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      subscription = supabase
        .channel(realtimeChannelNameRef.current)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'financial_cycles',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchCycles();
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      cancelled = true;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchCycles]);

  return {
    // State
    cycles,
    cyclesWithStats,
    activeCycles,
    nextCycle,
    currentCycle,
    selectedCycle,
    loading,
    error,

    // Actions
    setSelectedCycle,
    createCycle,
    updateCycle,
    deleteCycle,
    toggleActive,
    duplicateCycle,
    refresh: fetchCycles,
  };
}
