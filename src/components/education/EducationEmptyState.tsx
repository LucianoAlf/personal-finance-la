import { Sparkles } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  educationBodyClassName,
  educationHeadingClassName,
  educationShellClassName,
  educationTonePanelClassName,
} from './education-shell';

export function EducationEmptyState() {
  return (
    <Card className={educationShellClassName}>
      <CardContent className="flex items-start gap-4 p-6">
        <div className={cn(educationTonePanelClassName('violet'), 'flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]')}>
          <Sparkles className="h-6 w-6 text-violet-100" aria-hidden />
        </div>

        <div>
          <h3 className={cn(educationHeadingClassName, 'text-xl')}>Bem-vindo à sua área de educação</h3>
          <p className={cn(educationBodyClassName, 'mt-1')}>
            Ainda estamos conhecendo seus hábitos financeiros. Use o app (lançamentos, metas e contas) e complete o
            perfil de investidor abaixo para desbloquear recomendações de trilha mais precisas. Os módulos ao lado já
            vêm do nosso catálogo oficial — você pode começar por qualquer lição.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
