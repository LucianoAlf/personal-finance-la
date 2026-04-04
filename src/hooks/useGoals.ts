import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type {
  FinancialGoal,
  FinancialGoalWithCategory,
  GoalType,
  GoalStatus,
  CreateSavingsGoalInput,
  CreateSpendingGoalInput,
  GoalStats,
} from '@/types/database.types';

interface UseGoalsReturn {
  goals: FinancialGoalWithCategory[];
  loading: boolean;
  error: string | null;
  
  // CRUD
  createSavingsGoal: (data: CreateSavingsGoalInput) => Promise<FinancialGoal | null>;
  createSpendingGoal: (data: CreateSpendingGoalInput) => Promise<FinancialGoal | null>;
  updateGoal: (id: string, data: Partial<FinancialGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addToSavingsGoal: (id: string, amount: number) => Promise<void>;
  
  // Queries
  getGoalsByType: (type: GoalType) => FinancialGoalWithCategory[];
  getActiveGoals: () => FinancialGoalWithCategory[];
  getGoalById: (id: string) => FinancialGoalWithCategory | undefined;
  
  // Streaks
  calculateStreak: (goalId: string) => Promise<number>;
  updateBestStreak: (goalId: string) => Promise<void>;
  
  // Stats
  getStats: () => GoalStats;
  
  // Refresh
  refreshGoals: () => Promise<void>;
}

export function useGoals(): UseGoalsReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<FinancialGoalWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch goals com informações de categoria
  const fetchGoals = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('financial_goals')
        .select(`
          *,
          category:categories(name, icon)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Enriquecer dados com cálculos
      const enrichedGoals: FinancialGoalWithCategory[] = (data || []).map((goal: any) => {
        const percentage = goal.target_amount > 0 
          ? Math.round((goal.current_amount / goal.target_amount) * 100)
          : 0;
        
        const remaining = goal.target_amount - goal.current_amount;
        
        let days_left: number | undefined;
        if (goal.deadline) {
          const deadline = new Date(goal.deadline);
          const today = new Date();
          days_left = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        } else if (goal.period_end) {
          const period_end = new Date(goal.period_end);
          const today = new Date();
          days_left = Math.ceil((period_end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
          ...goal,
          category_name: goal.category?.name,
          category_icon: goal.category?.icon,
          percentage,
          remaining,
          days_left,
          deadline: goal.deadline ? new Date(goal.deadline) : undefined,
          period_start: goal.period_start ? new Date(goal.period_start) : undefined,
          period_end: goal.period_end ? new Date(goal.period_end) : undefined,
          created_at: new Date(goal.created_at),
          updated_at: new Date(goal.updated_at),
        };
      });

      setGoals(enrichedGoals);
    } catch (err: any) {
      console.error('Error fetching goals:', err);
      setError(err.message);
      toast({
        title: 'Erro ao carregar metas',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Realtime: ouvir alterações nas metas e transações (para refletir triggers)
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('financial-goals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_goals', filter: `user_id=eq.${user.id}` }, () => {
        fetchGoals();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_card_transactions', filter: `user_id=eq.${user.id}` }, () => {
        // triggers atualizam financial_goals
        fetchGoals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchGoals]);

  // Criar meta de economia
  const createSavingsGoal = async (data: CreateSavingsGoalInput): Promise<FinancialGoal | null> => {
    if (!user) return null;

    try {
      const { data: newGoal, error: createError } = await supabase
        .from('financial_goals')
        .insert({
          user_id: user.id,
          goal_type: 'savings',
          name: data.name,
          icon: data.icon || '💰',
          target_amount: data.target_amount,
          current_amount: data.current_amount || 0,
          deadline: data.deadline.toISOString().split('T')[0],
          status: 'active',
        })
        .select()
        .single();

      if (createError) throw createError;

      toast({
        title: '✅ Meta criada!',
        description: `Meta "${data.name}" criada com sucesso.`,
      });

      await fetchGoals();
      return newGoal;
    } catch (err: any) {
      console.error('Error creating savings goal:', err);
      toast({
        title: 'Erro ao criar meta',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Criar meta de gasto
  const createSpendingGoal = async (data: CreateSpendingGoalInput): Promise<FinancialGoal | null> => {
    if (!user) return null;

    try {
      const { data: newGoal, error: createError } = await supabase
        .from('financial_goals')
        .insert({
          user_id: user.id,
          goal_type: 'spending_limit',
          name: data.name,
          category_id: data.category_id,
          target_amount: data.target_amount,
          current_amount: 0,
          period_type: data.period_type,
          period_start: data.period_start.toISOString().split('T')[0],
          period_end: data.period_end.toISOString().split('T')[0],
          status: 'active',
        })
        .select()
        .single();

      if (createError) throw createError;

      toast({
        title: '✅ Meta de gasto criada!',
        description: `Limite de R$ ${data.target_amount.toFixed(2)} para ${data.name}.`,
      });

      await fetchGoals();
      return newGoal;
    } catch (err: any) {
      console.error('Error creating spending goal:', err);
      toast({
        title: 'Erro ao criar meta',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Atualizar meta
  const updateGoal = async (id: string, data: Partial<FinancialGoal>) => {
    try {
      const { error: updateError } = await supabase
        .from('financial_goals')
        .update(data)
        .eq('id', id);

      if (updateError) throw updateError;

      toast({
        title: '✅ Meta atualizada!',
        description: 'As alterações foram salvas.',
      });

      await fetchGoals();
    } catch (err: any) {
      console.error('Error updating goal:', err);
      toast({
        title: 'Erro ao atualizar meta',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  // Deletar meta
  const deleteGoal = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast({
        title: '✅ Meta excluída',
        description: 'A meta foi removida com sucesso.',
      });

      await fetchGoals();
    } catch (err: any) {
      console.error('Error deleting goal:', err);
      toast({
        title: 'Erro ao excluir meta',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  // Adicionar valor a meta de economia (registra contribuição)
  const addToSavingsGoal = async (id: string, amount: number) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('financial_goal_contributions')
        .insert({
          user_id: user.id,
          goal_id: id,
          amount,
        });
      if (error) throw error;
      await fetchGoals();
      toast({
        title: '✅ Aporte registrado',
        description: `Adicionado ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} à meta.`,
      });
    } catch (err: any) {
      console.error('Error adding contribution:', err);
      toast({ title: 'Erro ao adicionar valor', description: err.message, variant: 'destructive' });
    }
  };

  // Filtrar por tipo
  const getGoalsByType = (type: GoalType) => {
    return goals.filter(g => g.goal_type === type);
  };

  // Filtrar ativos
  const getActiveGoals = () => {
    return goals.filter(g => g.status === 'active' || g.status === 'exceeded');
  };

  // Buscar por ID
  const getGoalById = (id: string) => {
    return goals.find(g => g.id === id);
  };

  // Calcular streak
  const calculateStreak = async (goalId: string): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('calculate_spending_streak', {
        goal_id: goalId,
      });

      if (error) throw error;
      return data || 0;
    } catch (err: any) {
      console.error('Error calculating streak:', err);
      return 0;
    }
  };

  // Atualizar best streak
  const updateBestStreak = async (goalId: string) => {
    try {
      await supabase.rpc('update_best_streak', {
        goal_id: goalId,
      });
      await fetchGoals();
    } catch (err: any) {
      console.error('Error updating best streak:', err);
    }
  };

  // Estatísticas
  const getStats = (): GoalStats => {
    const savingsGoals = goals.filter(g => g.goal_type === 'savings');
    const spendingGoals = goals.filter(g => g.goal_type === 'spending_limit');

    return {
      total_goals: goals.length,
      active_goals: goals.filter(g => g.status === 'active').length,
      completed_goals: goals.filter(g => g.status === 'completed').length,
      exceeded_goals: goals.filter(g => g.status === 'exceeded').length,
      total_savings: savingsGoals.reduce((sum, g) => sum + g.current_amount, 0),
      best_streak: Math.max(...goals.map(g => g.best_streak), 0),
      completion_rate: goals.length > 0
        ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100)
        : 0,
    };
  };

  return {
    goals,
    loading,
    error,
    createSavingsGoal,
    createSpendingGoal,
    updateGoal,
    deleteGoal,
    addToSavingsGoal,
    getGoalsByType,
    getActiveGoals,
    getGoalById,
    calculateStreak,
    updateBestStreak,
    getStats,
    refreshGoals: fetchGoals,
  };
}
