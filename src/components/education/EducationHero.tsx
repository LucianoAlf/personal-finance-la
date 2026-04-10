import { GraduationCap, Sparkles } from 'lucide-react';

import {
  educationBodyClassName,
  educationPanelClassName,
  educationShellClassName,
  educationSubtlePanelClassName,
} from '@/components/education/education-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface EducationHeroProps {
  loading: boolean;
  subtitle: string;
  levelLabel: string | null;
  streakDays: number | null;
}

export function EducationHero({ loading, subtitle, levelLabel, streakDays }: EducationHeroProps) {
  if (loading) {
    return (
      <Card className={cn(educationShellClassName, 'overflow-hidden')}>
        <CardContent className="space-y-5 p-7">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-[20px]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-72" />
              <Skeleton className="h-4 w-full max-w-2xl" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-11 w-full rounded-[18px]" />
            <Skeleton className="h-11 w-full rounded-[18px]" />
            <Skeleton className="h-11 w-full rounded-[18px]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const meta: string[] = [];
  if (levelLabel) {
    meta.push(levelLabel);
  }
  if (streakDays != null && streakDays > 0) {
    meta.push(`${streakDays} dia${streakDays === 1 ? '' : 's'} de sequência`);
  }

  return (
    <Card className={cn(educationShellClassName, 'overflow-hidden')}>
      <CardContent className="p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-violet-500/20 bg-gradient-to-br from-violet-500/18 to-primary/8 text-primary shadow-[0_12px_32px_rgba(139,92,246,0.18)]">
                <GraduationCap className="h-8 w-8" aria-hidden />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Hub educacional
                </div>
                <h2 className="text-[2rem] font-semibold tracking-tight text-foreground">
                  Seu hub de educação financeira
                </h2>
                <p className={cn(educationBodyClassName, 'max-w-3xl text-base')}>{subtitle}</p>
              </div>
            </div>

            {meta.length > 0 ? (
              <div className={cn(educationSubtlePanelClassName, 'inline-flex px-4 py-2')}>
                <p className="text-sm font-medium text-muted-foreground">{meta.join(' · ')}</p>
              </div>
            ) : null}
          </div>

          <div className={cn(educationPanelClassName, 'p-5')}>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300">
              Ritmo da jornada
            </p>
            <div className="mt-3 space-y-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Momento atual</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {levelLabel ?? 'Começando sua trilha'}
                  </p>
                </div>
                <p className="text-sm font-medium text-violet-300">
                  {streakDays != null && streakDays > 0 ? `${streakDays} dia${streakDays === 1 ? '' : 's'}` : 'Novo ciclo'}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Continue evoluindo no seu próprio ritmo. O hub cruza progresso, contexto financeiro e próximos passos
                para manter a jornada clara e relevante.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
