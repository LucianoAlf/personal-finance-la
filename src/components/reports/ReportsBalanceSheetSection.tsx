import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Landmark } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { getReportsSectionMeta } from '@/utils/reports/view-model';
import {
  formatReportsAxisCurrency,
  reportsChartTooltipProps,
  reportsPanelClassName,
  reportsShellClassName,
  ReportsInsightNotice,
  ReportsMetricTile,
  ReportsSectionHeading,
} from './reports-shell';

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
      <Card className={reportsShellClassName}>
        <CardHeader className="space-y-3 pb-4">
          <Skeleton className="h-8 w-64 rounded-full" />
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

  const section = context.balanceSheet;
  const meta = getReportsSectionMeta(context.quality.balanceSheet);

  if (!section) {
    return (
      <Card className={reportsShellClassName}>
        <CardHeader className="space-y-3 pb-4">
          <ReportsSectionHeading
            title="Balanço patrimonial"
            description={meta.description}
            metaLabel={meta.label}
            icon={<Landmark className="h-5 w-5" />}
          />
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
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
    <Card className={reportsShellClassName}>
      <CardHeader className="space-y-3 pb-4">
        <ReportsSectionHeading
          title="Balanço patrimonial"
          description={meta.description}
          metaLabel={meta.label}
          partial={meta.isPartial}
          icon={<Landmark className="h-5 w-5" />}
        />
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {(meta.isPartial || hasSingleHistoryPoint) ? (
          <ReportsInsightNotice title="Evolução patrimonial conservadora" tone="warning">
            {hasSingleHistoryPoint
              ? 'A série histórica ainda tem apenas um ponto, então a evolução mostra somente o snapshot consolidado disponível.'
              : meta.description}
          </ReportsInsightNotice>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <ReportsMetricTile label="Ativos totais" value={formatCurrency(section.totalAssets)} />
          <ReportsMetricTile label="Passivos totais" value={formatCurrency(section.totalLiabilities)} />
          <ReportsMetricTile label="Patrimônio líquido" value={formatCurrency(section.netWorth)} tone="positive" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className={reportsPanelClassName}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Snapshot consolidado
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  Relação entre ativos, passivos e patrimônio
                </p>
              </div>
            </div>

            <div className="h-[320px]">
              {meta.isAvailable ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
                    <XAxis dataKey="name" stroke="rgba(148, 163, 184, 0.6)" />
                    <YAxis tickFormatter={formatReportsAxisCurrency} stroke="rgba(148, 163, 184, 0.6)" />
                    <Tooltip {...reportsChartTooltipProps} formatter={(value: number) => formatCurrency(Number(value))} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-border/60 text-sm text-muted-foreground">
                  Comparativo indisponível para este período.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className={reportsPanelClassName}>
              <p className="mb-3 text-base font-semibold tracking-tight text-foreground">Evolução patrimonial</p>
              {meta.isAvailable ? (
                hasEvolutionHistory ? (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
                        <XAxis dataKey="month" stroke="rgba(148, 163, 184, 0.6)" />
                        <YAxis tickFormatter={formatReportsAxisCurrency} stroke="rgba(148, 163, 184, 0.6)" />
                        <Tooltip {...reportsChartTooltipProps} formatter={(value: number) => formatCurrency(Number(value))} />
                        <Bar dataKey="netWorth" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="rounded-[20px] border border-border/60 bg-surface/50 p-4">
                    <p className="text-sm text-muted-foreground">Último ponto consolidado</p>
                    <p className="mt-2 text-[2rem] font-semibold tracking-tight text-foreground">
                      {formatCurrency(historyData[0]?.netWorth ?? section.netWorth)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {historyData[0]?.month ?? 'Sem referência histórica adicional'}
                    </p>
                  </div>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Evolução patrimonial indisponível para este período.</p>
              )}
            </div>

            <BucketList title="Composição dos ativos" emptyLabel="Nenhum ativo consolidado" items={section.assetBreakdown} accent="bg-blue-500" />
            <BucketList title="Composição dos passivos" emptyLabel="Nenhum passivo consolidado" items={section.liabilityBreakdown} accent="bg-violet-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BucketList({
  title,
  emptyLabel,
  items,
  accent,
}: {
  title: string;
  emptyLabel: string;
  items: Array<{ label: string; amount: number; share: number }>;
  accent: string;
}) {
  return (
    <div className={reportsPanelClassName}>
      <p className="mb-3 text-base font-semibold tracking-tight text-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{formatCurrency(item.amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-overlay/75">
                <div className={`h-full rounded-full ${accent}`} style={{ width: `${Math.min(item.share, 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{formatPercentage(item.share)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
