import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Heart } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { AnalyticsData } from '@/hooks/useAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodOption } from './AnalyticsFilters';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  tone: 'purple' | 'blue' | 'amber' | 'green';
  loading?: boolean;
}

const metricToneStyles = {
  purple: {
    shell:
      'bg-[linear-gradient(145deg,rgba(139,92,246,0.12),rgba(255,255,255,0)_45%)] dark:bg-[linear-gradient(145deg,rgba(139,92,246,0.16),rgba(15,23,42,0)_74%)]',
    iconBox: 'border-primary/18 bg-primary/10 text-primary',
    delta: 'text-primary',
  },
  blue: {
    shell:
      'bg-[linear-gradient(145deg,rgba(59,130,246,0.12),rgba(255,255,255,0)_45%)] dark:bg-[linear-gradient(145deg,rgba(59,130,246,0.16),rgba(15,23,42,0)_74%)]',
    iconBox: 'border-info/18 bg-info/10 text-info',
    delta: 'text-info',
  },
  amber: {
    shell:
      'bg-[linear-gradient(145deg,rgba(245,158,11,0.12),rgba(255,255,255,0)_45%)] dark:bg-[linear-gradient(145deg,rgba(245,158,11,0.16),rgba(15,23,42,0)_74%)]',
    iconBox: 'border-warning/18 bg-warning/10 text-warning',
    delta: 'text-warning',
  },
  green: {
    shell:
      'bg-[linear-gradient(145deg,rgba(16,185,129,0.12),rgba(255,255,255,0)_45%)] dark:bg-[linear-gradient(145deg,rgba(16,185,129,0.16),rgba(15,23,42,0)_74%)]',
    iconBox: 'border-success/18 bg-success/10 text-success',
    delta: 'text-success',
  },
} as const;

function MetricCard({ title, value, change, icon: Icon, tone }: MetricCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const formattedChange = change !== undefined ? Math.round(change) : undefined;

  return (
    <div
      data-testid={`analytics-metric-card-${title}`}
      className={cn(
        'rounded-[28px] border border-border/70 bg-card/95 p-5 shadow-[0_18px_44px_rgba(3,8,20,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(3,8,20,0.18)] dark:shadow-[0_22px_48px_rgba(2,6,23,0.28)]',
        metricToneStyles[tone].shell,
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm', metricToneStyles[tone].iconBox)}>
          <Icon className="h-5 w-5" />
        </div>
        {formattedChange !== undefined && (
          <div className={cn(
            'flex items-center gap-1 rounded-full border border-border/70 bg-surface/70 px-2.5 py-1 text-xs font-semibold shadow-sm',
            isPositive ? 'text-success' : isNegative ? 'text-danger' : metricToneStyles[tone].delta,
          )}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : isNegative ? <TrendingDown className="h-4 w-4" /> : null}
            {formattedChange > 0 ? '+' : ''}{formattedChange}%
          </div>
        )}
      </div>
      <h3 className="mb-1 text-sm font-medium text-muted-foreground">{title}</h3>
      <p
        data-testid={`analytics-metric-value-${title}`}
        className="text-[1.52rem] font-semibold leading-tight tracking-tight text-foreground [font-variant-numeric:tabular-nums] sm:text-[1.68rem]"
      >
        {value}
      </p>
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
          <h2 className="text-[1.75rem] font-semibold tracking-tight text-foreground">Métricas do Período</h2>
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
        <h2 className="text-[1.75rem] font-semibold tracking-tight text-foreground">Métricas do Período</h2>
        <span className="rounded-full border border-border/70 bg-surface/70 px-3 py-1 text-xs font-medium text-muted-foreground">
          {PERIOD_LABELS[selectedPeriod]}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Gasto"
          value={formatCurrency(totalGasto)}
          change={variacaoMensal}
          icon={DollarSign}
          tone="purple"
        />
        <MetricCard
          title="Variação Mensal"
          value={`${variacaoMensal > 0 ? '+' : ''}${Math.round(variacaoMensal)}%`}
          change={variacaoMensal}
          icon={TrendingUp}
          tone="blue"
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          icon={ShoppingBag}
          tone="amber"
        />
        <MetricCard
          title="Score de Saúde"
          value={`${scoreFinanceiro}/100`}
          change={scoreFinanceiro >= 70 ? 5 : -5}
          icon={Heart}
          tone="green"
        />
      </div>
    </div>
  );
}
