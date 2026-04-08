import type { Transaction } from '@/types/transactions';

/**
 * Bank account filters (`AccountMultiSelect`, URL `?account=`) only list rows from `accounts`
 * (checking, savings, etc.). Unified credit-card ledger rows are backed by
 * `credit_card_transactions`: they expose `credit_card_id` and keep `account_id` empty so
 * they never match a selected bank account id. When one or more bank accounts are selected,
 * only ledger transactions with a matching `account_id` are included; card purchases are
 * excluded by design (filter by category/tags or future card-specific UI if needed).
 */
export function transactionMatchesBankAccountIds(
  transaction: Transaction,
  selectedBankAccountIds: string[],
): boolean {
  if (selectedBankAccountIds.length === 0) return true;
  const bankAccountId = transaction.account_id;
  if (bankAccountId == null || String(bankAccountId).trim() === '') {
    return false;
  }
  return selectedBankAccountIds.includes(bankAccountId);
}
