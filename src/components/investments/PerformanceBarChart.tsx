import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import type { Investment } from '@/types/database.types';

interface PerformanceBarChartProps {
  investments: Investment[];
}

const panelClassName =
  'border-border/70 bg-card/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]';

export function PerformanceBarChart({ investments }: PerformanceBarChartProps) {
  if (!investments || investments.length === 0) {
    return (
      <Card className={panelClassName}>
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="text-2xl">Performance por Ativo</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[320px] items-center justify-center text-center text-muted-foreground">
          Nenhum investimento disponível
        </CardContent>
      </Card>
    );
  }

  const chartData = investments
    .map((investment) => {
      const totalInvested = investment.total_invested || 0;
      const currentValue = investment.current_value || totalInvested;
      const returnValue = currentValue - totalInvested;
      const returnPercentage = totalInvested > 0 ? (returnValue / totalInvested) * 100 : 0;

      return {
        name: investment.ticker || investment.name,
        return: returnValue,
        percentage: returnPercentage,
        invested: totalInvested,
        current: currentValue,
        isPositive: returnValue >= 0,
      };
    })
    .sort((left, right) => right.return - left.return)
    .slice(0, 10);

  const positiveCount = chartData.filter((item) => item.isPositive).length;
  const negativeCount = chartData.filter((item) => !item.isPositive).length;

  const formatYAxis = (value: number) => {
    const absolute = Math.abs(value);
    if (absolute >= 1000) {
      return `${value >= 0 ? '' : '-'}${(absolute / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  const renderLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    const isPositive = value >= 0;

    return (
      <text
        x={x + width / 2}
        y={isPositive ? y - 8 : y + height + 18}
        fill={isPositive ? '#10b981' : '#ef4444'}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
      >
        {value >= 0 ? '+' : ''}
        {value.toFixed(1)}%
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) {
      return null;
    }

    const data = payload[0].payload;

    return (
      <div className="rounded-[1.35rem] border border-border/70 bg-card/95 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
        <p className="mb-3 text-sm font-semibold text-foreground">{data.name}</p>
        <div className="space-y-1.5 text-sm">
          <p className="text-muted-foreground">
            Investido: <span className="font-medium text-foreground">{formatCurrency(data.invested)}</span>
          </p>
          <p className="text-muted-foreground">
            Atual: <span className="font-medium text-foreground">{formatCurrency(data.current)}</span>
          </p>
          <p className={`font-semibold ${data.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            Retorno: {formatCurrency(data.return)} ({data.percentage >= 0 ? '+' : ''}
            {data.percentage.toFixed(2)}%)
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className={panelClassName}>
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle className="text-2xl">Performance por Ativo (Top 10)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              label={{
                value: 'Retorno (R$)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'hsl(var(--muted-foreground))' },
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--surface))', opacity: 0.35 }} />
            <Bar dataKey="return" radius={[8, 8, 0, 0]} label={renderLabel}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isPositive ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-center">
            <p className="mb-1 text-sm text-emerald-600 dark:text-emerald-300">Ganhos</p>
            <p className="text-xl font-semibold text-emerald-500">{positiveCount}</p>
          </div>
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-center">
            <p className="mb-1 text-sm text-rose-600 dark:text-rose-300">Perdas</p>
            <p className="text-xl font-semibold text-rose-500">{negativeCount}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-surface/55 p-4 text-center">
            <p className="mb-1 text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-semibold text-foreground">{chartData.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
