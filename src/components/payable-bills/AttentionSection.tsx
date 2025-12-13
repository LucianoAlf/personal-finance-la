import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import { PayableBill } from '@/types/payable-bills.types';
import { BillCard } from './BillCard';
import { differenceInDays, parseISO, isToday, isTomorrow } from 'date-fns';

interface AttentionSectionProps {
  bills: PayableBill[];
  onPay: (bill: PayableBill) => void;
  onEdit: (bill: PayableBill) => void;
  onDelete: (bill: PayableBill) => void;
  onCopy: (bill: PayableBill) => void;
  onConfigReminders: (bill: PayableBill) => void;
}

export function AttentionSection({
  bills,
  onPay,
  onEdit,
  onDelete,
  onCopy,
  onConfigReminders,
}: AttentionSectionProps) {
  const today = new Date();
  
  // Filtrar contas que precisam de atenção
  const overdueBills = bills.filter((b) => b.status === 'overdue');
  const dueTodayBills = bills.filter(
    (b) => b.status === 'pending' && isToday(parseISO(b.due_date))
  );
  const dueTomorrowBills = bills.filter(
    (b) => b.status === 'pending' && isTomorrow(parseISO(b.due_date))
  );
  
  const attentionBills = [...overdueBills, ...dueTodayBills, ...dueTomorrowBills];
  
  if (attentionBills.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header da seção */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            Atenção Necessária
          </span>
        </div>
        
        {/* Mini badges */}
        <div className="flex gap-2">
          {overdueBills.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-full">
              <Clock className="h-3 w-3" />
              {overdueBills.length} atrasada{overdueBills.length > 1 ? 's' : ''}
            </span>
          )}
          {dueTodayBills.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-500 text-white rounded-full">
              <Calendar className="h-3 w-3" />
              {dueTodayBills.length} vence hoje
            </span>
          )}
          {dueTomorrowBills.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-500 text-white rounded-full">
              <Calendar className="h-3 w-3" />
              {dueTomorrowBills.length} vence amanhã
            </span>
          )}
        </div>
      </div>

      {/* Cards de atenção */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {attentionBills.slice(0, 6).map((bill, index) => (
          <motion.div
            key={bill.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <BillCard
              bill={bill}
              onPay={onPay}
              onEdit={onEdit}
              onDelete={onDelete}
              onCopy={onCopy}
              onConfigReminders={onConfigReminders}
              highlight
            />
          </motion.div>
        ))}
      </div>
      
      {attentionBills.length > 6 && (
        <p className="text-sm text-muted-foreground text-center">
          +{attentionBills.length - 6} outras contas precisam de atenção
        </p>
      )}
    </motion.div>
  );
}
