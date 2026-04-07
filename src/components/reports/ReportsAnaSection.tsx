import { Sparkles } from 'lucide-react';

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
import { getReportsSectionMeta } from '@/utils/reports/view-model';

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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 w-full" />
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
    <Card className="border-slate-200 bg-slate-50/70">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <CardTitle className="text-xl">Leitura da Ana Clara</CardTitle>
          </div>
          <span
            className={cn(
              'inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium',
              meta.isAvailable
                ? 'border-violet-200 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-white text-slate-600',
            )}
          >
            {meta.label}
          </span>
        </div>
        <CardDescription>
          {section ? 'Bloco opcional de interpretação, sempre secundário aos dados determinísticos acima.' : meta.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {section?.summary ? (
          <p className="text-sm leading-6 text-slate-700">{section.summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            A narrativa complementar ainda não está disponível. O restante do relatório continua baseado apenas no contexto determinístico.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <BulletGroup title="Insights" items={section?.insights ?? []} emptyLabel="Sem insights adicionais." />
          <BulletGroup title="Riscos" items={section?.risks ?? []} emptyLabel="Sem riscos narrativos extras." />
          <BulletGroup title="Recomendações" items={section?.recommendations ?? []} emptyLabel="Sem recomendações adicionais." />
          <BulletGroup title="Próximas ações" items={section?.nextBestActions ?? []} emptyLabel="Sem próximas ações sugeridas." />
        </div>
      </CardContent>
    </Card>
  );
}

function BulletGroup({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="mb-2 font-medium text-slate-900">{title}</p>
      {items.length > 0 ? (
        <div className="space-y-2 text-sm text-slate-700">
          {items.map((item) => (
            <p key={item}>- {item}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}
