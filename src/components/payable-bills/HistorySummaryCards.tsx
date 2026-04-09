import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Receipt, CheckCircle, TrendingUp } from 'lucide-react';
import { parseISO, isBefore } from 'date-fns';
import { PayableBill } from '@/types/payable-bills.types';
import { StatCard } from '@/components/dashboard/StatCard';

interface HistorySummaryCardsProps {
  bills: PayableBill[];
}

export function HistorySummaryCards({ bills }: HistorySummaryCardsProps) {
  const stats = useMemo(() => {
    const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const count = bills.length;
    const average = count > 0 ? total / count : 0;

    const onTime = bills.filter((bill) => {
      if (!bill.paid_at) return false;
      const paidDate = parseISO(bill.paid_at);
      const dueDate = parseISO(bill.due_date);
      return !isBefore(dueDate, paidDate);
    }).length;

    const onTimeRate = count > 0 ? Math.round((onTime / count) * 100) : 0;

    return { total, count, average, onTimeRate };
  }, [bills]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const cards = [
    {
      title: 'Total Pago',
      value: formatCurrency(stats.total),
      icon: DollarSign,
      gradient: 'green' as const,
      valueClassName: 'text-emerald-500',
      subtitle: `${stats.count} ${stats.count === 1 ? 'conta' : 'contas'}`,
    },
    {
      title: 'Contas Pagas',
      value: stats.count.toString(),
      icon: Receipt,
      gradient: 'blue' as const,
      valueClassName: 'text-blue-500',
      subtitle: 'Histórico filtrado',
    },
    {
      title: 'Pontualidade',
      value: `${stats.onTimeRate}%`,
      icon: CheckCircle,
      gradient: stats.onTimeRate >= 80 ? ('green' as const) : stats.onTimeRate >= 50 ? ('orange' as const) : ('red' as const),
      valueClassName:
        stats.onTimeRate >= 80 ? 'text-emerald-500' : stats.onTimeRate >= 50 ? 'text-amber-400' : 'text-red-500',
      subtitle: 'Pagas no prazo',
    },
    {
      title: 'Média por Conta',
      value: formatCurrency(stats.average),
      icon: TrendingUp,
      gradient: 'purple' as const,
      valueClassName: 'text-primary',
      subtitle: 'Valor médio pago',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <StatCard
            title={card.title}
            value={card.value}
            icon={card.icon}
            gradient={card.gradient}
            subtitle={card.subtitle}
            valueClassName={card.valueClassName}
          />
        </motion.div>
      ))}
    </div>
  );
}
