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

const shellClassName =
  'rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]';

function normalizeNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AssetAllocationChart({ data }: AssetAllocationChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className={shellClassName}>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight">Alocação por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface-elevated/35 text-sm text-muted-foreground">
            Nenhum dado disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: getCategoryLabel(item.category),
    value: normalizeNumber(item.value),
    percentage: normalizeNumber(item.percentage),
    count: normalizeNumber(item.count),
    color: getCategoryColor(item.category),
  }));

  const renderLabel = (entry: { percentage?: number }) => `${normalizeNumber(entry.percentage).toFixed(1)}%`;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-2xl border border-border/70 bg-popover/95 p-3 text-popover-foreground shadow-xl backdrop-blur-xl">
          <p className="mb-1 font-semibold tracking-tight">{item.name}</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Valor: {formatCurrency(item.value)}</p>
            <p>Percentual: {normalizeNumber(item.percentage).toFixed(2)}%</p>
            <p>Ativos: {normalizeNumber(item.count)}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={shellClassName}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold tracking-tight">Alocação por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-border/60 bg-surface-elevated/35 p-4">
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
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border/60 bg-surface-elevated/45 p-4 text-center">
            <p className="mb-1 text-sm text-muted-foreground">Total de categorias</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{data.length}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface-elevated/45 p-4 text-center">
            <p className="mb-1 text-sm text-muted-foreground">Total de ativos</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {chartData.reduce((sum, item) => sum + item.count, 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
