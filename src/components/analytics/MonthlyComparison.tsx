import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';

import { AnalyticsData } from '@/hooks/useAnalytics';
import { useChartData } from '@/hooks/useChartData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/formatters';

const CARD_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

interface MonthlyComparisonProps {
  analyticsData: AnalyticsData | null;
  loading: boolean;
}

export function MonthlyComparison({ analyticsData, loading }: MonthlyComparisonProps) {
  const { comparisonData } = useChartData(analyticsData);
  const chartGridColor = 'hsl(var(--border) / 0.55)';
  const chartTextColor = 'hsl(var(--muted-foreground))';

  if (loading) {
    return (
      <div className="rounded-[30px] border border-border/70 bg-card/95 p-6 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <Skeleton className="h-[420px] w-full rounded-[24px]" />
      </div>
    );
  }

  if (comparisonData.length === 0) {
    return (
      <div className="rounded-[30px] border border-border/70 bg-card/95 p-6 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <div className="py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-surface-elevated/65 text-primary shadow-sm">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">Sem dados para exibir</h3>
          <p className="text-sm text-muted-foreground">
            Sao necessarios pelo menos 2 meses de historico para comparacao.
          </p>
        </div>
      </div>
    );
  }

  const cardNames = Array.from(
    new Set(comparisonData.flatMap((month) => Object.keys(month.cards))),
  );

  const chartData = comparisonData.map((month) => ({
    month: month.month,
    ...month.cards,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <div className="rounded-2xl border border-border/70 bg-card/95 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.2)] backdrop-blur-xl">
          <p className="mb-2 font-semibold text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          <div className="mt-2 border-t border-border/60 pt-2">
            <p className="text-sm font-semibold text-foreground">Total: {formatCurrency(total)}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const average =
    comparisonData.reduce((sum, month) => sum + month.total, 0) / comparisonData.length;

  return (
    <div
      data-testid="analytics-monthly-comparison-shell"
      className="rounded-[30px] border border-border/70 bg-card/95 p-6 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]"
    >
      <div className="mb-5">
        <h3 className="text-[1.55rem] font-semibold tracking-tight text-foreground">
          Comparativo Mensal
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare seus gastos dos ultimos meses por cartao
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div
            data-testid="analytics-monthly-comparison-summary"
            className="rounded-2xl border border-border/60 bg-surface-elevated/45 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          >
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/90">
              Media mensal
            </span>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(average)}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface-elevated/45 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/90">
              Periodo
            </span>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {comparisonData.length} meses
            </p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
          <XAxis dataKey="month" stroke={chartTextColor} />
          <YAxis tickFormatter={(value) => `R$ ${value}`} stroke={chartTextColor} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {cardNames.map((cardName, index) => (
            <Bar
              key={cardName}
              dataKey={cardName}
              name={cardName}
              fill={CARD_COLORS[index % CARD_COLORS.length]}
              animationBegin={index * 100}
              animationDuration={800}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-surface/70 px-3 py-1.5">
          <div className="h-0.5 w-8 bg-border" />
          <span>Media: {formatCurrency(average)}</span>
        </div>
      </div>
    </div>
  );
}
