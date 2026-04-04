import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import type { Investment } from '@/types/database.types';

interface PerformanceBarChartProps {
  investments: Investment[];
}

export function PerformanceBarChart({ investments }: PerformanceBarChartProps) {
  if (!investments || investments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance por Ativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhum investimento disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  // Preparar dados para o gráfico
  const chartData = investments
    .map((inv) => {
      const totalInvested = inv.total_invested || 0;
      const currentValue = inv.current_value || totalInvested;
      const returnValue = currentValue - totalInvested;
      const returnPercentage = totalInvested > 0
        ? (returnValue / totalInvested) * 100
        : 0;

      return {
        name: inv.ticker || inv.name,
        return: returnValue,
        percentage: returnPercentage,
        invested: totalInvested,
        current: currentValue,
        isPositive: returnValue >= 0,
      };
    })
    .sort((a, b) => b.return - a.return) // Ordenar por retorno (maior primeiro)
    .slice(0, 10); // Top 10 investimentos

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{data.name}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Investido:</span>{' '}
              <span className="font-medium">{formatCurrency(data.invested)}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Atual:</span>{' '}
              <span className="font-medium">{formatCurrency(data.current)}</span>
            </p>
            <p className={`text-sm font-semibold ${data.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              Retorno: {formatCurrency(data.return)} ({data.percentage >= 0 ? '+' : ''}{data.percentage.toFixed(2)}%)
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Format Y-axis
  const formatYAxis = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1000) {
      return `${value >= 0 ? '' : '-'}${(absValue / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  // Custom bar label
  const renderLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    const isPositive = value >= 0;
    
    return (
      <text
        x={x + width / 2}
        y={isPositive ? y - 5 : y + height + 15}
        fill={isPositive ? '#10b981' : '#ef4444'}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
      >
        {value >= 0 ? '+' : ''}{value.toFixed(1)}%
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Ativo (Top 10)</CardTitle>
      </CardHeader>
      <CardContent>
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
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="return"
              fill="#8884d8"
              radius={[8, 8, 0, 0]}
              label={renderLabel}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isPositive ? '#10b981' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 mb-1">Ganhos</p>
            <p className="text-lg font-bold text-green-700">
              {chartData.filter(d => d.isPositive).length}
            </p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600 mb-1">Perdas</p>
            <p className="text-lg font-bold text-red-700">
              {chartData.filter(d => !d.isPositive).length}
            </p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-lg font-bold">
              {chartData.length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
