import type { BankTransactionRow } from '@/types/reconciliation';

/**
 * Minimal structural view of a payable_bill row, so the matcher does not need
 * the full application-level type (we intentionally avoid `import type` from
 * the payables module to keep this lib reusable by Ana Clara's edge function
 * context too, which runs in Deno and should not pull in frontend modules).
 */
export interface PayableCandidateBill {
  id: string;
  user_id?: string;
  description?: string | null;
  amount?: number | string | null;
  due_date?: string | null;
  status?: string | null;
  provider_name?: string | null;
  payment_method?: string | null;
  category_id?: string | null;
  payment_account_id?: string | null;
}

export interface PayableCandidate {
  bill: PayableCandidateBill;
  /** Absolute days between bill.due_date and bank.date. Lower is better. */
  dayDistance: number;
  /**
   * Absolute delta between bank posted amount and bill amount, in currency
   * units. Used to sort ties and to render "R$ 2 a mais que o esperado" hints.
   */
  amountDelta: number;
  /**
   * Ranking score. Higher is better. Primarily penalizes day distance and
   * amount drift; mildly rewards a matching keyword between
   * `bill.description`/`bill.provider_name` and `bank.description`.
   */
  score: number;
  /** True when the bill due_date is already past the bank posted date. */
  billOverdue: boolean;
}

export interface FindPayableCandidatesInput {
  bank: BankTransactionRow;
  bills: PayableCandidateBill[];
  /**
   * Max absolute days between `bill.due_date` and `bank.date`. Defaults to 14:
   * operators often pay bills days after the due date, and Pluggy can take up
   * to a day to post. 14 is the sweet spot between recall and precision.
   */
  windowInDays?: number;
  /**
   * Percentage tolerance against the bill.amount. Defaults to 0.05 (5 percent),
   * matching the backend tolerance in `assertPayableLinkable`.
   */
  percentTolerance?: number;
  /**
   * Minimum absolute tolerance in currency units. Falls back to this when the
   * percent tolerance would be smaller than sub-cent noise. Defaults to 0.5.
   */
  absoluteTolerance?: number;
  /** Max items returned. Defaults to 5. */
  limit?: number;
}

function daysBetween(a?: string | null, b?: string | null): number {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Number.POSITIVE_INFINITY;
  const millisPerDay = 1000 * 60 * 60 * 24;
  return Math.abs(Math.round((ta - tb) / millisPerDay));
}

function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sharedKeyword(a: string, b: string): boolean {
  if (!a || !b) return false;
  const tokensA = new Set(a.split(' ').filter((t) => t.length >= 4));
  if (tokensA.size === 0) return false;
  for (const token of b.split(' ')) {
    if (token.length >= 4 && tokensA.has(token)) return true;
  }
  return false;
}

/**
 * Proposes `payable_bills` that could plausibly explain a pending bank
 * transaction. Rules:
 *   - bill.status is 'pending' | 'scheduled' | 'overdue' | 'partial' (never 'paid' / 'cancelled')
 *   - |bill.amount - |bank.amount|| <= max(bill.amount * percentTolerance, absoluteTolerance)
 *   - |days(bill.due_date, bank.date)| <= windowInDays
 *   - matching user_id when the bill carries one (defensive — caller normally scopes)
 *
 * The ranking function privileges same-day matches and exact amounts; ties are
 * broken by keyword similarity between bill description / provider name and
 * the bank description (e.g. "Enel" / "ENERGIA" / "Claro" / "SPOTIFY").
 */
export function findPayableCandidates(
  input: FindPayableCandidatesInput,
): PayableCandidate[] {
  const windowInDays = input.windowInDays ?? 14;
  const percentTolerance = input.percentTolerance ?? 0.05;
  const absoluteTolerance = input.absoluteTolerance ?? 0.5;
  const limit = input.limit ?? 5;

  const posted = Math.abs(Number(input.bank.amount ?? 0));
  if (!Number.isFinite(posted) || posted <= 0) return [];

  const normalizedBankText = normalizeText(
    [input.bank.description, input.bank.raw_description].filter(Boolean).join(' '),
  );

  const candidates: PayableCandidate[] = [];

  for (const bill of input.bills) {
    if (bill.user_id && input.bank.user_id && bill.user_id !== input.bank.user_id) continue;

    const status = (bill.status ?? '').toLowerCase();
    if (status === 'paid' || status === 'cancelled') continue;

    const expected = Number(bill.amount ?? 0);
    if (!Number.isFinite(expected) || expected <= 0) continue;

    const amountDelta = Math.abs(expected - posted);
    const tolerance = Math.max(expected * percentTolerance, absoluteTolerance);
    if (amountDelta > tolerance) continue;

    const dayDistance = daysBetween(bill.due_date, input.bank.date);
    if (dayDistance > windowInDays) continue;

    let score = 200 - dayDistance * 6 - (amountDelta * 40) / Math.max(expected, 1);

    const normalizedBillText = normalizeText(
      [bill.description, bill.provider_name].filter(Boolean).join(' '),
    );
    if (sharedKeyword(normalizedBillText, normalizedBankText)) {
      score += 25;
    }

    if (amountDelta <= 0.01) {
      score += 15;
    }

    if (status === 'scheduled') {
      // User explicitly scheduled the bill, very strong signal.
      score += 8;
    }

    const bankTime = Date.parse(input.bank.date);
    const dueTime = bill.due_date ? Date.parse(bill.due_date) : Number.NaN;
    const billOverdue =
      Number.isFinite(dueTime) && Number.isFinite(bankTime) && dueTime < bankTime;

    candidates.push({ bill, dayDistance, amountDelta, score, billOverdue });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.amountDelta !== b.amountDelta) return a.amountDelta - b.amountDelta;
    if (a.dayDistance !== b.dayDistance) return a.dayDistance - b.dayDistance;
    return String(a.bill.id).localeCompare(String(b.bill.id));
  });

  return candidates.slice(0, limit);
}
