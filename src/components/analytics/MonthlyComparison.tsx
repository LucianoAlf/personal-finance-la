import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useChartData } from '@/hooks/useChartData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/formatters';
import { BarChart3 } from 'lucide-react';

const CARD_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export function MonthlyComparison() {
  const { data: analyticsData, loading } = useAnalytics();
  const { comparisonData } = useChartData(analyticsData);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (comparisonData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Sem dados para exibir
          </h3>
          <p className="text-gray-600">
            É necessário pelo menos 2 meses de histórico para comparação
          </p>
        </div>
      </div>
    );
  }

  // Extrair nomes únicos de cartões
  const cardNames = Array.from(
    new Set(
      comparisonData.flatMap(month => Object.keys(month.cards))
    )
  );

  // Transformar dados para o formato do Recharts
  const chartData = comparisonData.map(month => ({
    month: month.month,
    ...month.cards,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-gray-600">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          <div className="border-t border-gray-200 mt-2 pt-2">
            <p className="text-sm font-semibold text-gray-900">
              Total: {formatCurrency(total)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calcular média
  const average = comparisonData.reduce((sum, month) => sum + month.total, 0) / comparisonData.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Comparativo Mensal
        </h3>
        <p className="text-sm text-gray-600">
          Compare seus gastos dos últimos meses por cartão
        </p>
        <div className="mt-2 flex items-center gap-4">
          <div className="text-sm">
            <span className="text-gray-600">Média mensal: </span>
            <span className="font-semibold text-gray-900">{formatCurrency(average)}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Período: </span>
            <span className="font-semibold text-gray-900">{comparisonData.length} meses</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="month" 
            stroke="#6b7280"
          />
          <YAxis 
            tickFormatter={(value) => `R$ ${value}`}
            stroke="#6b7280"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {cardNames.map((cardName, index) => (
            <Bar
              key={cardName}
              dataKey={cardName}
              name={cardName}
              fill={CARD_COLORS[index % CARD_COLORS.length]}
              animationBegin={index * 100}
              animationDuration={800}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Linha de tendência visual */}
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-8 h-0.5 bg-gray-300" />
          <span>Média: {formatCurrency(average)}</span>
        </div>
      </div>
    </div>
  );
}
