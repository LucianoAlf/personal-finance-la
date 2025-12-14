import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSpendingPatterns } from '@/hooks/useSpendingPatterns';

interface TemporalAnalysisCardProps {
  cardId?: string;
}

export function TemporalAnalysisCard({ cardId }: TemporalAnalysisCardProps) {
  const { temporalData, daysShort, loading, transactionCount } = useSpendingPatterns(cardId);
  
  const hours = ['Manhã', 'Tarde', 'Noite'];

  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-100';
    if (value >= 80) return 'bg-purple-600';
    if (value >= 60) return 'bg-purple-500';
    if (value >= 40) return 'bg-purple-400';
    if (value >= 20) return 'bg-purple-300';
    return 'bg-purple-200';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análise Temporal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Análise Temporal
        </CardTitle>
        <span className="text-xs text-gray-500">
          {transactionCount} transações
        </span>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            <div className="text-xs font-medium text-gray-500"></div>
            {hours.map(hour => (
              <div key={hour} className="text-xs font-medium text-gray-500 text-center">
                {hour}
              </div>
            ))}
          </div>

          {/* Heatmap */}
          {daysShort.map((day, dayIndex) => (
            <div key={day} className="grid grid-cols-4 gap-1">
              <div className="text-xs font-medium text-gray-700 flex items-center">
                {day}
              </div>
              {temporalData.heatmap[dayIndex].map((value, hourIndex) => (
                <div
                  key={hourIndex}
                  className={`h-8 rounded ${getColor(value)} transition-all hover:scale-105 cursor-pointer`}
                  title={`${day} - ${hours[hourIndex]}: ${value}% de atividade`}
                />
              ))}
            </div>
          ))}

          {/* Legenda */}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
            <span>Menos</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-gray-100 rounded border"></div>
              <div className="w-4 h-4 bg-purple-200 rounded"></div>
              <div className="w-4 h-4 bg-purple-300 rounded"></div>
              <div className="w-4 h-4 bg-purple-400 rounded"></div>
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <div className="w-4 h-4 bg-purple-600 rounded"></div>
            </div>
            <span>Mais</span>
          </div>

          {transactionCount === 0 && (
            <div className="text-center text-sm text-gray-500 mt-4">
              Sem dados de transações para exibir o heatmap.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
