import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Activity } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';
import { formatCurrency } from '@/utils/formatters';
import {
  formatReportMonth,
  getReportsSectionMeta,
  hasPositiveValues,
} from '@/utils/reports/view-model';
import {
  formatReportsAxisCurrency,
  reportsChartTooltipProps,
  reportsPanelClassName,
  reportsShellClassName,
  ReportsInsightNotice,
  ReportsMetricTile,
  ReportsSectionHeading,
} from './reports-shell';

interface ReportsTrendSectionProps {
  context: ReportIntelligenceContext | null;
  loading?: boolean;
}

export function ReportsTrendSection({
  context,
  loading = false,
}: ReportsTrendSectionProps) {
  if (loading) {
    return (
      <Card className={reportsShellClassName}>
        <CardHeader className="space-y-3 pb-4">
          <Skeleton className="h-8 w-56 rounded-full" />
          <Skeleton className="h-4 w-80 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <Skeleton className="h-[360px] w-full rounded-[24px]" />
        </CardContent>
      </Card>
    );
  }

  if (!context) {
    return null;
  }

  const section = context.cashflow;
  const meta = getReportsSectionMeta(context.quality.cashflow);

  if (!section || !hasPositiveValues(section.monthlySeries, ['income', 'expenses', 'net'])) {
    return (
      <Card className={reportsShellClassName}>
        <CardHeader className="space-y-3 pb-4">
          <ReportsSectionHeading
            title="Tendências do período"
            description={meta.description}
            metaLabel={meta.label}
            icon={<Activity className="h-5 w-5" />}
          />
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          Ainda não há movimentação suficiente para montar a série temporal do relatório.
        </CardContent>
      </Card>
    );
  }

  const trendIcon =
    section.trend === 'up'
      ? ArrowUpRight
      : section.trend === 'down'
        ? ArrowDownRight
        : ArrowRight;
  const trendLabel =
    section.trend === 'up'
      ? 'Tendência de melhora no saldo líquido'
      : section.trend === 'down'
        ? 'Tendência de piora no saldo líquido'
        : 'Saldo líquido estável no período';
  const TrendIcon = trendIcon;

  return (
    <Card className={reportsShellClassName}>
      <CardHeader className="space-y-3 pb-4">
        <ReportsSectionHeading
          title="Tendências do período"
          description={meta.description}
          metaLabel={meta.label}
          partial={meta.isPartial}
          icon={<Activity className="h-5 w-5" />}
        />
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {meta.isPartial ? (
          <ReportsInsightNotice title="Leitura parcial">
            Esta evolução usa apenas os pontos já consolidados do período selecionado.
          </ReportsInsightNotice>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <ReportsMetricTile label="Receitas" value={formatCurrency(section.incomeTotal)} tone="positive" />
          <ReportsMetricTile label="Despesas" value={formatCurrency(section.expenseTotal)} tone="negative" />
          <ReportsMetricTile label="Saldo líquido" value={formatCurrency(section.netTotal)} tone="violet" />
        </div>

        <div className={reportsPanelClassName}>
          <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-surface text-primary">
              <TrendIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium text-foreground">Leitura executiva</p>
              <p>{trendLabel}</p>
            </div>
          </div>

          <div className="h-[320px]">
            {meta.isAvailable ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={section.monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
                  <XAxis dataKey="month" tickFormatter={formatReportMonth} stroke="rgba(148, 163, 184, 0.6)" />
                  <YAxis tickFormatter={formatReportsAxisCurrency} stroke="rgba(148, 163, 184, 0.6)" />
                  <Tooltip
                    {...reportsChartTooltipProps}
                    labelFormatter={(value) => formatReportMonth(String(value))}
                    formatter={(value: number, name: string) => [
                      formatCurrency(Number(value)),
                      TREND_SERIES_LABELS[name] ?? name,
                    ]}
                  />
                  <Legend formatter={(value) => TREND_SERIES_LABELS[value as keyof typeof TREND_SERIES_LABELS] ?? value} />
                  <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2.5} dot={false} name="income" />
                  <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2.5} dot={false} name="expenses" />
                  <Line type="monotone" dataKey="net" stroke="#8b5cf6" strokeWidth={2.5} dot={false} name="net" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-border/60 text-sm text-muted-foreground">
                Série temporal indisponível para este período.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const TREND_SERIES_LABELS = {
  income: 'Receitas',
  expenses: 'Despesas',
  net: 'Saldo líquido',
} as const;
