// SPRINT 5: Geração de Relatórios de Investimentos
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Investment, InvestmentTransaction } from '@/types/database.types';
import { normalizeInvestmentCategory, toAllocationBucket } from '@/utils/investments/contracts';

export type ReportPeriod = 'monthly' | 'quarterly' | 'annual';

export interface InvestmentReport {
  period: {
    type: ReportPeriod;
    start: Date;
    end: Date;
    label: string;
  };
  summary: {
    totalInvested: number;
    currentValue: number;
    totalReturn: number;
    returnPercentage: number;
  };
  allocation: Record<string, { value: number; percentage: number }>;
  performance: {
    bestPerformer: { name: string; return: number } | null;
    worstPerformer: { name: string; return: number } | null;
    avgReturn: number;
  };
  dividends: {
    totalReceived: number;
    count: number;
    yieldOnCost: number;
  };
  transactions: {
    buys: InvestmentTransaction[];
    sells: InvestmentTransaction[];
    dividends: InvestmentTransaction[];
  };
  taxReport: {
    capitalGains: number;
    dividendsReceived: number;
    tradingProfit: number;
    swingTrade: number;
    dayTrade: number;
  };
}

/**
 * Calcula datas de início e fim baseadas no período
 */
function getPeriodDates(
  period: ReportPeriod,
  year: number,
  month?: number
): { start: Date; end: Date; label: string } {
  const now = new Date(year, month ? month - 1 : 0, 1);

  switch (period) {
    case 'monthly': {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return {
        start,
        end,
        label: format(start, 'MMMM/yyyy', { locale: ptBR }),
      };
    }
    case 'quarterly': {
      const start = startOfQuarter(now);
      const end = endOfQuarter(now);
      return {
        start,
        end,
        label: `Q${Math.floor((now.getMonth() + 3) / 3)}/${year}`,
      };
    }
    case 'annual': {
      const start = startOfYear(now);
      const end = endOfYear(now);
      return {
        start,
        end,
        label: `Ano ${year}`,
      };
    }
  }
}

/**
 * Gera relatório completo de investimentos
 */
export function generateInvestmentReport(
  investments: Investment[],
  transactions: InvestmentTransaction[],
  period: ReportPeriod,
  year: number,
  month?: number
): InvestmentReport {
  const { start, end, label } = getPeriodDates(period, year, month);

  // Filtrar transações do período
  const periodTransactions = transactions.filter((t) => {
    const tDate = new Date(t.transaction_date);
    return tDate >= start && tDate <= end;
  });

  // 1. SUMMARY
  const totalInvested = investments.reduce((sum, inv) => sum + (inv.total_invested || 0), 0);
  const currentValue = investments.reduce((sum, inv) => sum + (inv.current_value || inv.total_invested || 0), 0);
  const totalReturn = currentValue - totalInvested;
  const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  // 2. ALLOCATION
  const allocation: Record<string, { value: number; percentage: number }> = {};
  investments.forEach((inv) => {
    const category = toAllocationBucket(normalizeInvestmentCategory(inv.category, inv.type));
    const value = inv.current_value || inv.total_invested || 0;

    if (!allocation[category]) {
      allocation[category] = { value: 0, percentage: 0 };
    }
    allocation[category].value += value;
  });

  // Calcular percentuais
  Object.keys(allocation).forEach((cat) => {
    allocation[cat].percentage = currentValue > 0 ? (allocation[cat].value / currentValue) * 100 : 0;
  });

  // 3. PERFORMANCE
  const returns = investments.map((inv) => {
    const invested = inv.total_invested || 0;
    const current = inv.current_value || invested;
    const returnPct = invested > 0 ? ((current - invested) / invested) * 100 : 0;
    return { name: inv.ticker || inv.name, return: returnPct };
  });

  const bestPerformer = returns.length > 0 ? returns.reduce((best, curr) => (curr.return > best.return ? curr : best)) : null;
  const worstPerformer = returns.length > 0 ? returns.reduce((worst, curr) => (curr.return < worst.return ? curr : worst)) : null;
  const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r.return, 0) / returns.length : 0;

  // 4. DIVIDENDS
  const dividendTransactions = periodTransactions.filter((t) => t.transaction_type === 'dividend');
  const totalDividends = dividendTransactions.reduce((sum, t) => sum + t.total_value, 0);
  const yieldOnCost = totalInvested > 0 ? (totalDividends / totalInvested) * 100 : 0;

  // 5. TRANSACTIONS
  const buys = periodTransactions.filter((t) => t.transaction_type === 'buy');
  const sells = periodTransactions.filter((t) => t.transaction_type === 'sell');

  // 6. TAX REPORT (simplificado)
  const sellsTotal = sells.reduce((sum, t) => sum + t.total_value, 0);
  const buysTotal = buys.reduce((sum, t) => sum + t.total_value, 0);
  const capitalGains = sellsTotal - buysTotal;
  const tradingProfit = capitalGains > 0 ? capitalGains : 0;

  return {
    period: { type: period, start, end, label },
    summary: {
      totalInvested,
      currentValue,
      totalReturn,
      returnPercentage,
    },
    allocation,
    performance: {
      bestPerformer,
      worstPerformer,
      avgReturn,
    },
    dividends: {
      totalReceived: totalDividends,
      count: dividendTransactions.length,
      yieldOnCost,
    },
    transactions: {
      buys,
      sells,
      dividends: dividendTransactions,
    },
    taxReport: {
      capitalGains,
      dividendsReceived: totalDividends,
      tradingProfit,
      swingTrade: tradingProfit, // Simplificado
      dayTrade: 0, // Simplificado
    },
  };
}
