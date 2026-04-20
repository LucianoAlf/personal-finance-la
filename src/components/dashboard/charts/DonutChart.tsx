import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/utils/formatters';

export interface DonutChartItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface DonutChartProps {
  data: DonutChartItem[];
  total: number;
}

export function DonutChart({ data, total }: DonutChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        Sem despesas neste mês.
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label="Despesas por categoria"
      className="flex flex-col items-center gap-4"
    >
      <div className="relative h-[200px] w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div data-testid="donut-total" className="text-lg font-semibold text-foreground">
            {formatCurrency(total)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">TOTAL</div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {data.map((item) => (
          <div
            key={item.name}
            data-testid="donut-chip"
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-foreground',
            )}
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ background: item.color }}
            />
            <span className="font-medium">{item.name}</span>
            <span className="text-muted-foreground">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
