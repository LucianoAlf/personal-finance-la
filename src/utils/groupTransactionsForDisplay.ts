import type { Transaction } from '@/types/transactions';

export interface DisplayTransactionItem extends Transaction {
  displayAmount?: number;
  displayDescription?: string;
  /** Valor integral da compra parcelada (ex.: R$ 600 em 3x de R$ 200). */
  displayPurchaseTotal?: number;
  groupedInstallments?: Transaction[];
  groupedInstallmentCount?: number;
}

const normalizeInstallmentDescription = (description: string) =>
  description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();

const buildInstallmentGroupKey = (transaction: Transaction) => {
  if (transaction.installment_group_id) {
    return transaction.installment_group_id;
  }

  return [
    transaction.credit_card_id || 'no-card',
    normalizeInstallmentDescription(transaction.description),
    transaction.transaction_date,
    transaction.category_id || 'no-category',
    transaction.total_installments || 1,
    transaction.total_amount || transaction.amount * (transaction.total_installments || 1),
  ].join('::');
};

export function groupTransactionsForDisplay(
  transactions: Transaction[],
  formatCurrency: (value: number) => string
): DisplayTransactionItem[] {
  const groupedTransactions: DisplayTransactionItem[] = [];
  const installmentGroups = new Map<string, Transaction[]>();

  transactions.forEach((transaction) => {
    if (
      transaction.credit_card_id &&
      transaction.total_installments &&
      transaction.total_installments > 1
    ) {
      const installmentKey = buildInstallmentGroupKey(transaction);
      const existing = installmentGroups.get(installmentKey) || [];
      existing.push(transaction);
      installmentGroups.set(installmentKey, existing);
      return;
    }

    groupedTransactions.push(transaction);
  });

  installmentGroups.forEach((groupTransactions) => {
    const sortedInstallments = [...groupTransactions].sort(
      (a, b) => (a.installment_number || 0) - (b.installment_number || 0)
    );
    const firstInstallment = sortedInstallments[0];
    const baseDescription = normalizeInstallmentDescription(firstInstallment.description);
    const expected = firstInstallment.total_installments || 1;
    const sumVisible = sortedInstallments.reduce((s, t) => s + Number(t.amount || 0), 0);
    const fullGroupInView = expected > 1 && sortedInstallments.length === expected;
    const displayAmount = fullGroupInView
      ? firstInstallment.total_amount ||
        firstInstallment.amount * (firstInstallment.total_installments || 1)
      : sumVisible;
    const totalPurchase =
      Number(firstInstallment.total_amount || 0) > 0
        ? Number(firstInstallment.total_amount)
        : Number(firstInstallment.amount) * expected;
    const displayDescription =
      expected > 1 && !fullGroupInView
        ? `${baseDescription} (parcela ${firstInstallment.installment_number || 1}/${expected})`
        : `${baseDescription} (${expected}x de ${formatCurrency(firstInstallment.amount)})`;

    groupedTransactions.push({
      ...firstInstallment,
      description: baseDescription,
      displayDescription,
      displayAmount,
      displayPurchaseTotal: totalPurchase,
      groupedInstallments: sortedInstallments,
      groupedInstallmentCount: sortedInstallments.length,
    });
  });

  groupedTransactions.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return groupedTransactions;
}
