import { useCallback, useMemo } from 'react';
import { endOfMonth, startOfMonth } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { useToast } from '@/hooks/use-toast';
import { useTransactions } from '@/hooks/useTransactions';
import { formatDateOnly } from '@/utils/formatters';
import type { FinancialGoalWithCategory } from '@/types/database.types';
import {
  buildSpendingPlanSuggestions,
  getPreviousMonthKey,
  getSpendingGoalsForMonth,
  isMonthlySpendingGoalForMonth,
  summarizeBudgetItems,
  toBudgetItemsFromSpendingGoals,
} from '@/utils/spendingGoalPlanning';

interface SavePlanItem {
  category_id: string;
  target_amount: number;
  name?: string;
}

interface UseSpendingGoalsPlanningParams {
  month: string;
  heroSummaryMonth?: string;
  goals: FinancialGoalWithCategory[];
  refreshGoals: () => Promise<void>;
}

export function useSpendingGoalsPlanning({
  month,
  heroSummaryMonth,
  goals,
  refreshGoals,
}: UseSpendingGoalsPlanningParams) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { categories } = useCategories();
  const { transactions } = useTransactions();
  const { transactions: creditCardTransactions } = useCreditCardTransactions();

  const monthlyGoals = useMemo(() => getSpendingGoalsForMonth(goals, month), [goals, month]);
  const planningItems = useMemo(() => toBudgetItemsFromSpendingGoals(goals, month), [goals, month]);

  const heroMonthKey = heroSummaryMonth ?? month;
  const heroPlanningItems = useMemo(
    () => toBudgetItemsFromSpendingGoals(goals, heroMonthKey),
    [goals, heroMonthKey]
  );

  const summary = useMemo(() => summarizeBudgetItems(planningItems), [planningItems]);
  const heroSummary = useMemo(() => summarizeBudgetItems(heroPlanningItems), [heroPlanningItems]);

  const savePlan = useCallback(
    async (items: SavePlanItem[]) => {
      if (!user) return { created: 0, updated: 0 };

      const monthStart = startOfMonth(new Date(`${month}-01T12:00:00`));
      const monthEnd = endOfMonth(monthStart);
      const existingMap = new Map(
        goals
          .filter((goal) => isMonthlySpendingGoalForMonth(goal, month))
          .map((goal) => [goal.category_id, goal])
      );

      const normalizedItems = items
        .map((item) => ({
          ...item,
          target_amount: Number(item.target_amount || 0),
        }))
        .filter((item) => item.category_id && item.target_amount > 0);

      const toCreate = normalizedItems.filter((item) => !existingMap.has(item.category_id));
      const toUpdate = normalizedItems.filter((item) => existingMap.has(item.category_id));

      if (toCreate.length > 0) {
        const { error } = await supabase.from('financial_goals').insert(
          toCreate.map((item) => ({
            user_id: user.id,
            goal_type: 'spending_limit',
            name:
              item.name ||
              `Limite ${categories.find((category) => category.id === item.category_id)?.name || 'Categoria'}`,
            category_id: item.category_id,
            target_amount: item.target_amount,
            period_type: 'monthly',
            period_start: formatDateOnly(monthStart),
            period_end: formatDateOnly(monthEnd),
            status: 'active',
          }))
        );

        if (error) throw error;
      }

      if (toUpdate.length > 0) {
        const results = await Promise.all(
          toUpdate.map((item) =>
            supabase
              .from('financial_goals')
              .update({
                target_amount: item.target_amount,
                name: item.name || existingMap.get(item.category_id)?.name,
                status: 'active',
              })
              .eq('id', existingMap.get(item.category_id)!.id)
          )
        );

        const failed = results.find((result) => result.error);
        if (failed?.error) throw failed.error;
      }

      await refreshGoals();

      toast({
        title: 'Planejamento mensal salvo',
        description: `${normalizedItems.length} ${normalizedItems.length === 1 ? 'categoria atualizada' : 'categorias atualizadas'} em ${month}.`,
      });

      return { created: toCreate.length, updated: toUpdate.length };
    },
    [categories, goals, month, refreshGoals, toast, user]
  );

  const copyFromPreviousMonth = useCallback(async () => {
    const previousMonth = getPreviousMonthKey(month);
    const previousGoals = goals.filter((goal) => isMonthlySpendingGoalForMonth(goal, previousMonth));

    if (previousGoals.length === 0) {
      toast({
        title: 'Nada para copiar',
        description: `Nenhuma meta mensal encontrada em ${previousMonth}.`,
      });
      return [];
    }

    await savePlan(
      previousGoals.map((goal) => ({
        category_id: goal.category_id!,
        target_amount: Number(goal.target_amount || 0),
        name: goal.name,
      }))
    );

    return previousGoals;
  }, [goals, month, savePlan, toast]);

  const getSuggestions = useCallback(async () => {
    return buildSpendingPlanSuggestions({
      categories,
      goals,
      transactions,
      creditCardTransactions,
      monthKey: month,
    });
  }, [categories, creditCardTransactions, goals, month, transactions]);

  const applySuggestions = useCallback(async () => {
    const suggestions = await getSuggestions();
    const currentCategoryIds = new Set(monthlyGoals.map((goal) => goal.category_id));
    const missingSuggestions = suggestions.filter((item) => !currentCategoryIds.has(item.category_id));

    if (missingSuggestions.length === 0) {
      toast({
        title: 'Sugestões já absorvidas',
        description: 'As categorias sugeridas já possuem meta mensal neste mês.',
      });
      return [];
    }

    await savePlan(
      missingSuggestions.map((item) => ({
        category_id: item.category_id,
        target_amount: item.suggested_amount,
        name: `Limite ${item.category_name}`,
      }))
    );

    return missingSuggestions;
  }, [getSuggestions, monthlyGoals, savePlan, toast]);

  return {
    goals: monthlyGoals,
    planningItems,
    heroPlanningItems,
    heroSummaryMonth: heroMonthKey,
    heroTotalPlanned: heroSummary.totalPlanned,
    heroTotalActual: heroSummary.totalActual,
    totalPlanned: summary.totalPlanned,
    totalActual: summary.totalActual,
    totalDifference: summary.totalDifference,
    utilizationPct: summary.utilizationPct,
    safeCount: summary.safeCount,
    warningCount: summary.warningCount,
    exceededCount: summary.exceededCount,
    savePlan,
    copyFromPreviousMonth,
    getSuggestions,
    applySuggestions,
    refreshPlanning: refreshGoals,
    monthKey: month,
    heroMonthKey,
  };
}
