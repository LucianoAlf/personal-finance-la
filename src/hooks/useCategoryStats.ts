import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  transactionCount: number;
  totalAmount: number;
}

export function useCategoryStats() {
  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('credit_card_transactions')
        .select(`
          category_id,
          amount,
          categories(name)
        `);

      if (error) throw error;

      // Agrupar por categoria
      const statsMap = new Map<string, CategoryStats>();

      data?.forEach((transaction: any) => {
        const categoryId = transaction.category_id;
        const categoryName = transaction.categories?.name || 'Sem Categoria';

        if (!statsMap.has(categoryId)) {
          statsMap.set(categoryId, {
            categoryId,
            categoryName,
            transactionCount: 0,
            totalAmount: 0,
          });
        }

        const stat = statsMap.get(categoryId)!;
        stat.transactionCount++;
        stat.totalAmount += transaction.amount;
      });

      setStats(Array.from(statsMap.values()));
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
