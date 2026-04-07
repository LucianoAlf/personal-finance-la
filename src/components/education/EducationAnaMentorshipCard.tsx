import { Link } from 'react-router-dom';
import { ArrowRight, Brain, Compass, Sparkles, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getLessonUrl } from '@/utils/education/view-model';
import type { EducationAnaMentorshipPresentation } from '@/utils/education/view-model';

interface EducationAnaMentorshipCardProps {
  loading: boolean;
  presentation: EducationAnaMentorshipPresentation | null;
  nextLessonId: string | null;
  qualityLabel: string | null;
}

export function EducationAnaMentorshipCard({
  loading,
  presentation,
  nextLessonId,
  qualityLabel,
}: EducationAnaMentorshipCardProps) {
  if (loading) {
    return (
      <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!presentation) {
    return null;
  }

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-violet-600" aria-hidden />
              <CardTitle className="text-lg">Ana Clara — mentoria educacional</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Uma leitura guiada do seu momento atual, usando o contexto da trilha e os sinais do app.
            </p>
          </div>
          {qualityLabel ? <Badge variant="outline">{qualityLabel}</Badge> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-xl border border-violet-200 bg-white/90 p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-700">
            <Compass className="h-4 w-4" aria-hidden />
            Foco da semana
          </div>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{presentation.focusTitle}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{presentation.reasonWhy}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <TriangleAlert className="h-4 w-4 text-amber-600" aria-hidden />
              Por que a Ana escolheu isso
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {presentation.attentionItems.length > 0 ? (
                presentation.attentionItems.map((item) => <li key={item}>• {item}</li>)
              ) : (
                <li>• Sem alertas adicionais. Continue sustentando o ritmo atual.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Sparkles className="h-4 w-4 text-violet-600" aria-hidden />
              Próximos passos no app
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {presentation.recommendationItems.length > 0 ? (
                presentation.recommendationItems.map((item) => <li key={item}>• {item}</li>)
              ) : (
                <li>• Continue na próxima aula sugerida para aprofundar esse foco.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-violet-300 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Seu próximo passo no app</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {presentation.nextStepTitle ?? 'Abra a próxima aula recomendada para continuar a trilha.'}
            </p>
          </div>
          {nextLessonId ? (
            <Button asChild>
              <Link to={getLessonUrl(nextLessonId)}>
                Abrir próxima aula
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
