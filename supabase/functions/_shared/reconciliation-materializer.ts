import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { scoreReconciliationCandidates, type SourceHealth } from './reconciliation-matcher.ts';
import {
  computeReconciliationPriority,
  type ReconciliationPriority,
} from './reconciliation-priority.ts';

export interface MaterializeBankTransactionInput {
  source_item_id: string | null;
  external_id: string | null;
  account_name: string;
  external_account_id: string | null;
  internal_account_id: string | null;
  amount: number;
  date: string;
  description: string;
  raw_description: string | null;
  sourceHealth?: SourceHealth;
  /**
   * When true, the row will be persisted but NO case is created and the bank
   * row is marked `reconciliation_status = 'deferred'`. Prevents pre-window
   * transactions from flooding the inbox while still preserving the audit row.
   */
  out_of_scope?: boolean;
}

export interface ReconciliationMaterializationInput {
  userId: string;
  source: 'manual_paste' | 'csv_upload' | 'manual_entry' | 'pluggy';
  rows: MaterializeBankTransactionInput[];
  onConflict?: string;
  refreshOpenCases?: boolean;
  rollbackInsertedBankRowsOnCaseFailure?: boolean;
}

export interface ReconciliationMaterializationResult {
  importedCount: number;
  createdCases: number;
  matchedCount: number;
  unmatchedCount: number;
  generatedCases: Array<{ confidence: number; divergenceType: string; status: string }>;
  bankTransactionIds: string[];
}

interface PayableBillRecord {
  id: string;
  amount: number;
  due_date: string;
  description: string;
}

interface BuiltCaseDraft {
  bankStatus: 'pending' | 'matched';
  caseDraft: {
    user_id: string;
    divergence_type: string;
    matched_record_type: 'payable_bill' | null;
    matched_record_id: string | null;
    confidence: number;
    confidence_reasoning: Record<string, unknown>;
    hypotheses: Array<{ label: string; confidence: number }>;
    status: 'open';
    priority: ReconciliationPriority;
  };
}

const RECONCILIATION_CASE_REFRESH_CHUNK_SIZE = 200;

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function validateRow(row: MaterializeBankTransactionInput, index: number) {
  if (!row.account_name?.trim()) throw new Error(`Row ${index + 1}: account_name is required`);
  if (!row.description?.trim()) throw new Error(`Row ${index + 1}: description is required`);
  if (!row.date?.trim()) throw new Error(`Row ${index + 1}: date is required`);
  if (!Number.isFinite(row.amount)) throw new Error(`Row ${index + 1}: amount must be numeric`);
}

export function buildCaseDraft(input: {
  userId: string;
  bankTransaction: MaterializeBankTransactionInput;
  payables: PayableBillRecord[];
  now?: string;
}): BuiltCaseDraft {
  const sourceHealth = input.bankTransaction.sourceHealth ?? 'healthy';
  const now = input.now ?? new Date().toISOString();

  const score = scoreReconciliationCandidates({
    bankTransaction: {
      amount: input.bankTransaction.amount,
      date: input.bankTransaction.date,
      description: input.bankTransaction.description,
      sourceHealth,
    },
    payables: input.payables,
    transactions: [],
    accounts: [],
  });

  const bestMatch = score.bestMatch;

  if (!bestMatch) {
    const priority = computeReconciliationPriority({
      divergenceType: 'unmatched_bank_transaction',
      amount: input.bankTransaction.amount,
      transactionDate: input.bankTransaction.date,
      now,
      sourceHealth,
      matchConfidence: 0,
    });

    return {
      bankStatus: 'pending',
      caseDraft: {
        user_id: input.userId,
        divergence_type: 'unmatched_bank_transaction',
        matched_record_type: null,
        matched_record_id: null,
        confidence: 0,
        confidence_reasoning: { no_match: true, source_health: sourceHealth },
        hypotheses: score.hypotheses,
        status: 'open',
        priority,
      },
    };
  }

  const divergenceType =
    !bestMatch.reasoning.amountExact
      ? 'amount_mismatch'
      : !bestMatch.reasoning.dateWindow
        ? 'date_mismatch'
        : !bestMatch.reasoning.descriptionAligned
          ? 'unclassified_transaction'
          : 'pending_bill_paid_in_bank';

  const priority = computeReconciliationPriority({
    divergenceType,
    amount: input.bankTransaction.amount,
    transactionDate: input.bankTransaction.date,
    now,
    sourceHealth,
    matchConfidence: bestMatch.confidence,
  });

  return {
    bankStatus: 'matched',
    caseDraft: {
      user_id: input.userId,
      divergence_type: divergenceType,
      matched_record_type: bestMatch.recordType,
      matched_record_id: bestMatch.recordId,
      confidence: bestMatch.confidence,
      confidence_reasoning: bestMatch.reasoning,
      hypotheses: score.hypotheses,
      status: 'open',
      priority,
    },
  };
}

async function persistBankRows(
  supabase: SupabaseClient,
  input: ReconciliationMaterializationInput,
  rows: Array<Record<string, unknown>>,
) {
  if (input.onConflict) {
    const { data, error } = await supabase
      .from('bank_transactions')
      .upsert(rows, { onConflict: input.onConflict })
      .select('*');

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to upsert bank transactions');
    }

    return data;
  }

  const { data, error } = await supabase.from('bank_transactions').insert(rows).select('*');
  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to insert bank transactions');
  }

  return data;
}

