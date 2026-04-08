import type { Transaction, TransactionType } from '@/types/transactions';

import { transactionMatchesBankAccountIds } from '@/utils/transactions/bankAccountFilter';

export interface UrlTransactionFilters {
  type: TransactionType | null;
  accountId: string | null;
  categoryId: string | null;
}

function isTransactionType(value: string | null): value is TransactionType {
  return value === 'income' || value === 'expense' || value === 'transfer';
}

export function getUrlTransactionFilters(searchParams: URLSearchParams): UrlTransactionFilters {
  const typeParam = searchParams.get('type');

  return {
    type: isTransactionType(typeParam) ? typeParam : null,
    accountId: searchParams.get('account'),
    categoryId: searchParams.get('category'),
  };
}

export function matchesUrlTransactionFilters(
  transaction: Transaction,
  filters: UrlTransactionFilters,
): boolean {
  if (filters.type && transaction.type !== filters.type) {
    return false;
  }

  if (filters.accountId && !transactionMatchesBankAccountIds(transaction, [filters.accountId])) {
    return false;
  }

  if (filters.categoryId && transaction.category_id !== filters.categoryId) {
    return false;
  }

  return true;
}

export function applyUrlTransactionFilters(
  transactions: Transaction[],
  filters: UrlTransactionFilters,
): Transaction[] {
  return transactions.filter((transaction) => matchesUrlTransactionFilters(transaction, filters));
}
