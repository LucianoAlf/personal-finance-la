import { describe, expect, it } from 'vitest';

import { transactionMatchesBankAccountIds } from '@/utils/transactions/bankAccountFilter';
import type { Transaction } from '@/types/transactions';

function baseTx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: '1',
    user_id: 'u',
    account_id: 'acc-1',
    category_id: 'c1',
    type: 'expense',
    amount: 10,
    description: 'x',
    transaction_date: '2026-04-01',
    is_paid: true,
    is_recurring: false,
    source: 'manual',
    created_at: '',
    updated_at: '',
    ...over,
  } as Transaction;
}

describe('transactionMatchesBankAccountIds', () => {
  it('allows all rows when no bank accounts are selected', () => {
    expect(transactionMatchesBankAccountIds(baseTx(), [])).toBe(true);
    expect(transactionMatchesBankAccountIds(baseTx({ account_id: '' }), [])).toBe(true);
  });

  it('matches ledger rows by account_id', () => {
    expect(transactionMatchesBankAccountIds(baseTx({ account_id: 'acc-1' }), ['acc-1'])).toBe(true);
    expect(transactionMatchesBankAccountIds(baseTx({ account_id: 'acc-1' }), ['acc-2'])).toBe(false);
  });

  it('excludes credit-card unified rows with empty account_id', () => {
    const cardLike = baseTx({
      account_id: '' as Transaction['account_id'],
      credit_card_id: 'card-1',
      payment_method: 'credit',
    });
    expect(transactionMatchesBankAccountIds(cardLike, ['acc-1'])).toBe(false);
  });
});
