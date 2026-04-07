import { Sparkles } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

export function EducationEmptyState() {
  return (
    <Card className="border-dashed border-2 border-violet-200 bg-violet-50/50">
      <CardContent className="p-6 flex gap-4 items-start">
        <Sparkles className="text-violet-600 flex-shrink-0 mt-0.5" size={28} aria-hidden />
        <div>
          <h3 className="font-semibold text-gray-900">Bem-vindo à sua área de educação</h3>
          <p className="text-sm text-gray-600 mt-1">
            Ainda estamos conhecendo seus hábitos financeiros. Use o app (lançamentos, metas e contas) e complete o
            perfil de investidor abaixo para desbloquear recomendações de trilha mais precisas. Os módulos ao lado já
            vêm do nosso catálogo oficial — você pode começar por qualquer lição.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
