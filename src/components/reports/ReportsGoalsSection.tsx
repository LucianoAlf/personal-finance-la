import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { getReportsSectionMeta } from '@/utils/reports/view-model';

interface ReportsGoalsSectionProps {
  context: ReportIntelligenceContext | null;
  loading?: boolean;
}

export function ReportsGoalsSection({
  context,
  loading = false,
}: ReportsGoalsSectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!context) {
    return null;
  }

  const section = context.goals;
  const meta = getReportsSectionMeta(context.quality.goals);

  if (!section) {
    return (
      <Card>
        <CardHeader>
          <SectionHeading title="Metas financeiras" metaLabel={meta.label} />
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nenhuma meta ativa ou concluída foi encontrada para compor este bloco.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeading title="Metas financeiras" metaLabel={meta.label} partial={meta.isPartial} />
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetric label="Ativas" value={String(section.active)} />
          <SummaryMetric label="Concluídas" value={String(section.completed)} />
          <SummaryMetric label="Em risco" value={String(section.atRisk)} />
          <SummaryMetric label="Taxa de conclusão" value={formatPercentage(section.completionRate)} />
        </div>

        <div className="space-y-4">
          {section.progressByGoal.slice(0, 5).map((goal) => (
            <div key={goal.id} className="rounded-lg border p-4">
              <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{goal.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {goal.type} · {goal.status}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-semibold text-gray-900">{formatPercentage(goal.progressPercentage)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                  </p>
                </div>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    'h-full rounded-full',
                    goal.status === 'completed'
                      ? 'bg-emerald-500'
                      : goal.onTrack === false
                        ? 'bg-red-500'
                        : 'bg-blue-500',
                  )}
                  style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                />
              </div>

              <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:justify-between">
                <span>Faltam {formatCurrency(goal.remainingAmount)}</span>
                <span>{goal.deadline ? `Prazo: ${goal.deadline}` : 'Sem prazo definido'}</span>
              </div>
            </div>
          ))}
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
