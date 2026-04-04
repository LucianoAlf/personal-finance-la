import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { motion } from 'framer-motion';

interface PortfolioSummaryCardsProps {
  totalInvested: number;
  currentValue: number;
  totalReturn: number;
  returnPercentage: number;
}

export function PortfolioSummaryCards({
  totalInvested,
  currentValue,
  totalReturn,
  returnPercentage,
}: PortfolioSummaryCardsProps) {
  const isPositive = totalReturn >= 0;

  const cards = [
    {
      title: 'Total Investido',
      value: formatCurrency(totalInvested),
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Valor Atual',
      value: formatCurrency(currentValue),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Valorização',
      value: formatCurrency(totalReturn),
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-green-600' : 'text-red-600',
      bgColor: isPositive ? 'bg-green-50' : 'bg-red-50',
      borderColor: isPositive ? 'border-l-green-500' : 'border-l-red-500',
    },
    {
      title: 'Rentabilidade',
      value: `${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(2)}%`,
      icon: Percent,
      color: isPositive ? 'text-green-600' : 'text-red-600',
      bgColor: isPositive ? 'bg-green-50' : 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className={`${card.borderColor ? `border-l-4 ${card.borderColor}` : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">
                      {card.title}
                    </p>
                    <h2 className={`text-2xl font-bold ${card.color}`}>
                      {card.value}
                    </h2>
                  </div>
                  <div className={`rounded-lg p-3 ${card.bgColor}`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
