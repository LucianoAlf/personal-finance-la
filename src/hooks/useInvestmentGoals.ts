import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type {
  InvestmentGoal,
  CreateInvestmentGoalInput,
  UpdateInvestmentGoalInput,
  InvestmentGoalMetrics,
  InvestmentProjectionMonth,
  InvestmentGoalWithMetrics,
  CreateContributionInput,
  InvestmentGoalContribution,
} from '@/types/investment-goals.types';

export function useInvestmentGoals() {
  const [goals, setGoals] = useState<InvestmentGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar metas do usuário
  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: fetchError } = await supabase
        .from('investment_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setGoals(data || []);
    } catch (err: any) {
      console.error('Error fetching investment goals:', err);
      setError(err.message);
      toast.error('Erro ao carregar metas de investimento');
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar meta
  const createGoal = useCallback(async (input: CreateInvestmentGoalInput): Promise<InvestmentGoal | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: createError } = await supabase
        .from('investment_goals')
        .insert({
          user_id: user.id,
          name: input.name,
          description: input.description,
          category: input.category,
          target_amount: input.target_amount,
          current_amount: input.current_amount || 0,
          start_date: input.start_date || new Date().toISOString().split('T')[0],
          target_date: input.target_date,
          expected_return_rate: input.expected_return_rate,
          monthly_contribution: input.monthly_contribution || 0,
          contribution_day: input.contribution_day,
          linked_investments: input.linked_investments || [],
          auto_invest: input.auto_invest || false,
          priority: input.priority || 'medium',
          status: 'active',
          notify_milestones: input.notify_milestones ?? true,
          notify_contribution: input.notify_contribution ?? false,
          notify_rebalancing: input.notify_rebalancing ?? false,
          icon: input.icon,
          color: input.color,
        })
        .select()
        .single();

      if (createError) throw createError;

      setGoals((prev) => [data, ...prev]);
      toast.success('Meta de investimento criada!');
      return data;
    } catch (err: any) {
      console.error('Error creating investment goal:', err);
      toast.error(err.message || 'Erro ao criar meta');
      return null;
    }
  }, []);

  // Atualizar meta
  const updateGoal = useCallback(async (id: string, input: UpdateInvestmentGoalInput): Promise<boolean> => {
    try {
      const { data, error: updateError } = await supabase
        .from('investment_goals')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setGoals((prev) => prev.map((g) => (g.id === id ? data : g)));
      toast.success('Meta atualizada!');
      return true;
    } catch (err: any) {
      console.error('Error updating investment goal:', err);
      toast.error(err.message || 'Erro ao atualizar meta');
      return false;
    }
  }, []);

  // Deletar meta
  const deleteGoal = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('investment_goals')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setGoals((prev) => prev.filter((g) => g.id !== id));
      toast.success('Meta deletada!');
      return true;
    } catch (err: any) {
      console.error('Error deleting investment goal:', err);
      toast.error(err.message || 'Erro ao deletar meta');
      return false;
    }
  }, []);

  // Buscar métricas de uma meta
  const getGoalMetrics = useCallback(async (goalId: string): Promise<InvestmentGoalMetrics | null> => {
    try {
      const { data, error } = await supabase.rpc('get_investment_goal_metrics', {
        p_goal_id: goalId,
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error fetching goal metrics:', err);
      return null;
    }
  }, []);

  // Buscar projeção de uma meta
  const getGoalProjection = useCallback(async (
    currentAmount: number,
    monthlyContribution: number,
    annualRate: number,
    months: number
  ): Promise<InvestmentProjectionMonth[]> => {
    try {
      const { data, error } = await supabase.rpc('calculate_investment_projection', {
        p_current_amount: currentAmount,
        p_monthly_contribution: monthlyContribution,
        p_annual_rate: annualRate,
        p_months: months,
      });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error calculating projection:', err);
      return [];
    }
  }, []);

  // Buscar meta com métricas e projeção
  const getGoalWithMetrics = useCallback(async (goalId: string): Promise<InvestmentGoalWithMetrics | null> => {
    try {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return null;

      const [metrics, projection] = await Promise.all([
        getGoalMetrics(goalId),
        getGoalProjection(
          goal.current_amount,
          goal.monthly_contribution,
          goal.expected_return_rate,
          calculateMonthsRemaining(goal.target_date)
        ),
      ]);

      if (!metrics) return null;

      return {
        ...goal,
        metrics,
        projection,
      };
    } catch (err: any) {
      console.error('Error fetching goal with metrics:', err);
      return null;
    }
  }, [goals, getGoalMetrics, getGoalProjection]);

  // Computed: Metas ativas
  const activeGoals = goals.filter((g) => g.status === 'active');

  // Computed: Metas concluídas
  const completedGoals = goals.filter((g) => g.status === 'completed');

  // Computed: Total investido
  const totalInvested = goals.reduce((sum, g) => sum + g.current_amount, 0);

  // Computed: Total alvo
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);

  // Adicionar contribuição/aporte
  const addContribution = useCallback(async (input: CreateContributionInput): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('investment_goal_contributions')
        .insert({
          user_id: user.id,
          goal_id: input.goal_id,
          amount: input.amount,
          date: input.date || new Date().toISOString().split('T')[0],
          note: input.note,
        });

      if (error) throw error;

      // O trigger já atualiza current_amount automaticamente
      // Mas vamos refetch para garantir sincronização
      await fetchGoals();
      
      toast.success(`Aporte de R$ ${input.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrado!`);
      return true;
    } catch (err: any) {
      console.error('Error adding contribution:', err);
      toast.error(err.message || 'Erro ao registrar aporte');
      return false;
    }
  }, [fetchGoals]);

  // Buscar histórico de contribuições
  const getContributionHistory = useCallback(async (goalId: string): Promise<InvestmentGoalContribution[]> => {
    try {
      const { data, error } = await supabase
        .from('investment_goal_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching contributions:', err);
      toast.error('Erro ao carregar histórico');
      return [];
    }
  }, []);

  // Realtime subscription
  useEffect(() => {
    fetchGoals();

    const subscription = supabase
      .channel('investment_goals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investment_goals',
        },
        (payload) => {
          console.log('Investment goal change:', payload);
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
    activeGoals,
    completedGoals,
    totalInvested,
    totalTarget,
    loading,
    error,

    // Actions
    createGoal,
    updateGoal,
    deleteGoal,
    getGoalMetrics,
    getGoalProjection,
    getGoalWithMetrics,
    addContribution,
    getContributionHistory,
    refresh: fetchGoals,
  };
}

// Helper: Calcular meses restantes
function calculateMonthsRemaining(targetDate: string): number {
  const today = new Date();
  const target = new Date(targetDate);
  const months = (target.getFullYear() - today.getFullYear()) * 12 
                + (target.getMonth() - today.getMonth());
  return Math.max(0, months);
}
