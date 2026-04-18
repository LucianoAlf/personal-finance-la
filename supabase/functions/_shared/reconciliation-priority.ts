import { daysBetween, type SourceHealth } from './reconciliation-matcher.ts';

export type ReconciliationPriority = 'urgent' | 'high' | 'medium' | 'low' | 'infra';

export interface ComputeReconciliationPriorityInput {
  divergenceType: string;
  amount: number;
  transactionDate: string;
  now: string;
  sourceHealth: SourceHealth;
  matchConfidence: number;
}

/**
 * Operational priority policy for reconciliation cases.
 *
 * The earlier implementation hardcoded unmatched bank transactions to `urgent`,
 * which produced a misleading inbox where 2500 cases all looked like emergencies.
 * The model below classifies cases by the operator's real mental model:
 *   - `urgent`: a payment mismatch or a very large recent movement without a match
 *   - `high`: a material-value unmatched movement, amount/date mismatch, or possible duplicate
 *   - `medium`: normal queue (small/medium movements, strong matches awaiting confirmation)
 *   - `low`: ancient or tiny-value items
 *   - `infra`: the ingestion source is stale, so the issue is trust in the data, not the data itself
 */
export function computeReconciliationPriority(
  input: ComputeReconciliationPriorityInput,
): ReconciliationPriority {
  if (input.sourceHealth === 'stale') return 'infra';

  const abs = Math.abs(Number(input.amount) || 0);
  const nowDate = input.now.slice(0, 10);
  const daysOld = Number.isFinite(daysBetween(input.transactionDate, nowDate))
    ? daysBetween(input.transactionDate, nowDate)
    : 0;

  if (input.divergenceType === 'possible_duplicate') {
    return 'high';
  }

  if (input.divergenceType === 'amount_mismatch') {
    if (abs >= 1000) return 'urgent';
    return 'high';
  }

  if (input.divergenceType === 'date_mismatch') {
    if (abs >= 2000) return 'high';
    return 'medium';
  }

  if (input.matchConfidence > 0) {
    if (input.matchConfidence >= 0.7) return 'medium';
    return 'low';
  }

  if (daysOld > 60) return 'low';
  if (abs < 50) return 'low';
  if (abs >= 5000 && daysOld <= 7) return 'urgent';
  if (abs >= 1500 && daysOld <= 14) return 'high';
  if (daysOld > 30 && abs < 500) return 'low';

  return 'medium';
}
