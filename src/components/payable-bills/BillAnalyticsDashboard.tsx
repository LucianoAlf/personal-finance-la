import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useBillAnalytics } from '@/hooks/useBillAnalytics';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function BillAnalyticsDashboard() {
  const { analytics, loading } = useBillAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Dados insuficientes para gerar analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  const { totals, performance, monthly_totals, forecast, top_providers, by_type } = analytics;

  // Dados para gráfico de linha (mensal)
  const monthlyChartData = {
    labels: monthly_totals.map(m => m.month_name),
    datasets: [
      {
        label: 'Total',
        data: monthly_totals.map(m => m.total),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Pago',
        data: monthly_totals.map(m => m.paid),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  // Dados para gráfico de pizza (tipos)
  const typeLabels = Object.keys(by_type);
  const typeChartData = {
    labels: typeLabels.map(key => {
      const labels: Record<string, string> = {
        service: 'Serviços',
        telecom: 'Telecom',
        subscription: 'Assinaturas',
        utilities: 'Utilidades',
        tax: 'Impostos',
        rent: 'Aluguel',
        loan: 'Empréstimos',
        installment: 'Parcelamentos',
        insurance: 'Seguros',
        education: 'Educação',
        health: 'Saúde',
        other: 'Outros'
      };
      return labels[key] || key;
    }),
    datasets: [{
      data: typeLabels.map(key => by_type[key].total),
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(14, 165, 233, 0.8)',
        'rgba(132, 204, 22, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(156, 163, 175, 0.8)'
      ]
    }]
  };

  // Dados para gráfico de barras (top providers)
  const providerChartData = {
    labels: top_providers.map(p => p.provider.slice(0, 20)),
    datasets: [{
      label: 'Total Gasto',
      data: top_providers.map(p => p.total),
      backgroundColor: 'rgba(99, 102, 241, 0.8)',
    }]
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0
                }).format(totals.total_amount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.total_bills} contas no período
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pontualidade */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa Pontualidade</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                performance.on_time_payment_rate >= 80 ? "text-green-600" : "text-orange-600"
              )}>
                {performance.on_time_payment_rate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.paid_count} pagas / {totals.total_bills} total
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Atraso Médio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Atraso Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performance.avg_delay_days.toFixed(1)} dias
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Máximo: {performance.max_delay_days.toFixed(0)} dias
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Previsão */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Previsão Próx. Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0
                }).format(forecast.next_month_prediction)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado em {forecast.based_on_months} meses
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Cards Secundários */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Pagas */}
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Pagas
                </p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(totals.paid_amount)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                  {totals.paid_count} contas
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        {/* Vencidas */}
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Vencidas
                </p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-300">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(totals.overdue_amount)}
                </p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                  {totals.overdue_count} contas
                </p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>

        {/* Pendentes */}
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  Pendentes
                </p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(totals.pending_amount)}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                  {totals.pending_count} contas
                </p>
              </div>
              <Calendar className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Linha - Mensal */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line
                data={monthlyChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          return `${context.dataset.label}: ${new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(context.parsed.y)}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      ticks: {
                        callback: (value) => new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0
                        }).format(value as number)
                      }
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Tipos */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <Pie
                data={typeChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.parsed;
                          const percentage = typeLabels[context.dataIndex] 
                            ? by_type[typeLabels[context.dataIndex]].percentage 
                            : 0;
                          return `${label}: ${new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(value)} (${percentage.toFixed(1)}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Top Fornecedores */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Fornecedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar
                data={providerChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const provider = top_providers[context.dataIndex];
                          return [
                            `Total: ${new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(provider.total)}`,
                            `Contas: ${provider.count}`,
                            `Média: ${new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(provider.avg)}`
                          ];
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      ticks: {
                        callback: (value) => new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0
                        }).format(value as number)
                      }
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
