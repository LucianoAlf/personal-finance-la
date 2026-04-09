import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useState } from 'react';

import { AnalyticsData } from '@/hooks/useAnalytics';
import { useChartData } from '@/hooks/useChartData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExpensesTimelineProps {
  analyticsData: AnalyticsData | null;
  loading: boolean;
}

export function ExpensesTimeline({ analyticsData, loading }: ExpensesTimelineProps) {
  const { timelineData } = useChartData(analyticsData);
  const [viewMode, setViewMode] = useState<'daily' | 'accumulated'>('accumulated');

  const chartGridColor = 'hsl(var(--border) / 0.55)';
  const chartTextColor = 'hsl(var(--muted-foreground))';
  const chartLineColor = 'hsl(var(--primary))';
  const chartAccentColor = 'hsl(var(--info))';

  if (loading) {
    return (
      <div className="rounded-[30px] border border-border/70 bg-card/95 p-6 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <Skeleton className="h-[420px] w-full rounded-[24px]" />
      </div>
    );
  }

  if (timelineData.length === 0) {
    return (
      <div className="rounded-[30px] border border-border/70 bg-card/95 p-6 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <div className="py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-surface-elevated/65 text-primary shadow-sm">
            <TrendingUp className="h-6 w-6" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">Sem dados para exibir</h3>
          <p className="text-sm text-muted-foreground">
            Adicione transacoes para visualizar a evolucao temporal.
          </p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-2xl border border-border/70 bg-card/95 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.2)] backdrop-blur-xl">
          <p className="mb-1 font-semibold text-foreground">
            {new Date(label).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      data-testid="analytics-timeline-shell"
      className="rounded-[30px] border border-border/70 bg-card/95 p-6 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]"
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-[1.55rem] font-semibold tracking-tight text-foreground">
            Evolucao dos Gastos
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe seus gastos ao longo do tempo
          </p>
        </div>
        <div className="flex gap-2 rounded-2xl border border-border/70 bg-surface/70 p-1 shadow-sm">
          <Button
            data-testid="analytics-timeline-toggle-daily"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('daily')}
            className={cn(
              'h-10 rounded-xl px-3 text-sm font-semibold',
              viewMode === 'daily'
                ? 'bg-surface/70 text-foreground shadow-sm ring-1 ring-primary/15'
                : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
            )}
          >
            Diario
          </Button>
          <Button
            data-testid="analytics-timeline-toggle-accumulated"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('accumulated')}
            className={cn(
              'h-10 rounded-xl px-3 text-sm font-semibold',
              viewMode === 'accumulated'
                ? 'bg-surface/70 text-foreground shadow-sm ring-1 ring-primary/15'
                : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
            )}
          >
            Acumulado
          </Button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        {viewMode === 'accumulated' ? (
          <AreaChart data={timelineData}>
            <defs>
              <linearGradient id="analyticsAccumulated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartLineColor} stopOpacity={0.36} />
                <stop offset="95%" stopColor={chartLineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => new Date(value).getDate().toString()}
              stroke={chartTextColor}
            />
            <YAxis tickFormatter={(value) => `R$ ${value}`} stroke={chartTextColor} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="accumulated"
              name="Acumulado"
              stroke={chartLineColor}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#analyticsAccumulated)"
              animationBegin={0}
              animationDuration={1000}
            />
          </AreaChart>
        ) : (
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => new Date(value).getDate().toString()}
              stroke={chartTextColor}
            />
            <YAxis tickFormatter={(value) => `R$ ${value}`} stroke={chartTextColor} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="amount"
              name="Diario"
              stroke={chartAccentColor}
              strokeWidth={2}
              dot={{ fill: chartAccentColor, r: 4 }}
              activeDot={{ r: 6 }}
              animationBegin={0}
              animationDuration={1000}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