async function replaceOpenCasesIfNeeded(
  supabase: SupabaseClient,
  userId: string,
  bankTransactionIds: string[],
) {
  const existingCases: Array<{ bank_transaction_id: unknown; status: unknown }> = [];

  for (const chunk of chunkValues(bankTransactionIds, RECONCILIATION_CASE_REFRESH_CHUNK_SIZE)) {
    const { data, error: existingCasesError } = await supabase
      .from('reconciliation_cases')
      .select('id, bank_transaction_id, status')
      .eq('user_id', userId)
      .in('bank_transaction_id', chunk);

    if (existingCasesError) {
      throw new Error(existingCasesError.message ?? 'Failed to load existing reconciliation cases');
    }

    existingCases.push(...((data ?? []) as Array<{ bank_transaction_id: unknown; status: unknown }>));
  }

  const terminalStatuses = new Set(['confirmed', 'rejected', 'deferred', 'auto_closed']);
  const terminalBankTransactionIds = new Set<string>();
  const replaceableBankTransactionIds = new Set<string>();

  for (const row of existingCases) {
    const bankTransactionId = String((row as { bank_transaction_id: unknown }).bank_transaction_id);
    const status = String((row as { status: unknown }).status);

    if (terminalStatuses.has(status)) {
      terminalBankTransactionIds.add(bankTransactionId);
      continue;
    }

    replaceableBankTransactionIds.add(bankTransactionId);
  }

  if (replaceableBankTransactionIds.size > 0) {
    for (const chunk of chunkValues(Array.from(replaceableBankTransactionIds), RECONCILIATION_CASE_REFRESH_CHUNK_SIZE)) {
      const { error: deleteError } = await supabase
        .from('reconciliation_cases')
        .delete()
        .eq('user_id', userId)
        .in('bank_transaction_id', chunk);

      if (deleteError) {
        throw new Error(deleteError.message ?? 'Failed to refresh existing reconciliation cases');
      }
    }
  }

  return terminalBankTransactionIds;
}

export async function materializeReconciliationRows(
  supabase: SupabaseClient,
  input: ReconciliationMaterializationInput,
): Promise<ReconciliationMaterializationResult> {
  if (!input.rows.length) {
    throw new Error('rows must contain at least one transaction');
  }

  input.rows.forEach(validateRow);

  const { data: payableBills, error: payableError } = await supabase
    .from('payable_bills')
    .select('id, amount, due_date, description')
    .eq('user_id', input.userId);

  if (payableError) {
    throw new Error(payableError.message ?? 'Failed to load payable bills');
  }

  const prepared = input.rows.map((row) => {
    const outOfScope = Boolean(row.out_of_scope);

    if (outOfScope) {
      return {
        bankRow: {
          user_id: input.userId,
          source: input.source,
          source_item_id: row.source_item_id,
          external_id: row.external_id,
          account_name: row.account_name,
          external_account_id: row.external_account_id,
          internal_account_id: row.internal_account_id,
          amount: row.amount,
          date: row.date,
          description: row.description,
          raw_description: row.raw_description,
          reconciliation_status: 'deferred',
          out_of_scope: true,
        },
        caseDraft: null,
      };
    }

    const draft = buildCaseDraft({
      userId: input.userId,
      bankTransaction: row,
      payables: (payableBills ?? []) as PayableBillRecord[],
    });

    return {
      bankRow: {
        user_id: input.userId,
        source: input.source,
        source_item_id: row.source_item_id,
        external_id: row.external_id,
        account_name: row.account_name,
        external_account_id: row.external_account_id,
        internal_account_id: row.internal_account_id,
        amount: row.amount,
        date: row.date,
        description: row.description,
        raw_description: row.raw_description,
        reconciliation_status: draft.bankStatus,
        out_of_scope: false,
      },
      caseDraft: draft.caseDraft,
    };
  });

  const insertedBankRows = await persistBankRows(
    supabase,
    input,
    prepared.map((item) => item.bankRow),
  );

  const bankTransactionIds = insertedBankRows.map((row) => String((row as { id: unknown }).id));
  const terminalBankTransactionIds = input.refreshOpenCases
    ? await replaceOpenCasesIfNeeded(supabase, input.userId, bankTransactionIds)
    : new Set<string>();

  const casesPayload = insertedBankRows
    .map((bankRow, index) => {
      const draft = prepared[index].caseDraft;
      if (!draft) return null;
      return {
        ...draft,
        bank_transaction_id: bankRow.id,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .filter((row) => !terminalBankTransactionIds.has(String(row.bank_transaction_id)));

  if (casesPayload.length > 0) {
    const { error: casesError } = await supabase.from('reconciliation_cases').insert(casesPayload);

    if (casesError) {
      if (input.rollbackInsertedBankRowsOnCaseFailure) {
        await supabase
          .from('bank_transactions')
          .delete()
          .eq('user_id', input.userId)
          .in('id', bankTransactionIds);
      }

      throw new Error(casesError.message ?? 'Failed to materialize reconciliation cases');
    }
  }

  const matchedCount = casesPayload.filter((row) => row.matched_record_type).length;

  return {
    importedCount: insertedBankRows.length,
    createdCases: casesPayload.length,
    matchedCount,
    unmatchedCount: casesPayload.length - matchedCount,
    generatedCases: casesPayload.map((row) => ({
      confidence: Number(row.confidence),
      divergenceType: row.divergence_type,
      status: row.status,
    })),
    bankTransactionIds,
  };
}
