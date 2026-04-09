import { Store, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import { useTopSpending } from '@/hooks/useTopSpending';
import { Skeleton } from '@/components/ui/skeleton';
import { parseDateOnlyAsLocal } from '@/utils/dateOnly';
import { AnalyticsScope } from '@/hooks/analyticsScope';

interface TopMerchantsCardProps {
  scope?: AnalyticsScope;
}

export function TopMerchantsCard({ scope }: TopMerchantsCardProps) {
  const { topMerchants, loading } = useTopSpending(scope);

  if (loading) {
    return (
      <Card className="rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
            Top 5 Estabelecimentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[92px] w-full rounded-[22px]" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (topMerchants.length === 0) {
    return (
      <Card className="rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
            Top 5 Estabelecimentos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="py-10 text-center text-muted-foreground">
            <Store className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p>Nenhum estabelecimento registrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="analytics-top-merchants-card"
      className="rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]"
    >
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
          Top 5 Estabelecimentos
        </CardTitle>
      </CardHeader>
      <CardContent
        data-testid="analytics-top-merchants-content"
        className="space-y-4 pt-5"
      >
        {topMerchants.map((merchant, index) => (
          <div
            key={merchant.merchantName}
            data-testid={`analytics-top-merchant-row-${merchant.merchantName}`}
            className="flex items-start gap-4 rounded-[22px] border border-border/60 bg-surface-elevated/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:bg-surface-elevated/68"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface text-sm font-bold text-foreground">
              {index + 1}
            </div>

            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/50"
              style={{ backgroundColor: `${merchant.categoryColor}20` }}
            >
              <Store className="h-5 w-5" style={{ color: merchant.categoryColor }} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-semibold text-foreground">{merchant.merchantName}</h4>
                  <p className="text-xs text-muted-foreground">{merchant.categoryName}</p>
                </div>
                <span className="ml-2 font-semibold text-foreground">
                  {formatCurrency(merchant.totalAmount)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl border border-border/60 bg-background/55 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <p className="text-muted-foreground">Frequencia</p>
                  <p className="font-semibold text-foreground">{merchant.transactionCount}x</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/55 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <p className="text-muted-foreground">Ticket Medio</p>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(merchant.averageTicket)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/55 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Ultima
                  </p>
                  <p className="font-semibold text-foreground">
                    {format(parseDateOnlyAsLocal(merchant.lastPurchaseDate), 'dd/MM', { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
