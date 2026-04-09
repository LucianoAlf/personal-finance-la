import { BarChart3 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSpendingPatterns } from '@/hooks/useSpendingPatterns';
import { AnalyticsScope } from '@/hooks/analyticsScope';
import { cn } from '@/lib/utils';

interface TemporalAnalysisCardProps {
  scope?: AnalyticsScope;
}

export function TemporalAnalysisCard({ scope }: TemporalAnalysisCardProps) {
  const { temporalData, daysShort, loading, transactionCount } = useSpendingPatterns(scope);

  const hours = ['Manha', 'Tarde', 'Noite'];

  const getColor = (value: number) => {
    if (value === 0) return 'border-border/50 bg-surface/70';
    if (value >= 80) return 'border-primary/45 bg-primary text-primary-foreground shadow-[0_12px_22px_rgba(139,92,246,0.24)]';
    if (value >= 60) return 'border-primary/35 bg-primary/80 text-primary-foreground';
    if (value >= 40) return 'border-primary/25 bg-primary/60 text-foreground';
    if (value >= 20) return 'border-primary/20 bg-primary/35 text-foreground';
    return 'border-primary/15 bg-primary/18 text-foreground';
  };

  if (loading) {
    return (
      <Card className="rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="flex items-center gap-2 text-[1.65rem] font-semibold tracking-tight text-foreground">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analise Temporal
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="analytics-temporal-card"
      className="rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]"
    >
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-5">
        <CardTitle className="flex items-center gap-2 text-[1.65rem] font-semibold tracking-tight text-foreground">
          <BarChart3 className="h-5 w-5 text-primary" />
          Analise Temporal
        </CardTitle>
        <span className="rounded-full border border-border/60 bg-surface/70 px-3 py-1 text-xs font-medium text-muted-foreground">
          {transactionCount} transacoes
        </span>
      </CardHeader>
      <CardContent data-testid="analytics-temporal-content" className="pt-5">
        <div className="space-y-2">
          <div className="mb-3 grid grid-cols-4 gap-2">
            <div className="text-xs font-medium text-muted-foreground"></div>
            {hours.map((hour) => (
              <div key={hour} className="text-center text-xs font-medium text-muted-foreground">
                {hour}
              </div>
            ))}
          </div>

          {daysShort.map((day, dayIndex) => (
            <div key={day} className="grid grid-cols-4 gap-2">
              <div className="flex items-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
              {temporalData.heatmap[dayIndex].map((value, hourIndex) => (
                <div
                  key={hourIndex}
                  data-testid={`analytics-temporal-cell-${dayIndex}-${hourIndex}`}
                  className={cn(
                    'h-10 cursor-pointer rounded-xl border transition-all hover:scale-[1.02]',
                    getColor(value),
                  )}
                  title={`${day} - ${hours[hourIndex]}: ${value}% de atividade`}
                />
              ))}
            </div>
          ))}

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Menos</span>
            <div className="flex gap-1">
              <div className="h-4 w-4 rounded border border-border/50 bg-surface/70"></div>
              <div className="h-4 w-4 rounded border border-primary/15 bg-primary/18"></div>
              <div className="h-4 w-4 rounded border border-primary/20 bg-primary/35"></div>
              <div className="h-4 w-4 rounded border border-primary/25 bg-primary/60"></div>
              <div className="h-4 w-4 rounded border border-primary/35 bg-primary/80"></div>
              <div className="h-4 w-4 rounded border border-primary/45 bg-primary"></div>
            </div>
            <span>Mais</span>
          </div>

          {transactionCount === 0 ? (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Sem dados de transacoes para exibir o heatmap.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
