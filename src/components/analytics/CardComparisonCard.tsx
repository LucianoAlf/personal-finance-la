import { CreditCard, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import { useCardComparison } from '@/hooks/useCardComparison';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsScope } from '@/hooks/analyticsScope';

interface CardComparisonCardProps {
  scope?: AnalyticsScope;
}

export function CardComparisonCard({ scope }: CardComparisonCardProps) {
  const { cards, loading, recommendation } = useCardComparison(scope);

  if (loading) {
    return (
      <Card className="rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
            Comparacao de Cartoes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <Skeleton className="h-40 w-full rounded-[24px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="analytics-card-comparison-card"
      className="rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]"
    >
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
          Comparacao de Cartoes
        </CardTitle>
      </CardHeader>
      <CardContent
        data-testid="analytics-card-comparison-content"
        className="space-y-4 pt-5"
      >
        {recommendation ? (
          <div
            data-testid="analytics-card-comparison-recommendation"
            className="flex items-center gap-3 rounded-[22px] border border-success-border/70 bg-success-subtle/80 px-4 py-3 text-success shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-success-border/70 bg-success/10">
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">{recommendation}</p>
          </div>
        ) : null}

        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.cardId}
              data-testid={`analytics-card-comparison-row-${card.cardId}`}
              className="rounded-[22px] border border-border/60 bg-surface-elevated/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 bg-primary/10 text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{card.cardName}</h4>
                    <p className="text-xs text-muted-foreground">{card.cardBrand}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    Score: {card.efficiencyScore.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Eficiencia</p>
                </div>
              </div>

              <div className="mb-3">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Limite Usado</span>
                  <span>{card.limitPercentage.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-overlay/75">
                  <div
                    className={
                      card.limitPercentage > 80
                        ? 'h-2 rounded-full bg-danger transition-all'
                        : card.limitPercentage > 50
                          ? 'h-2 rounded-full bg-warning transition-all'
                          : 'h-2 rounded-full bg-success transition-all'
                    }
                    style={{ width: `${Math.min(card.limitPercentage, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatCurrency(card.limitUsed)} de {formatCurrency(card.limitTotal)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-border/60 bg-background/55 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <p className="text-muted-foreground">Gasto Medio</p>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(card.averageSpending)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/55 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <p className="text-muted-foreground">Transacoes</p>
                  <p className="font-semibold text-foreground">{card.transactionCount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
