import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { DollarSign, Receipt, CheckCircle, TrendingUp } from 'lucide-react';
import { PayableBill } from '@/types/payable-bills.types';
import { parseISO, isBefore } from 'date-fns';

interface HistorySummaryCardsProps {
  bills: PayableBill[];
}

export function HistorySummaryCards({ bills }: HistorySummaryCardsProps) {
  const stats = useMemo(() => {
    const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const count = bills.length;
    const average = count > 0 ? total / count : 0;
    
    // Calcular pontualidade (pagos antes ou no dia do vencimento)
    const onTime = bills.filter((bill) => {
      if (!bill.paid_at) return false;
      const paidDate = parseISO(bill.paid_at);
      const dueDate = parseISO(bill.due_date);
      return !isBefore(dueDate, paidDate); // pago antes ou no dia
    }).length;
    
    const onTimeRate = count > 0 ? Math.round((onTime / count) * 100) : 0;

    return { total, count, average, onTimeRate };
  }, [bills]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const cards = [
    {
      title: 'Total Pago',
      value: formatCurrency(stats.total),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Contas Pagas',
      value: stats.count.toString(),
      icon: Receipt,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Pontualidade',
      value: `${stats.onTimeRate}%`,
      icon: CheckCircle,
      color: stats.onTimeRate >= 80 ? 'text-green-600' : stats.onTimeRate >= 50 ? 'text-yellow-600' : 'text-red-600',
      bgColor: stats.onTimeRate >= 80 ? 'bg-green-500/10' : stats.onTimeRate >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10',
    },
    {
      title: 'Média por Conta',
      value: formatCurrency(stats.average),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={`p-4 ${card.bgColor}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-background/50`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
