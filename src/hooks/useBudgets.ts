import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCategories } from './useCategories';
import { useTransactions } from './useTransactions';

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

export function useBudgets(month: string = getCurrentMonth()) {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { categories } = useCategories();
  const { transactions } = useTransactions();

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('month', month);

      if (error) throw error;
      const rows = (data || []) as DBBudget[];

      const enriched: BudgetItem[] = rows.map((b) => {
        const category = categories.find((c) => c.id === b.category_id);
        const actual = transactions
          .filter(
            (t) =>
              t.category_id === b.category_id &&
              t.type === 'expense' &&
              t.is_paid &&
              new Date(t.transaction_date as any).toISOString().slice(0, 7) === month
          )
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const percentage = b.planned_amount > 0 ? (actual / b.planned_amount) * 100 : 0;
        const status: BudgetItem['status'] = percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok';

        return {
          id: b.id,
          category_id: b.category_id,
          category_name: category?.name || 'Sem categoria',
          category_icon: category?.icon || '📦',
          category_color: category?.color || 'gray',
          planned_amount: Number(b.planned_amount || 0),
          actual_amount: Number(actual || 0),
          difference: Number(actual || 0) - Number(b.planned_amount || 0),
          percentage,
          status,
          notes: b.notes,
          month: b.month,
        };
      });

      setBudgets(enriched);
    } catch (err) {
      console.error('Erro ao buscar budgets:', err);
    } finally {
      setLoading(false);
    }
  }, [month, categories, transactions]);

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

  return {
    budgets,
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
