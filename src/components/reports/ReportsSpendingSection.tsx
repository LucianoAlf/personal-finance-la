import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { PieChartIcon } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { getReportsSectionMeta } from '@/utils/reports/view-model';
import {
  reportsChartTooltipProps,
  reportsPanelClassName,
  reportsShellClassName,
  ReportsSectionHeading,
  ReportsInsightNotice,
} from './reports-shell';

interface ReportsSpendingSectionProps {
  context: ReportIntelligenceContext | null;
  loading?: boolean;
}

const COLORS = ['#2563eb', '#7c3aed', '#0f766e', '#ea580c', '#db2777', '#64748b'];

export function ReportsSpendingSection({
  context,
  loading = false,
}: ReportsSpendingSectionProps) {
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

  const section = context.spending;
  const meta = getReportsSectionMeta(context.quality.spending);

  if (!section || section.categoryBreakdown.length === 0) {
    return (
      <Card className={reportsShellClassName}>
        <CardHeader className="space-y-3 pb-4">
          <ReportsSectionHeading
            title="Composição das despesas"
            description={meta.description}
            metaLabel={meta.label}
            icon={<PieChartIcon className="h-5 w-5" />}
          />
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          Nenhuma despesa categorizada foi encontrada para este período.
        </CardContent>
      </Card>
    );
  }

  const chartData = section.topCategories.map((category, index) => ({
    name: category.categoryName,
    value: category.amount,
    fill: COLORS[index % COLORS.length],
    share: category.share,
  }));

  return (
    <Card className={reportsShellClassName}>
      <CardHeader className="space-y-3 pb-4">
        <ReportsSectionHeading
          title="Composição das despesas"
          description={meta.description}
          metaLabel={meta.label}
          partial={meta.isPartial}
          icon={<PieChartIcon className="h-5 w-5" />}
        />
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {meta.isPartial ? (
          <ReportsInsightNotice title="Leitura parcial">
            Esta leitura usa apenas os dados já consolidados para o período selecionado.
          </ReportsInsightNotice>
        ) : null}

        {section.uncategorizedShare > 0 ? (
          <Alert className="rounded-[22px] border-amber-500/25 bg-amber-500/10 text-amber-100">
            <AlertTitle>Parte do gasto ainda está sem categoria</AlertTitle>
            <AlertDescription>
              {formatPercentage(section.uncategorizedShare)} das despesas seguem sem classificação.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className={reportsPanelClassName}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(230px,0.38fr)] lg:items-center">
              <div className="h-[320px]">
                {meta.isAvailable ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={78} outerRadius={118}>
                        {chartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        {...reportsChartTooltipProps}
                        formatter={(value: number) => formatCurrency(Number(value))}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-border/60 text-sm text-muted-foreground">
                    Gráfico indisponível para este período.
                  </div>
                )}
              </div>

              <div className="grid gap-3">
                {section.topCategories.slice(0, 3).map((category, index) => (
                  <div
                    key={`${category.categoryId ?? 'sem-categoria'}-${category.categoryName}`}
                    className="rounded-[22px] border border-border/60 bg-surface/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <p className="font-medium text-foreground">{category.categoryName}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {category.transactionCount} lançamentos
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatCurrency(category.amount)}</p>
                        <p className="text-sm text-muted-foreground">{formatPercentage(category.share)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={reportsPanelClassName}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Leitura rápida
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  Onde o período concentrou mais gasto
                </p>
              </div>
              <span className="rounded-full border border-border/60 bg-surface/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                {section.topCategories.length} categorias
              </span>
            </div>

            <div className="space-y-3">
              {section.topCategories.map((category, index) => (
                <div
                  key={`detail-${category.categoryId ?? 'sem-categoria'}-${category.categoryName}`}
                  className="rounded-[20px] border border-border/60 bg-surface/50 p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {category.categoryName}
                    </span>
                    <span className="font-semibold text-foreground">{formatCurrency(category.amount)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-overlay/75">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(category.share * 100, 100)}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{category.transactionCount} lançamentos</span>
                    <span>{formatPercentage(category.share)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
