import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths } from 'date-fns';

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

export interface BillAnalytics {
  period: {
    start_date: string;
    end_date: string;
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
  performance: {
    on_time_payment_rate: number;
    avg_delay_days: number;
    max_delay_days: number;
  };
  monthly_totals: MonthlyTotal[];
  forecast: {
    next_month_prediction: number;
    based_on_months: number;
  };
  top_providers: TopProvider[];
  by_type: TypeDistribution;
}

export interface UseBillAnalyticsReturn {
  analytics: BillAnalytics | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  setDateRange: (startDate: Date, endDate: Date) => void;
}

export function useBillAnalytics(): UseBillAnalyticsReturn {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<BillAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Default: últimos 12 meses
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 12));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      const { data, error: fetchError } = await supabase.rpc('get_bill_analytics', {
        p_user_id: user.id,
        p_start_date: startDateStr,
        p_end_date: endDateStr
      });

      if (fetchError) throw fetchError;

      setAnalytics(data as BillAnalytics);
    } catch (err: any) {
      console.error('Erro ao buscar analytics:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const setDateRange = useCallback((newStartDate: Date, newEndDate: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }, []);

  return {
    analytics,
    loading,
    error,
    refresh: fetchAnalytics,
    setDateRange
  };
}
