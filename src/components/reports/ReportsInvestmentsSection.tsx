import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-52" />
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

  const section = context.investments;
  const meta = getReportsSectionMeta(context.quality.investments);

  if (!section) {
    return (
      <Card>
        <CardHeader>
          <SectionHeading title="Investimentos" metaLabel={meta.label} />
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
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
    <Card>
      <CardHeader>
        <SectionHeading title="Investimentos" metaLabel={meta.label} partial={meta.isPartial} />
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {meta.isPartial && (
          <Alert>
            <AlertTitle>Visualização parcial</AlertTitle>
            <AlertDescription>{meta.description}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <SummaryMetric label="Valor da carteira" value={formatCurrency(section.portfolioValue)} />
          <SummaryMetric
            label="Retorno total"
            value={`${section.totalReturn >= 0 ? '+' : ''}${formatCurrency(section.totalReturn)}`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,1fr)]">
          <div className="h-72 rounded-lg border p-4">
            {meta.isAvailable && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {meta.isAvailable ? 'Sem dados de alocação disponíveis' : 'Gráfico de alocação indisponível para este período.'}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="mb-3 font-medium text-gray-900">Alocação consolidada</p>
              <div className="space-y-3">
                {section.allocationSummary.length > 0 ? (
                  section.allocationSummary.map((item) => (
                    <div key={`${item.assetClass}-${item.label}`}>
                      <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                        <span className="text-gray-700">{item.label}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(item.value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{formatPercentage(item.percentage)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sem composição detalhada da carteira.</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="mb-3 font-medium text-gray-900">Planejamento e oportunidades</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                {section.planningHighlights.map((item) => (
                  <p key={item}>- {item}</p>
                ))}
                {section.opportunitySignals.slice(0, 2).map((signal) => (
                  <p key={signal.title}>
                    - {signal.title}: {signal.description}
                  </p>
                ))}
                {section.planningHighlights.length === 0 && section.opportunitySignals.length === 0 && (
                  <p>Sem destaques adicionais de planejamento neste momento.</p>
                )}
              </div>
            </div>
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
