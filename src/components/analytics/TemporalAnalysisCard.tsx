import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TemporalAnalysisCard() {
  // Heatmap simplificado - versão visual básica
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const hours = ['Manhã', 'Tarde', 'Noite'];
  
  // Dados mockados (0-100)
  const heatmapData = [
    [20, 30, 40],  // Dom
    [50, 60, 45],  // Seg
    [55, 70, 50],  // Ter
    [60, 75, 55],  // Qua
    [65, 80, 60],  // Qui
    [70, 85, 90],  // Sex
    [90, 95, 85],  // Sáb
  ];

  const getColor = (value: number) => {
    if (value >= 80) return 'bg-purple-600';
    if (value >= 60) return 'bg-purple-500';
    if (value >= 40) return 'bg-purple-400';
    if (value >= 20) return 'bg-purple-300';
    return 'bg-purple-200';
  };

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
          {days.map((day, dayIndex) => (
            <div key={day} className="grid grid-cols-4 gap-1">
              <div className="text-xs font-medium text-gray-700 flex items-center">
                {day}
              </div>
              {heatmapData[dayIndex].map((value, hourIndex) => (
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
              <div className="w-4 h-4 bg-purple-200 rounded"></div>
              <div className="w-4 h-4 bg-purple-300 rounded"></div>
              <div className="w-4 h-4 bg-purple-400 rounded"></div>
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <div className="w-4 h-4 bg-purple-600 rounded"></div>
            </div>
            <span>Mais</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
