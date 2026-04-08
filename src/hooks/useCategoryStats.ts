import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  mergeCategoryUsageFromRows,
  mergeCategoryUsageWithAuxiliaryCounts,
  type CategoryUsageRow,
} from '@/utils/categorization/merge-category-usage';

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  transactionCount: number;
  totalAmount: number;
  payableBillsCount: number;
  financialGoalsCount: number;
  legacyBudgetsCount: number;
}

function countRowsByCategoryId(rows: { category_id: string | null }[] | null): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows || []) {
    if (row.category_id == null || row.category_id === '') continue;
    const id = row.category_id;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export function useCategoryStats() {
  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStats([]);
        return;
      }

      const bankPromise = supabase
        .from('transactions')
        .select(`
          category_id,
          amount,
          categories(name)
        `)
        .eq('user_id', user.id);

      const cardPromise = supabase
        .from('credit_card_transactions')
        .select(`
          category_id,
          amount,
          categories(name)
        `)
        .eq('user_id', user.id);

      const billsPromise = supabase
        .from('payable_bills')
        .select('category_id')
        .eq('user_id', user.id)
        .not('category_id', 'is', null);

      const goalsPromise = supabase
        .from('financial_goals')
        .select('category_id')
        .eq('user_id', user.id)
        .not('category_id', 'is', null);

      const budgetsPromise = supabase
        .from('budgets')
        .select('category_id')
        .eq('user_id', user.id)
        .not('category_id', 'is', null);

      const [bankResult, cardResult, billsResult, goalsResult, budgetsResult] = await Promise.all([
        bankPromise,
        cardPromise,
        billsPromise,
        goalsPromise,
        budgetsPromise,
      ]);

      if (bankResult.error) throw bankResult.error;
      if (cardResult.error) throw cardResult.error;
      if (billsResult.error) throw billsResult.error;
      if (goalsResult.error) throw goalsResult.error;

      let legacyBudgetRows: { category_id: string | null }[] = [];
      if (budgetsResult.error) {
        console.warn('Estatísticas: não foi possível carregar orçamentos legados (budgets):', budgetsResult.error);
      } else {
        legacyBudgetRows = (budgetsResult.data || []) as { category_id: string | null }[];
      }

      const normalize = (raw: unknown): CategoryUsageRow[] => {
        if (!Array.isArray(raw)) return [];
        return raw.map((row: any) => {
          const cat = row.categories;
          const categoryObj =
            Array.isArray(cat) ? cat[0] : cat;
          return {
            category_id: row.category_id,
            amount: row.amount,
            categories:
              categoryObj && typeof categoryObj.name === 'string'
                ? { name: categoryObj.name }
                : null,
          };
        });
      };

      const bankRows = normalize(bankResult.data);
      const cardRows = normalize(cardResult.data);

      const merged = mergeCategoryUsageFromRows(bankRows, cardRows);
      const auxiliary = {
        payableBillsByCategoryId: countRowsByCategoryId(billsResult.data as { category_id: string | null }[]),
        financialGoalsByCategoryId: countRowsByCategoryId(goalsResult.data as { category_id: string | null }[]),
        legacyBudgetsByCategoryId: countRowsByCategoryId(legacyBudgetRows),
      };

      setStats(mergeCategoryUsageWithAuxiliaryCounts(merged, auxiliary));
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refetch: fetchStats };
}
