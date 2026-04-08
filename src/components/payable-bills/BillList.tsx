import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PayableBill } from '@/types/payable-bills.types';
import type { Category } from '@/types/categories';
import type { Account } from '@/types/accounts';
import { BillCard } from './BillCard';
import { InstallmentGroupCard, groupInstallments } from './InstallmentGroupCard';
import { Inbox } from 'lucide-react';

interface BillListProps {
  bills: PayableBill[];
  allBills?: PayableBill[];
  categories: Category[];
  accounts: Account[];
  categoriesLoading: boolean;
  onPay?: (bill: PayableBill) => void;
  onEdit?: (bill: PayableBill) => void;
  onDelete?: (bill: PayableBill) => void;
  onCopy?: (bill: PayableBill) => void;
  onConfigReminders?: (bill: PayableBill) => void;
  onDeleteInstallmentGroup?: (groupId: string) => void;
  onRevertPayment?: (bill: PayableBill) => void;
  emptyMessage?: string;
}

export function BillList({
  bills,
  allBills,
  categories,
  accounts,
  categoriesLoading,
  onPay,
  onEdit,
  onDelete,
  onCopy,
  onConfigReminders,
  onDeleteInstallmentGroup,
  onRevertPayment,
  emptyMessage = 'Nenhuma conta encontrada',
}: BillListProps) {
  // Separar contas individuais e parcelamentos agrupados
  const { individualBills, installmentGroups } = useMemo(() => {
    const sourceBills = allBills || bills;
    const visibleInstallmentGroupIds = new Set(
      bills
        .filter((bill) => bill.is_installment && bill.installment_group_id)
        .map((bill) => bill.installment_group_id as string)
    );
    // IDs de parcelas que pertencem a um grupo
    const groupedInstallmentIds = new Set<string>();
    
    // Agrupar parcelamentos
    const groups = groupInstallments(sourceBills).filter((group) =>
      visibleInstallmentGroupIds.has(group.groupId)
    );
    
    // Marcar todas as parcelas que foram agrupadas
    groups.forEach((group) => {
      group.installments.forEach((installment) => {
        groupedInstallmentIds.add(installment.id);
      });
    });
    
    // Contas individuais = todas que não são parcelas agrupadas
    const individual = bills.filter((bill) => !groupedInstallmentIds.has(bill.id));
    
    return {
      individualBills: individual,
      installmentGroups: groups,
    };
  }, [allBills, bills]);

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
    <div className="space-y-6">
      {/* Parcelamentos Agrupados */}
      {installmentGroups.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <span className="h-px flex-1 bg-border" />
            Parcelamentos ({installmentGroups.length})
            <span className="h-px flex-1 bg-border" />
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            {installmentGroups.map((group) => (
              <InstallmentGroupCard
                key={group.groupId}
                group={group}
                categories={categories}
                accounts={accounts}
                categoriesLoading={categoriesLoading}
                onPayInstallment={onPay}
                onEditInstallment={onEdit}
                onDeleteGroup={onDeleteInstallmentGroup}
                onRevertInstallmentPayment={onRevertPayment}
              />
            ))}
          </div>
        </div>
      )}

      {/* Contas Individuais */}
      {individualBills.length > 0 && (
        <div className="space-y-4">
          {installmentGroups.length > 0 && (
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <span className="h-px flex-1 bg-border" />
              Outras Contas ({individualBills.length})
              <span className="h-px flex-1 bg-border" />
            </h4>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {individualBills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                categories={categories}
                accounts={accounts}
                onPay={onPay}
                onEdit={onEdit}
                onDelete={onDelete}
                onCopy={onCopy}
                onConfigReminders={onConfigReminders}
                onRevertPayment={onRevertPayment}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
