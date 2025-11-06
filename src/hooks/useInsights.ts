import { useMemo } from 'react';
import { AnalyticsData } from './useAnalytics';
import { AlertTriangle, TrendingUp, Target, DollarSign, CheckCircle2, BarChart3, Bell, Store } from 'lucide-react';

export interface Insight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'tip';
  title: string;
  description: string;
  icon: React.ElementType;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useInsights(analyticsData: AnalyticsData | null): Insight[] {
  return useMemo(() => {
    if (!analyticsData) return [];

    const insights: Insight[] = [];

    // 1. Alerta de Variação Mensal (reduzido para 10%)
    const currentTotal = analyticsData.currentMonth.totalSpent;
    const previousTotal = analyticsData.previousMonth.totalSpent;
    if (previousTotal > 0) {
      const variation = ((currentTotal - previousTotal) / previousTotal) * 100;
      if (Math.abs(variation) >= 10) {
        insights.push({
          id: 'monthly-variation',
          type: variation > 0 ? 'warning' : 'success',
          title: variation > 0 ? 'Atenção aos gastos!' : 'Economia identificada!',
          description: `Você gastou ${Math.abs(variation).toFixed(0)}% ${
            variation > 0 ? 'a mais' : 'a menos'
          } que o mês passado (${variation > 0 ? '+' : ''}R$ ${Math.abs(currentTotal - previousTotal).toFixed(2)})`,
          icon: variation > 0 ? AlertTriangle : DollarSign,
          action: {
            label: 'Ver Detalhes',
            onClick: () => console.log('Ver detalhes de variação'),
          },
        });
      }
    }

    // 2. Categoria em Crescimento
    const topCategory = analyticsData.currentMonth.categoryBreakdown
      .sort((a, b) => b.amount - a.amount)[0];
    if (topCategory && topCategory.amount > currentTotal * 0.3) {
      const percentage = (topCategory.amount / currentTotal) * 100;
      insights.push({
        id: 'top-category',
        type: 'info',
        title: `${topCategory.category} em alta`,
        description: `Categoria ${topCategory.category} representa ${percentage.toFixed(0)}% dos seus gastos (R$ ${topCategory.amount.toFixed(2)})`,
        icon: TrendingUp,
        action: {
          label: 'Criar Meta',
          onClick: () => console.log('Criar meta para categoria'),
        },
      });
    }

    // 3. Alerta de Limite (ajustado para 30%)
    const limitPercentage = analyticsData.limitUsage.percentage;
    if (limitPercentage >= 70) {
      insights.push({
        id: 'limit-warning',
        type: 'warning',
        title: 'Limite próximo do topo!',
        description: `Você está usando ${Math.round(limitPercentage)}% do limite total (R$ ${analyticsData.limitUsage.totalUsed.toFixed(2)} de R$ ${analyticsData.limitUsage.totalLimit.toFixed(2)})`,
        icon: Target,
      });
    } else if (limitPercentage >= 30) {
      insights.push({
        id: 'limit-info',
        type: 'info',
        title: 'Uso moderado do limite',
        description: `Você está usando ${Math.round(limitPercentage)}% do limite total. Continue controlando seus gastos!`,
        icon: Target,
      });
    }

    // 4. Economia Identificada (se gastos diminuíram significativamente)
    if (previousTotal > 0 && currentTotal < previousTotal * 0.85) {
      const saved = previousTotal - currentTotal;
      insights.push({
        id: 'savings',
        type: 'success',
        title: 'Economia identificada!',
        description: `Você economizou R$ ${saved.toFixed(2)} este mês comparado ao anterior. Parabéns!`,
        icon: DollarSign,
      });
    }

    // 5. Padrão Positivo (faturas pagas em dia)
    const paidOnTimePercentage = analyticsData.invoiceStats.totalInvoices > 0
      ? (analyticsData.invoiceStats.paidOnTime / analyticsData.invoiceStats.totalInvoices) * 100
      : 0;
    if (paidOnTimePercentage >= 90 && analyticsData.invoiceStats.totalInvoices > 0) {
      insights.push({
        id: 'payment-pattern',
        type: 'success',
        title: 'Parabéns!',
        description: `Você pagou ${analyticsData.invoiceStats.paidOnTime} de ${analyticsData.invoiceStats.totalInvoices} faturas em dia. Continue assim!`,
        icon: CheckCircle2,
      });
    }

    // 6. Tendência (comparação com média - ajustado para 1-2 meses)
    const monthsForAvg = analyticsData.last6Months.length >= 3 ? 3 : analyticsData.last6Months.length;
    if (monthsForAvg >= 1) {
      const avgMonths = analyticsData.last6Months
        .slice(-monthsForAvg)
        .reduce((sum, m) => sum + m.totalSpent, 0) / monthsForAvg;
      const difference = ((currentTotal - avgMonths) / avgMonths) * 100;
      
      if (Math.abs(difference) >= 10) {
        insights.push({
          id: 'trend',
          type: difference > 0 ? 'warning' : 'success',
          title: difference > 0 ? 'Gastos acima da média' : 'Gastos abaixo da média',
          description: `Seus gastos estão ${Math.abs(difference).toFixed(0)}% ${
            difference > 0 ? 'acima' : 'abaixo'
          } da média dos últimos ${monthsForAvg} ${monthsForAvg === 1 ? 'mês' : 'meses'} (R$ ${avgMonths.toFixed(2)})`,
          icon: BarChart3,
        });
      }
    }

    // 7. Previsão de Fatura (ajustado para 1+ meses)
    if (analyticsData.last6Months.length >= 1) {
      const avgMonthly = analyticsData.last6Months
        .reduce((sum, m) => sum + m.totalSpent, 0) / analyticsData.last6Months.length;
      const predicted = avgMonthly * 1.05; // 5% de margem
      
      insights.push({
        id: 'prediction',
        type: 'tip',
        title: 'Previsão de gastos',
        description: `Com base no seu padrão, sua fatura deve ficar em torno de R$ ${predicted.toFixed(2)} este mês`,
        icon: Bell,
      });
    }

    // 8. Estabelecimento Frequente (ajustado para 2+ ocorrências)
    const topMerchant = analyticsData.currentMonth.merchantBreakdown[0];
    if (topMerchant && topMerchant.count >= 2) {
      insights.push({
        id: 'frequent-merchant',
        type: 'info',
        title: 'Estabelecimento frequente',
        description: `Você visitou ${topMerchant.merchant} ${topMerchant.count}x este mês, totalizando R$ ${topMerchant.amount.toFixed(2)}`,
        icon: Store,
      });
    }

    // 9. Resumo do Mês (sempre mostrar se houver gastos)
    if (currentTotal > 0 && insights.length < 2) {
      const ticketMedio = analyticsData.currentMonth.averageTicket;
      const totalTransactions = analyticsData.currentMonth.transactionCount;
      
      insights.push({
        id: 'monthly-summary',
        type: 'info',
        title: 'Resumo do mês',
        description: `Você realizou ${totalTransactions} ${totalTransactions === 1 ? 'transação' : 'transações'} este mês, com ticket médio de R$ ${ticketMedio.toFixed(2)}`,
        icon: DollarSign,
      });
    }

    return insights;
  }, [analyticsData]);
}
