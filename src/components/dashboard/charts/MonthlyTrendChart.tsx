import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { ChartCard } from './ChartCard';
import { formatCurrency } from '@/utils/formatters';
import type { Transaction } from '@/types/transactions';
import { useMemo } from 'react';
import { competenceMonthFromTransaction, isInvoicePaymentExpense } from '@/utils/transactionCompetence';

interface MonthlyTrendChartProps {
  transactions: Transaction[];
  selectedDate: Date;
}

interface ChartData {
  month: string;
  income: number;
  expense: number;
}

export function MonthlyTrendChart({ transactions, selectedDate }: MonthlyTrendChartProps) {
  // Gerar últimos 6 meses (memo)
  const monthsWindow = useMemo(() => {
    const months = [] as { month: string; yearMonth: string }[];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedDate);
      date.setMonth(date.getMonth() - i);
      months.push({
        month: monthNames[date.getMonth()],
        yearMonth: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      });
    }
    return months;
  }, [selectedDate]);

  // Calcular receitas e despesas usando a mesma régua dos cards:
  // mês de competência para cartão e exclusão de pagamento de fatura.
  const chartData: ChartData[] = useMemo(() => {
    return monthsWindow.map(({ month, yearMonth }) => {
      const monthTransactions = transactions.filter(
        (t) => competenceMonthFromTransaction(t) === yearMonth
      );

      const income = monthTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = monthTransactions
        .filter((t) => t.type === 'expense' && !isInvoicePaymentExpense(t))
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return { month, income, expense };
    });
  }, [monthsWindow, transactions]);

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-300">{entry.name}:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Formatar eixo Y
  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value}`;
  };

  // Verificar se há dados
  const hasData = chartData.some(d => d.income > 0 || d.expense > 0);

  return (
    <ChartCard
      title="Evolução Mensal (Últimos 6 Meses)"
      icon={TrendingUp}
      headerTone="satin-clean"
      isEmpty={!hasData}
      emptyMessage="Dados insuficientes para gerar o gráfico"
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="month"
            className="text-gray-600 dark:text-gray-400"
            stroke="currentColor"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            className="text-gray-600 dark:text-gray-400"
            stroke="currentColor"
            style={{ fontSize: '12px' }}
            tickFormatter={formatYAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
            iconType="line"
          />
          <Line 
            type="monotone" 
            dataKey="income" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
            name="Receitas"
            isAnimationActive={false}
          />
          <Line 
            type="monotone" 
            dataKey="expense" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
            name="Despesas"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
