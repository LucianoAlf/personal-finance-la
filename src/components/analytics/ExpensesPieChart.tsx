import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

import { AnalyticsData } from '@/hooks/useAnalytics';
import { useChartData } from '@/hooks/useChartData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/formatters';

interface ExpensesPieChartProps {
  analyticsData: AnalyticsData | null;
  loading: boolean;
}

export function ExpensesPieChart({ analyticsData, loading }: ExpensesPieChartProps) {
  const { pieData } = useChartData(analyticsData);

  if (loading) {
    return (
      <div className="rounded-[30px] border border-border/70 bg-card/95 p-6 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <Skeleton className="h-[420px] w-full rounded-[24px]" />
      </div>
    );
  }

  if (pieData.length === 0) {
    return (
      <div className="rounded-[30px] border border-border/70 bg-card/95 p-6 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <div className="py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-surface-elevated/65 text-primary shadow-sm">
            <PieChartIcon className="h-6 w-6" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">Sem dados para exibir</h3>
          <p className="text-sm text-muted-foreground">
            Adicione transacoes categorizadas para visualizar a distribuicao dos gastos.
          </p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-2xl border border-border/70 bg-card/95 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.2)] backdrop-blur-xl">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }

    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {payload.map((entry: any, index: number) => (
          <div
            key={`legend-${index}`}
            data-testid={`analytics-pie-legend-${entry.value}`}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-elevated/45 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          >
            <div
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{entry.value}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(entry.payload.value)}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      data-testid="analytics-pie-chart-shell"
      className="rounded-[30px] border border-border/70 bg-card/95 p-6 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[1.55rem] font-semibold tracking-tight text-foreground">
            Distribuicao por Categoria
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize como seus gastos estao distribuidos
          </p>
        </div>
        <div className="rounded-full border border-border/60 bg-surface/70 px-3 py-1 text-xs font-medium text-muted-foreground">
          {pieData.length} categorias
        </div>
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="46%"
            labelLine={false}
            label={({ name, percentage }) => `${name} (${percentage.toFixed(0)}%)`}
            outerRadius={122}
            innerRadius={18}
            fill="hsl(var(--foreground))"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
