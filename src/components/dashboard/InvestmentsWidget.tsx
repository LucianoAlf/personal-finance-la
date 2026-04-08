import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Briefcase, ArrowRight } from 'lucide-react';
import { useInvestmentsQuery } from '@/hooks/useInvestmentsQuery';
import { formatCurrency } from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';

export function InvestmentsWidget() {
  const navigate = useNavigate();
  const { investments, loading } = useInvestmentsQuery();

  // Calcular métricas
  const activeInvestments = investments.filter(inv => inv.status !== 'sold');
  const totalInvested = activeInvestments.reduce(
    (sum, inv) => sum + (inv.total_invested || inv.quantity * inv.purchase_price),
    0
  );
  const totalValue = activeInvestments.reduce((sum, inv) => {
    const currentValue = inv.current_value || (inv.quantity * (inv.current_price || inv.purchase_price));
    return sum + currentValue;
  }, 0);
  const totalReturn = totalValue - totalInvested;
  const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  const showSkeleton = loading && investments.length === 0;

  if (showSkeleton) {
    return (
      <Card className="group cursor-pointer border-border/70 bg-surface/95 transition-all duration-300 hover:bg-surface-elevated/90 hover:shadow-[0_24px_50px_rgba(3,8,20,0.26)]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Investimentos</CardTitle>
            </div>
            <Skeleton className="h-4 w-16 bg-surface-elevated" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full bg-surface-elevated" />
          <Skeleton className="h-6 w-2/3 bg-surface-elevated" />
          <Skeleton className="h-6 w-1/2 bg-surface-elevated" />
        </CardContent>
      </Card>
    );
  }

  const isEmpty = activeInvestments.length === 0;
  const isPositive = totalReturn >= 0;

  return (
    <Card 
      className="group cursor-pointer border-border/70 bg-surface/95 transition-all duration-300 hover:bg-surface-elevated/90 hover:shadow-[0_24px_50px_rgba(3,8,20,0.26)]"
      onClick={() => navigate('/investimentos')}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Investimentos</CardTitle>
          </div>
          <ArrowRight className="h-4 w-4 text-foreground/50 transition-colors group-hover:text-primary" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isEmpty ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-surface-elevated/80">
              <Briefcase className="h-7 w-7 text-primary/80" />
            </div>
            <p className="text-sm text-foreground/80">Nenhum investimento</p>
            <p className="text-xs text-foreground/75">Comece a investir agora</p>
          </div>
        ) : (
          <>
            {/* Valor Total */}
            <div>
              <p className="mb-1 text-xs text-foreground/80">Valor Atual</p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(totalValue)}
              </p>
            </div>

            {/* Retorno */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-elevated/80 p-3">
              <div className="flex items-center gap-1.5">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-emerald-300" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-danger" />
                )}
                <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-300' : 'text-danger'}`}>
                  {isPositive ? '+' : ''}{returnPercentage.toFixed(2)}%
                </span>
              </div>
              <span className={`text-sm font-medium ${isPositive ? 'text-emerald-300' : 'text-danger'}`}>
                {isPositive ? '+' : ''}{formatCurrency(totalReturn)}
              </span>
            </div>

            {/* Ativos */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/80">
                {activeInvestments.length} {activeInvestments.length === 1 ? 'ativo' : 'ativos'}
              </span>
              <span className="text-foreground/75">
                {formatCurrency(totalInvested)} investido
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
