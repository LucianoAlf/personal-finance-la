import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { formatCurrency } from '@/utils/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/hooks/useCategories';

interface InvoiceSummaryProps {
  invoiceId: string;
}

// Cores para as categorias
const CATEGORY_COLORS = [
  '#8B5CF6', // Roxo
  '#EC4899', // Rosa
  '#F59E0B', // Laranja
  '#10B981', // Verde
  '#3B82F6', // Azul
  '#EF4444', // Vermelho
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

export function InvoiceSummary({ invoiceId }: InvoiceSummaryProps) {
  const { transactions, loading } = useCreditCardTransactions();
  const { categories } = useCategories();

  // Filtrar transações da fatura
  const invoiceTransactions = transactions.filter((t) => t.invoice_id === invoiceId);

  // Agrupar por categoria
  const categoryTotals = invoiceTransactions.reduce((acc, transaction) => {
    const name = categories.find(c => c.id === (transaction.category_id || ''))?.name || 'Outros';
    acc[name] = (acc[name] || 0) + transaction.amount;
    return acc;
  }, {} as Record<string, number>);

  // Preparar dados para o gráfico
  const chartData = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value,
      percentage: 0, // Será calculado depois
    }))
    .sort((a, b) => b.value - a.value);

  // Calcular total
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  // Calcular percentuais
  chartData.forEach((item) => {
    item.percentage = (item.value / total) * 100;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma transação para exibir
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">{formatCurrency(data.value)}</p>
          <p className="text-xs text-gray-500">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Gráfico de Pizza */}
      <div className="bg-white rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Despesas por Categoria
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percentage }) => `${percentage.toFixed(1)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Lista de Categorias */}
      <div className="space-y-2">
        {chartData.map((item, index) => (
          <div
            key={item.name}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
              />
              <span className="font-medium text-gray-900">{item.name}</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900">
                {formatCurrency(item.value)}
              </div>
              <div className="text-xs text-gray-500">
                {item.percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
        <span className="font-semibold text-gray-900">Total</span>
        <span className="text-xl font-bold text-purple-600">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
