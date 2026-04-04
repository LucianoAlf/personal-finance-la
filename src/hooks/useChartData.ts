import { useMemo } from 'react';
import { AnalyticsData } from './useAnalytics';
import { parseDateOnlyAsLocal } from '@/utils/dateOnly';

export interface PieChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface TimelineData {
  date: string;
  amount: number;
  accumulated: number;
}

export interface ComparisonData {
  month: string;
  total: number;
  cards: { [cardName: string]: number };
}

export function useChartData(analyticsData: AnalyticsData | null) {
  const pieData = useMemo((): PieChartData[] => {
    if (!analyticsData?.currentMonth?.categoryBreakdown) return [];

    const categories = analyticsData.currentMonth.categoryBreakdown;
    const total = analyticsData.currentMonth.totalSpent;

    if (!categories || categories.length === 0 || total === 0) return [];

    // Filtrar categorias com pelo menos 5% do total
    const significantCategories = categories.filter(cat => (cat.amount / total) * 100 >= 5);
    const others = categories.filter(cat => (cat.amount / total) * 100 < 5);
    const othersTotal = others.reduce((sum, cat) => sum + cat.amount, 0);

    const result = significantCategories.map(cat => ({
      name: cat.category,
      value: cat.amount,
      color: cat.color || '#8b5cf6',
      percentage: (cat.amount / total) * 100,
    }));

    // Adicionar "Outros" se houver
    if (othersTotal > 0) {
      result.push({
        name: 'Outros',
        value: othersTotal,
        color: '#94a3b8',
        percentage: (othersTotal / total) * 100,
      });
    }

    return result.sort((a, b) => b.value - a.value);
  }, [analyticsData]);

  const timelineData = useMemo((): TimelineData[] => {
    const transactions = analyticsData?.currentMonth?.transactions;
    if (!transactions || transactions.length === 0) return [];

    const dailyMap = new Map<string, number>();

    transactions.forEach((transaction) => {
      const dateKey = parseDateOnlyAsLocal(transaction.purchaseDate).toISOString().slice(0, 10);
      const existing = dailyMap.get(dateKey) || 0;
      dailyMap.set(dateKey, existing + transaction.amount);
    });

    // Converter para array e calcular acumulado
    let accumulated = 0;
    const result: TimelineData[] = [];

    Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, amount]) => {
        accumulated += amount;
        result.push({
          date,
          amount: Math.round(amount * 100) / 100,
          accumulated: Math.round(accumulated * 100) / 100,
        });
      });

    return result;
  }, [analyticsData]);

  const comparisonData = useMemo((): ComparisonData[] => {
    if (!analyticsData?.last6Months) return [];

    const months = analyticsData.last6Months;
    if (!months || months.length === 0) return [];

    return months.map(month => {
      const cards: { [cardName: string]: number } = {};
      
      if (month.cardBreakdown) {
        month.cardBreakdown.forEach(card => {
          cards[card.cardName] = card.amount;
        });
      }

      return {
        month: month.month,
        total: month.totalSpent,
        cards,
      };
    });
  }, [analyticsData]);

  return {
    pieData,
    timelineData,
    comparisonData,
  };
}
