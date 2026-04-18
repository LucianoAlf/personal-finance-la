import { describe, expect, it } from 'vitest';

import type { BankTransactionRow } from '@/types/reconciliation';

import { findTransferCandidates } from './reconciliation-transfer-candidates';

function makeBankTx(overrides: Partial<BankTransactionRow> = {}): BankTransactionRow {
  return {
    id: 'bt-0',
    user_id: 'user-1',
    source: 'pluggy',
    source_item_id: null,
    external_id: null,
    account_name: 'Conta A',
    external_account_id: 'acc-A',
    internal_account_id: null,
    amount: -500,
    date: '2026-04-10',
    description: 'Transferencia para conta B',
    raw_description: null,
    reconciliation_status: 'pending',
    out_of_scope: false,
    ...overrides,
  };
}

describe('findTransferCandidates', () => {
  it('returns the opposite-sign, same-value leg within the window', () => {
    const primary = makeBankTx({ id: 'bt-out', amount: -500 });
    const match = makeBankTx({
      id: 'bt-in',
      account_name: 'Conta B',
      external_account_id: 'acc-B',
      amount: 500,
      date: '2026-04-10',
      description: 'Transferencia recebida',
    });
    const noise = makeBankTx({ id: 'bt-other', amount: -120, description: 'Padaria' });

    const results = findTransferCandidates({ primary, pool: [primary, match, noise] });

    expect(results.length).toBe(1);
    expect(results[0].bankTransaction.id).toBe('bt-in');
    expect(results[0].dayDistance).toBe(0);
  });

  it('rejects same-sign candidates and mismatched amounts', () => {
    const primary = makeBankTx({ id: 'bt-out', amount: -500 });
    const sameSign = makeBankTx({ id: 'bt-ss', amount: -500 });
    const offValue = makeBankTx({ id: 'bt-off', amount: 499 });

    const results = findTransferCandidates({ primary, pool: [primary, sameSign, offValue] });
    expect(results).toEqual([]);
  });

  it('excludes candidates outside the day window', () => {
    const primary = makeBankTx({ id: 'bt-out', amount: -500, date: '2026-04-10' });
    const tooOld = makeBankTx({ id: 'bt-old', amount: 500, date: '2026-03-15' });
    const tooFuture = makeBankTx({ id: 'bt-future', amount: 500, date: '2026-04-25' });

    const results = findTransferCandidates({
      primary,
      pool: [primary, tooOld, tooFuture],
      windowInDays: 3,
    });
    expect(results).toEqual([]);
  });

  it('excludes already-resolved / out-of-scope rows', () => {
    const primary = makeBankTx({ id: 'bt-out', amount: -500 });
    const reconciled = makeBankTx({ id: 'bt-done', amount: 500, reconciliation_status: 'reconciled' });
    const ignored = makeBankTx({ id: 'bt-ign', amount: 500, reconciliation_status: 'ignored' });
    const alreadyPaired = makeBankTx({ id: 'bt-paired', amount: 500, reconciliation_status: 'transfer_matched' });
    const archived = makeBankTx({ id: 'bt-arch', amount: 500, out_of_scope: true });

    const results = findTransferCandidates({
      primary,
      pool: [primary, reconciled, ignored, alreadyPaired, archived],
    });
    expect(results).toEqual([]);
  });

  it('ranks closer dates higher and caps by limit', () => {
    const primary = makeBankTx({ id: 'bt-out', amount: -200, date: '2026-04-10' });
    const pool = [
      primary,
      makeBankTx({ id: 'bt-far', amount: 200, date: '2026-04-13' }),
      makeBankTx({ id: 'bt-close', amount: 200, date: '2026-04-10' }),
      makeBankTx({ id: 'bt-mid', amount: 200, date: '2026-04-11' }),
    ];

    const results = findTransferCandidates({ primary, pool, limit: 2 });
    expect(results.length).toBe(2);
    expect(results[0].bankTransaction.id).toBe('bt-close');
    expect(results[1].bankTransaction.id).toBe('bt-mid');
  });

  it('boosts candidates with transfer-like descriptions on both sides', () => {
    const primary = makeBankTx({ id: 'bt-out', amount: -300, description: 'TED para Joao' });
    const generic = makeBankTx({ id: 'bt-g', amount: 300, description: 'Credito avulso' });
    const transferLike = makeBankTx({ id: 'bt-t', amount: 300, description: 'TED recebida de Maria' });

    const results = findTransferCandidates({ primary, pool: [primary, generic, transferLike] });
    expect(results[0].bankTransaction.id).toBe('bt-t');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });
});
