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
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Investimentos</CardTitle>
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  const isEmpty = activeInvestments.length === 0;
  const isPositive = totalReturn >= 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => navigate('/investimentos')}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Investimentos</CardTitle>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isEmpty ? (
          <div className="text-center py-4">
            <Briefcase className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Nenhum investimento</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Comece a investir agora</p>
          </div>
        ) : (
          <>
            {/* Valor Total */}
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Valor Atual</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalValue)}
              </p>
            </div>

            {/* Retorno */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <div className="flex items-center gap-1.5">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-sm font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? '+' : ''}{returnPercentage.toFixed(2)}%
                </span>
              </div>
              <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositive ? '+' : ''}{formatCurrency(totalReturn)}
              </span>
            </div>

            {/* Ativos */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {activeInvestments.length} {activeInvestments.length === 1 ? 'ativo' : 'ativos'}
              </span>
              <span className="text-gray-500 dark:text-gray-500">
                {formatCurrency(totalInvested)} investido
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
