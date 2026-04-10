import { Target } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { getReportsSectionMeta } from '@/utils/reports/view-model';
import {
  reportsPanelClassName,
  reportsShellClassName,
  ReportsMetricTile,
  ReportsSectionHeading,
} from './reports-shell';

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
      <Card className={reportsShellClassName}>
        <CardHeader className="space-y-3 pb-4">
          <Skeleton className="h-8 w-48 rounded-full" />
          <Skeleton className="h-4 w-72 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <Skeleton className="h-[280px] w-full rounded-[24px]" />
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
      <Card className={reportsShellClassName}>
        <CardHeader className="space-y-3 pb-4">
          <ReportsSectionHeading
            title="Metas financeiras"
            description={meta.description}
            metaLabel={meta.label}
            icon={<Target className="h-5 w-5" />}
          />
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          Nenhuma meta ativa ou concluída foi encontrada para compor este bloco.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={reportsShellClassName}>
      <CardHeader className="space-y-3 pb-4">
        <ReportsSectionHeading
          title="Metas financeiras"
          description={meta.description}
          metaLabel={meta.label}
          partial={meta.isPartial}
          icon={<Target className="h-5 w-5" />}
        />
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <div className="grid gap-3 md:grid-cols-4">
          <ReportsMetricTile label="Ativas" value={String(section.active)} />
          <ReportsMetricTile label="Concluídas" value={String(section.completed)} />
          <ReportsMetricTile label="Em risco" value={String(section.atRisk)} tone={section.atRisk > 0 ? 'negative' : 'default'} />
          <ReportsMetricTile label="Taxa de conclusão" value={formatPercentage(section.completionRate)} tone="violet" />
        </div>

        <div className="space-y-4">
          {section.progressByGoal.slice(0, 5).map((goal) => (
            <div key={goal.id} className={reportsPanelClassName}>
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-base font-semibold tracking-tight text-foreground">{goal.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {goal.type} · {goal.status}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-lg font-semibold tracking-tight text-foreground">
                    {formatPercentage(goal.progressPercentage)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                  </p>
                </div>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-surface-overlay/75">
                <div
                  className={cn(
                    'h-full rounded-full',
                    goal.status === 'completed'
                      ? 'bg-emerald-500'
                      : goal.onTrack === false
                        ? 'bg-rose-500'
                        : 'bg-blue-500',
                  )}
                  style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                />
              </div>

              <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                <span>Faltam {formatCurrency(goal.remainingAmount)}</span>
                <span className="md:text-right">
                  {goal.deadline ? `Prazo: ${goal.deadline}` : 'Sem prazo definido'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
