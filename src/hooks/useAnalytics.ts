import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface AnalyticsData {
  currentMonth: {
    totalSpent: number;
    transactionCount: number;
    averageTicket: number;
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

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const previousMonthStart = startOfMonth(subMonths(now, 1));
      const previousMonthEnd = endOfMonth(subMonths(now, 1));
      const sixMonthsAgo = subMonths(now, 6);

      // Buscar transações do mês atual
      const { data: currentTransactions, error: currentError } = await supabase
        .from('credit_card_transactions')
        .select(`
          *,
          credit_card_invoices!inner(
            reference_month,
            credit_card_id,
            credit_cards(name, credit_limit)
          ),
          categories(name, color, icon)
        `)
        .gte('credit_card_invoices.reference_month', currentMonthStart.toISOString())
        .lte('credit_card_invoices.reference_month', currentMonthEnd.toISOString());

      if (currentError) throw currentError;

      // Buscar transações do mês anterior
      const { data: previousTransactions, error: previousError } = await supabase
        .from('credit_card_transactions')
        .select(`
          amount,
          credit_card_invoices!inner(reference_month)
        `)
        .gte('credit_card_invoices.reference_month', previousMonthStart.toISOString())
        .lte('credit_card_invoices.reference_month', previousMonthEnd.toISOString());

      if (previousError) throw previousError;

      // Buscar faturas dos últimos 6 meses
      const { data: last6MonthsInvoices, error: sixMonthsError } = await supabase
        .from('credit_card_invoices')
        .select(`
          reference_month,
          total_amount,
          credit_card_id,
          credit_cards!inner(name)
        `)
        .gte('reference_month', sixMonthsAgo.toISOString())
        .order('reference_month', { ascending: true });

      if (sixMonthsError) throw sixMonthsError;

      // Buscar limites dos cartões
      const { data: cards, error: cardsError } = await supabase
        .from('credit_cards')
        .select('id, credit_limit, available_limit')
        .eq('is_archived', false);

      if (cardsError) throw cardsError;

      // Buscar estatísticas de faturas
      const { data: allInvoices, error: invoicesError } = await supabase
        .from('credit_card_invoices')
        .select('status, due_date')
        .gte('reference_month', sixMonthsAgo.toISOString());

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
      const previousMonthTotal = previousTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const previousMonthCount = previousTransactions?.length || 0;

      // Processar últimos 6 meses
      const monthsMap = new Map<string, { totalSpent: number; cardBreakdown: Map<string, number> }>();
      last6MonthsInvoices?.forEach((invoice: any) => {
        const monthKey = format(new Date(invoice.reference_month), 'MMM/yy');
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
        inv.status === 'paid' && new Date(inv.due_date) >= now2
      ).length || 0;
      const overdue = allInvoices?.filter(inv => 
        inv.status === 'open' && new Date(inv.due_date) < now2
      ).length || 0;

      setData({
        currentMonth: {
          totalSpent: currentMonthTotal,
          transactionCount: currentMonthCount,
          averageTicket,
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
