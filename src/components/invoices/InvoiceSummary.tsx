import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/hooks/useCategories';
import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { formatCurrency } from '@/utils/formatters';

interface InvoiceSummaryProps {
  invoiceId: string;
}

const CATEGORY_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#6366F1', '#14B8A6'];

export function InvoiceSummary({ invoiceId }: InvoiceSummaryProps) {
  const { transactions, loading } = useCreditCardTransactions();
  const { categories } = useCategories();

  const invoiceTransactions = transactions.filter((transaction) => transaction.invoice_id === invoiceId);

  const categoryTotals = invoiceTransactions.reduce((accumulator, transaction) => {
    const categoryName =
      categories.find((category) => category.id === (transaction.category_id || ''))?.name || 'Outros';
    accumulator[categoryName] = (accumulator[categoryName] || 0) + transaction.amount;
    return accumulator;
  }, {} as Record<string, number>);

  const chartData = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value,
      percentage: 0,
    }))
    .sort((first, second) => second.value - first.value);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  chartData.forEach((item) => {
    item.percentage = total > 0 ? (item.value / total) * 100 : 0;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[340px] w-full rounded-[28px]" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-16 w-full rounded-[20px]" />
          ))}
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-border/70 bg-surface-elevated/35 px-5 py-10 text-center text-sm text-muted-foreground">
        Nenhuma transacao encontrada para esta fatura.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    const data = payload[0].payload;

    return (
      <div className="rounded-[18px] border border-border/70 bg-card/95 p-3 shadow-[0_18px_40px_rgba(2,6,23,0.24)] backdrop-blur-xl">
        <p className="font-semibold text-foreground">{data.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(data.value)}</p>
        <p className="text-xs text-muted-foreground">{data.percentage.toFixed(1)}%</p>
      </div>
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px]">
      <div className="rounded-[28px] border border-border/70 bg-surface-elevated/45 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Categorias da fatura</h3>
            <p className="mt-1 text-sm text-muted-foreground">Distribuicao dos gastos por categoria neste ciclo.</p>
          </div>
          <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {chartData.length} categorias
          </div>
        </div>

        <div className="mt-5 h-[320px] rounded-[24px] border border-border/60 bg-background/50 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage.toFixed(0)}%`}
                outerRadius={108}
                innerRadius={50}
                dataKey="value"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={1}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[28px] border border-border/70 bg-surface-elevated/45 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total do ciclo</h4>
            <span className="text-[1.25rem] font-semibold tracking-tight text-primary">{formatCurrency(total)}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Os maiores grupos de gasto da fatura aparecem abaixo para facilitar o corte fino.
          </p>
        </div>

        <div className="space-y-3">
          {chartData.map((item, index) => (
            <div
              key={item.name}
              className="rounded-[22px] border border-border/70 bg-card/95 p-4 shadow-[0_10px_28px_rgba(2,6,23,0.12)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}% da fatura</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(item.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
