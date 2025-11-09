import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { getCategoryLabel, getCategoryColor } from '@/hooks/usePortfolioMetrics';
import { formatCurrency } from '@/utils/formatters';

interface AllocationData {
  category: string;
  value: number;
  percentage: number;
  count: number;
}

interface AssetAllocationChartProps {
  data: AllocationData[];
}

export function AssetAllocationChart({ data }: AssetAllocationChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alocação por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhum dado disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  // Preparar dados para o gráfico
  const chartData = data.map((item) => ({
    name: getCategoryLabel(item.category),
    value: item.value,
    percentage: item.percentage,
    count: item.count,
    color: getCategoryColor(item.category),
  }));

  // Custom label para mostrar percentual
  const renderLabel = (entry: any) => {
    return `${entry.percentage.toFixed(1)}%`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-1">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Valor: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">
            Percentual: {data.percentage.toFixed(2)}%
          </p>
          <p className="text-sm text-muted-foreground">
            Ativos: {data.count}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alocação por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total de Categorias</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total de Ativos</p>
            <p className="text-2xl font-bold">
              {data.reduce((sum, item) => sum + item.count, 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
