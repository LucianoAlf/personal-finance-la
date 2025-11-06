import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useChartData } from '@/hooks/useChartData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/formatters';
import { TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ExpensesTimeline() {
  const { data: analyticsData, loading } = useAnalytics();
  const { timelineData } = useChartData(analyticsData);
  const [viewMode, setViewMode] = useState<'daily' | 'accumulated'>('accumulated');

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (timelineData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Sem dados para exibir
          </h3>
          <p className="text-gray-600">
            Adicione transações para visualizar a evolução temporal
          </p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-1">
            {new Date(label).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-gray-600">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Evolução dos Gastos
          </h3>
          <p className="text-sm text-gray-600">
            Acompanhe seus gastos ao longo do tempo
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('daily')}
          >
            Diário
          </Button>
          <Button
            variant={viewMode === 'accumulated' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('accumulated')}
          >
            Acumulado
          </Button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        {viewMode === 'accumulated' ? (
          <AreaChart data={timelineData}>
            <defs>
              <linearGradient id="colorAccumulated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).getDate().toString()}
              stroke="#6b7280"
            />
            <YAxis 
              tickFormatter={(value) => `R$ ${value}`}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="accumulated"
              name="Acumulado"
              stroke="#8b5cf6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAccumulated)"
              animationBegin={0}
              animationDuration={1000}
            />
          </AreaChart>
        ) : (
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).getDate().toString()}
              stroke="#6b7280"
            />
            <YAxis 
              tickFormatter={(value) => `R$ ${value}`}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="amount"
              name="Diário"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 4 }}
              activeDot={{ r: 6 }}
              animationBegin={0}
              animationDuration={1000}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
