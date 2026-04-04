import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface RecurringTrendData {
  parent_recurring_id: string;
  description: string;
  provider_name: string;
  month: string;
  avg_amount: number;
  min_amount: number;
  max_amount: number;
  stddev_amount: number;
  occurrences_count: number;
  variation_percent: number;
  previous_month_amount: number | null;
}

export interface VariationAlert {
  bill_id: string;
  description: string;
  provider_name: string;
  current_amount: number;
  previous_amount: number;
  variation_percent: number;
  severity: 'warning' | 'danger';
  month: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
  }[];
}

export interface UseRecurringTrendReturn {
  trendData: RecurringTrendData[];
  alerts: VariationAlert[];
  chartData: ChartData;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const CHART_COLORS = [
  { border: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.1)' },   // Vermelho
  { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.1)' },  // Azul
  { border: 'rgb(34, 197, 94)', bg: 'rgba(34, 197, 94, 0.1)' },    // Verde
  { border: 'rgb(168, 85, 247)', bg: 'rgba(168, 85, 247, 0.1)' },  // Roxo
  { border: 'rgb(249, 115, 22)', bg: 'rgba(249, 115, 22, 0.1)' },  // Laranja
];

export function useRecurringTrend(): UseRecurringTrendReturn {
  const { user } = useAuth();
  const [trendData, setTrendData] = useState<RecurringTrendData[]>([]);
  const [alerts, setAlerts] = useState<VariationAlert[]>([]);
  const [chartData, setChartData] = useState<ChartData>({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTrendData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Buscar dados da view
      const { data, error: fetchError } = await supabase
        .from('v_recurring_bills_trend')
        .select('*')
        .order('month', { ascending: false })
        .limit(60); // Últimos 12 meses * 5 contas máx

      if (fetchError) throw fetchError;

      const typedData = data as RecurringTrendData[];
      setTrendData(typedData);

      // Detectar alertas (variação > 15%)
      const detectedAlerts: VariationAlert[] = typedData
        .filter(item => 
          Math.abs(item.variation_percent) >= 15 && 
          item.previous_month_amount !== null
        )
        .slice(0, 5) // Máximo 5 alertas
        .map(item => ({
          bill_id: item.parent_recurring_id,
          description: item.description,
          provider_name: item.provider_name,
          current_amount: item.avg_amount,
          previous_amount: item.previous_month_amount!,
          variation_percent: item.variation_percent,
          severity: Math.abs(item.variation_percent) >= 30 ? 'danger' : 'warning',
          month: format(parseISO(item.month), 'MMMM/yyyy', { locale: ptBR })
        }));

      setAlerts(detectedAlerts);

      // Transformar em formato Chart.js
      const groupedByBill = typedData.reduce((acc, item) => {
        if (!acc[item.parent_recurring_id]) {
          acc[item.parent_recurring_id] = {
            description: item.description,
            data: []
          };
        }
        acc[item.parent_recurring_id].data.push({
          month: item.month,
          amount: item.avg_amount
        });
        return acc;
      }, {} as Record<string, { description: string; data: { month: string; amount: number }[] }>);

      // Pegar até 5 contas com mais dados
      const topBills = Object.entries(groupedByBill)
        .sort((a, b) => b[1].data.length - a[1].data.length)
        .slice(0, 5);

      // Gerar labels (últimos 12 meses)
      const allMonths = [...new Set(typedData.map(d => d.month))]
        .sort()
        .slice(-12)
        .map(m => format(parseISO(m), 'MMM/yy', { locale: ptBR }));

      // Criar datasets
      const datasets = topBills.map(([billId, bill], index) => {
        const color = CHART_COLORS[index % CHART_COLORS.length];
        
        // Mapear dados para os meses
        const dataMap = new Map(
          bill.data.map(d => [format(parseISO(d.month), 'MMM/yy', { locale: ptBR }), d.amount])
        );
        
        const data = allMonths.map(month => dataMap.get(month) || null);

        return {
          label: bill.description,
          data: data as number[],
          borderColor: color.border,
          backgroundColor: color.bg,
          tension: 0.4,
          fill: true
        };
      });

      setChartData({
        labels: allMonths,
        datasets
      });

    } catch (err) {
      console.error('Erro ao buscar trend:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTrendData();
    
    // Refresh automático a cada 5 minutos
    const interval = setInterval(fetchTrendData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchTrendData]);

  return {
    trendData,
    alerts,
    chartData,
    loading,
    error,
    refresh: fetchTrendData
  };
}
