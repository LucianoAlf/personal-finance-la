import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { ChartCard } from './ChartCard';
import { formatCurrency } from '@/utils/formatters';
import type { Transaction } from '@/types/transactions';

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
  // Gerar últimos 6 meses
  const getLast6Months = () => {
    const months = [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedDate);
      date.setMonth(date.getMonth() - i);
      months.push({
        month: monthNames[date.getMonth()],
        fullDate: date,
      });
    }
    return months;
  };

  // Calcular receitas e despesas por mês
  const chartData: ChartData[] = getLast6Months().map(({ month, fullDate }) => {
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.transaction_date);
      return (
        tDate.getMonth() === fullDate.getMonth() &&
        tDate.getFullYear() === fullDate.getFullYear() &&
        t.is_paid
      );
    });
    
    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const expense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    return { month, income, expense };
  });

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-semibold text-gray-900">
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
      isEmpty={!hasData}
      emptyMessage="Dados insuficientes para gerar o gráfico"
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af"
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
            animationDuration={1000}
          />
          <Line 
            type="monotone" 
            dataKey="expense" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
            name="Despesas"
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
