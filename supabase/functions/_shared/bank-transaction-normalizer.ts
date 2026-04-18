import { resolveAccountLabel } from './reconciliation-account-label.ts';

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
  /**
   * Marks the row as out_of_scope when it falls before the user's active
   * reconciliation window. Persisted to the DB column of the same name so the
   * UI can filter it out of the inbox by default. Optional so legacy call
   * sites can omit it (defaults to false in the DB).
   */
  out_of_scope?: boolean;
}

export const normalizeAmount = (amount: number) => Number(amount.toFixed(2));

export interface NormalizePluggyTransactionInput {
  sourceItemId: string;
  accountId: string;
  /** Raw Pluggy account.name. Could be a design codename (e.g. "ultraviolet-black"). */
  accountName?: string | null;
  /** Institution name from the pluggy_connection row; preferred driver of the label. */
  institutionName?: string | null;
  /** Pluggy account.marketingName. */
  marketingName?: string | null;
  /** Pluggy account.type (BANK | CREDIT). */
  accountType?: string | null;
  /** Pluggy account.subtype. */
  accountSubtype?: string | null;
  /** Pluggy account.number (already masked). */
  accountNumber?: string | null;
  internalAccountId: string | null;
  transaction: { id: string; amount: number; date: string; description: string };
  /**
   * Optional YYYY-MM-DD cutoff. When provided, any transaction whose date is
   * strictly before this value is materialized with `out_of_scope = true`.
   */
  windowStart?: string | null;
}

export function normalizePluggyTransaction(
  input: NormalizePluggyTransactionInput,
): NormalizedBankTransactionInput {
  const label = resolveAccountLabel({
    institutionName: input.institutionName ?? null,
    accountName: input.accountName ?? null,
    marketingName: input.marketingName ?? null,
    type: input.accountType ?? null,
    subtype: input.accountSubtype ?? null,
    number: input.accountNumber ?? null,
  });

  const isOutOfScope = Boolean(
    input.windowStart && input.transaction.date && input.transaction.date < input.windowStart,
  );

  return {
    user_id: '',
    source: 'pluggy',
    source_item_id: input.sourceItemId,
    external_id: input.transaction.id,
    account_name: label,
    external_account_id: input.accountId,
    internal_account_id: input.internalAccountId,
    amount: normalizeAmount(input.transaction.amount),
    date: input.transaction.date,
    description: input.transaction.description.trim(),
    raw_description: input.transaction.description,
    out_of_scope: isOutOfScope,
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
