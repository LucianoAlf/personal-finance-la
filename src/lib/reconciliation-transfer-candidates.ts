import type { BankTransactionRow } from '@/types/reconciliation';

/**
 * A scored counterpart proposal for an internal-transfer pairing. The UI lets
 * the operator pick from this list when resolving an `unmatched_bank_transaction`
 * case as "transferencia interna".
 */
export interface TransferCandidate {
  bankTransaction: BankTransactionRow;
  /**
   * Absolute days separating the candidate from the primary leg. Lower is
   * better. Exposed so the UI can render "mesmo dia" / "+1 dia" hints.
   */
  dayDistance: number;
  /**
   * Numerical score used to rank candidates. Higher is better. Primarily
   * rewards smaller day distance; lightly rewards the same account number /
   * description keyword ("transf", "ted", "pix") when available.
   */
  score: number;
}

export interface FindTransferCandidatesInput {
  primary: BankTransactionRow;
  pool: BankTransactionRow[];
  /**
   * Max absolute days between the primary leg and the candidate leg. Defaults
   * to 3 which is enough to cover interbank delays (TED/DOC) without pulling in
   * random unrelated rows.
   */
  windowInDays?: number;
  /**
   * Amount tolerance (in absolute currency units) used to match the two legs.
   * Defaults to 0.01 (1 cent) since both legs should be exact.
   */
  amountEpsilon?: number;
  /**
   * Max items returned. Defaults to 8; more than that usually means the
   * matching criteria are too loose and the operator needs to pick manually.
   */
  limit?: number;
}

function daysBetween(a: string, b: string): number {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Number.POSITIVE_INFINITY;
  const millisPerDay = 1000 * 60 * 60 * 24;
  return Math.abs(Math.round((ta - tb) / millisPerDay));
}

function looksLikeTransferDescription(description: string | null | undefined): boolean {
  if (!description) return false;
  const haystack = description.toLowerCase();
  const needles = [
    'transf',
    'transferencia',
    'transfer\u00eancia',
    'ted',
    'doc',
    'pix',
    'entre contas',
    'enviado',
    'recebido',
  ];
  return needles.some((needle) => haystack.includes(needle));
}

/**
 * Finds likely counterpart bank_transactions for an internal transfer. The
 * rules are intentionally conservative:
 *   - opposite sign (one debit, one credit)
 *   - same absolute amount within `amountEpsilon`
 *   - within `windowInDays` of the primary date
 *   - different id, same user (pool is already scoped by caller)
 *   - never a row that is already reconciled / ignored / transfer_matched
 *   - never the out-of-scope archive
 */
export function findTransferCandidates(
  input: FindTransferCandidatesInput,
): TransferCandidate[] {
  const windowInDays = input.windowInDays ?? 3;
  const amountEpsilon = input.amountEpsilon ?? 0.01;
  const limit = input.limit ?? 8;
  const primary = input.primary;
  const primaryAbs = Math.abs(Number(primary.amount ?? 0));
  const primarySign = Math.sign(Number(primary.amount ?? 0));

  if (primaryAbs === 0 || primarySign === 0) return [];

  const candidates: TransferCandidate[] = [];

  for (const row of input.pool) {
    if (row.id === primary.id) continue;
    if (row.user_id !== primary.user_id) continue;
    if (row.out_of_scope) continue;

    const status = row.reconciliation_status ?? 'pending';
    if (status === 'reconciled' || status === 'rejected' || status === 'ignored' || status === 'transfer_matched') {
      continue;
    }

    const amount = Number(row.amount ?? 0);
    if (Math.sign(amount) === primarySign) continue;
    if (Math.abs(Math.abs(amount) - primaryAbs) > amountEpsilon) continue;

    const dayDistance = daysBetween(primary.date, row.date);
    if (dayDistance > windowInDays) continue;

    let score = 100 - dayDistance * 10;
    if (looksLikeTransferDescription(primary.description) && looksLikeTransferDescription(row.description)) {
      score += 8;
    }
    if (primary.external_account_id && row.external_account_id && primary.external_account_id !== row.external_account_id) {
      // Different accounts is actually the expected shape of a transfer,
      // so give it a tiny positive boost instead of treating as noise.
      score += 2;
    }

    candidates.push({ bankTransaction: row, dayDistance, score });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.dayDistance !== b.dayDistance) return a.dayDistance - b.dayDistance;
    return a.bankTransaction.date.localeCompare(b.bankTransaction.date);
  });

  return candidates.slice(0, limit);
}
