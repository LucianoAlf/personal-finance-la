// SPRINT 5.1: Hook para buscar histórico de snapshots do portfólio
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { subDays } from 'date-fns';

export interface PortfolioSnapshot {
  id: string;
  snapshot_date: string;
  total_invested: number;
  current_value: number;
  return_amount: number;
  return_percentage: number;
  allocation: Record<string, number>;
  top_performers: Array<{ ticker: string; return: number }>;
  dividends_ytd: number;
  dividend_yield: number;
}

export function usePortfolioHistory(days: number = 365) {
  const [history, setHistory] = useState<PortfolioSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setError(null);

      try {
        const startDate = subDays(new Date(), days).toISOString().split('T')[0];

        const { data, error: fetchError } = await supabase
          .from('portfolio_snapshots')
          .select('*')
          .gte('snapshot_date', startDate)
          .order('snapshot_date', { ascending: true });

        if (fetchError) throw fetchError;

        setHistory(data || []);
      } catch (err) {
        console.error('Erro ao buscar histórico:', err);
        setError('Falha ao carregar histórico do portfólio');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [days]);

  return { history, loading, error };
}
