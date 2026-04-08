import type { Transaction } from '@/types/transactions';

type LedgerTag = NonNullable<Transaction['tags']>[number];

export interface CreditCardTagRow {
  credit_card_transaction_id: string;
  tag: LedgerTag | LedgerTag[] | null;
}

export interface CreditCardLedgerRow {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  description: string;
  purchase_date: string;
  created_at: string;
  credit_card_id: string | null;
  invoice_id: string | null;
  is_installment?: boolean | null;
  is_parent_installment?: boolean | null;
  installment_number?: number | null;
  total_installments?: number | null;
  installment_group_id?: string | null;
  total_amount?: number | null;
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
  credit_card?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
  invoice?: {
    reference_month?: string | null;
  } | null;
}

export function buildCreditCardTransactionTagMap(
  rows: CreditCardTagRow[],
): Record<string, LedgerTag[]> {
  return rows.reduce<Record<string, LedgerTag[]>>((acc, row) => {
    const tag = Array.isArray(row.tag) ? row.tag[0] : row.tag;
    if (!tag) return acc;
    if (!acc[row.credit_card_transaction_id]) {
      acc[row.credit_card_transaction_id] = [];
    }
    acc[row.credit_card_transaction_id].push(tag);
    return acc;
  }, {});
}

export function mapCreditCardTransactionRow(
  cc: CreditCardLedgerRow,
  tagsByTransactionId: Record<string, LedgerTag[]>,
): Transaction {
  const ref = cc.invoice?.reference_month ?? undefined;
  const competenceMonth = ref ? ref.slice(0, 7) : (cc.purchase_date || '').slice(0, 7);

  return {
    id: cc.id,
    user_id: cc.user_id,
    account_id: '' as Transaction['account_id'],
    category_id: (cc.category_id ?? '') as Transaction['category_id'],
    type: 'expense',
    amount: cc.amount,
    description: cc.description,
    transaction_date: cc.purchase_date,
    competence_month: competenceMonth,
    is_paid: false,
    is_recurring: false,
    recurrence_type: undefined,
    recurrence_end_date: undefined,
    attachment_url: undefined,
    notes: undefined,
    source: 'manual',
    whatsapp_message_id: undefined,
    transfer_to_account_id: undefined,
    created_at: cc.created_at,
    updated_at: cc.created_at,
    status: 'completed',
    temp_id: null,
    confirmed_at: null,
    payment_method: 'credit',
    category: cc.category ?? undefined,
    account: cc.credit_card ? { id: cc.credit_card.id, name: `💳 ${cc.credit_card.name}` } : undefined,
    tags: tagsByTransactionId[cc.id] ?? [],
    credit_card_id: cc.credit_card_id ?? undefined,
    credit_card_name: cc.credit_card?.name,
    is_installment: cc.is_installment || false,
    is_parent_installment: cc.is_parent_installment || false,
    installment_number: cc.installment_number ?? undefined,
    total_installments: cc.total_installments ?? undefined,
    installment_group_id: cc.installment_group_id ?? undefined,
    total_amount: cc.total_amount ?? undefined,
  } as Transaction;
}
