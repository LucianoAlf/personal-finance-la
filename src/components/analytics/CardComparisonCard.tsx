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
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Cartões</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação de Cartões</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recomendação */}
        {recommendation && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <p className="text-sm font-medium text-green-900">{recommendation}</p>
          </div>
        )}

        {/* Tabela de Cartões */}
        <div className="space-y-3">
          {cards.map((card) => (
            <div key={card.cardId} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{card.cardName}</h4>
                    <p className="text-xs text-gray-500">{card.cardBrand}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    Score: {card.efficiencyScore.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">Eficiência</p>
                </div>
              </div>

              {/* Barra de Limite */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Limite Usado</span>
                  <span>{card.limitPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      card.limitPercentage > 80 ? 'bg-red-500' :
                      card.limitPercentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(card.limitPercentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(card.limitUsed)} de {formatCurrency(card.limitTotal)}
                </p>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Gasto Médio</p>
                  <p className="font-semibold">{formatCurrency(card.averageSpending)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Transações</p>
                  <p className="font-semibold">{card.transactionCount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
