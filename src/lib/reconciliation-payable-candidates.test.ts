import { describe, expect, it } from 'vitest';

import type { BankTransactionRow } from '@/types/reconciliation';

import {
  findPayableCandidates,
  type PayableCandidateBill,
} from './reconciliation-payable-candidates';

function bankRow(overrides: Partial<BankTransactionRow> = {}): BankTransactionRow {
  return {
    id: 'bt-1',
    user_id: 'user-1',
    source: 'pluggy',
    source_item_id: null,
    external_id: null,
    account_name: 'Nubank',
    external_account_id: null,
    internal_account_id: null,
    amount: -100,
    date: '2026-04-12',
    description: 'Enel debito automatico',
    raw_description: null,
    reconciliation_status: 'pending',
    ...overrides,
  };
}

function bill(overrides: Partial<PayableCandidateBill> = {}): PayableCandidateBill {
  return {
    id: 'bill-1',
    user_id: 'user-1',
    description: 'Conta de luz',
    provider_name: 'ENEL',
    amount: 100,
    due_date: '2026-04-10',
    status: 'pending',
    ...overrides,
  };
}

describe('findPayableCandidates', () => {
  it('returns an empty list when bank amount is zero', () => {
    const result = findPayableCandidates({
      bank: bankRow({ amount: 0 }),
      bills: [bill()],
    });
    expect(result).toEqual([]);
  });

  it('surfaces a same-amount + same-keyword match as the top candidate', () => {
    const result = findPayableCandidates({
      bank: bankRow({ description: 'ENEL SP distribuidora' }),
      bills: [
        bill({ id: 'bill-rent', description: 'Aluguel', provider_name: 'Casa', amount: 1500, due_date: '2026-04-10' }),
        bill({ id: 'bill-enel', description: 'Energia', provider_name: 'ENEL', amount: 100, due_date: '2026-04-10' }),
      ],
    });
    expect(result[0].bill.id).toBe('bill-enel');
    expect(result.find((c) => c.bill.id === 'bill-rent')).toBeUndefined();
  });

  it('filters out paid and cancelled bills', () => {
    const result = findPayableCandidates({
      bank: bankRow(),
      bills: [
        bill({ id: 'bill-paid', status: 'paid' }),
        bill({ id: 'bill-cancelled', status: 'cancelled' }),
        bill({ id: 'bill-pending', status: 'pending' }),
      ],
    });
    expect(result.map((c) => c.bill.id)).toEqual(['bill-pending']);
  });

  it('respects the 5 percent tolerance by default', () => {
    const result = findPayableCandidates({
      bank: bankRow({ amount: -104 }),
      bills: [bill({ amount: 100 })],
    });
    expect(result).toHaveLength(1);
  });

  it('rejects bills diverging beyond tolerance', () => {
    const result = findPayableCandidates({
      bank: bankRow({ amount: -250 }),
      bills: [bill({ amount: 100 })],
    });
    expect(result).toEqual([]);
  });

  it('uses absoluteTolerance for very small bills so sub-cent noise is not rejected', () => {
    const result = findPayableCandidates({
      bank: bankRow({ amount: -0.6 }),
      bills: [bill({ id: 'tiny', amount: 0.5, description: 'taxa', provider_name: null })],
    });
    expect(result[0]?.bill.id).toBe('tiny');
  });

  it('enforces the day window', () => {
    const result = findPayableCandidates({
      bank: bankRow({ date: '2026-04-12' }),
      bills: [
        bill({ id: 'close', due_date: '2026-04-10' }),
        bill({ id: 'far', due_date: '2026-02-01' }),
      ],
    });
    expect(result.map((c) => c.bill.id)).toEqual(['close']);
  });

  it('prioritizes same-day + exact amount over other plausible bills', () => {
    const result = findPayableCandidates({
      bank: bankRow({ date: '2026-04-12', amount: -100 }),
      bills: [
        bill({ id: 'close-exact', due_date: '2026-04-12', amount: 100 }),
        bill({ id: 'off-day', due_date: '2026-04-08', amount: 100 }),
        bill({ id: 'off-amount', due_date: '2026-04-12', amount: 98 }),
      ],
    });
    expect(result[0].bill.id).toBe('close-exact');
  });

  it('marks overdue bills', () => {
    const [top] = findPayableCandidates({
      bank: bankRow({ date: '2026-04-15' }),
      bills: [bill({ due_date: '2026-04-10' })],
    });
    expect(top?.billOverdue).toBe(true);
  });

  it('skips bills belonging to a different user when both sides disclose user_id', () => {
    const result = findPayableCandidates({
      bank: bankRow({ user_id: 'user-1' }),
      bills: [bill({ user_id: 'user-2' })],
    });
    expect(result).toEqual([]);
  });

  it('caps the results at the configured limit', () => {
    const result = findPayableCandidates({
      bank: bankRow(),
      bills: Array.from({ length: 12 }, (_, i) =>
        bill({ id: `b-${i}`, due_date: '2026-04-10', amount: 100 - i * 0.1 }),
      ),
      limit: 3,
    });
    expect(result).toHaveLength(3);
  });
});
