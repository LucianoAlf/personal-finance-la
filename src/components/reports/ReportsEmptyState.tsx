import { BarChart3 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { reportsShellClassName, reportsDashedPanelClassName } from './reports-shell';

interface ReportsEmptyStateProps {
  periodLabel: string;
}

export function ReportsEmptyState({ periodLabel }: ReportsEmptyStateProps) {
  return (
    <Card className={`${reportsShellClassName} border-dashed`}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className="rounded-[22px] border border-border/60 bg-surface-elevated/45 p-3 text-primary">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
              Dados insuficientes para montar o relatório
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{periodLabel}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={reportsDashedPanelClassName}>
          <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>
              O backend retornou contexto canônico, mas ainda não há seções determinísticas fortes o
              suficiente para exibir.
            </p>
            <p>
              Registre movimentações, contas, metas, contas a pagar ou investimentos para destravar os
              blocos do relatório.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
