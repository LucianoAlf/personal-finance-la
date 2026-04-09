import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { ChartCard } from './ChartCard';
import { formatCurrency } from '@/utils/formatters';
import { useMemo } from 'react';
import type { Transaction } from '@/types/transactions';
import { isInvoicePaymentExpense } from '@/utils/transactionCompetence';

interface ExpensesByCategoryChartProps {
  transactions: Transaction[];
  selectedDate: Date;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export function ExpensesByCategoryChart({ transactions, selectedDate }: ExpensesByCategoryChartProps) {
  void selectedDate;

  // As transações já vêm filtradas por competência no pai.
  // Aqui seguimos a mesma regra do card "Despesas do Mês":
  // incluir despesas de cartão e excluir apenas pagamentos de fatura.
  const expenses = useMemo(() => (
    transactions.filter((t) => t.type === 'expense' && !isInvoicePaymentExpense(t))
  ), [transactions]);

  // Agrupar por categoria usando a categoria embutida na transação (evita esperar hook de categorias)
  const grouped = useMemo(() => {
    return expenses.reduce((acc, transaction: any) => {
      const cat = transaction.category; // vem de useTransactionsQuery
      const categoryName = cat?.name || 'Sem categoria';
      const categoryColor = cat?.color || '#9ca3af';

      if (!acc[categoryName]) {
        acc[categoryName] = { value: 0, color: categoryColor };
      }
      acc[categoryName].value += Number(transaction.amount);
      return acc;
    }, {} as Record<string, { value: number; color: string }>);
  }, [expenses]);

  // Converter para array, ordenar (Top 5) e calcular porcentagens
  const { chartData, total } = useMemo(() => {
    const arr: ChartData[] = Object.entries(grouped)
      .map(([name, data]) => ({
        name,
        value: data.value,
        color: data.color,
        percentage: 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const t = arr.reduce((sum, item) => sum + item.value, 0);
    arr.forEach((item) => {
      item.percentage = t > 0 ? (item.value / t) * 100 : 0;
    });
    return { chartData: arr, total: t };
  }, [grouped]);

  /** Tags canônicas nas despesas do período (conta + cartão), por frequência. */
  const topExpenseTags = useMemo(() => {
    const counts = new Map<string, { name: string; color: string; count: number }>();
    for (const t of expenses) {
      for (const tag of t.tags ?? []) {
        if (!tag?.id) continue;
        const cur = counts.get(tag.id) ?? {
          name: tag.name,
          color: tag.color || '#a855f7',
          count: 0,
        };
        cur.count += 1;
        counts.set(tag.id, cur);
      }
    }
    return [...counts.entries()]
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [expenses]);

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload as ChartData;

    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-gray-900 dark:text-white mb-1">{data.name}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
          {formatCurrency(data.value)}
        </p>
        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
          {data.percentage.toFixed(1)}% do total
        </p>
      </div>
    );
  };

  // Renderizar label customizado
  const renderLabel = (entry: any) => {
    return `${entry.percentage.toFixed(0)}%`;
  };

  const isEmpty = chartData.length === 0;

  return (
    <ChartCard
      title="Despesas por Categoria"
      icon={PieChartIcon}
      headerTone="satin-clean"
      isEmpty={isEmpty}
      emptyMessage="Nenhuma despesa registrada neste mês"
    >
      <div className="w-full">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={renderLabel}
              labelLine={false}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {value} - {formatCurrency(entry.payload.value)}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Total */}
        <div className="mt-4 pt-4 border-t dark:border-gray-700 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total de Despesas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(total)}</p>
        </div>

        {topExpenseTags.length > 0 ? (
          <div className="mt-4 pt-3 border-t dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">
              Tags mais frequentes no mês
            </p>
            <ul className="flex flex-wrap justify-center gap-2">
              {topExpenseTags.map((row) => (
                <li
                  key={row.id}
                  className="inline-flex items-center gap-1.5 text-xs rounded-full px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  />
                  {row.name}
                  <span className="text-gray-500 dark:text-gray-500">({row.count})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </ChartCard>
  );
}
