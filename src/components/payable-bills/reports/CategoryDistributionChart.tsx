import { Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart } from 'lucide-react';
import { TypeDistribution, getBillTypeLabel, formatCurrency } from '@/hooks/useBillReports';

// Registrar componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryDistributionChartProps {
  distribution: TypeDistribution;
  totalAmount: number;
}

// Cores para cada categoria
const CATEGORY_COLORS: Record<string, { bg: string; border: string }> = {
  rent: { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgb(239, 68, 68)' },
  housing: { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgb(239, 68, 68)' },
  utilities: { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgb(59, 130, 246)' },
  telecom: { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgb(168, 85, 247)' },
  subscription: { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgb(236, 72, 153)' },
  service: { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgb(34, 197, 94)' },
  tax: { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgb(249, 115, 22)' },
  loan: { bg: 'rgba(14, 165, 233, 0.8)', border: 'rgb(14, 165, 233)' },
  insurance: { bg: 'rgba(132, 204, 22, 0.8)', border: 'rgb(132, 204, 22)' },
  education: { bg: 'rgba(251, 191, 36, 0.8)', border: 'rgb(251, 191, 36)' },
  health: { bg: 'rgba(244, 63, 94, 0.8)', border: 'rgb(244, 63, 94)' },
  transport: { bg: 'rgba(99, 102, 241, 0.8)', border: 'rgb(99, 102, 241)' },
  food: { bg: 'rgba(245, 158, 11, 0.8)', border: 'rgb(245, 158, 11)' },
  entertainment: { bg: 'rgba(139, 92, 246, 0.8)', border: 'rgb(139, 92, 246)' },
  other: { bg: 'rgba(156, 163, 175, 0.8)', border: 'rgb(156, 163, 175)' }
};

const DEFAULT_COLOR = { bg: 'rgba(156, 163, 175, 0.8)', border: 'rgb(156, 163, 175)' };

export function CategoryDistributionChart({ distribution, totalAmount }: CategoryDistributionChartProps) {
  const categories = Object.keys(distribution);
  
  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChart className="h-5 w-5" />
            Distribuição por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <PieChart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sem dados para exibir</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ordenar por valor (maior primeiro)
  const sortedCategories = categories.sort(
    (a, b) => distribution[b].total - distribution[a].total
  );

  const chartData = {
    labels: sortedCategories.map(cat => getBillTypeLabel(cat)),
    datasets: [{
      data: sortedCategories.map(cat => distribution[cat].total),
      backgroundColor: sortedCategories.map(cat => 
        (CATEGORY_COLORS[cat] || DEFAULT_COLOR).bg
      ),
      borderColor: sortedCategories.map(cat => 
        (CATEGORY_COLORS[cat] || DEFAULT_COLOR).border
      ),
      borderWidth: 2,
      hoverOffset: 8
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const category = sortedCategories[context.dataIndex];
            const data = distribution[category];
            return [
              `${formatCurrency(data.total)}`,
              `${data.percentage.toFixed(1)}% do total`,
              `${data.count} conta${data.count > 1 ? 's' : ''}`
            ];
          }
        }
      }
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="h-5 w-5" />
          Distribuição por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] relative">
          <Doughnut data={chartData} options={options} />
          
          {/* Centro do donut com total */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* Lista resumida das top 3 categorias */}
        <div className="mt-4 space-y-2">
          {sortedCategories.slice(0, 3).map((cat, index) => {
            const data = distribution[cat];
            const color = CATEGORY_COLORS[cat] || DEFAULT_COLOR;
            
            return (
              <div key={cat} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: color.border }}
                  />
                  <span className="text-muted-foreground">
                    {getBillTypeLabel(cat)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatCurrency(data.total)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({data.percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
