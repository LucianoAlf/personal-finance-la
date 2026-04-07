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
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';
import { formatCurrency } from '@/utils/formatters';
import {
  formatReportMonth,
  getReportsSectionMeta,
  hasPositiveValues,
} from '@/utils/reports/view-model';

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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
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
      <Card>
        <CardHeader>
          <SectionHeading title="Tendências do período" metaLabel={meta.label} />
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
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
    <Card>
      <CardHeader>
        <SectionHeading title="Tendências do período" metaLabel={meta.label} partial={meta.isPartial} />
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {meta.isPartial && (
          <Alert>
            <AlertTitle>Visualização parcial</AlertTitle>
            <AlertDescription>{meta.description}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <SummaryMetric label="Receitas" value={formatCurrency(section.incomeTotal)} />
          <SummaryMetric label="Despesas" value={formatCurrency(section.expenseTotal)} />
          <SummaryMetric label="Saldo líquido" value={formatCurrency(section.netTotal)} />
        </div>

        <div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <TrendIcon className="h-4 w-4" />
          <span>{trendLabel}</span>
        </div>

        <div className="h-80">
          {meta.isAvailable ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={section.monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tickFormatter={formatReportMonth} />
                <YAxis tickFormatter={formatAxisCurrency} />
                <Tooltip
                  labelFormatter={(value) => formatReportMonth(String(value))}
                  formatter={(value: number, name: string) => [
                    formatCurrency(Number(value)),
                    TREND_SERIES_LABELS[name] ?? name,
                  ]}
                />
                <Legend formatter={(value) => TREND_SERIES_LABELS[value as keyof typeof TREND_SERIES_LABELS] ?? value} />
                <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} dot={false} name="income" />
                <Line type="monotone" dataKey="expenses" stroke="#dc2626" strokeWidth={2} dot={false} name="expenses" />
                <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} dot={false} name="net" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Série temporal indisponível para este período.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeading({
  title,
  metaLabel,
  partial = false,
}: {
  title: string;
  metaLabel: string;
  partial?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <CardTitle className="text-xl">{title}</CardTitle>
      <span
        className={cn(
          'inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium',
          partial
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700',
        )}
      >
        {metaLabel}
      </span>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function formatAxisCurrency(value: number) {
  return value >= 1000 ? `R$ ${(value / 1000).toFixed(0)}k` : `R$ ${value}`;
}

const TREND_SERIES_LABELS = {
  income: 'Receitas',
  expenses: 'Despesas',
  net: 'Saldo líquido',
} as const;
