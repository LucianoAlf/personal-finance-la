import type { Transaction } from '@/types/transactions';

/** Mês de competência YYYY-MM (cartão: fatura; demais: data da transação). */
export function competenceMonthFromTransaction(
  t: Pick<Transaction, 'transaction_date' | 'competence_month'>
): string {
  if (t.competence_month) return t.competence_month;
  return (t.transaction_date || '').slice(0, 7);
}

/** Débito na conta por pagamento de fatura — não é gasto por categoria/competência do cartão. */
export function isInvoicePaymentExpense(t: Pick<Transaction, 'type' | 'description'>): boolean {
  if (t.type !== 'expense') return false;
  const d = (t.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return d.includes('pagamento de fatura') || d.includes('pagamento da fatura');
}

/** Saída de caixa no mês civil (data do lançamento na conta), para cartão só quando paga a fatura. */
export function isCashOutExpenseInBankMonth(
  t: Transaction,
  selectedYearMonth: string
): boolean {
  if (t.type !== 'expense') return false;
  if (!t.transaction_date?.startsWith(selectedYearMonth)) return false;
  if (isInvoicePaymentExpense(t)) return true;
  if (t.credit_card_id || t.payment_method === 'credit') return false;
  return Boolean(t.is_paid);
}
