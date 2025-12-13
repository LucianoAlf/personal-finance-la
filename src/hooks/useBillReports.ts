import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =====================================================
// TIPOS
// =====================================================

export interface MonthlyTotal {
  month: string;
  month_name: string;
  total: number;
  paid: number;
  pending: number;
  count: number;
}

export interface TopProvider {
  provider: string;
  count: number;
  total: number;
  avg: number;
}

export interface TypeDistribution {
  [key: string]: {
    count: number;
    total: number;
    percentage: number;
  };
}

export interface Comparison {
  previous_total: number;
  current_total: number;
  difference: number;
  variation_percent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PotentialSavings {
  overdue_bills_count: number;
  estimated_fines: number;
  estimated_interest: number;
  total_potential_savings: number;
  message: string;
}

export interface TopIncrease {
  description: string;
  provider: string | null;
  bill_type: string;
  current_amount: number;
  previous_amount: number;
  difference: number;
  variation_percent: number;
}

export interface BiggestExpense {
  description: string;
  provider: string | null;
  amount: number;
  bill_type: string;
  percentage_of_total: number;
}

export interface BillReportsData {
  period: {
    start_date: string;
    end_date: string;
    previous_start_date: string;
    previous_end_date: string;
  };
  totals: {
    total_bills: number;
    paid_count: number;
    overdue_count: number;
    pending_count: number;
    total_amount: number;
    paid_amount: number;
    overdue_amount: number;
    pending_amount: number;
    avg_amount: number;
  };
  comparison: Comparison;
  performance: {
    on_time_payment_rate: number;
    avg_delay_days: number;
    max_delay_days: number;
    paid_on_time_count: number;
    paid_late_count: number;
  };
  potential_savings: PotentialSavings;
  monthly_totals: MonthlyTotal[];
  forecast: {
    next_month_prediction: number;
    based_on_months: number;
  };
  top_providers: TopProvider[];
  by_type: TypeDistribution;
  top_increases: TopIncrease[];
  biggest_expense: BiggestExpense;
}

export type PeriodPreset = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'last_12_months' | 'this_year' | 'custom';

export interface UseBillReportsReturn {
  data: BillReportsData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  periodPreset: PeriodPreset;
  setPeriodPreset: (preset: PeriodPreset) => void;
  customDateRange: { start: Date; end: Date } | null;
  setCustomDateRange: (range: { start: Date; end: Date }) => void;
  periodLabel: string;
}

// =====================================================
// LABELS
// =====================================================

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  this_month: 'Este mês',
  last_month: 'Mês passado',
  last_3_months: 'Últimos 3 meses',
  last_6_months: 'Últimos 6 meses',
  last_12_months: 'Últimos 12 meses',
  this_year: 'Este ano',
  custom: 'Personalizado'
};

export const BILL_TYPE_LABELS: Record<string, string> = {
  service: 'Serviços',
  telecom: 'Telecom',
  subscription: 'Assinaturas',
  utilities: 'Utilidades',
  tax: 'Impostos',
  rent: 'Aluguel',
  loan: 'Empréstimos',
  installment: 'Parcelamentos',
  insurance: 'Seguros',
  education: 'Educação',
  health: 'Saúde',
  housing: 'Moradia',
  transport: 'Transporte',
  food: 'Alimentação',
  entertainment: 'Lazer',
  other: 'Outros'
};

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useBillReports(): UseBillReportsReturn {
  const { user } = useAuth();
  const [data, setData] = useState<BillReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);

  // Calcular datas baseado no preset
  const dateRange = useMemo(() => {
    const now = new Date();
    
    switch (periodPreset) {
      case 'this_month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case 'last_3_months':
        return {
          start: subMonths(now, 3),
          end: now
        };
      case 'last_6_months':
        return {
          start: subMonths(now, 6),
          end: now
        };
      case 'last_12_months':
        return {
          start: subMonths(now, 12),
          end: now
        };
      case 'this_year':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: now
        };
      case 'custom':
        return customDateRange || {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  }, [periodPreset, customDateRange]);

  // Label do período
  const periodLabel = useMemo(() => {
    if (periodPreset === 'custom' && customDateRange) {
      return `${format(customDateRange.start, 'dd/MM/yyyy')} - ${format(customDateRange.end, 'dd/MM/yyyy')}`;
    }
    
    if (periodPreset === 'this_month') {
      return format(new Date(), 'MMMM yyyy', { locale: ptBR });
    }
    
    if (periodPreset === 'last_month') {
      return format(subMonths(new Date(), 1), 'MMMM yyyy', { locale: ptBR });
    }
    
    return PERIOD_LABELS[periodPreset];
  }, [periodPreset, customDateRange]);

  // Buscar dados
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const startDateStr = format(dateRange.start, 'yyyy-MM-dd');
      const endDateStr = format(dateRange.end, 'yyyy-MM-dd');

      const { data: result, error: fetchError } = await supabase.rpc('get_bill_analytics', {
        p_user_id: user.id,
        p_start_date: startDateStr,
        p_end_date: endDateStr
      });

      if (fetchError) throw fetchError;

      setData(result as BillReportsData);
    } catch (err: any) {
      console.error('Erro ao buscar relatórios:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, dateRange]);

  // Buscar ao montar e quando período mudar
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange,
    periodLabel
  };
}

// =====================================================
// UTILITÁRIOS
// =====================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'text-red-600'; // Gasto subindo é ruim
    case 'down':
      return 'text-green-600'; // Gasto descendo é bom
    default:
      return 'text-gray-600';
  }
}

export function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    default:
      return '→';
  }
}

export function getBillTypeLabel(type: string): string {
  return BILL_TYPE_LABELS[type] || type;
}
