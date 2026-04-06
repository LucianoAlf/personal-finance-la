import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { processGamificationEvent } from '@/lib/gamification';
import type {
  SavingsGoal,
  CreateGoalInput,
  UpdateGoalInput,
  GoalContribution,
  CreateGoalContributionInput,
  GoalWithStats,
  GoalStatus,
} from '@/types/settings.types';

type FinancialSavingsGoalRow = {
  id: string;
  user_id: string;
  name: string;
  category?: SavingsGoal['category'] | null;
  target_amount: number | string;
  current_amount: number | string;
  start_date?: string | null;
  target_date?: string | null;
  deadline?: string | null;
  priority?: SavingsGoal['priority'] | null;
  status?: string | null;
  icon?: string | null;
  notify_milestones?: boolean | null;
  notify_contribution?: boolean | null;
  contribution_frequency?: SavingsGoal['contribution_frequency'] | null;
  contribution_day?: number | null;
  notify_delay?: boolean | null;
  created_at: string;
  updated_at: string;
};

type FinancialGoalContributionRow = {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number | string;
  date?: string | null;
  note?: string | null;
  created_at: string;
  updated_at?: string | null;
};

const normalizeGoalStatus = (status: string | null | undefined): GoalStatus => {
  if (status === 'completed' || status === 'exceeded' || status === 'archived') {
    return status;
  }

  return 'active';
};

const mapGoalRecord = (record: FinancialSavingsGoalRow): SavingsGoal => ({
  id: record.id,
  user_id: record.user_id,
  name: record.name,
  category: record.category || 'general',
  target_amount: Number(record.target_amount || 0),
  current_amount: Number(record.current_amount || 0),
  start_date: record.start_date || new Date().toISOString().split('T')[0],
  target_date: record.target_date || record.deadline || '',
  deadline: record.deadline || record.target_date || null,
  priority: record.priority || 'medium',
  status: normalizeGoalStatus(record.status),
  icon: record.icon,
  notify_milestones: record.notify_milestones ?? true,
  notify_contribution: record.notify_contribution ?? false,
  contribution_frequency: record.contribution_frequency || undefined,
  contribution_day: record.contribution_day || undefined,
  notify_delay: record.notify_delay ?? false,
  created_at: record.created_at,
  updated_at: record.updated_at,
});

const mapContributionRecord = (record: FinancialGoalContributionRow): GoalContribution => ({
  id: record.id,
  goal_id: record.goal_id,
  user_id: record.user_id,
  amount: Number(record.amount || 0),
  date: record.date || record.created_at.split('T')[0],
  note: record.note || undefined,
  created_at: record.created_at,
  updated_at: record.updated_at || record.created_at,
});

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
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('goal_type', 'savings')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setGoals(((data || []) as FinancialSavingsGoalRow[]).map(mapGoalRecord));
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
        .from('financial_goals')
        .insert({
          user_id: user.id,
          goal_type: 'savings',
          name: input.name,
          category: input.category,
          target_amount: input.target_amount,
          current_amount: input.current_amount || 0,
          start_date: input.start_date || new Date().toISOString().split('T')[0],
          deadline: input.target_date,
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

      setGoals((prev) => [mapGoalRecord(data as FinancialSavingsGoalRow), ...prev]);
      await processGamificationEvent('create_goal');
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
      const payload: Record<string, unknown> = { ...input };

      if (input.target_date !== undefined) {
        payload.target_date = input.target_date;
        payload.deadline = input.target_date;
      }

      const { data, error: updateError } = await supabase
        .from('financial_goals')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setGoals((prev) => prev.map((g) => (g.id === id ? mapGoalRecord(data as FinancialSavingsGoalRow) : g)));
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
        .from('financial_goals')
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

        const contributionDate = input.date || new Date().toISOString().split('T')[0];

        const { error: insertError } = await supabase
          .from('financial_goal_contributions')
          .insert({
            user_id: user.id,
            goal_id: input.goal_id,
            amount: input.amount,
            date: contributionDate,
            note: input.note,
          });

        if (insertError) throw insertError;

        // O trigger já atualiza current_amount, mas vamos refetch para garantir
        await fetchGoals();
        await processGamificationEvent('add_goal_contribution');
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
        .from('financial_goal_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mapped = ((data || []) as FinancialGoalContributionRow[]).map(mapContributionRecord);
      setContributions(mapped);
      return mapped;
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
    const targetDate = new Date(`${goal.target_date}T12:00:00`);
    
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
    
    const startDate = new Date(`${goal.start_date}T12:00:00`);
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
      .channel('financial_savings_goals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_goals',
        },
        (payload) => {
          console.log('Goal change:', payload);
          fetchGoals();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_goal_contributions',
        },
        () => {
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
