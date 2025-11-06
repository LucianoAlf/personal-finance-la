import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface TopCategory {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  totalAmount: number;
  transactionCount: number;
  percentageOfTotal: number;
  changeFromLastMonth: number;
}

interface TopMerchant {
  merchantName: string;
  totalAmount: number;
  transactionCount: number;
  averageTicket: number;
  lastPurchaseDate: string;
  categoryName: string;
  categoryColor: string;
}

interface TopSpendingData {
  topCategories: TopCategory[];
  topMerchants: TopMerchant[];
  totalSpent: number;
}

export function useTopSpending(month?: Date) {
  const { user } = useAuth();
  const [data, setData] = useState<TopSpendingData>({
    topCategories: [],
    topMerchants: [],
    totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    fetchTopSpending();
  }, [user, month]);

  const fetchTopSpending = async () => {
    try {
      setLoading(true);
      setError(null);

      const targetMonth = month || new Date();
      const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59);

      // Buscar transações do mês com categorias
      const { data: transactions, error: txError } = await supabase
        .from('credit_card_transactions')
        .select(`
          id,
          description,
          amount,
          created_at,
          category_id,
          categories (
            id,
            name,
            color,
            icon
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (txError) throw txError;

      // Calcular total gasto
      const totalSpent = transactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;

      // Agrupar por categoria
      const categoryMap = new Map<string, {
        categoryId: string;
        categoryName: string;
        categoryColor: string;
        categoryIcon: string;
        totalAmount: number;
        transactionCount: number;
      }>();

      transactions?.forEach(tx => {
        if (!tx.categories || Array.isArray(tx.categories)) return;

        const category = tx.categories as { id: string; name: string; color: string; icon: string };
        const key = tx.category_id;
        const existing = categoryMap.get(key);

        if (existing) {
          existing.totalAmount += tx.amount;
          existing.transactionCount += 1;
        } else {
          categoryMap.set(key, {
            categoryId: tx.category_id,
            categoryName: category.name,
            categoryColor: category.color,
            categoryIcon: category.icon || 'Tag',
            totalAmount: tx.amount,
            transactionCount: 1,
          });
        }
      });

      // Converter para array e calcular percentuais
      const topCategories: TopCategory[] = Array.from(categoryMap.values())
        .map(cat => ({
          ...cat,
          percentageOfTotal: totalSpent > 0 ? (cat.totalAmount / totalSpent) * 100 : 0,
          changeFromLastMonth: 0, // TODO: calcular comparação com mês anterior
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);

      // Agrupar por estabelecimento (descrição)
      const merchantMap = new Map<string, {
        merchantName: string;
        totalAmount: number;
        transactionCount: number;
        lastPurchaseDate: string;
        categoryName: string;
        categoryColor: string;
      }>();

      transactions?.forEach(tx => {
        // Extrair nome do estabelecimento (primeira parte da descrição)
        const merchantName = tx.description.split('-')[0].trim();
        const existing = merchantMap.get(merchantName);
        const category = (!tx.categories || Array.isArray(tx.categories)) 
          ? null 
          : tx.categories as { id: string; name: string; color: string; icon: string };

        if (existing) {
          existing.totalAmount += tx.amount;
          existing.transactionCount += 1;
          if (new Date(tx.created_at) > new Date(existing.lastPurchaseDate)) {
            existing.lastPurchaseDate = tx.created_at;
          }
        } else {
          merchantMap.set(merchantName, {
            merchantName,
            totalAmount: tx.amount,
            transactionCount: 1,
            lastPurchaseDate: tx.created_at,
            categoryName: category?.name || 'Outros',
            categoryColor: category?.color || '#6B7280',
          });
        }
      });

      // Converter para array e calcular ticket médio
      const topMerchants: TopMerchant[] = Array.from(merchantMap.values())
        .map(merchant => ({
          ...merchant,
          averageTicket: merchant.totalAmount / merchant.transactionCount,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);

      setData({
        topCategories,
        topMerchants,
        totalSpent,
      });
    } catch (err) {
      console.error('Erro ao buscar top spending:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados');
    } finally {
      setLoading(false);
    }
  };

  return {
    ...data,
    loading,
    error,
    refetch: fetchTopSpending,
  };
}
