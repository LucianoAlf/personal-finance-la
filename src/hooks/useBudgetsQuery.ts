import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * @deprecated Mantido apenas para compatibilidade temporária.
 * O dashboard e a página de metas devem ler `spending_limit` como fonte canônica.
 */

// ✅ Buscar orçamentos + calcular gastos do mês por categoria
const fetchBudgets = async (monthKey: string): Promise<any[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Budgets com categoria
  const { data: budgetsData, error } = await supabase
    .from('budgets')
    .select(`
      *,
      category:categories(id, name, icon, color)
    `)
    .eq('user_id', user.id)
    .eq('month', monthKey);

  if (error) throw error;
  const budgets = budgetsData || [];

  // Transações do mês (apenas despesas pagas)
  const start = `${monthKey}-01`;
  const endDate = new Date(start);
  endDate.setMonth(endDate.getMonth() + 1);
  const end = endDate.toISOString().slice(0, 10);

  const { data: txs, error: txErr } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .eq('is_paid', true)
    .gte('transaction_date', start)
    .lt('transaction_date', end);

  if (txErr) throw txErr;

  const spentByCategory = new Map<string, number>();
  (txs || []).forEach((t: any) => {
    const key = t.category_id;
    spentByCategory.set(key, (spentByCategory.get(key) || 0) + Number(t.amount || 0));
  });

  // Enriquecer budgets
  const enriched = budgets.map((b: any) => {
    const actual_amount = spentByCategory.get(b.category_id) || 0;
    const planned = Number(b.planned_amount || 0);
    const percentage = planned > 0 ? (actual_amount / planned) * 100 : 0;
    const status = percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok';
    return {
      ...b,
      actual_amount,
      percentage,
      status,
    };
  });

  return enriched;
};

// ✅ Hook com React Query (cache automático)
export const useBudgetsQuery = (monthKey: string) => {
  const query = useQuery({
    queryKey: ['budgets', monthKey],
    queryFn: () => fetchBudgets(monthKey),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const budgets = (query.data || []) as any[];
  const totalPlanned = budgets.reduce((sum, b) => sum + Number(b.planned_amount || 0), 0);
  const totalActual = budgets.reduce((sum, b) => sum + Number(b.actual_amount || 0), 0);
  const totalDifference = totalPlanned - totalActual;

  return {
    budgets,
    loading: query.isLoading,
    error: query.error,
    totalPlanned,
    totalActual,
    totalDifference,
    refetch: query.refetch,
  };
};
