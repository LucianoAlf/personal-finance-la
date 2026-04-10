import { ArrowRight, BookOpen } from 'lucide-react';

import {
  educationBodyClassName,
  educationPanelClassName,
  educationShellClassName,
  educationSubtlePanelClassName,
} from '@/components/education/education-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { EducationProgressSection as ProgressSection } from '@/utils/education/intelligence-contract';

interface EducationProgressSectionProps {
  loading: boolean;
  section: ProgressSection | null;
  summaryLines: string[];
  nextLessonTitle: string | null;
  onContinueNextLesson: () => void;
  continueDisabled: boolean;
}

export function EducationProgressSection({
  loading,
  section,
  summaryLines,
  nextLessonTitle,
  onContinueNextLesson,
  continueDisabled,
}: EducationProgressSectionProps) {
  if (loading) {
    return (
      <Card className={educationShellClassName}>
        <CardHeader>
          <Skeleton className="h-7 w-52" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full rounded-[20px]" />
          <Skeleton className="h-11 w-56 rounded-[18px]" />
        </CardContent>
      </Card>
    );
  }

  if (!section || section.totalLessonsAvailable <= 0) {
    return null;
  }

  return (
    <Card className={educationShellClassName}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-info-border/70 bg-info-subtle/55 text-info">
            <BookOpen className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Seu progresso</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Continuidade de aprendizado, sinais do app e próxima etapa sugerida.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className={cn(educationPanelClassName, 'p-4')}>
          <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            {summaryLines.map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {nextLessonTitle ? (
          <div className={cn(educationSubtlePanelClassName, 'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between')}>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300">Próxima sugestão</p>
              <p className="mt-2 text-sm font-medium text-foreground">{nextLessonTitle}</p>
            </div>
            <Button type="button" size="sm" onClick={onContinueNextLesson} disabled={continueDisabled}>
              Continuar lição sugerida
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
