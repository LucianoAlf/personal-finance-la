import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

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
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import {
  formatReportMonth,
  getReportsSectionMeta,
} from '@/utils/reports/view-model';

interface ReportsObligationsSectionProps {
  context: ReportIntelligenceContext | null;
  loading?: boolean;
}

export function ReportsObligationsSection({
  context,
  loading = false,
}: ReportsObligationsSectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!context) {
    return null;
  }

  const section = context.obligations;
  const meta = getReportsSectionMeta(context.quality.obligations);

  if (!section) {
    return (
      <Card>
        <CardHeader>
          <SectionHeading title="Obrigações e pressão de caixa" metaLabel={meta.label} />
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Não há contas abertas, cartões ativos ou previsão de vencimentos suficiente para este período.
        </CardContent>
      </Card>
    );
  }

  const hasRisk = section.overdueBillsCount > 0 || section.creditCardUtilization >= 70;

  return (
    <Card>
      <CardHeader>
        <SectionHeading title="Obrigações e pressão de caixa" metaLabel={meta.label} partial={meta.isPartial} />
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {meta.isPartial && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Visualização parcial</AlertTitle>
            <AlertDescription>{meta.description}</AlertDescription>
          </Alert>
        )}

        {hasRisk && (
          <Alert variant={section.overdueBillsCount > 0 ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção ao curto prazo</AlertTitle>
            <AlertDescription>
              {section.overdueBillsCount > 0
                ? `${section.overdueBillsCount} contas em atraso pedem ação imediata.`
                : `Uso do limite em ${formatPercentage(section.creditCardUtilization)} indica maior pressão no cartão.`}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric label="Contas em aberto" value={String(section.openBillsCount)} />
          <SummaryMetric label="Em atraso" value={String(section.overdueBillsCount)} />
          <SummaryMetric label="Valor pendente" value={formatCurrency(section.pendingBillsAmount)} />
          <SummaryMetric
            label="Uso do limite"
            value={section.creditCardLimit > 0 ? formatPercentage(section.creditCardUtilization) : 'Sem cartão'}
          />
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between gap-4">
            <p className="font-medium text-gray-900">Utilização consolidada do cartão</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(section.creditCardUsed)} de {formatCurrency(section.creditCardLimit)}
            </p>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                'h-full rounded-full',
                section.creditCardUtilization >= 70 ? 'bg-red-500' : 'bg-blue-500',
              )}
              style={{ width: `${Math.min(section.creditCardUtilization, 100)}%` }}
            />
          </div>
        </div>

        {section.forecastNextMonths.length > 0 && (
          <div className="rounded-lg border p-4">
            <p className="mb-4 font-medium text-gray-900">Previsão dos próximos meses</p>
            <div className="h-64">
              {meta.isAvailable ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={section.forecastNextMonths}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={formatReportMonth} />
                    <YAxis tickFormatter={formatAxisCurrency} />
                    <Tooltip
                      labelFormatter={(value) => formatReportMonth(String(value))}
                      formatter={(value: number) => formatCurrency(Number(value))}
                    />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Previsão indisponível para este período.
                </div>
              )}
            </div>
          </div>
        )}
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
