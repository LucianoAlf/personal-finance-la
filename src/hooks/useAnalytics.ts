import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format, differenceInCalendarDays, subDays } from 'date-fns';
import { parseDateOnlyAsLocal, toYearMonthKey } from '@/utils/dateOnly';
import { AnalyticsScope } from './analyticsScope';

export interface AnalyticsData {
  currentMonth: {
    totalSpent: number;
    transactionCount: number;
    averageTicket: number;
    transactions: Array<{ purchaseDate: string; amount: number }>;
    categoryBreakdown: Array<{ category: string; amount: number; color: string }>;
    merchantBreakdown: Array<{ merchant: string; amount: number; count: number }>;
  };
  previousMonth: {
    totalSpent: number;
    transactionCount: number;
  };
  last6Months: Array<{
    month: string;
    totalSpent: number;
    cardBreakdown: Array<{ cardName: string; amount: number }>;
  }>;
  limitUsage: {
    totalLimit: number;
    totalUsed: number;
    percentage: number;
  };
  invoiceStats: {
    totalInvoices: number;
    paidOnTime: number;
    overdue: number;
  };
}

export function useAnalytics(scope?: AnalyticsScope) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [scope?.cardId, scope?.startDate?.getTime(), scope?.endDate?.getTime()]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const hasExplicitAll = scope !== undefined && scope?.startDate === null;
      const currentMonthStart = !hasExplicitAll ? scope?.startDate ?? startOfMonth(now) : startOfMonth(now);
      const currentMonthEnd = !hasExplicitAll ? scope?.endDate ?? endOfMonth(now) : endOfMonth(now);
      const periodLength = differenceInCalendarDays(currentMonthEnd, currentMonthStart) + 1;
      const previousMonthEnd = subDays(currentMonthStart, 1);
      const previousMonthStart = subDays(currentMonthStart, periodLength);
      const sixMonthsAgo = subMonths(now, 6);
      const previousMonthKey = toYearMonthKey(previousMonthStart);
      const hasBoundedRange = Boolean(scope?.startDate);

      // Buscar transações do mês atual
      let currentTransactionsQuery = supabase
        .from('credit_card_transactions')
        .select(`
          *,
          categories(name, color, icon)
        `);

      if (!hasExplicitAll) {
        currentTransactionsQuery = currentTransactionsQuery
          .gte('purchase_date', format(currentMonthStart, 'yyyy-MM-dd'))
          .lte('purchase_date', format(currentMonthEnd, 'yyyy-MM-dd'));
      }

      if (scope?.cardId) {
        currentTransactionsQuery = currentTransactionsQuery.eq('credit_card_id', scope.cardId);
      }

      const { data: currentTransactions, error: currentError } = await currentTransactionsQuery;

      if (currentError) throw currentError;

      // Buscar transações do mês anterior
      let previousTransactions: Array<{ amount: number; purchase_date: string }> | null = [];
      if (!hasExplicitAll) {
        let previousTransactionsQuery = supabase
          .from('credit_card_transactions')
          .select(`
            amount,
            purchase_date
          `)
          .gte('purchase_date', format(previousMonthStart, 'yyyy-MM-dd'))
          .lte('purchase_date', format(previousMonthEnd, 'yyyy-MM-dd'));

        if (scope?.cardId) {
          previousTransactionsQuery = previousTransactionsQuery.eq('credit_card_id', scope.cardId);
        }

        const { data, error: previousError } = await previousTransactionsQuery;

        if (previousError) throw previousError;
        previousTransactions = data;
      }

      // Buscar faturas dos últimos 6 meses
      let last6MonthsQuery = supabase
        .from('credit_card_invoices')
        .select(`
          reference_month,
          total_amount,
          credit_card_id,
          credit_cards!inner(name)
        `)
        .order('reference_month', { ascending: true });

      if (scope?.cardId) {
        last6MonthsQuery = last6MonthsQuery.eq('credit_card_id', scope.cardId);
      }

      if (hasExplicitAll) {
        // No date filter for all-time view.
      } else if (hasBoundedRange) {
        last6MonthsQuery = last6MonthsQuery
          .gte('reference_month', format(startOfMonth(currentMonthStart), 'yyyy-MM-dd'))
          .lte('reference_month', format(currentMonthEnd, 'yyyy-MM-dd'));
      } else {
        last6MonthsQuery = last6MonthsQuery.gte('reference_month', format(startOfMonth(sixMonthsAgo), 'yyyy-MM-dd'));
      }

      const { data: last6MonthsInvoices, error: sixMonthsError } = await last6MonthsQuery;

      if (sixMonthsError) throw sixMonthsError;

      // Buscar limites dos cartões
      let cardsQuery = supabase
        .from('credit_cards')
        .select('id, credit_limit, available_limit')
        .eq('is_archived', false);

      if (scope?.cardId) {
        cardsQuery = cardsQuery.eq('id', scope.cardId);
      }

      const { data: cards, error: cardsError } = await cardsQuery;

      if (cardsError) throw cardsError;

      // Buscar estatísticas de faturas
      let allInvoicesQuery = supabase
        .from('credit_card_invoices')
        .select('status, due_date, reference_month');

      if (scope?.cardId) {
        allInvoicesQuery = allInvoicesQuery.eq('credit_card_id', scope.cardId);
      }

      if (hasExplicitAll) {
        // No date filter for all-time view.
      } else if (hasBoundedRange) {
        allInvoicesQuery = allInvoicesQuery
          .gte('reference_month', format(startOfMonth(currentMonthStart), 'yyyy-MM-dd'))
          .lte('reference_month', format(currentMonthEnd, 'yyyy-MM-dd'));
      } else {
        allInvoicesQuery = allInvoicesQuery.gte('reference_month', format(startOfMonth(sixMonthsAgo), 'yyyy-MM-dd'));
      }

      const { data: allInvoices, error: invoicesError } = await allInvoicesQuery;

      if (invoicesError) throw invoicesError;

      // Processar dados do mês atual
      const currentMonthTotal = currentTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const currentMonthCount = currentTransactions?.length || 0;
      const averageTicket = currentMonthCount > 0 ? currentMonthTotal / currentMonthCount : 0;

      // Agrupar por categoria
      const categoryMap = new Map<string, { amount: number; color: string }>();
      currentTransactions?.forEach((transaction: any) => {
        const category = transaction.categories;
        if (category) {
          const categoryName = category.name || 'Sem Categoria';
          const existing = categoryMap.get(categoryName) || { amount: 0, color: category.color || '#8b5cf6' };
          existing.amount += transaction.amount;
          categoryMap.set(categoryName, existing);
        } else {
          // Transações sem categoria vão para "Sem Categoria"
          const categoryName = 'Sem Categoria';
          const existing = categoryMap.get(categoryName) || { amount: 0, color: '#94a3b8' };
          existing.amount += transaction.amount;
          categoryMap.set(categoryName, existing);
        }
      });

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        color: data.color,
      }));

      // Agrupar por estabelecimento (usando description como fallback)
      const merchantMap = new Map<string, { amount: number; count: number }>();
      currentTransactions?.forEach(transaction => {
        // Usar description como nome do estabelecimento
        const merchantName = transaction.description || 'Sem descrição';
        const existing = merchantMap.get(merchantName) || { amount: 0, count: 0 };
        existing.amount += transaction.amount;
        existing.count += 1;
        merchantMap.set(merchantName, existing);
      });

      const merchantBreakdown = Array.from(merchantMap.entries())
        .map(([merchant, data]) => ({
          merchant,
          amount: data.amount,
          count: data.count,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      // Processar mês anterior
      const previousMonthFiltered = previousTransactions?.filter((transaction: any) => {
        if (!transaction.purchase_date) {
          return false;
        }

        return toYearMonthKey(transaction.purchase_date) === previousMonthKey;
      }) || [];

      const previousMonthTotal = previousMonthFiltered.reduce((sum, t: any) => sum + t.amount, 0);
      const previousMonthCount = previousMonthFiltered.length;

      // Processar últimos 6 meses
      const monthsMap = new Map<string, { totalSpent: number; cardBreakdown: Map<string, number> }>();
      last6MonthsInvoices?.forEach((invoice: any) => {
        const monthKey = format(parseDateOnlyAsLocal(invoice.reference_month), 'MMM/yy');
        const existing = monthsMap.get(monthKey) || { totalSpent: 0, cardBreakdown: new Map() };
        existing.totalSpent += invoice.total_amount;
        
        const cardName = invoice.credit_cards?.name || 'Desconhecido';
        const cardAmount = existing.cardBreakdown.get(cardName) || 0;
        existing.cardBreakdown.set(cardName, cardAmount + invoice.total_amount);
        
        monthsMap.set(monthKey, existing);
      });

      const last6Months = Array.from(monthsMap.entries()).map(([month, data]) => ({
        month,
        totalSpent: data.totalSpent,
        cardBreakdown: Array.from(data.cardBreakdown.entries()).map(([cardName, amount]) => ({
          cardName: cardName as string,
          amount: amount as number,
        })),
      }));

      // Calcular uso de limite
      const totalLimit = cards?.reduce((sum, c) => sum + (c.credit_limit || 0), 0) || 0;
      const totalUsed = cards?.reduce((sum, c) => sum + ((c.credit_limit || 0) - (c.available_limit || 0)), 0) || 0;
      const percentage = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

      // Estatísticas de faturas
      const now2 = new Date();
      const paidOnTime = allInvoices?.filter(inv => 
        inv.status === 'paid' && parseDateOnlyAsLocal(inv.due_date) >= now2
      ).length || 0;
      const overdue = allInvoices?.filter(inv => 
        inv.status === 'open' && parseDateOnlyAsLocal(inv.due_date) < now2
      ).length || 0;

      setData({
        currentMonth: {
          totalSpent: currentMonthTotal,
          transactionCount: currentMonthCount,
          averageTicket,
          transactions: (currentTransactions || []).map((transaction: any) => ({
            purchaseDate: transaction.purchase_date,
            amount: transaction.amount,
          })),
          categoryBreakdown,
          merchantBreakdown,
        },
        previousMonth: {
          totalSpent: previousMonthTotal,
          transactionCount: previousMonthCount,
        },
        last6Months,
        limitUsage: {
          totalLimit,
          totalUsed,
          percentage,
        },
        invoiceStats: {
          totalInvoices: allInvoices?.length || 0,
          paidOnTime,
          overdue,
        },
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar análises');
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error, refetch: fetchAnalytics };
}
