import { BarChart3 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportsEmptyStateProps {
  periodLabel: string;
}

export function ReportsEmptyState({ periodLabel }: ReportsEmptyStateProps) {
  return (
    <Card className="border-dashed bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-slate-100 p-3 text-slate-600">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Dados insuficientes para montar o relatório</CardTitle>
            <CardDescription>{periodLabel}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>O backend retornou contexto canônico, mas ainda não há seções determinísticas fortes o suficiente para exibir.</p>
        <p>Registre movimentações, contas, metas, contas a pagar ou investimentos para destravar os blocos do relatório.</p>
      </CardContent>
    </Card>
  );
}
