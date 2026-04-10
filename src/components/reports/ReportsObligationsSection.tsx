import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import {
  formatReportMonth,
  getReportsSectionMeta,
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

  const section = context.obligations;
  const meta = getReportsSectionMeta(context.quality.obligations);

  if (!section) {
    return (
      <Card className={reportsShellClassName}>
        <CardHeader className="space-y-3 pb-4">
          <ReportsSectionHeading
            title="Obrigações e pressão de caixa"
            description={meta.description}
            metaLabel={meta.label}
            icon={<ShieldAlert className="h-5 w-5" />}
          />
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          Não há contas abertas, cartões ativos ou previsão de vencimentos suficiente para este período.
        </CardContent>
      </Card>
    );
  }

  const hasRisk = section.overdueBillsCount > 0 || section.creditCardUtilization >= 70;

  return (
    <Card className={reportsShellClassName}>
      <CardHeader className="space-y-3 pb-4">
        <ReportsSectionHeading
          title="Obrigações e pressão de caixa"
          description={meta.description}
          metaLabel={meta.label}
          partial={meta.isPartial}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {meta.isPartial ? (
          <ReportsInsightNotice title="Leitura parcial">
            Esta seção usa somente as obrigações já consolidadas para o período selecionado.
          </ReportsInsightNotice>
        ) : null}

        {hasRisk ? (
          <ReportsInsightNotice
            title="Atenção ao curto prazo"
            tone={section.overdueBillsCount > 0 ? 'danger' : 'warning'}
          >
            {section.overdueBillsCount > 0
              ? `${section.overdueBillsCount} contas em atraso pedem ação imediata.`
              : `Uso do limite em ${formatPercentage(section.creditCardUtilization)} indica maior pressão no cartão.`}
          </ReportsInsightNotice>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ReportsMetricTile label="Contas em aberto" value={String(section.openBillsCount)} />
          <ReportsMetricTile label="Em atraso" value={String(section.overdueBillsCount)} tone={section.overdueBillsCount > 0 ? 'negative' : 'default'} />
          <ReportsMetricTile label="Valor pendente" value={formatCurrency(section.pendingBillsAmount)} tone="negative" />
          <ReportsMetricTile
            label="Uso do limite"
            value={section.creditCardLimit > 0 ? formatPercentage(section.creditCardUtilization) : 'Sem cartão'}
            caption={section.creditCardLimit > 0 ? 'Leitura consolidada do cartão' : 'Nenhum cartão ativo no período'}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(320px,1.08fr)]">
          <div className={reportsPanelClassName}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-base font-semibold tracking-tight text-foreground">
                Utilização consolidada do cartão
              </p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(section.creditCardUsed)} de {formatCurrency(section.creditCardLimit)}
              </p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-overlay/80">
              <div
                className={section.creditCardUtilization >= 70 ? 'h-full rounded-full bg-rose-500' : 'h-full rounded-full bg-blue-500'}
                style={{ width: `${Math.min(section.creditCardUtilization, 100)}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>Uso no período</span>
              <span>{formatPercentage(section.creditCardUtilization)}</span>
            </div>
          </div>

          <div className={reportsPanelClassName}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Próximos meses
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  Projeção de vencimentos e pressão de caixa
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-300" />
            </div>

            <div className="h-[280px]">
              {meta.isAvailable ? (
                section.forecastNextMonths.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={section.forecastNextMonths}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
                      <XAxis dataKey="month" tickFormatter={formatReportMonth} stroke="rgba(148, 163, 184, 0.6)" />
                      <YAxis tickFormatter={formatReportsAxisCurrency} stroke="rgba(148, 163, 184, 0.6)" />
                      <Tooltip
                        {...reportsChartTooltipProps}
                        labelFormatter={(value) => formatReportMonth(String(value))}
                        formatter={(value: number) => formatCurrency(Number(value))}
                      />
                      <Bar dataKey="amount" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-border/60 text-sm text-muted-foreground">
                    Previsão indisponível para este período.
                  </div>
                )
              ) : (
                <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-border/60 text-sm text-muted-foreground">
                  Previsão indisponível para este período.
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
