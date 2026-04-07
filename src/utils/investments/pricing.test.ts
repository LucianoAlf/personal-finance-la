import { describe, expect, it } from 'vitest';

import {
  resolveInvestmentDisplayPrice,
  resolveInvestmentDisplayValue,
} from '@/utils/investments/pricing';

describe('investment pricing', () => {
  const investment = {
    quantity: 10,
    purchase_price: 50,
    current_price: null,
    current_value: null,
    total_invested: 500,
  };

  it('falls back to purchase price when persisted current price is unavailable', () => {
    expect(resolveInvestmentDisplayPrice(investment)).toBe(50);
  });

  it('prefers live quotes when available', () => {
    expect(resolveInvestmentDisplayPrice(investment, { price: 62 })).toBe(62);
    expect(resolveInvestmentDisplayValue(investment, { price: 62 })).toBe(620);
  });
});
