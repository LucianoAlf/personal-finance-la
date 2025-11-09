// SPRINT 5: Hook para calcular retornos mensais do portfólio (últimos 12 meses)
import { useMemo } from 'react';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { useInvestmentTransactions } from './useInvestmentTransactions';
import type { InvestmentTransaction } from '@/types/database.types';

export interface MonthlyReturn {
  date: Date;
  month: string; // "Jan/25"
  return: number; // Retorno percentual do mês
  value: number; // Valor do portfólio no final do mês
  invested: number; // Total investido até o final do mês
  gain: number; // Ganho absoluto do mês
}

/**
 * Calcula o valor do portfólio em uma data específica
 * baseado no histórico de transações
 */
function calculatePortfolioValue(
  transactions: InvestmentTransaction[],
  targetDate: Date
): { value: number; invested: number } {
  // Filtrar transações até a data alvo
  const relevantTransactions = transactions.filter(
    (t) => new Date(t.transaction_date) <= targetDate
  );

  let totalInvested = 0;
  let currentValue = 0;

  // Agrupar por investment_id
  const byInvestment: Record<
    string,
    { invested: number; quantity: number; purchases: number }
  > = {};

  relevantTransactions.forEach((t) => {
    if (!byInvestment[t.investment_id]) {
      byInvestment[t.investment_id] = { invested: 0, quantity: 0, purchases: 0 };
    }

    const inv = byInvestment[t.investment_id];

    switch (t.transaction_type) {
      case 'buy':
        inv.invested += t.total_value;
        inv.quantity += t.quantity || 0;
        inv.purchases++;
        totalInvested += t.total_value;
        break;

      case 'sell':
        // Ao vender, reduzir proporcionalmente o investido
        const avgPrice = inv.quantity > 0 ? inv.invested / inv.quantity : 0;
        const soldValue = avgPrice * (t.quantity || 0);
        inv.invested -= soldValue;
        inv.quantity -= t.quantity || 0;
        totalInvested -= soldValue;
        break;

      case 'dividend':
        // Dividendos não afetam o total investido, mas aumentam o valor atual
        currentValue += t.total_value;
        break;
    }
  });

  // Calcular valor atual baseado no preço médio de compra
  // (simulação - na prática, usaríamos preços históricos reais)
  Object.values(byInvestment).forEach((inv) => {
    if (inv.quantity > 0) {
      const avgPrice = inv.invested / inv.quantity;
      currentValue += inv.quantity * avgPrice;
    }
  });

  return {
    value: currentValue,
    invested: totalInvested,
  };
}

/**
 * Hook para calcular retornos mensais do portfólio
 * nos últimos 12 meses
 */
export function useMonthlyReturns(): MonthlyReturn[] {
  const { transactions } = useInvestmentTransactions();

  return useMemo(() => {
    const monthlyData: MonthlyReturn[] = [];
    const now = new Date();

    // Últimos 12 meses (de 11 meses atrás até mês atual)
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));

      // Calcular valor no início e fim do mês
      const startData = calculatePortfolioValue(transactions, monthStart);
      const endData = calculatePortfolioValue(transactions, monthEnd);

      // Calcular retorno percentual do mês
      const returnPct =
        startData.value > 0 ? ((endData.value - startData.value) / startData.value) * 100 : 0;

      const gain = endData.value - startData.value;

      monthlyData.push({
        date: monthStart,
        month: format(monthStart, 'MMM/yy'),
        return: returnPct,
        value: endData.value,
        invested: endData.invested,
        gain,
      });
    }

    return monthlyData;
  }, [transactions]);
}

/**
 * Hook para calcular retorno acumulado em um período
 */
export function usePortfolioReturn(
  period: '1M' | '3M' | '6M' | '1Y' = '1Y'
): number {
  const monthlyReturns = useMonthlyReturns();

  const monthsMap = {
    '1M': 1,
    '3M': 3,
    '6M': 6,
    '1Y': 12,
  };

  const months = monthsMap[period];
  const relevantMonths = monthlyReturns.slice(-months);

  if (relevantMonths.length === 0) return 0;

  // Pegar valor inicial e final
  const initialValue = relevantMonths[0].invested;
  const finalValue = relevantMonths[relevantMonths.length - 1].value;

  if (initialValue === 0) return 0;

  return ((finalValue - initialValue) / initialValue) * 100;
}
