export interface NormalizedBankTransactionInput {
  user_id: string;
  source: 'manual_paste' | 'csv_upload' | 'manual_entry' | 'pluggy';
  source_item_id: string | null;
  external_id: string | null;
  account_name: string;
  external_account_id: string | null;
  internal_account_id: string | null;
  amount: number;
  date: string;
  description: string;
  raw_description: string | null;
}

export const normalizeAmount = (amount: number) => Number(amount.toFixed(2));

export function normalizePluggyTransaction(input: {
  sourceItemId: string;
  accountId: string;
  accountName?: string | null;
  internalAccountId: string | null;
  transaction: { id: string; amount: number; date: string; description: string };
}): NormalizedBankTransactionInput {
  return {
    user_id: '',
    source: 'pluggy',
    source_item_id: input.sourceItemId,
    external_id: input.transaction.id,
    // Minimal seed only. Replace with the real account name from Pluggy payload as soon as it is available.
    account_name: input.accountName?.trim() || 'Conta Pluggy',
    external_account_id: input.accountId,
    internal_account_id: input.internalAccountId,
    amount: normalizeAmount(input.transaction.amount),
    date: input.transaction.date,
    description: input.transaction.description.trim(),
    raw_description: input.transaction.description,
  };
}

/** Maps a generic CSV row (already keyed by header) into the normalized bank shape. */
export function normalizeCsvTransaction(input: {
  user_id: string;
  source_item_id?: string | null;
  account_name: string;
  external_account_id?: string | null;
  internal_account_id?: string | null;
  row: Record<string, string>;
  columnMap: {
    date: string;
    amount: string;
    description: string;
    external_id?: string;
  };
}): NormalizedBankTransactionInput {
  const date = (input.row[input.columnMap.date] ?? '').trim();
  const amountRaw = (input.row[input.columnMap.amount] ?? '').trim().replace(',', '.');
  const description = (input.row[input.columnMap.description] ?? '').trim();
  const amount = normalizeAmount(Number.parseFloat(amountRaw));
  const externalId = input.columnMap.external_id
    ? (input.row[input.columnMap.external_id] ?? '').trim() || null
    : null;

  return {
    user_id: input.user_id,
    source: 'csv_upload',
    source_item_id: input.source_item_id ?? null,
    external_id: externalId,
    account_name: input.account_name,
    external_account_id: input.external_account_id ?? null,
    internal_account_id: input.internal_account_id ?? null,
    amount: Number.isFinite(amount) ? amount : 0,
    date,
    description,
    raw_description: description || null,
  };
}
