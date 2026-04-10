import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Landmark } from 'lucide-react';

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
  ReportsMetricTile,
  ReportsSectionHeading,
} from './reports-shell';

interface ReportsInvestmentsSectionProps {
  context: ReportIntelligenceContext | null;
  loading?: boolean;
}

const COLORS = ['#0f766e', '#2563eb', '#7c3aed', '#ea580c', '#64748b', '#db2777'];

export function ReportsInvestmentsSection({
  context,
  loading = false,
}: ReportsInvestmentsSectionProps) {
  if (loading) {
    return (
      <Card className={reportsShellClassName}>
        <CardHeader className="space-y-3 pb-4">
          <Skeleton className="h-8 w-56 rounded-full" />
          <Skeleton className="h-4 w-80 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <Skeleton className="h-[320px] w-full rounded-[24px]" />
        </CardContent>
      </Card>
    );
  }

  if (!context) {
    return null;
  }

  const section = context.investments;
  const meta = getReportsSectionMeta(context.quality.investments);

  if (!section) {
    return (
      <Card className={reportsShellClassName}>
        <CardHeader className="space-y-3 pb-4">
          <ReportsSectionHeading
            title="Investimentos"
            description={meta.description}
            metaLabel={meta.label}
            icon={<Landmark className="h-5 w-5" />}
          />
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          O relatório ainda não recebeu um resumo consolidado do portfólio para este período.
        </CardContent>
      </Card>
    );
  }

  const chartData = section.allocationSummary.map((item, index) => ({
    name: item.label,
    value: item.value,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <Card className={reportsShellClassName}>
      <CardHeader className="space-y-3 pb-4">
        <ReportsSectionHeading
          title="Investimentos"
          description={meta.description}
          metaLabel={meta.label}
          partial={meta.isPartial}
          icon={<Landmark className="h-5 w-5" />}
        />
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {meta.isPartial ? (
          <Alert className="rounded-[22px] border-amber-500/25 bg-amber-500/10 text-amber-100">
            <AlertTitle>Leitura parcial</AlertTitle>
            <AlertDescription>{meta.description}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <ReportsMetricTile label="Valor da carteira" value={formatCurrency(section.portfolioValue)} />
          <ReportsMetricTile
            label="Retorno total"
            value={`${section.totalReturn >= 0 ? '+' : ''}${formatCurrency(section.totalReturn)}`}
            tone={section.totalReturn >= 0 ? 'positive' : 'negative'}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]">
          <div className={reportsPanelClassName}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Carteira consolidada
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  Distribuição patrimonial por classe
                </p>
              </div>
            </div>

            <div className="h-[300px]">
              {meta.isAvailable && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={72} outerRadius={116}>
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
                  {meta.isAvailable ? 'Sem dados de alocação disponíveis' : 'Gráfico de alocação indisponível para este período.'}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className={reportsPanelClassName}>
              <p className="mb-3 text-base font-semibold tracking-tight text-foreground">Alocação consolidada</p>
              <div className="space-y-3">
                {section.allocationSummary.length > 0 ? (
                  section.allocationSummary.map((item, index) => (
                    <div key={`${item.assetClass}-${item.label}`}>
                      <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-overlay/75">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(item.percentage, 100)}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{formatPercentage(item.percentage)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sem composição detalhada da carteira.</p>
                )}
              </div>
            </div>

            <div className={reportsPanelClassName}>
              <p className="mb-3 text-base font-semibold tracking-tight text-foreground">Planejamento e oportunidades</p>
              <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {section.planningHighlights.map((item) => (
                  <p key={item}>- {item}</p>
                ))}
                {section.opportunitySignals.slice(0, 2).map((signal) => (
                  <p key={signal.title}>
                    - {signal.title}: {signal.description}
                  </p>
                ))}
                {section.planningHighlights.length === 0 && section.opportunitySignals.length === 0 ? (
                  <p>Sem destaques adicionais de planejamento neste momento.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
