import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { ChartCard } from './ChartCard';
import { formatCurrency } from '@/utils/formatters';
import { useMemo } from 'react';
import type { Transaction } from '@/types/transactions';

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
  // Filtrar apenas despesas pagas (as transações já vêm filtradas por mês no pai)
  const expenses = useMemo(() => (
    transactions.filter(t => t.type === 'expense' && t.is_paid)
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

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0].payload as ChartData;
    
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
        <p className="text-sm text-gray-600 mb-1">
          {formatCurrency(data.value)}
        </p>
        <p className="text-xs text-purple-600 font-medium">
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
                <span className="text-sm text-gray-700">
                  {value} - {formatCurrency(entry.payload.value)}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Total */}
        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-sm text-gray-600">Total de Despesas</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
        </div>
      </div>
    </ChartCard>
  );
}
