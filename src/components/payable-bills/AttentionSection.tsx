import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Calendar, Receipt } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PayableBill } from '@/types/payable-bills.types';
import type { Category } from '@/types/categories';
import type { Account } from '@/types/accounts';
import { BillCard } from './BillCard';
import { getDaysUntilDue, isBillOverdue, isDueToday, formatCurrency } from '@/utils/billCalculations';

function isOpenForAttention(bill: PayableBill): boolean {
  return bill.status !== 'paid' && bill.status !== 'cancelled';
}

interface AttentionSectionProps {
  bills: PayableBill[];
  categories: Category[];
  accounts: Account[];
  categoriesLoading: boolean;
  onPay: (bill: PayableBill) => void;
  onEdit: (bill: PayableBill) => void;
  onDelete: (bill: PayableBill) => void;
  onCopy: (bill: PayableBill) => void;
  onConfigReminders: (bill: PayableBill) => void;
}

export function AttentionSection({
  bills,
  categories,
  accounts,
  categoriesLoading,
  onPay,
  onEdit,
  onDelete,
  onCopy,
  onConfigReminders,
}: AttentionSectionProps) {
  // Alinhar com o resumo da página e usePayableBills: vencimento pela data, não só status === 'overdue'
  // (parcelas e outras linhas podem ficar como pending no banco mesmo após o vencimento).
  const overdueBills = bills.filter(
    (b) => isOpenForAttention(b) && isBillOverdue(b.due_date)
  );
  const dueTodayBills = bills.filter(
    (b) => isOpenForAttention(b) && isDueToday(b.due_date)
  );
  const dueTomorrowBills = bills.filter(
    (b) => isOpenForAttention(b) && getDaysUntilDue(b.due_date) === 1
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
        <div className="flex gap-1 md:gap-2">
          {overdueBills.length > 0 && (
            <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-2 md:py-1 text-[11px] md:text-xs font-medium bg-red-500 text-white rounded-full">
              <Clock className="h-3 w-3 md:h-3 md:w-3" />
              {overdueBills.length} atrasada{overdueBills.length > 1 ? 's' : ''}
            </span>
          )}
          {dueTodayBills.length > 0 && (
            <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-2 md:py-1 text-[11px] md:text-xs font-medium bg-orange-500 text-white rounded-full">
              <Calendar className="h-3 w-3 md:h-3 md:w-3" />
              {dueTodayBills.length} vence hoje
            </span>
          )}
          {dueTomorrowBills.length > 0 && (
            <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-2 md:py-1 text-[11px] md:text-xs font-medium bg-yellow-500 text-white rounded-full">
              <Calendar className="h-3 w-3 md:h-3 md:w-3" />
              {dueTomorrowBills.length} vence amanhã
            </span>
          )}
        </div>
      </div>

      {/* Cards de atenção — mobile compact inline cards */}
      <div className="lg:hidden space-y-2">
        {attentionBills.slice(0, 6).map((bill) => {
          const isOverdue = isBillOverdue(bill.due_date);
          return (
            <button
              key={`a-${bill.id}`}
              type="button"
              onClick={() => onEdit(bill)}
              className={`flex w-full items-center gap-3 rounded-xl border border-border border-l-4 bg-surface-elevated p-3 text-left ${isOverdue ? 'border-l-destructive' : 'border-l-warning'}`}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Receipt size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{bill.description}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {format(parseISO(bill.due_date), 'dd/MM')}
                  {' · '}
                  {formatCurrency(bill.amount)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Cards de atenção — desktop full BillCard grid */}
      <div className="hidden lg:grid gap-4 lg:grid-cols-3">
        {attentionBills.slice(0, 6).map((bill, index) => (
          <motion.div
            key={bill.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <BillCard
              bill={bill}
              categories={categories}
              accounts={accounts}
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
