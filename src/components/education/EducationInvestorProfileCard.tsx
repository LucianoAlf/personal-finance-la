import { AlertTriangle, RefreshCcw, Shield } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!section) {
    return null;
  }

  const label = section.profileKey ? profileKeyLabels[section.profileKey] ?? section.profileKey : null;

  return (
    <Card className="border-l-4 border-emerald-600">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <Shield className="text-emerald-600" size={22} aria-hidden />
            <CardTitle className="text-base">Perfil de investidor</CardTitle>
          </div>
          {onOpenQuestionnaire ? (
            <Button type="button" size="sm" variant={reviewRequired ? 'default' : 'outline'} onClick={onOpenQuestionnaire}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {reviewRequired ? 'Atualizar perfil' : 'Refazer perfil'}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        {section.needsSuitabilityQuestionnaire && (
          <p>
            Complete o questionário para alinhar trilhas educacionais e alertas ao seu perfil de risco. Sem isso,
            parte da personalização permanece genérica.
          </p>
        )}
        {reviewRequired ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
            <p className="text-xs leading-relaxed">
              Seu perfil pode estar desatualizado. Vale revisar o questionário para manter adequação e mentoria coerentes
              com seu momento atual.
            </p>
          </div>
        ) : null}
        {label && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-600">Perfil estimado:</span>
            <Badge variant="secondary">{label}</Badge>
            {questionnaireVersion ? (
              <Badge variant="outline">Versão {questionnaireVersion}</Badge>
            ) : null}
          </div>
        )}
        {section.summary && <p className="leading-relaxed">{section.summary}</p>}
        {section.lastAssessmentAt && (
          <p className="text-xs text-gray-500">
            Última avaliação: {new Date(section.lastAssessmentAt).toLocaleDateString('pt-BR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
