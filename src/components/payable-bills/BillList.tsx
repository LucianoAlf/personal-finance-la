import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PayableBill } from '@/types/payable-bills.types';
import type { Category } from '@/types/categories';
import type { Account } from '@/types/accounts';
import { BillCard } from './BillCard';
import { InstallmentGroupCard, groupInstallments } from './InstallmentGroupCard';
import { Inbox, Receipt } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { isBillOverdue, getRemainingAmount, formatCurrency } from '@/utils/billCalculations';

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
    <>
      {/* Desktop list — preserved */}
      <div className="hidden lg:block">
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
      </div>

      {/* Mobile list — inline cards */}
      <div className="space-y-2 lg:hidden">
        {individualBills.map((bill) => {
          const category = categories.find((c) => c.id === bill.category_id);
          const account = accounts.find((a) => a.id === bill.account_id);
          const isOverdue = isBillOverdue(bill.due_date);
          const remaining = getRemainingAmount(bill);

          return (
            <button
              key={`m-${bill.id}`}
              type="button"
              onClick={() => onEdit?.(bill)}
              className={`flex w-full items-center gap-3 rounded-xl border border-border border-l-4 bg-surface-elevated p-3 text-left transition-colors hover:bg-surface-overlay ${
                isOverdue ? 'border-l-destructive' : 'border-l-warning'
              }`}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Receipt size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{bill.description}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {category?.name ?? 'Sem categoria'}
                  {account ? ` · ${account.name}` : ''}
                  {' · '}
                  {format(parseISO(bill.due_date), 'dd/MM')}
                </div>
              </div>
              <div className="flex-shrink-0 text-right text-sm font-bold text-foreground">
                {formatCurrency(remaining)}
              </div>
            </button>
          );
        })}

        {installmentGroups.map((group) => (
          <button
            key={`m-${group.groupId}`}
            type="button"
            onClick={() => onEdit?.(group.installments[0])}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-elevated p-3 text-left hover:bg-surface-overlay"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Receipt size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">{group.installments[0].description}</div>
              <div className="truncate text-xs text-muted-foreground">
                {group.installments.length} parcelas
              </div>
            </div>
            <div className="flex-shrink-0 text-right text-sm font-bold text-foreground">
              {formatCurrency(group.installments.reduce((s, b) => s + getRemainingAmount(b), 0))}
            </div>
          </button>
        ))}

        {bills.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Inbox size={32} aria-hidden="true" />
            <div>{emptyMessage}</div>
          </div>
        )}
      </div>
    </>
  );
}
