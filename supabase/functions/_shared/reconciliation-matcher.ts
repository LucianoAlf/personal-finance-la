export type SourceHealth = 'healthy' | 'stale';

export interface BankTransactionForMatch {
  amount: number;
  date: string;
  description: string;
  sourceHealth: SourceHealth;
}

export interface PayableRecord {
  id: string;
  amount: number;
  due_date: string;
  description: string;
}

export interface ScoreInput {
  bankTransaction: BankTransactionForMatch;
  payables: PayableRecord[];
  transactions: unknown[];
  accounts: unknown[];
}

export interface MatchCandidate {
  recordId: string;
  recordType: 'payable_bill';
  confidence: number;
  reasoning: {
    amountExact: boolean;
    dateWindow: boolean;
    descriptionAligned: boolean;
    sourceHealthPenalty: boolean;
  };
}

export interface ScoreResult {
  bestMatch: MatchCandidate | null;
  hypotheses: Array<{ label: string; confidence: number }>;
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00Z`).getTime();
  const db = new Date(`${b}T12:00:00Z`).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return Number.POSITIVE_INFINITY;
  return Math.abs(da - db) / (24 * 60 * 60 * 1000);
}

/** Normalized token overlap + substring boost for short bill labels vs long bank text. */
export function similarity(a: string, b: string): number {
  const A = a.toLowerCase().replace(/\s+/g, ' ').trim();
  const B = b.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!A.length || !B.length) return 0;
  if (A.includes(B) || B.includes(A)) return 0.85;

  const tokensA = new Set(A.split(/[^a-z0-9áàâãéêíóôõúç]+/u).filter((t) => t.length > 1));
  const tokensB = new Set(B.split(/[^a-z0-9áàâãéêíóôõúç]+/u).filter((t) => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let inter = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) inter++;
  }
  const union = tokensA.size + tokensB.size - inter;
  return union === 0 ? 0 : inter / union;
}

export const applySourceHealthPenalty = (confidence: number, sourceHealth: SourceHealth) =>
  sourceHealth === 'stale' ? Math.min(confidence, 0.64) : confidence;

export function scoreReconciliationCandidates(input: ScoreInput): ScoreResult {
  const billMatches: MatchCandidate[] = input.payables.map((bill) => {
    const amountScore = Math.abs(Math.abs(input.bankTransaction.amount) - bill.amount) <= 0.1 ? 0.5 : 0;
    const dateScore = daysBetween(input.bankTransaction.date, bill.due_date) <= 7 ? 0.2 : 0;
    const descriptionScore = similarity(input.bankTransaction.description, bill.description) >= 0.6 ? 0.25 : 0;
    const rawConfidence = amountScore + dateScore + descriptionScore;
    const confidence = applySourceHealthPenalty(rawConfidence, input.bankTransaction.sourceHealth);

    return {
      recordId: bill.id,
      recordType: 'payable_bill' as const,
      confidence,
      reasoning: {
        amountExact: amountScore > 0,
        dateWindow: dateScore > 0,
        descriptionAligned: descriptionScore > 0,
        sourceHealthPenalty: input.bankTransaction.sourceHealth === 'stale',
      },
    };
  });

  const sorted = [...billMatches].sort((a, b) => b.confidence - a.confidence);
  const bestMatch = sorted[0] ?? null;

  if (!bestMatch || bestMatch.confidence < 0.5) {
    return {
      bestMatch: null,
      hypotheses: [
        { label: 'transferência', confidence: 0.38 },
        { label: 'pagamento não lançado', confidence: 0.27 },
        { label: 'sem match ainda', confidence: 0.35 },
      ],
    };
  }

  return { bestMatch, hypotheses: [] };
}
