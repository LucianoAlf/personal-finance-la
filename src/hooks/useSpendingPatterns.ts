import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { parseDateOnlyAsLocal } from '@/utils/dateOnly';
import { AnalyticsScope } from './analyticsScope';

interface SpendingPatterns {
  dayOfWeek: string;
  dayOfWeekCount: number;
  preferredTime: string;
  preferredTimeCount: number;
  installmentPercentage: number;
  averageTicket: number;
}

interface TemporalData {
  // Matriz 7x3 (dias x períodos)
  heatmap: number[][];
  maxValue: number;
}

interface DayHourData {
  day: number;
  hour: number;
  count: number;
  total: number;
}

const DAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getTimeSlot(hour: number): number {
  if (hour >= 6 && hour < 12) return 0;  // Manhã
  if (hour >= 12 && hour < 18) return 1; // Tarde
  return 2; // Noite
}

function getTimeSlotLabel(slot: number): string {
  switch (slot) {
    case 0: return '6h - 12h';
    case 1: return '12h - 18h';
    case 2: return '18h - 6h';
    default: return '';
  }
}

function getTransactionDateTime(tx: { purchase_date?: string; created_at?: string }): Date {
  const localPurchaseDate = tx.purchase_date ? parseDateOnlyAsLocal(tx.purchase_date) : new Date();

  if (!tx.created_at) {
    return localPurchaseDate;
  }

  const createdAt = new Date(tx.created_at);

  return new Date(
    localPurchaseDate.getFullYear(),
    localPurchaseDate.getMonth(),
    localPurchaseDate.getDate(),
    createdAt.getHours(),
    createdAt.getMinutes(),
    createdAt.getSeconds(),
    createdAt.getMilliseconds()
  );
}

export function useSpendingPatterns(scope?: AnalyticsScope) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        const hasExplicitAll = scope !== undefined && scope?.startDate === null;
        const rangeStart = scope?.startDate ? new Date(scope.startDate) : new Date();
        if (!scope?.startDate && !hasExplicitAll) {
          rangeStart.setDate(rangeStart.getDate() - 90);
        }

        const rangeEnd = scope?.endDate ? new Date(scope.endDate) : new Date();

        let query = supabase
          .from('credit_card_transactions')
          .select('id, purchase_date, amount, is_installment, total_installments, installment_group_id, created_at')
          .eq('user_id', user.id)
          .order('purchase_date', { ascending: false });

        if (!hasExplicitAll) {
          query = query
            .gte('purchase_date', rangeStart.toISOString().split('T')[0])
            .lte('purchase_date', rangeEnd.toISOString().split('T')[0]);
        }

        if (scope?.cardId) {
          query = query.eq('credit_card_id', scope.cardId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setTransactions(data || []);
      } catch (err: any) {
        setError(err.message);
        console.error('Erro ao buscar transações:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user?.id, scope?.cardId, scope?.startDate?.getTime(), scope?.endDate?.getTime()]);

  // Calcular padrões de gasto
  const patterns = useMemo<SpendingPatterns>(() => {
    if (transactions.length === 0) {
      return {
        dayOfWeek: 'Sem dados',
        dayOfWeekCount: 0,
        preferredTime: 'Sem dados',
        preferredTimeCount: 0,
        installmentPercentage: 0,
        averageTicket: 0,
      };
    }

    // Contar por dia da semana
    const dayCount: Record<number, number> = {};
    const timeSlotCount: Record<number, number> = {};
    let installmentCount = 0;
    let totalAmount = 0;

    transactions.forEach((tx) => {
      const date = getTransactionDateTime(tx);
      const day = date.getDay();
      const hour = date.getHours();
      const slot = getTimeSlot(hour);

      dayCount[day] = (dayCount[day] || 0) + 1;
      timeSlotCount[slot] = (timeSlotCount[slot] || 0) + 1;

      if (tx.is_installment || (tx.total_installments && tx.total_installments > 1) || tx.installment_group_id) {
        installmentCount++;
      }
      totalAmount += tx.amount;
    });

    // Encontrar dia com mais compras
    let maxDay = 0;
    let maxDayCount = 0;
    Object.entries(dayCount).forEach(([day, count]) => {
      if (count > maxDayCount) {
        maxDay = parseInt(day);
        maxDayCount = count;
      }
    });

    // Encontrar período com mais compras
    let maxSlot = 0;
    let maxSlotCount = 0;
    Object.entries(timeSlotCount).forEach(([slot, count]) => {
      if (count > maxSlotCount) {
        maxSlot = parseInt(slot);
        maxSlotCount = count;
      }
    });

    return {
      dayOfWeek: DAYS_PT[maxDay],
      dayOfWeekCount: maxDayCount,
      preferredTime: getTimeSlotLabel(maxSlot),
      preferredTimeCount: maxSlotCount,
      installmentPercentage: Math.round((installmentCount / transactions.length) * 100),
      averageTicket: totalAmount / transactions.length,
    };
  }, [transactions]);

  // Calcular dados temporais para heatmap
  const temporalData = useMemo<TemporalData>(() => {
    // Matriz 7 dias x 3 períodos
    const heatmap: number[][] = Array(7).fill(null).map(() => Array(3).fill(0));
    let maxValue = 0;

    transactions.forEach((tx) => {
      const date = getTransactionDateTime(tx);
      const day = date.getDay();
      const hour = date.getHours();
      const slot = getTimeSlot(hour);

      heatmap[day][slot] += tx.amount;
      if (heatmap[day][slot] > maxValue) {
        maxValue = heatmap[day][slot];
      }
    });

    // Normalizar para 0-100
    if (maxValue > 0) {
      for (let d = 0; d < 7; d++) {
        for (let s = 0; s < 3; s++) {
          heatmap[d][s] = Math.round((heatmap[d][s] / maxValue) * 100);
        }
      }
    }

    return { heatmap, maxValue };
  }, [transactions]);

  // Gerar insight baseado nos dados
  const insight = useMemo<string>(() => {
    if (transactions.length === 0) {
      return 'Adicione transações para ver insights sobre seus padrões de gasto.';
    }

    const insights: string[] = [];

    // Insight sobre dia da semana
    if (patterns.dayOfWeekCount > 5) {
      insights.push(
        `Você gasta mais às ${patterns.dayOfWeek}s (${patterns.dayOfWeekCount} compras). Considere revisar compras nesse dia.`
      );
    }

    // Insight sobre parcelamento
    if (patterns.installmentPercentage > 50) {
      insights.push(
        `${patterns.installmentPercentage}% das suas compras são parceladas. Cuidado com o comprometimento futuro do limite.`
      );
    } else if (patterns.installmentPercentage < 20) {
      insights.push(
        `Apenas ${patterns.installmentPercentage}% das compras são parceladas. Bom controle financeiro!`
      );
    }

    return insights.length > 0 
      ? insights[0] 
      : `Seu ticket médio é de R$ ${patterns.averageTicket.toFixed(2)}. Continue monitorando seus gastos!`;
  }, [transactions, patterns]);

  return {
    patterns,
    temporalData,
    insight,
    loading,
    error,
    transactionCount: transactions.length,
    daysShort: DAYS_SHORT,
  };
}
