import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
  type TooltipItem,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { PieChart } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatCurrency,
  getBillTypeLabel,
  type TypeDistribution,
} from '@/hooks/useBillReports';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryDistributionChartProps {
  distribution: TypeDistribution;
  totalAmount: number;
}

const CATEGORY_COLORS: Record<string, { solid: string; soft: string }> = {
  rent: { solid: '#ef4444', soft: 'rgba(239,68,68,0.76)' },
  housing: { solid: '#fb7185', soft: 'rgba(251,113,133,0.76)' },
  utilities: { solid: '#3b82f6', soft: 'rgba(59,130,246,0.76)' },
  telecom: { solid: '#8b5cf6', soft: 'rgba(139,92,246,0.76)' },
  subscription: { solid: '#ec4899', soft: 'rgba(236,72,153,0.76)' },
  service: { solid: '#10b981', soft: 'rgba(16,185,129,0.76)' },
  tax: { solid: '#f97316', soft: 'rgba(249,115,22,0.76)' },
  loan: { solid: '#0ea5e9', soft: 'rgba(14,165,233,0.76)' },
  insurance: { solid: '#84cc16', soft: 'rgba(132,204,22,0.76)' },
  education: { solid: '#eab308', soft: 'rgba(234,179,8,0.76)' },
  health: { solid: '#f43f5e', soft: 'rgba(244,63,94,0.76)' },
  transport: { solid: '#6366f1', soft: 'rgba(99,102,241,0.76)' },
  food: { solid: '#f59e0b', soft: 'rgba(245,158,11,0.76)' },
  entertainment: { solid: '#a855f7', soft: 'rgba(168,85,247,0.76)' },
  other: { solid: '#94a3b8', soft: 'rgba(148,163,184,0.76)' },
};

const DEFAULT_COLOR = { solid: '#94a3b8', soft: 'rgba(148,163,184,0.76)' };

function getThemeColor(token: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value ? `hsl(${value})` : fallback;
}

function safeMetric(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function CategoryDistributionChart({
  distribution,
  totalAmount,
}: CategoryDistributionChartProps) {
  const categories = Object.keys(distribution);
  const textColor = getThemeColor('--muted-foreground', 'rgba(148,163,184,0.92)');
  const foregroundColor = getThemeColor('--foreground', '#f8fafc');
  const tooltipBg = getThemeColor('--popover', 'rgba(15,23,42,0.95)');

  if (categories.length === 0) {
    return (
      <Card className="rounded-[1.75rem] border-border/70 bg-card/95 shadow-[0_20px_50px_rgba(2,6,23,0.2)]">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="flex items-center gap-2 text-[1.1rem] font-semibold tracking-tight">
            <PieChart className="h-5 w-5 text-primary" />
            Distribuição por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent className="py-16 text-center text-muted-foreground">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-border/60 bg-surface/70">
            <PieChart className="h-7 w-7 opacity-60" />
          </div>
          <p className="text-base font-semibold text-foreground">Sem dados para exibir</p>
          <p className="mt-2 text-sm">Cadastre mais contas para analisar como os gastos se distribuem.</p>
        </CardContent>
      </Card>
    );
  }

  const normalizedDistribution = Object.fromEntries(
    categories.map((category) => {
      const entry = distribution[category];

      return [
        category,
        {
          count: safeMetric(entry?.count),
          total: safeMetric(entry?.total),
          percentage: safeMetric(entry?.percentage),
        },
      ];
    }),
  );

  const sortedCategories = categories.sort(
    (a, b) => normalizedDistribution[b].total - normalizedDistribution[a].total,
  );

  const chartData = {
    labels: sortedCategories.map((category) => getBillTypeLabel(category)),
    datasets: [
      {
        data: sortedCategories.map((category) => normalizedDistribution[category].total),
        backgroundColor: sortedCategories.map((category) => (CATEGORY_COLORS[category] || DEFAULT_COLOR).soft),
        borderColor: sortedCategories.map((category) => (CATEGORY_COLORS[category] || DEFAULT_COLOR).solid),
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
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
        displayColors: false,
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => {
            const category = sortedCategories[context.dataIndex];
            const data = normalizedDistribution[category];
            return `${formatCurrency(data.total)} • ${data.percentage.toFixed(1)}% • ${data.count} conta${data.count > 1 ? 's' : ''}`;
          },
        },
      },
    },
  };

  return (
    <Card className="rounded-[1.75rem] border-border/70 bg-card/95 shadow-[0_20px_50px_rgba(2,6,23,0.2)]">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-[1.1rem] font-semibold tracking-tight">
          <PieChart className="h-5 w-5 text-primary" />
          Distribuição por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="relative h-[320px] rounded-[1.4rem] border border-border/60 bg-surface/40 p-4">
          <Doughnut data={chartData} options={options} />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full border border-border/60 bg-background/75 px-5 py-4 text-center shadow-[0_10px_30px_rgba(2,6,23,0.16)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {sortedCategories.slice(0, 4).map((category) => {
            const data = normalizedDistribution[category];
            const color = CATEGORY_COLORS[category] || DEFAULT_COLOR;

            return (
              <div
                key={category}
                className="rounded-[1.2rem] border border-border/60 bg-surface/50 px-4 py-3"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: color.solid }} />
                    <span className="text-sm font-medium text-foreground">
                      {getBillTypeLabel(category)}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(data.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{data.count} conta{data.count > 1 ? 's' : ''}</span>
                  <span>{data.percentage.toFixed(1)}% do total</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
