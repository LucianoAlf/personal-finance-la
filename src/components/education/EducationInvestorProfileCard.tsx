import { AlertTriangle, RefreshCcw, Shield } from 'lucide-react';

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
import type { EducationInvestorProfileSection } from '@/utils/education/intelligence-contract';

interface EducationInvestorProfileCardProps {
  loading: boolean;
  section: EducationInvestorProfileSection | null;
  reviewRequired?: boolean;
  questionnaireVersion?: number | null;
  onOpenQuestionnaire?: () => void;
}

const profileKeyLabels: Record<string, string> = {
  conservative: 'Conservador',
  moderate: 'Moderado',
  balanced: 'Equilibrado',
  growth: 'Crescimento',
  aggressive: 'Arrojado',
};

export function EducationInvestorProfileCard({
  loading,
  section,
  reviewRequired = false,
  questionnaireVersion = null,
  onOpenQuestionnaire,
}: EducationInvestorProfileCardProps) {
  if (loading) {
    return (
      <Card className={educationShellClassName}>
        <CardHeader className="space-y-4">
          <Skeleton className="h-7 w-60" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full rounded-[18px]" />
          <Skeleton className="h-16 w-full rounded-[20px]" />
        </CardContent>
      </Card>
    );
  }

  if (!section) {
    return null;
  }

  const profileLabel = section.profileKey ? profileKeyLabels[section.profileKey] ?? section.profileKey : null;

  return (
    <Card className={educationShellClassName}>
      <CardHeader className="space-y-4 pb-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                <Shield className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                  Perfil de investidor
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Adequação de risco e jornada educacional calibradas para o seu momento atual.
                </p>
              </div>
            </div>
          </div>

          {onOpenQuestionnaire ? (
            <Button
              type="button"
              size="sm"
              variant={reviewRequired ? 'default' : 'outline'}
              onClick={onOpenQuestionnaire}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {reviewRequired ? 'Atualizar perfil' : 'Refazer perfil'}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {reviewRequired ? (
          <div className={cn(educationTonePanelClassName('warning'), 'flex gap-3 p-4')}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <p className="text-sm leading-relaxed text-foreground/90">
              Seu perfil pode estar desatualizado. Vale revisar o questionário para manter a adequação e a mentoria
              coerentes com seu momento atual.
            </p>
          </div>
        ) : null}

        <div className={cn(educationPanelClassName, 'grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px]')}>
          <div className="space-y-3">
            {section.needsSuitabilityQuestionnaire ? (
              <p className={educationBodyClassName}>
                Complete o questionário para alinhar trilhas educacionais e alertas ao seu perfil de risco. Sem isso,
                parte da personalização permanece genérica.
              </p>
            ) : null}

            {profileLabel ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Perfil estimado:</span>
                <Badge variant="secondary">{profileLabel}</Badge>
                {questionnaireVersion ? <Badge variant="outline">Versão {questionnaireVersion}</Badge> : null}
              </div>
            ) : null}

            {section.summary ? <p className={educationBodyClassName}>{section.summary}</p> : null}
          </div>

          <div className={cn(educationTonePanelClassName('info'), 'p-4')}>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-info">Confiança do perfil</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {section.lastAssessmentAt
                ? `Última avaliação: ${new Date(section.lastAssessmentAt).toLocaleDateString('pt-BR')}`
                : 'Perfil sem data consolidada de avaliação.'}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Refaça a avaliação quando sua tolerância a risco, horizonte ou experiência mudarem.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
