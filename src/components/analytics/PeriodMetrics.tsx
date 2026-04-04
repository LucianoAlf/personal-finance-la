import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Heart } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { AnalyticsData } from '@/hooks/useAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodOption } from './AnalyticsFilters';

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}

function MetricCard({ title, value, change, icon: Icon, color }: MetricCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const formattedChange = change !== undefined ? Math.round(change) : undefined;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        {formattedChange !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
          }`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : isNegative ? <TrendingDown className="h-4 w-4" /> : null}
            {formattedChange > 0 ? '+' : ''}{formattedChange}%
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

interface PeriodMetricsProps {
  analyticsData: AnalyticsData | null;
  loading: boolean;
  selectedPeriod: PeriodOption;
}

const PERIOD_LABELS: Record<PeriodOption, string> = {
  '1m': 'Último mês',
  '3m': 'Últimos 3 meses',
  '6m': 'Últimos 6 meses',
  '12m': 'Último ano',
  all: 'Todo o período',
};

export function PeriodMetrics({ analyticsData, loading, selectedPeriod }: PeriodMetricsProps) {

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Métricas do Período</h2>
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }

  const totalGasto = analyticsData.currentMonth.totalSpent;
  const previousTotal = analyticsData.previousMonth.totalSpent;
  const variacaoMensal = previousTotal > 0 
    ? ((totalGasto - previousTotal) / previousTotal) * 100 
    : 0;
  const ticketMedio = analyticsData.currentMonth.averageTicket;
  
  // Calcular score de saúde (0-100)
  const limitScore = 100 - analyticsData.limitUsage.percentage; // Quanto menos usar, melhor
  const paymentScore = analyticsData.invoiceStats.totalInvoices > 0
    ? (analyticsData.invoiceStats.paidOnTime / analyticsData.invoiceStats.totalInvoices) * 100
    : 100;
  const trendScore = variacaoMensal <= 0 ? 100 : Math.max(0, 100 - variacaoMensal);
  const scoreFinanceiro = Math.round((limitScore + paymentScore + trendScore) / 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Métricas do Período</h2>
        <span className="text-sm text-gray-500">{PERIOD_LABELS[selectedPeriod]}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Gasto"
          value={formatCurrency(totalGasto)}
          change={variacaoMensal}
          icon={DollarSign}
          color="purple"
        />
        <MetricCard
          title="Variação Mensal"
          value={`${variacaoMensal > 0 ? '+' : ''}${Math.round(variacaoMensal)}%`}
          change={variacaoMensal}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          icon={ShoppingBag}
          color="amber"
        />
        <MetricCard
          title="Score de Saúde"
          value={`${scoreFinanceiro}/100`}
          change={scoreFinanceiro >= 70 ? 5 : -5}
          icon={Heart}
          color="green"
        />
      </div>
    </div>
  );
}
