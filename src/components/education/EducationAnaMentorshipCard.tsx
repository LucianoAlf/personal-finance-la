import { Link } from 'react-router-dom';
import { ArrowRight, Brain, Compass, Sparkles, TriangleAlert } from 'lucide-react';

import {
  educationBodyClassName,
  educationPanelClassName,
  educationShellClassName,
  educationTonePanelClassName,
} from '@/components/education/education-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
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
      <Card className={educationShellClassName}>
        <CardHeader className="space-y-4">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-28 w-full rounded-[24px]" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-24 w-full rounded-[20px]" />
            <Skeleton className="h-24 w-full rounded-[20px]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!presentation) {
    return null;
  }

  return (
    <Card className={educationShellClassName}>
      <CardHeader className="space-y-4 pb-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-violet-500/20 bg-violet-500/10 text-violet-300">
                <Brain className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                  Ana Clara — mentoria educacional
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Uma leitura guiada do seu momento atual, usando o contexto da trilha e os sinais do app.
                </p>
              </div>
            </div>
          </div>

          {qualityLabel ? <Badge variant="outline">{qualityLabel}</Badge> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className={cn(educationTonePanelClassName('violet'), 'p-5')}>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-violet-300">
            <Compass className="h-4 w-4" aria-hidden />
            Foco da semana
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{presentation.focusTitle}</h3>
          <p className={cn(educationBodyClassName, 'mt-3 text-base')}>{presentation.reasonWhy}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={cn(educationPanelClassName, 'p-4')}>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <TriangleAlert className="h-4 w-4 text-warning" aria-hidden />
              Por que a Ana escolheu isso
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {presentation.attentionItems.length > 0 ? (
                presentation.attentionItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-warning/80" />
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-success/80" />
                  <span>Sem alertas adicionais. Continue sustentando o ritmo atual.</span>
                </li>
              )}
            </ul>
          </div>

          <div className={cn(educationPanelClassName, 'p-4')}>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-violet-300" aria-hidden />
              Próximos passos no app
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {presentation.recommendationItems.length > 0 ? (
                presentation.recommendationItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                  <span>Continue na próxima aula sugerida para aprofundar esse foco.</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className={cn(educationPanelClassName, 'flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between')}>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300">Seu próximo passo no app</p>
            <p className="mt-2 text-sm font-medium text-foreground">
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
