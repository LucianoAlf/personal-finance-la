import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types/categories';
import type { Transaction } from '@/types/transactions';
import { useCategories } from './useCategories';
import { useTransactions } from './useTransactions';

/**
 * @deprecated Mantido apenas como legado temporário.
 * O fluxo canônico de planejamento mensal por categoria agora usa
 * `financial_goals.goal_type = "spending_limit"` via `useSpendingGoalsPlanning`.
 */

export interface BudgetItem {
  id: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  planned_amount: number;
  actual_amount: number;
  difference: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
  notes?: string;
  month: string;
}

interface DBBudget {
  id: string;
  user_id?: string;
  category_id: string;
  month: string; // YYYY-MM
  planned_amount: number;
  notes?: string;
}

function enrichBudgetRows(rows: DBBudget[], categories: Category[], transactions: Transaction[]): BudgetItem[] {
  return rows.map((b) => {
    const category = categories.find((c) => c.id === b.category_id);
    const actual = transactions
      .filter(
        (t) =>
          t.category_id === b.category_id &&
          t.type === 'expense' &&
          t.is_paid &&
          new Date(t.transaction_date as any).toISOString().slice(0, 7) === b.month
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const planned = Number(b.planned_amount || 0);
    const percentage = planned > 0 ? (actual / planned) * 100 : 0;
    const status: BudgetItem['status'] = percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok';

    return {
      id: b.id,
      category_id: b.category_id,
      category_name: category?.name || 'Sem categoria',
      category_icon: category?.icon || '📦',
      category_color: category?.color || 'gray',
      planned_amount: planned,
      actual_amount: Number(actual || 0),
      difference: Number(actual || 0) - planned,
      percentage,
      status,
      notes: b.notes,
      month: b.month,
    };
  });
}

/** @param heroSummaryMonth Mês extra para totais do hero (ex.: mês civil atual), sem segundo fetch de transações. */
export function useBudgets(month: string = getCurrentMonth(), heroSummaryMonth?: string) {
  const [rawRows, setRawRows] = useState<DBBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const { categories } = useCategories();
  const { transactions } = useTransactions();

  const monthsToFetch = useMemo(() => {
    const set = new Set<string>([month]);
    if (heroSummaryMonth) set.add(heroSummaryMonth);
    return [...set];
  }, [month, heroSummaryMonth]);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('budgets').select('*').in('month', monthsToFetch);

      if (error) throw error;
      setRawRows((data || []) as DBBudget[]);
    } catch (err) {
      console.error('Erro ao buscar budgets:', err);
    } finally {
      setLoading(false);
    }
  }, [monthsToFetch]);

  const budgets = useMemo(
    () => enrichBudgetRows(rawRows.filter((b) => b.month === month), categories, transactions),
    [rawRows, month, categories, transactions]
  );

  const heroMonthKey = heroSummaryMonth ?? month;
  const heroBudgetItems = useMemo(
    () => enrichBudgetRows(rawRows.filter((b) => b.month === heroMonthKey), categories, transactions),
    [rawRows, heroMonthKey, categories, transactions]
  );

  const saveBudget = useCallback(
    async (categoryId: string, amount: number, notes?: string) => {
      const { error } = await supabase
        .from('budgets')
        .upsert(
          {
            category_id: categoryId,
            month,
            planned_amount: amount,
            notes,
          },
          { onConflict: 'user_id,category_id,month' }
        );
      if (error) throw error;
      await fetchBudgets();
    },
    [month, fetchBudgets]
  );

  const copyFromPreviousMonth = useCallback(async () => {
    const prevMonth = getPreviousMonth(month);
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('month', prevMonth);
    if (error) throw error;
    if (data) {
      for (const b of data as DBBudget[]) {
        await saveBudget(b.category_id, Number(b.planned_amount || 0), b.notes);
      }
    }
  }, [month, saveBudget]);

  const getSuggestions = useCallback(async () => {
    const last3 = getLast3Months(month);
    const suggestions = categories.map((c) => {
      const avg = last3
        .map((m) =>
          transactions
            .filter(
              (t) =>
                t.category_id === c.id &&
                t.type === 'expense' &&
                t.is_paid &&
                new Date(t.transaction_date as any).toISOString().slice(0, 7) === m
            )
            .reduce((sum, t) => sum + Number(t.amount), 0)
        )
        .reduce((sum, v) => sum + v, 0) /
        (last3.length || 1);
      const suggested = Math.round((avg || 0) * 1.05);
      return { category_id: c.id, category_name: c.name, suggested_amount: suggested };
    });
    return suggestions.filter((s) => s.suggested_amount > 0);
  }, [month, categories, transactions]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const totalPlanned = useMemo(() => budgets.reduce((sum, b) => sum + Number(b.planned_amount || 0), 0), [budgets]);
  const totalActual = useMemo(() => budgets.reduce((sum, b) => sum + Number(b.actual_amount || 0), 0), [budgets]);
  const totalDifference = useMemo(() => totalPlanned - totalActual, [totalActual, totalPlanned]);

  const heroTotalPlanned = useMemo(
    () => heroBudgetItems.reduce((sum, b) => sum + Number(b.planned_amount || 0), 0),
    [heroBudgetItems]
  );
  const heroTotalActual = useMemo(
    () => heroBudgetItems.reduce((sum, b) => sum + Number(b.actual_amount || 0), 0),
    [heroBudgetItems]
  );

  return {
    budgets,
    heroBudgetItems,
    heroSummaryMonth: heroMonthKey,
    heroTotalPlanned,
    heroTotalActual,
    loading,
    totalPlanned,
    totalActual,
    totalDifference,
    saveBudget,
    copyFromPreviousMonth,
    getSuggestions,
    refreshBudgets: fetchBudgets,
  };
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getPreviousMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  return `${prev.y}-${String(prev.m).padStart(2, '0')}`;
}

function getLast3Months(month: string) {
  const out = [month];
  let cur = month;
  for (let i = 0; i < 2; i++) {
    cur = getPreviousMonth(cur);
    out.push(cur);
  }
  return out;
}
