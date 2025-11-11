import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type {
  SavingsGoal,
  CreateGoalInput,
  UpdateGoalInput,
  GoalContribution,
  CreateGoalContributionInput,
  GoalWithStats,
} from '@/types/settings.types';

export function useGoalsManager() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  // Buscar metas do usuário
  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: fetchError } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setGoals(data || []);
    } catch (err: any) {
      console.error('Error fetching goals:', err);
      setError(err.message);
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar meta
  const createGoal = useCallback(async (input: CreateGoalInput): Promise<SavingsGoal | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: createError } = await supabase
        .from('savings_goals')
        .insert({
          user_id: user.id,
          name: input.name,
          category: input.category,
          target_amount: input.target_amount,
          current_amount: input.current_amount || 0,
          start_date: input.start_date || new Date().toISOString().split('T')[0],
          target_date: input.target_date,
          priority: input.priority || 'medium',
          status: 'active',
          icon: input.icon,
          notify_milestones: input.notify_milestones ?? true,
          notify_contribution: input.notify_contribution ?? false,
          contribution_frequency: input.contribution_frequency,
          contribution_day: input.contribution_day,
          notify_delay: input.notify_delay ?? false,
        })
        .select()
        .single();

      if (createError) throw createError;

      setGoals((prev) => [data, ...prev]);
      toast.success('Meta criada com sucesso!');
      return data;
    } catch (err: any) {
      console.error('Error creating goal:', err);
      toast.error(err.message || 'Erro ao criar meta');
      return null;
    }
  }, []);

  // Atualizar meta
  const updateGoal = useCallback(async (id: string, input: UpdateGoalInput): Promise<boolean> => {
    try {
      const { data, error: updateError } = await supabase
        .from('savings_goals')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setGoals((prev) => prev.map((g) => (g.id === id ? data : g)));
      toast.success('Meta atualizada!');
      return true;
    } catch (err: any) {
      console.error('Error updating goal:', err);
      toast.error(err.message || 'Erro ao atualizar meta');
      return false;
    }
  }, []);

  // Deletar meta
  const deleteGoal = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setGoals((prev) => prev.filter((g) => g.id !== id));
      toast.success('Meta deletada!');
      return true;
    } catch (err: any) {
      console.error('Error deleting goal:', err);
      toast.error(err.message || 'Erro ao deletar meta');
      return false;
    }
  }, []);

  // Adicionar contribuição
  const addContribution = useCallback(
    async (input: CreateGoalContributionInput): Promise<boolean> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { error: insertError } = await supabase
          .from('goal_contributions')
          .insert({
            user_id: user.id,
            goal_id: input.goal_id,
            amount: input.amount,
            date: input.date || new Date().toISOString().split('T')[0],
            note: input.note,
          });

        if (insertError) throw insertError;

        // O trigger já atualiza current_amount, mas vamos refetch para garantir
        await fetchGoals();
        toast.success(`R$ ${input.amount.toLocaleString('pt-BR')} adicionado à meta!`);
        return true;
      } catch (err: any) {
        console.error('Error adding contribution:', err);
        toast.error(err.message || 'Erro ao adicionar contribuição');
        return false;
      }
    },
    [fetchGoals]
  );

  // Buscar histórico de contribuições de uma meta
  const getContributionHistory = useCallback(async (goalId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('goal_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      setContributions(data || []);
      return data || [];
    } catch (err: any) {
      console.error('Error fetching contributions:', err);
      toast.error('Erro ao carregar histórico');
      return [];
    }
  }, []);

  // Computed: Metas ativas
  const activeGoals = goals.filter((g) => g.status === 'active');

  // Computed: Metas concluídas
  const completedGoals = goals.filter((g) => g.status === 'completed');

  // Computed: Total economizado
  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);

  // Computed: Total alvo
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);

  // Computed: Metas com estatísticas
  const goalsWithStats: GoalWithStats[] = goals.map((goal) => {
    const percentage = goal.target_amount > 0 
      ? Math.min(100, (goal.current_amount / goal.target_amount) * 100)
      : 0;
    
    const remaining = Math.max(0, goal.target_amount - goal.current_amount);
    
    const today = new Date();
    const targetDate = new Date(goal.target_date);
    
    // Validar se a data é válida
    const isValidDate = !isNaN(targetDate.getTime());
    const daysRemaining = isValidDate 
      ? Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    
    const monthsRemaining = Math.max(1, daysRemaining / 30);
    const suggestedMonthly = remaining > 0 && monthsRemaining > 0 
      ? Math.max(0, remaining / monthsRemaining)
      : 0;
    
    const isOverdue = daysRemaining === 0 && goal.status === 'active' && percentage < 100;
    
    const startDate = new Date(goal.start_date);
    const isValidStartDate = !isNaN(startDate.getTime());
    
    const totalDays = isValidDate && isValidStartDate
      ? Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const elapsedDays = isValidStartDate
      ? Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const expectedPercentage = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
    const isOnTrack = percentage >= expectedPercentage;

    return {
      ...goal,
      percentage,
      remaining,
      daysRemaining,
      suggestedMonthly,
      isOverdue,
      isOnTrack,
    };
  });

  // Realtime subscription
  useEffect(() => {
    fetchGoals();

    const subscription = supabase
      .channel('savings_goals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'savings_goals',
        },
        (payload) => {
          console.log('Goal change:', payload);
          fetchGoals();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchGoals]);

  return {
    // State
    goals,
    goalsWithStats,
    activeGoals,
    completedGoals,
    totalSaved,
    totalTarget,
    contributions,
    selectedGoal,
    loading,
    error,

    // Actions
    setSelectedGoal,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution,
    getContributionHistory,
    refresh: fetchGoals,
  };
}
