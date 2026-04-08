import { describe, expect, it } from 'vitest';

import type { Transaction } from '@/types/transactions';
import {
  applyUrlTransactionFilters,
  getUrlTransactionFilters,
} from '@/utils/transactions/urlTransactionFilters';

function baseTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    user_id: 'user-1',
    account_id: 'acc-1',
    category_id: 'cat-1',
    type: 'expense',
    amount: 50,
    description: 'Padaria',
    transaction_date: '2026-04-01',
    is_paid: true,
    is_recurring: false,
    source: 'manual',
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    ...overrides,
  } as Transaction;
}

describe('url transaction filters', () => {
  it('parses the canonical account/category/type query params', () => {
    const filters = getUrlTransactionFilters(
      new URLSearchParams('type=income&account=acc-1&category=cat-1'),
    );

    expect(filters).toEqual({
      type: 'income',
      accountId: 'acc-1',
      categoryId: 'cat-1',
    });
  });

  it('filters unified rows by the type query param', () => {
    const transactions = [
      baseTransaction({ id: 'expense', type: 'expense' }),
      baseTransaction({ id: 'income', type: 'income' }),
    ];

    const filtered = applyUrlTransactionFilters(
      transactions,
      getUrlTransactionFilters(new URLSearchParams('type=income')),
    );

    expect(filtered.map((transaction) => transaction.id)).toEqual(['income']);
  });

  it('keeps the bank-account rule for card rows when URL filters are applied together', () => {
    const transactions = [
      baseTransaction({ id: 'bank-income', type: 'income', account_id: 'acc-1' }),
      baseTransaction({
        id: 'card-income',
        type: 'income',
        account_id: '' as Transaction['account_id'],
        credit_card_id: 'card-1',
        payment_method: 'credit',
      }),
    ];

    const filtered = applyUrlTransactionFilters(
      transactions,
      getUrlTransactionFilters(new URLSearchParams('type=income&account=acc-1')),
    );

    expect(filtered.map((transaction) => transaction.id)).toEqual(['bank-income']);
  });
});
