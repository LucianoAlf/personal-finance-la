import { describe, expect, it } from 'vitest';

import {
  buildInitialPositionTransaction,
  calculateInvestmentStateFromTransactions,
  normalizeInvestmentCategory,
  toAllocationBucket,
} from '@/utils/investments/contracts';

describe('investment contracts', () => {
  it('normalizes current category enums to a single canonical model', () => {
    expect(normalizeInvestmentCategory('reit', 'real_estate')).toBe('reit');
    expect(normalizeInvestmentCategory('renda_fixa', 'treasury')).toBe('fixed_income');
    expect(normalizeInvestmentCategory(null, 'treasury')).toBe('fixed_income');
  });

  it('maps canonical categories to the allocation buckets used by radar and Ana Clara', () => {
    expect(toAllocationBucket('fixed_income')).toBe('renda_fixa');
    expect(toAllocationBucket('stock')).toBe('acoes_nacionais');
    expect(toAllocationBucket('reit')).toBe('fiis');
    expect(toAllocationBucket('international')).toBe('internacional');
  });

  it('keeps portfolio quantities consistent when an investment has an initial position plus additional buys', () => {
    const opening = buildInitialPositionTransaction({
      investmentId: 'inv-1',
      userId: 'user-1',
      quantity: 10,
      purchasePrice: 50,
      purchaseDate: '2026-04-06',
    });

    const result = calculateInvestmentStateFromTransactions([
      opening,
      {
        investment_id: 'inv-1',
        transaction_type: 'buy',
        quantity: 1,
        price: 1,
        total_value: 1,
      },
    ]);

    expect(result.quantity).toBe(11);
    expect(result.totalInvested).toBe(501);
    expect(result.averagePrice).toBeCloseTo(45.5454, 3);
  });
});
