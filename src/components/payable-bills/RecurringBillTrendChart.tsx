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
  Filler,
  ChartOptions
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

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

interface RecurringBillTrendChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension: number;
    }[];
  };
  loading?: boolean;
}

export function RecurringBillTrendChart({ data, loading }: RecurringBillTrendChartProps) {
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(context.parsed.y);
            }
            
            // Adicionar variação se houver ponto anterior
            const dataIndex = context.dataIndex;
            if (dataIndex > 0) {
              const previousValue = context.dataset.data[dataIndex - 1] as number;
              const currentValue = context.parsed.y;
              if (previousValue && currentValue) {
                const variation = ((currentValue - previousValue) / previousValue * 100).toFixed(1);
                const sign = parseFloat(variation) > 0 ? '+' : '';
                label += ` (${sign}${variation}%)`;
              }
            }
            
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 0
            }).format(value as number);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendências (últimos 12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data.datasets || data.datasets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendências (últimos 12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma conta recorrente com histórico suficiente</p>
            <p className="text-xs mt-1">Crie contas recorrentes para ver as tendências</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendências (últimos 12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <Line options={options} data={data} />
          </div>
          
          {/* Info */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              💡 <span className="font-medium">Dica:</span> Passe o mouse sobre os pontos para ver os valores e variações percentuais.
              Clique nas legendas para ocultar/mostrar contas.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
