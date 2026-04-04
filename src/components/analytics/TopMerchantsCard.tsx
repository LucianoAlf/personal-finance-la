import { Store, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import { useTopSpending } from '@/hooks/useTopSpending';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnlyAsLocal } from '@/utils/dateOnly';
import { AnalyticsScope } from '@/hooks/analyticsScope';

interface TopMerchantsCardProps {
  scope?: AnalyticsScope;
}

export function TopMerchantsCard({ scope }: TopMerchantsCardProps) {
  const { topMerchants, loading } = useTopSpending(scope);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Estabelecimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (topMerchants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Estabelecimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Store className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum estabelecimento registrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Estabelecimentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topMerchants.map((merchant, index) => (
          <div
            key={merchant.merchantName}
            className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {/* Ranking */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">
              {index + 1}
            </div>

            {/* Logo/Ícone */}
            <div
              className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${merchant.categoryColor}20` }}
            >
              <Store
                className="h-6 w-6"
                style={{ color: merchant.categoryColor }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {merchant.merchantName}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {merchant.categoryName}
                  </p>
                </div>
                <span className="font-bold text-gray-900 ml-2">
                  {formatCurrency(merchant.totalAmount)}
                </span>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div className="bg-gray-50 rounded px-2 py-1">
                  <p className="text-gray-500">Frequência</p>
                  <p className="font-semibold text-gray-900">
                    {merchant.transactionCount}x
                  </p>
                </div>
                <div className="bg-gray-50 rounded px-2 py-1">
                  <p className="text-gray-500">Ticket Médio</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(merchant.averageTicket)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded px-2 py-1">
                  <p className="text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Última
                  </p>
                  <p className="font-semibold text-gray-900">
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
