import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  type TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Loader2, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, type MonthlyTotal } from '@/hooks/useBillReports';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface MonthlyEvolutionChartProps {
  data: MonthlyTotal[];
  loading?: boolean;
}

function getThemeColor(token: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value ? `hsl(${value})` : fallback;
}

function ChartShell({ children }: { children: React.ReactNode }) {
  return (
    <Card className="rounded-[1.75rem] border-border/70 bg-card/95 shadow-[0_20px_50px_rgba(2,6,23,0.2)]">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-[1.1rem] font-semibold tracking-tight">
          <TrendingUp className="h-5 w-5 text-primary" />
          Evolução Mensal
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

export function MonthlyEvolutionChart({ data, loading }: MonthlyEvolutionChartProps) {
  if (loading) {
    return (
      <ChartShell>
        <div className="flex h-[320px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ChartShell>
    );
  }

  if (!data || data.length === 0) {
    return (
      <ChartShell>
        <div className="flex h-[320px] items-center justify-center text-center text-muted-foreground">
          <div>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-border/60 bg-surface/70">
              <TrendingUp className="h-7 w-7 opacity-60" />
            </div>
            <p className="text-base font-semibold text-foreground">Sem dados para exibir</p>
            <p className="mt-2 text-sm">Adicione contas em meses diferentes para ver a evolução.</p>
          </div>
        </div>
      </ChartShell>
    );
  }

  const textColor = getThemeColor('--muted-foreground', 'rgba(148,163,184,0.9)');
  const foregroundColor = getThemeColor('--foreground', '#f8fafc');
  const gridColor = typeof window === 'undefined'
    ? 'rgba(148,163,184,0.12)'
    : document.documentElement.classList.contains('dark')
      ? 'rgba(148,163,184,0.12)'
      : 'rgba(15,23,42,0.08)';
  const tooltipBg = getThemeColor('--popover', 'rgba(15,23,42,0.95)');

  const chartData = {
    labels: data.map((month) => month.month_name),
    datasets: [
      {
        label: 'Total',
        data: data.map((month) => month.total),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139,92,246,0.12)',
        tension: 0.38,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Pago',
        data: data.map((month) => month.paid),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        tension: 0.38,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Pendente',
        data: data.map((month) => month.pending),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.08)',
        tension: 0.35,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderDash: [6, 5],
      },
    ],
  };

  const options = {
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
          color: textColor,
          usePointStyle: true,
          boxWidth: 8,
          padding: 18,
          font: {
            size: 12,
            weight: 600,
          },
        },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: foregroundColor,
        bodyColor: foregroundColor,
        borderColor: 'rgba(148,163,184,0.18)',
        borderWidth: 1,
        padding: 14,
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const label = context.dataset.label ? `${context.dataset.label}: ` : '';
            const value = context.parsed.y ?? 0;
            return `${label}${formatCurrency(value)}`;
          },
          afterBody: (contexts: TooltipItem<'line'>[]) => {
            const month = data[contexts[0].dataIndex];
            return [`${month.count} conta${month.count > 1 ? 's' : ''} no mês`];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: textColor,
          callback: (value: string | number) => formatCurrency(Number(value)),
          font: { size: 11 },
        },
        grid: {
          color: gridColor,
        },
      },
      x: {
        ticks: {
          color: textColor,
          font: { size: 11 },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <ChartShell>
      <div className="h-[320px] rounded-[1.35rem] border border-border/60 bg-surface/35 p-4">
        <Line data={chartData} options={options} />
      </div>
    </ChartShell>
  );
}
