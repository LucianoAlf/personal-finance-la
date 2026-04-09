import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, Wallet } from 'lucide-react';
import { formatCurrency } from '@/utils/billCalculations';
import { StatCard } from '@/components/dashboard/StatCard';

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
  const totalAmount = pendingAmount + overdueAmount + paidAmount;
  const totalCount = pendingCount + overdueCount + paidCount;

  const cards = [
    {
      title: 'Total',
      amount: totalAmount,
      count: totalCount,
      icon: Wallet,
      gradient: 'blue' as const,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      title: 'A Vencer',
      amount: pendingAmount,
      count: pendingCount,
      icon: Clock,
      gradient: 'orange' as const,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
    },
    {
      title: 'Vencidas',
      amount: overdueAmount,
      count: overdueCount,
      icon: AlertCircle,
      gradient: 'red' as const,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    {
      title: 'Pagas',
      amount: paidAmount,
      count: paidCount,
      icon: CheckCircle2,
      gradient: 'green' as const,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
        >
          <StatCard
            title={card.title}
            value={formatCurrency(card.amount)}
            icon={card.icon}
            gradient={card.gradient}
            subtitle={`${card.count} ${card.count === 1 ? 'conta' : 'contas'}`}
            valueClassName={card.color}
          />
        </motion.div>
      ))}
    </div>
  );
}
