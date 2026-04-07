import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
import { getReportsSectionMeta } from '@/utils/reports/view-model';

interface ReportsBalanceSheetSectionProps {
  context: ReportIntelligenceContext | null;
  loading?: boolean;
}

export function ReportsBalanceSheetSection({
  context,
  loading = false,
}: ReportsBalanceSheetSectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
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

  const section = context.balanceSheet;
  const meta = getReportsSectionMeta(context.quality.balanceSheet);

  if (!section) {
    return (
      <Card>
        <CardHeader>
          <SectionHeading title="Balanço patrimonial" metaLabel={meta.label} />
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          O patrimônio líquido só aparece quando o backend consegue consolidar ativos e passivos do período.
        </CardContent>
      </Card>
    );
  }

  const comparisonData = [
    { name: 'Ativos', value: section.totalAssets },
    { name: 'Passivos', value: section.totalLiabilities },
    { name: 'Patrimônio', value: section.netWorth },
  ];
  const historyData = section.netWorthHistory.map((point) => ({
    month: point.month,
    netWorth: point.netWorth,
  }));
  const hasEvolutionHistory = historyData.length > 1;
  const hasSingleHistoryPoint = historyData.length === 1;

  return (
    <Card>
      <CardHeader>
        <SectionHeading title="Balanço patrimonial" metaLabel={meta.label} partial={meta.isPartial} />
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(meta.isPartial || hasSingleHistoryPoint) && (
          <Alert>
            <AlertTitle>Evolução patrimonial conservadora</AlertTitle>
            <AlertDescription>
              {hasSingleHistoryPoint
                ? 'A série histórica ainda tem apenas um ponto, então a evolução mostra somente o snapshot consolidado disponível.'
                : meta.description}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <SummaryMetric label="Ativos totais" value={formatCurrency(section.totalAssets)} />
          <SummaryMetric label="Passivos totais" value={formatCurrency(section.totalLiabilities)} />
          <SummaryMetric label="Patrimônio líquido" value={formatCurrency(section.netWorth)} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
          <div className="h-72 rounded-lg border p-4">
            {meta.isAvailable ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={formatAxisCurrency} />
                  <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Comparativo indisponível para este período.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="mb-3 font-medium text-gray-900">Evolução patrimonial</p>
              {meta.isAvailable ? (
                hasEvolutionHistory ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={formatAxisCurrency} />
                        <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                        <Bar dataKey="netWorth" fill="#0f766e" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-sm text-muted-foreground">Último ponto consolidado</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {formatCurrency(historyData[0]?.netWorth ?? section.netWorth)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {historyData[0]?.month ?? 'Sem referência histórica adicional'}
                    </p>
                  </div>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  Evolução patrimonial indisponível para este período.
                </p>
              )}
            </div>

            <BucketList
              title="Composição dos ativos"
              emptyLabel="Nenhum ativo consolidado"
              items={section.assetBreakdown}
            />
            <BucketList
              title="Composição dos passivos"
              emptyLabel="Nenhum passivo consolidado"
              items={section.liabilityBreakdown}
            />
          </div>
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

function BucketList({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: Array<{ label: string; amount: number; share: number }>;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-3 font-medium text-gray-900">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-700">{item.label}</span>
                <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(item.share, 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{formatPercentage(item.share)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatAxisCurrency(value: number) {
  return value >= 1000 ? `R$ ${(value / 1000).toFixed(0)}k` : `R$ ${value}`;
}
