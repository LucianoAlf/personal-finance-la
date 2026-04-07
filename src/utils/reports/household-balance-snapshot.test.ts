import { describe, expect, it } from 'vitest';

import { buildHouseholdBalanceSnapshot } from '../../../supabase/functions/_shared/household-balance-snapshot.ts';

describe('household balance snapshot', () => {
  it('builds consolidated assets, liabilities, and net worth from household sources', () => {
    const snapshot = buildHouseholdBalanceSnapshot({
      accounts: [
        {
          id: 'acc-1',
          type: 'checking',
          current_balance: 1500,
          include_in_total: true,
        },
        {
          id: 'acc-2',
          type: 'savings',
          current_balance: 500,
          include_in_total: true,
        },
      ],
      investments: [
        {
          id: 'inv-1',
          current_value: 10000,
          total_invested: 9500,
        },
      ],
      payableBills: [
        { id: 'bill-1', amount: 200, status: 'pending' },
        { id: 'bill-2', amount: 50, status: 'overdue' },
        { id: 'bill-3', amount: 99, status: 'paid' },
      ],
      creditCards: [
        {
          id: 'card-1',
          credit_limit: 2000,
          available_limit: 1200,
        },
      ],
    });

    expect(snapshot).toEqual({
      totalAssets: 12000,
      totalLiabilities: 1050,
      netWorth: 10950,
      assetBreakdown: [
        { label: 'Investimentos', amount: 10000, share: 83.33 },
        { label: 'Conta corrente', amount: 1500, share: 12.5 },
        { label: 'Poupança', amount: 500, share: 4.17 },
      ],
      liabilityBreakdown: [
        { label: 'Cartões de crédito', amount: 800, share: 76.19 },
        { label: 'Contas a pagar', amount: 250, share: 23.81 },
      ],
    });
  });

  it('still builds a household snapshot when the user has no investments', () => {
    const snapshot = buildHouseholdBalanceSnapshot({
      accounts: [
        {
          id: 'acc-1',
          type: 'checking',
          current_balance: 2000,
          include_in_total: true,
          is_active: true,
        },
      ],
      investments: [],
      payableBills: [{ id: 'bill-1', amount: 300, status: 'pending' }],
      creditCards: [],
    });

    expect(snapshot).toEqual({
      totalAssets: 2000,
      totalLiabilities: 300,
      netWorth: 1700,
      assetBreakdown: [{ label: 'Conta corrente', amount: 2000, share: 100 }],
      liabilityBreakdown: [{ label: 'Contas a pagar', amount: 300, share: 100 }],
    });
  });

  it('only counts payable bills due on or before the snapshot reference date', () => {
    const snapshot = buildHouseholdBalanceSnapshot({
      referenceDate: '2026-04-07',
      accounts: [
        {
          id: 'acc-1',
          type: 'checking',
          current_balance: 5000,
          include_in_total: true,
          is_active: true,
        },
      ],
      investments: [
        {
          id: 'inv-1',
          current_value: 10000,
          total_invested: 10000,
        },
      ],
      payableBills: [
        { id: 'bill-1', amount: 99, status: 'pending', due_date: '2026-04-05' },
        { id: 'bill-2', amount: 1500, status: 'pending', due_date: '2026-04-10' },
        { id: 'bill-3', amount: 57, status: 'pending', due_date: '2026-05-10' },
      ],
      creditCards: [
        {
          id: 'card-1',
          credit_limit: 25000,
          available_limit: 24355,
        },
      ],
    });

    expect(snapshot.totalAssets).toBe(15000);
    expect(snapshot.totalLiabilities).toBe(744);
    expect(snapshot.netWorth).toBe(14256);
    expect(snapshot.liabilityBreakdown).toEqual([
      { label: 'Cartões de crédito', amount: 645, share: 86.69 },
      { label: 'Contas a pagar', amount: 99, share: 13.31 },
    ]);
  });
});
