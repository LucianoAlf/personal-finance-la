import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { processGamificationEvent } from '@/lib/gamification';
import type {
  InvestmentGoal,
  CreateInvestmentGoalInput,
  UpdateInvestmentGoalInput,
  InvestmentGoalMetrics,
  InvestmentGoalPortfolioMetrics,
  InvestmentProjectionMonth,
  InvestmentGoalWithMetrics,
  CreateContributionInput,
  InvestmentGoalContribution,
  LinkedInvestmentSnapshot,
} from '@/types/investment-goals.types';
import { formatDateOnly, parseDateOnly } from '@/utils/formatters';
import type { Investment } from '@/types/database.types';
import { loadActiveInvestmentsForUser } from '@/hooks/useInvestments';

export function useInvestmentGoals() {
  const [goals, setGoals] = useState<InvestmentGoalWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getGoalProjection = useCallback(async (
    currentAmount: number,
    monthlyContribution: number,
    annualRate: number,
    months: number
  ): Promise<InvestmentProjectionMonth[]> => {
    try {
      if (months <= 0) return [];

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

  const getRpcGoalMetrics = useCallback(async (goalId: string): Promise<InvestmentGoalMetrics | null> => {
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

  const enrichGoal = useCallback(async (
    goal: InvestmentGoal,
    activeInvestments: Investment[]
  ): Promise<InvestmentGoalWithMetrics> => {
    const linkedInvestmentDetails: LinkedInvestmentSnapshot[] = activeInvestments
      .filter((investment) => goal.linked_investments?.includes(investment.id))
      .map((investment) => ({
        id: investment.id,
        name: investment.name,
        ticker: investment.ticker,
        current_value: getInvestmentCurrentValue(investment),
        total_invested: getInvestmentInvestedValue(investment),
      }));

    const manualCurrentAmount = Number(goal.current_amount || 0);
    const linkedCurrentAmount = goal.auto_invest
      ? linkedInvestmentDetails.reduce((sum, investment) => sum + investment.current_value, 0)
      : 0;
    const effectiveCurrentAmount = manualCurrentAmount + linkedCurrentAmount;

    const baseMetrics = await getRpcGoalMetrics(goal.id);
    const monthsRemaining = baseMetrics?.months_remaining ?? calculateMonthsRemaining(goal.target_date);
    const projection = await getGoalProjection(
      effectiveCurrentAmount,
      Number(goal.monthly_contribution || 0),
      Number(goal.expected_return_rate || 0),
      monthsRemaining
    );

    const finalProjection = projection.at(-1)?.balance ?? effectiveCurrentAmount;
    const totalContributions = Number(goal.monthly_contribution || 0) * monthsRemaining;
    const totalInterest = finalProjection - effectiveCurrentAmount - totalContributions;
    const percentage = goal.target_amount > 0 ? (effectiveCurrentAmount / goal.target_amount) * 100 : 0;

    const metrics: InvestmentGoalPortfolioMetrics = {
      goal_id: goal.id,
      current_amount: effectiveCurrentAmount,
      target_amount: Number(goal.target_amount || 0),
      percentage: Number(percentage.toFixed(2)),
      months_total: baseMetrics?.months_total ?? calculateMonthsTotal(goal.start_date, goal.target_date),
      months_elapsed: baseMetrics?.months_elapsed ?? calculateMonthsElapsed(goal.start_date),
      months_remaining: monthsRemaining,
      final_projection: Number(finalProjection.toFixed(2)),
      total_contributions: Number(totalContributions.toFixed(2)),
      total_interest: Number(totalInterest.toFixed(2)),
      is_on_track: finalProjection >= Number(goal.target_amount || 0),
      shortfall: Math.max(0, Number((Number(goal.target_amount || 0) - finalProjection).toFixed(2))),
      manual_current_amount: manualCurrentAmount,
      linked_current_amount: Number(linkedCurrentAmount.toFixed(2)),
      effective_current_amount: Number(effectiveCurrentAmount.toFixed(2)),
      linked_investments_count: linkedInvestmentDetails.length,
      current_gap: Math.max(0, Number((Number(goal.target_amount || 0) - effectiveCurrentAmount).toFixed(2))),
      projected_gap: Math.max(0, Number((Number(goal.target_amount || 0) - finalProjection).toFixed(2))),
    };

    return {
      ...goal,
      current_amount: metrics.effective_current_amount,
      metrics,
      projection,
      linked_investment_details: linkedInvestmentDetails,
    };
  }, [getGoalProjection, getRpcGoalMetrics]);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const [{ data: rawGoals, error: fetchGoalsError }, activeInvestments] = await Promise.all([
        supabase
          .from('investment_goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        loadActiveInvestmentsForUser(user.id),
      ]);

      if (fetchGoalsError) throw fetchGoalsError;

      const enrichedGoals = await Promise.all(
        (rawGoals || []).map((goal) => enrichGoal(goal, activeInvestments || []))
      );

      setGoals(enrichedGoals);
    } catch (err: any) {
      console.error('Error fetching investment goals:', err);
      setError(err.message);
      toast.error('Erro ao carregar metas de investimento');
    } finally {
      setLoading(false);
    }
  }, [enrichGoal]);

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
          start_date: input.start_date ? formatDateOnly(input.start_date) : formatDateOnly(new Date()),
          target_date: formatDateOnly(input.target_date),
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

      await fetchGoals();
      await processGamificationEvent('create_goal');
      toast.success('Meta de investimento criada!');
      return data;
    } catch (err: any) {
      console.error('Error creating investment goal:', err);
      toast.error(err.message || 'Erro ao criar meta');
      return null;
    }
  }, [fetchGoals]);

  const updateGoal = useCallback(async (id: string, input: UpdateInvestmentGoalInput): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('investment_goals')
        .update({
          ...input,
          start_date: input.start_date ? formatDateOnly(input.start_date) : undefined,
          target_date: input.target_date ? formatDateOnly(input.target_date) : undefined,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchGoals();
      toast.success('Meta atualizada!');
      return true;
    } catch (err: any) {
      console.error('Error updating investment goal:', err);
      toast.error(err.message || 'Erro ao atualizar meta');
      return false;
    }
  }, [fetchGoals]);

  const deleteGoal = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('investment_goals')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setGoals((prev) => prev.filter((goal) => goal.id !== id));
      toast.success('Meta deletada!');
      return true;
    } catch (err: any) {
      console.error('Error deleting investment goal:', err);
      toast.error(err.message || 'Erro ao deletar meta');
      return false;
    }
  }, []);

  const getGoalMetrics = useCallback(async (goalId: string): Promise<InvestmentGoalPortfolioMetrics | null> => {
    const cachedGoal = goals.find((goal) => goal.id === goalId);
    return cachedGoal?.metrics || null;
  }, [goals]);

  const getGoalWithMetrics = useCallback(async (goalId: string): Promise<InvestmentGoalWithMetrics | null> => {
    return goals.find((goal) => goal.id === goalId) || null;
  }, [goals]);

  const activeGoals = goals.filter((goal) => goal.status === 'active');
  const completedGoals = goals.filter((goal) => goal.status === 'completed');
  const totalInvested = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0);

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
          date: input.date ? formatDateOnly(input.date) : formatDateOnly(new Date()),
          note: input.note,
        });

      if (error) throw error;

      await fetchGoals();
      await processGamificationEvent('add_goal_contribution');
      toast.success(`Aporte de R$ ${input.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrado!`);
      return true;
    } catch (err: any) {
      console.error('Error adding contribution:', err);
      toast.error(err.message || 'Erro ao registrar aporte');
      return false;
    }
  }, [fetchGoals]);

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

  useEffect(() => {
    fetchGoals();

    const subscription = supabase
      .channel('investment_goal_portfolio_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investment_goals' }, fetchGoals)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investment_goal_contributions' }, fetchGoals)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments' }, fetchGoals)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchGoals]);

  return {
    goals,
    activeGoals,
    completedGoals,
    totalInvested,
    totalTarget,
    loading,
    error,
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

function getInvestmentCurrentValue(investment: Investment): number {
  const currentPrice = Number(investment.current_price ?? investment.purchase_price ?? 0);
  const quantity = Number(investment.quantity || 0);
  return Number(investment.current_value ?? quantity * currentPrice);
}

function getInvestmentInvestedValue(investment: Investment): number {
  const purchasePrice = Number(investment.purchase_price || 0);
  const quantity = Number(investment.quantity || 0);
  return Number(investment.total_invested ?? quantity * purchasePrice);
}

function calculateMonthsRemaining(targetDate: string): number {
  const today = parseDateOnly(formatDateOnly(new Date()));
  const target = parseDateOnly(targetDate);
  const months = (target.getFullYear() - today.getFullYear()) * 12
    + (target.getMonth() - today.getMonth());
  return Math.max(0, months);
}

function calculateMonthsElapsed(startDate: string): number {
  const start = parseDateOnly(startDate);
  const today = parseDateOnly(formatDateOnly(new Date()));
  const months = (today.getFullYear() - start.getFullYear()) * 12
    + (today.getMonth() - start.getMonth());
  return Math.max(0, months);
}

function calculateMonthsTotal(startDate: string, targetDate: string): number {
  const start = parseDateOnly(startDate);
  const target = parseDateOnly(targetDate);
  const months = (target.getFullYear() - start.getFullYear()) * 12
    + (target.getMonth() - start.getMonth());
  return Math.max(0, months);
}
