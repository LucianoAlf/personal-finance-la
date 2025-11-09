import { useMemo } from 'react';
import { addMonths, addDays, format, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import type { Investment, InvestmentTransaction } from '@/types/database.types';

export interface DividendPayment {
  id: string;
  investmentId: string;
  investmentName: string;
  ticker: string;
  paymentDate: Date;
  estimatedValue: number;
  quantity: number;
  dividendYield: number;
  currentPrice: number;
}

export interface MonthlyDividends {
  month: string;
  total: number;
  payments: DividendPayment[];
}

export interface DividendCalendarData {
  upcomingPayments: DividendPayment[];
  monthlyBreakdown: MonthlyDividends[];
  totalEstimated: number;
  next30Days: number;
  next90Days: number;
}

interface UseDividendCalendarProps {
  investments: Investment[];
  transactions?: InvestmentTransaction[];
}

export function useDividendCalendar({
  investments,
  transactions = [],
}: UseDividendCalendarProps): DividendCalendarData {
  const data = useMemo(() => {
    const today = startOfDay(new Date());
    const in90Days = addDays(today, 90);
    const in30Days = addDays(today, 30);

    // Filtrar apenas investimentos com dividend_yield
    const dividendInvestments = investments.filter(
      (inv) => inv.dividend_yield && inv.dividend_yield > 0 && inv.quantity > 0
    );

    if (dividendInvestments.length === 0) {
      return {
        upcomingPayments: [],
        monthlyBreakdown: [],
        totalEstimated: 0,
        next30Days: 0,
        next90Days: 0,
      };
    }

    // Gerar pagamentos estimados para os próximos 90 dias
    const upcomingPayments: DividendPayment[] = [];

    dividendInvestments.forEach((inv) => {
      // Calcular valor do dividendo por ação
      const currentPrice = inv.current_price || inv.purchase_price;
      const annualDividendPerShare = (currentPrice * (inv.dividend_yield || 0)) / 100;
      const monthlyDividendPerShare = annualDividendPerShare / 12;

      // Gerar pagamentos mensais para os próximos 3 meses
      // Assumindo pagamento no dia 15 de cada mês (simplificação)
      for (let i = 0; i < 3; i++) {
        const paymentDate = new Date(today);
        paymentDate.setDate(15);
        const futureDate = addMonths(paymentDate, i);

        // Se a data já passou este mês, começar do próximo
        if (isBefore(futureDate, today)) {
          continue;
        }

        if (isAfter(futureDate, in90Days)) {
          break;
        }

        const estimatedValue = monthlyDividendPerShare * inv.quantity;

        upcomingPayments.push({
          id: `${inv.id}-${format(futureDate, 'yyyy-MM')}`,
          investmentId: inv.id,
          investmentName: inv.name,
          ticker: inv.ticker || inv.name,
          paymentDate: futureDate,
          estimatedValue,
          quantity: inv.quantity,
          dividendYield: inv.dividend_yield || 0,
          currentPrice,
        });
      }
    });

    // Ordenar por data
    upcomingPayments.sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());

    // Agrupar por mês
    const monthlyMap = new Map<string, DividendPayment[]>();

    upcomingPayments.forEach((payment) => {
      const monthKey = format(payment.paymentDate, 'yyyy-MM');
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, []);
      }
      monthlyMap.get(monthKey)!.push(payment);
    });

    const monthlyBreakdown: MonthlyDividends[] = Array.from(monthlyMap.entries()).map(
      ([month, payments]) => ({
        month,
        total: payments.reduce((sum, p) => sum + p.estimatedValue, 0),
        payments,
      })
    );

    // Calcular totais
    const totalEstimated = upcomingPayments.reduce((sum, p) => sum + p.estimatedValue, 0);

    const next30DaysPayments = upcomingPayments.filter((p) =>
      isBefore(p.paymentDate, in30Days)
    );
    const next30Days = next30DaysPayments.reduce((sum, p) => sum + p.estimatedValue, 0);

    const next90Days = totalEstimated;

    return {
      upcomingPayments,
      monthlyBreakdown,
      totalEstimated,
      next30Days,
      next90Days,
    };
  }, [investments, transactions]);

  return data;
}

// Helper para buscar dividendos já recebidos (transactions com type 'dividend')
export function useDividendHistory(transactions: InvestmentTransaction[]) {
  const history = useMemo(() => {
    const dividendTransactions = transactions.filter((t) => t.transaction_type === 'dividend');

    // Ordenar por data (mais recente primeiro)
    const sorted = [...dividendTransactions].sort(
      (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );

    // Calcular total recebido
    const totalReceived = dividendTransactions.reduce((sum, t) => sum + t.total_value, 0);

    // Agrupar por ano
    const byYear = new Map<number, InvestmentTransaction[]>();
    dividendTransactions.forEach((t) => {
      const year = new Date(t.transaction_date).getFullYear();
      if (!byYear.has(year)) {
        byYear.set(year, []);
      }
      byYear.get(year)!.push(t);
    });

    const yearlyTotals = Array.from(byYear.entries()).map(([year, txs]) => ({
      year,
      total: txs.reduce((sum, t) => sum + t.total_value, 0),
      count: txs.length,
    }));

    return {
      transactions: sorted,
      totalReceived,
      yearlyTotals,
      count: dividendTransactions.length,
    };
  }, [transactions]);

  return history;
}
