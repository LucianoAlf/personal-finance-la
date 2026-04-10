import { Sparkles } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';
import { getReportsSectionMeta } from '@/utils/reports/view-model';
import {
  reportsShellClassName,
  ReportsBulletList,
  ReportsSectionHeading,
} from './reports-shell';

interface ReportsAnaSectionProps {
  context: ReportIntelligenceContext | null;
  loading?: boolean;
}

export function ReportsAnaSection({
  context,
  loading = false,
}: ReportsAnaSectionProps) {
  if (loading) {
    return (
      <Card className={reportsShellClassName}>
        <CardHeader className="space-y-3 pb-4">
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-4 w-72 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <Skeleton className="h-28 w-full rounded-[24px]" />
        </CardContent>
      </Card>
    );
  }

  if (!context) {
    return null;
  }

  const section = context.ana;
  const meta = getReportsSectionMeta(context.quality.ana);

  return (
    <Card className={`${reportsShellClassName} border-violet-500/20 bg-gradient-to-br from-card/98 via-card/95 to-violet-500/5`}>
      <CardHeader className="space-y-3 pb-4">
        <ReportsSectionHeading
          title="Leitura da Ana Clara"
          description={
            section
              ? 'Bloco opcional de interpretação, sempre secundário aos dados determinísticos acima.'
              : meta.description
          }
          metaLabel={meta.label}
          partial={!meta.isReliable}
          icon={<Sparkles className="h-5 w-5" />}
        />
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {section?.summary ? (
          <div className="rounded-[24px] border border-violet-500/20 bg-violet-500/8 p-5">
            <p className="text-sm leading-7 text-foreground/90">{section.summary}</p>
          </div>
        ) : (
          <div className="rounded-[24px] border border-border/60 bg-surface-elevated/35 p-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              A narrativa complementar ainda não está disponível. O restante do relatório continua
              baseado apenas no contexto determinístico.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <ReportsBulletList title="Insights" items={section?.insights ?? []} emptyLabel="Sem insights adicionais." />
          <ReportsBulletList title="Riscos" items={section?.risks ?? []} emptyLabel="Sem riscos narrativos extras." />
          <ReportsBulletList title="Recomendações" items={section?.recommendations ?? []} emptyLabel="Sem recomendações adicionais." />
          <ReportsBulletList title="Próximas ações" items={section?.nextBestActions ?? []} emptyLabel="Sem próximas ações sugeridas." />
        </div>
      </CardContent>
    </Card>
  );
}
