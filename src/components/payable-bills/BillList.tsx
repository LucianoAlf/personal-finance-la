import { motion } from 'framer-motion';
import { PayableBill } from '@/types/payable-bills.types';
import { BillCard } from './BillCard';
import { Inbox } from 'lucide-react';

interface BillListProps {
  bills: PayableBill[];
  onPay?: (bill: PayableBill) => void;
  onEdit?: (bill: PayableBill) => void;
  onDelete?: (bill: PayableBill) => void;
  onConfigReminders?: (bill: PayableBill) => void;
  emptyMessage?: string;
}

export function BillList({
  bills,
  onPay,
  onEdit,
  onDelete,
  onConfigReminders,
  emptyMessage = 'Nenhuma conta encontrada',
}: BillListProps) {
  if (bills.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="rounded-full bg-muted p-6 mb-4">
          <Inbox className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhuma conta por aqui</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {emptyMessage}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {bills.map((bill) => (
        <BillCard
          key={bill.id}
          bill={bill}
          onPay={onPay}
          onEdit={onEdit}
          onDelete={onDelete}
          onConfigReminders={onConfigReminders}
        />
      ))}
    </div>
  );
}
