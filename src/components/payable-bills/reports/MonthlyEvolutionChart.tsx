import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Loader2 } from 'lucide-react';
import { MonthlyTotal, formatCurrency } from '@/hooks/useBillReports';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MonthlyEvolutionChartProps {
  data: MonthlyTotal[];
  loading?: boolean;
}

export function MonthlyEvolutionChart({ data, loading }: MonthlyEvolutionChartProps) {
  if (loading) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Evolução Mensal
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Evolução Mensal
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sem dados para exibir</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = {
    labels: data.map(m => m.month_name),
    datasets: [
      {
        label: 'Total',
        data: data.map(m => m.total),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Pago',
        data: data.map(m => m.paid),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Pendente',
        data: data.map(m => m.pending),
        borderColor: 'rgb(251, 191, 36)',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        tension: 0.4,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderDash: [5, 5]
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            
            // Adicionar variação se houver ponto anterior
            const dataIndex = context.dataIndex;
            if (dataIndex > 0 && context.dataset.label === 'Total') {
              const previousValue = context.dataset.data[dataIndex - 1];
              const currentValue = context.parsed.y;
              if (previousValue && currentValue) {
                const variation = ((currentValue - previousValue) / previousValue * 100).toFixed(1);
                const sign = parseFloat(variation) > 0 ? '+' : '';
                label += ` (${sign}${variation}%)`;
              }
            }
            
            return label;
          },
          afterBody: function(context: any) {
            const dataIndex = context[0].dataIndex;
            const monthData = data[dataIndex];
            return [`\n${monthData.count} contas no mês`];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          },
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      }
    }
  };

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5" />
          Evolução Mensal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
