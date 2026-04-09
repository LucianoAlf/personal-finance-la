import { Clock, Calendar, CreditCard, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSpendingPatterns } from '@/hooks/useSpendingPatterns';
import { formatCurrency } from '@/utils/formatters';
import { AnalyticsScope } from '@/hooks/analyticsScope';

interface SpendingPatternsCardProps {
  scope?: AnalyticsScope;
}

export function SpendingPatternsCard({ scope }: SpendingPatternsCardProps) {
  const { patterns, insight, loading, transactionCount } = useSpendingPatterns(scope);

  if (loading) {
    return (
      <Card className="rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
            Padroes de Gasto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-[22px]" />
            ))}
          </div>
          <Skeleton className="h-16 w-full rounded-[22px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="analytics-spending-patterns-card"
      className="rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]"
    >
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-5">
        <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
          Padroes de Gasto
        </CardTitle>
        <span className="rounded-full border border-border/60 bg-surface/70 px-3 py-1 text-xs font-medium text-muted-foreground">
          {transactionCount} transacoes (90 dias)
        </span>
      </CardHeader>
      <CardContent
        data-testid="analytics-spending-patterns-content"
        className="space-y-4 pt-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <div
            data-testid="analytics-spending-pattern-item-day"
            className="flex items-start gap-3 rounded-[22px] border border-border/60 bg-surface-elevated/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          >
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/18 bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dia com mais gastos</p>
              <p className="font-semibold text-foreground">{patterns.dayOfWeek}</p>
              {patterns.dayOfWeekCount > 0 ? (
                <p className="text-xs text-muted-foreground/80">{patterns.dayOfWeekCount} compras</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-[22px] border border-border/60 bg-surface-elevated/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/18 bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Horario preferencial</p>
              <p className="font-semibold text-foreground">{patterns.preferredTime}</p>
              {patterns.preferredTimeCount > 0 ? (
                <p className="text-xs text-muted-foreground/80">{patterns.preferredTimeCount} compras</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-[22px] border border-border/60 bg-surface-elevated/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/18 bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Compras parceladas</p>
              <p className="font-semibold text-foreground">{patterns.installmentPercentage}%</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-[22px] border border-border/60 bg-surface-elevated/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/18 bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ticket medio</p>
              <p className="font-semibold text-foreground">
                {patterns.averageTicket > 0 ? formatCurrency(patterns.averageTicket) : 'R$ 0,00'}
              </p>
            </div>
          </div>
        </div>

        <div
          data-testid="analytics-spending-patterns-insight"
          className="rounded-[22px] border border-info-border/70 bg-info-subtle/80 px-4 py-3 text-info shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
        >
          <p className="text-sm">
            <strong>Insight:</strong> {insight}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
