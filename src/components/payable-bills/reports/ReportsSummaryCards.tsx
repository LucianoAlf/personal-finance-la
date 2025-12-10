import { Card, CardContent } from '@/components/ui/card';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  formatCurrency, 
  formatPercent, 
  Comparison 
} from '@/hooks/useBillReports';

interface ReportsSummaryCardsProps {
  totalAmount: number;
  totalBills: number;
  comparison: Comparison;
  forecastAmount: number;
  forecastMonths: number;
  onTimeRate: number;
  paidCount: number;
  totalPaid: number;
}

export function ReportsSummaryCards({
  totalAmount,
  totalBills,
  comparison,
  forecastAmount,
  forecastMonths,
  onTimeRate,
  paidCount,
  totalPaid
}: ReportsSummaryCardsProps) {
  const cards = [
    {
      title: 'Total do Período',
      value: formatCurrency(totalAmount),
      subtitle: `${totalBills} contas`,
      icon: DollarSign,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
      borderColor: 'border-indigo-200 dark:border-indigo-900'
    },
    {
      title: 'vs Período Anterior',
      value: formatPercent(comparison.variation_percent),
      subtitle: `${comparison.trend === 'up' ? '+' : ''}${formatCurrency(comparison.difference)}`,
      icon: comparison.trend === 'up' ? TrendingUp : comparison.trend === 'down' ? TrendingDown : Minus,
      color: comparison.trend === 'up' ? 'text-red-600' : comparison.trend === 'down' ? 'text-green-600' : 'text-gray-600',
      bgColor: comparison.trend === 'up' ? 'bg-red-50 dark:bg-red-950/20' : comparison.trend === 'down' ? 'bg-green-50 dark:bg-green-950/20' : 'bg-gray-50 dark:bg-gray-950/20',
      borderColor: comparison.trend === 'up' ? 'border-red-200 dark:border-red-900' : comparison.trend === 'down' ? 'border-green-200 dark:border-green-900' : 'border-gray-200 dark:border-gray-900',
      highlight: true
    },
    {
      title: 'Previsão Próx. Mês',
      value: formatCurrency(forecastAmount),
      subtitle: `Baseado em ${forecastMonths} meses`,
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      borderColor: 'border-purple-200 dark:border-purple-900'
    },
    {
      title: 'Taxa de Pontualidade',
      value: `${onTimeRate.toFixed(0)}%`,
      subtitle: `${paidCount}/${totalPaid} em dia`,
      icon: CheckCircle2,
      color: onTimeRate >= 80 ? 'text-green-600' : onTimeRate >= 50 ? 'text-yellow-600' : 'text-red-600',
      bgColor: onTimeRate >= 80 ? 'bg-green-50 dark:bg-green-950/20' : onTimeRate >= 50 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-red-50 dark:bg-red-950/20',
      borderColor: onTimeRate >= 80 ? 'border-green-200 dark:border-green-900' : onTimeRate >= 50 ? 'border-yellow-200 dark:border-yellow-900' : 'border-red-200 dark:border-red-900'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={cn(
            'relative overflow-hidden transition-all hover:shadow-md',
            card.bgColor,
            card.borderColor,
            card.highlight && 'ring-2 ring-offset-2',
            card.highlight && comparison.trend === 'up' && 'ring-red-300',
            card.highlight && comparison.trend === 'down' && 'ring-green-300'
          )}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className={cn('text-2xl font-bold', card.color)}>
                    {card.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {card.subtitle}
                  </p>
                </div>
                <div className={cn(
                  'rounded-full p-2',
                  card.bgColor
                )}>
                  <card.icon className={cn('h-5 w-5', card.color)} />
                </div>
              </div>
              
              {/* Indicador visual de tendência */}
              {card.highlight && (
                <div className={cn(
                  'absolute bottom-0 left-0 right-0 h-1',
                  comparison.trend === 'up' && 'bg-red-500',
                  comparison.trend === 'down' && 'bg-green-500',
                  comparison.trend === 'stable' && 'bg-gray-400'
                )} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
