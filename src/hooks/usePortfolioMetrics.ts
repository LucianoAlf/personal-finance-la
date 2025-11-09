import { useMemo } from 'react';
import type { Investment } from '@/types/database.types';

interface AllocationItem {
  category: string;
  value: number;
  percentage: number;
  count: number;
}

interface PortfolioMetrics {
  totalInvested: number;
  currentValue: number;
  totalReturn: number;
  returnPercentage: number;
  allocation: Record<string, AllocationItem>;
  count: number;
  byType: Record<string, { value: number; count: number }>;
  byCategory: Record<string, { value: number; count: number }>;
}

export function usePortfolioMetrics(investments: Investment[]): PortfolioMetrics {
  const metrics = useMemo(() => {
    // Totals
    const totalInvested = investments.reduce(
      (sum, inv) => sum + (inv.total_invested || 0),
      0
    );

    const currentValue = investments.reduce(
      (sum, inv) => sum + (inv.current_value || inv.total_invested || 0),
      0
    );

    const totalReturn = currentValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    // Allocation by category
    const allocation: Record<string, AllocationItem> = {};

    investments.forEach((inv) => {
      const category = inv.category || 'outros';
      const value = inv.current_value || inv.total_invested || 0;

      if (!allocation[category]) {
        allocation[category] = {
          category,
          value: 0,
          percentage: 0,
          count: 0,
        };
      }

      allocation[category].value += value;
      allocation[category].count += 1;
    });

    // Calculate percentages
    Object.keys(allocation).forEach((key) => {
      allocation[key].percentage = currentValue > 0
        ? (allocation[key].value / currentValue) * 100
        : 0;
    });

    // By Type
    const byType: Record<string, { value: number; count: number }> = {};

    investments.forEach((inv) => {
      const type = inv.type;
      const value = inv.current_value || inv.total_invested || 0;

      if (!byType[type]) {
        byType[type] = { value: 0, count: 0 };
      }

      byType[type].value += value;
      byType[type].count += 1;
    });

    // By Category
    const byCategory: Record<string, { value: number; count: number }> = {};

    investments.forEach((inv) => {
      const category = inv.category || 'outros';
      const value = inv.current_value || inv.total_invested || 0;

      if (!byCategory[category]) {
        byCategory[category] = { value: 0, count: 0 };
      }

      byCategory[category].value += value;
      byCategory[category].count += 1;
    });

    return {
      totalInvested,
      currentValue,
      totalReturn,
      returnPercentage,
      allocation,
      count: investments.length,
      byType,
      byCategory,
    };
  }, [investments]);

  return metrics;
}

// Helper functions for formatting
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    renda_fixa: 'Renda Fixa',
    acoes_nacionais: 'Ações Nacionais',
    fiis: 'Fundos Imobiliários',
    internacional: 'Internacional',
    cripto: 'Criptomoedas',
    previdencia: 'Previdência',
    outros: 'Outros',
  };
  return labels[category] || category;
}

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    stock: 'Ação',
    fund: 'Fundo',
    crypto: 'Criptomoeda',
    treasury: 'Tesouro Direto',
    real_estate: 'FII',
    other: 'Outro',
  };
  return labels[type] || type;
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    renda_fixa: '#10b981', // green-500
    acoes_nacionais: '#3b82f6', // blue-500
    fiis: '#f59e0b', // amber-500
    internacional: '#8b5cf6', // purple-500
    cripto: '#ec4899', // pink-500
    previdencia: '#6366f1', // indigo-500
    outros: '#6b7280', // gray-500
  };
  return colors[category] || '#6b7280';
}
