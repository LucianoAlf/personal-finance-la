import { Clock, Calendar, CreditCard, TrendingUp, Loader2 } from 'lucide-react';
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
      <Card>
        <CardHeader>
          <CardTitle>Padrões de Gasto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Padrões de Gasto</CardTitle>
        <span className="text-xs text-gray-500">
          {transactionCount} transações (90 dias)
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Dia com mais gastos</p>
              <p className="font-semibold text-gray-900">{patterns.dayOfWeek}</p>
              {patterns.dayOfWeekCount > 0 && (
                <p className="text-xs text-gray-400">{patterns.dayOfWeekCount} compras</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Horário preferencial</p>
              <p className="font-semibold text-gray-900">{patterns.preferredTime}</p>
              {patterns.preferredTimeCount > 0 && (
                <p className="text-xs text-gray-400">{patterns.preferredTimeCount} compras</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <CreditCard className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Compras parceladas</p>
              <p className="font-semibold text-gray-900">{patterns.installmentPercentage}%</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Ticket médio</p>
              <p className="font-semibold text-gray-900">
                {patterns.averageTicket > 0 ? formatCurrency(patterns.averageTicket) : 'R$ 0,00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-900">
            💡 <strong>Insight:</strong> {insight}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
