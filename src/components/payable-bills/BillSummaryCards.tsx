import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency } from '@/utils/billCalculations';

interface BillSummaryCardsProps {
  pendingAmount: number;
  pendingCount: number;
  overdueAmount: number;
  overdueCount: number;
  paidAmount: number;
  paidCount: number;
}

export function BillSummaryCards({
  pendingAmount,
  pendingCount,
  overdueAmount,
  overdueCount,
  paidAmount,
  paidCount,
}: BillSummaryCardsProps) {
  const cards = [
    {
      title: 'A Vencer',
      amount: pendingAmount,
      count: pendingCount,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
    },
    {
      title: 'Vencidas',
      amount: overdueAmount,
      count: overdueCount,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    {
      title: 'Pagas',
      amount: paidAmount,
      count: paidCount,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={`border-2 ${card.borderColor} ${card.bgColor}`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </h3>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="space-y-1">
                <p className={`text-2xl font-bold ${card.color}`}>
                  {formatCurrency(card.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {card.count} {card.count === 1 ? 'conta' : 'contas'}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
