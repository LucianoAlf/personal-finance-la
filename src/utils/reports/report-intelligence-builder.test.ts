import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../supabase/functions/_shared/investment-intelligence.ts', () => ({
  buildInvestmentIntelligenceContext: vi.fn(async () => null),
}));

import {
  buildReportIntelligenceContext,
  buildBalanceSheetSection,
  buildObligationsSection,
  buildOverviewSection,
  isGoalAtRisk,
} from '../../../supabase/functions/_shared/report-intelligence.ts';

function createSupabaseStub(
  tables: Record<string, Array<Record<string, unknown>>>,
  rpcResults: Record<string, unknown> = {},
) {
  function createQuery(tableName: string) {
    let rows = [...(tables[tableName] || [])];

    const builder = {
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        rows = rows.filter((row) => row[column] === value);
        return builder;
      },
      gte(column: string, value: string) {
        rows = rows.filter((row) => String(row[column] ?? '') >= value);
        return builder;
      },
      lte(column: string, value: string) {
        rows = rows.filter((row) => String(row[column] ?? '') <= value);
        return builder;
      },
      order(column: string, options?: { ascending?: boolean }) {
        const ascending = options?.ascending !== false;
        rows = [...rows].sort((left, right) => {
          const leftValue = String(left[column] ?? '');
          const rightValue = String(right[column] ?? '');
          return ascending ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue);
        });
        return builder;
      },
      then(onFulfilled?: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown) {
        return Promise.resolve({ data: rows, error: null }).then(onFulfilled);
      },
    };

    return builder;
  }

  return {
    from(tableName: string) {
      return createQuery(tableName);
    },
    rpc(functionName: string) {
      return Promise.resolve({
        data: rpcResults[functionName] ?? null,
        error: null,
      });
    },
  };
}

describe('report intelligence builder', () => {
  it('keeps the balance sheet unavailable for backdated report periods', () => {
    const section = buildBalanceSheetSection({
      accounts: [
        {
          id: 'account-1',
          name: 'Conta principal',
          type: 'checking',
          current_balance: 1500,
          include_in_total: true,
        },
      ],
      obligations: null,
      investments: null,
      endDate: '2026-02-28',
      dataAsOfDate: '2026-04-06',
    });

    expect(section).toBeNull();
  });

  it('falls back to raw payable bill rows for open and overdue counts', () => {
    const section = buildObligationsSection({
      billAnalytics: null,
      payableBills: [
        { id: 'bill-1', amount: 100, due_date: '2026-04-01', status: 'pending' },
        { id: 'bill-2', amount: 50, due_date: '2026-04-02', status: 'overdue' },
        { id: 'bill-3', amount: 25, due_date: '2026-04-03', status: 'paid' },
      ],
      creditCards: [],
      cardInvoices: [],
      endDate: '2026-04-06',
      dataAsOfDate: '2026-04-06',
    });

    expect(section).toMatchObject({
      openBillsCount: 2,
      overdueBillsCount: 1,
      pendingBillsAmount: 150,
    });
  });

  it('evaluates goal risk against the report reference date instead of wall clock time', () => {
    const goal = {
      id: 'goal-1',
      name: 'Reserva',
      goal_type: 'savings',
      status: 'active',
      target_amount: 1000,
      current_amount: 500,
      deadline: '2026-02-15',
      period_end: null,
    };

    expect(isGoalAtRisk(goal, '2025-12-01')).toBe(false);
    expect(isGoalAtRisk(goal, '2025-12-17')).toBe(true);
  });

  it('does not score overdue-bills health without bill evidence', () => {
    const overview = buildOverviewSection({
      cashflow: {
        incomeTotal: 1000,
        expenseTotal: 900,
        netTotal: 100,
        monthlySeries: [
          {
            month: '2026-04',
            income: 1000,
            expenses: 900,
            net: 100,
            savingsRate: 10,
          },
        ],
        largestIncomeMonth: null,
        largestExpenseMonth: null,
        averageMonthlySavingsRate: 10,
        trend: 'stable',
      },
      balanceSheet: null,
      goals: null,
      investmentContext: null,
      billAnalytics: null,
      payableBills: [],
    });

    expect(overview.financialScore).toBe(70);
  });

  it('builds historical balance sheet data from persisted consolidated snapshots', async () => {
    const context = await buildReportIntelligenceContext({
      supabase: createSupabaseStub({
        accounts: [],
        transactions: [],
        credit_card_transactions: [],
        credit_cards: [],
        credit_card_invoices: [],
        financial_goals: [],
        payable_bills: [],
        portfolio_snapshots: [
          {
            id: 'snap-1',
            user_id: 'user-1',
            snapshot_date: '2026-02-28',
            total_assets: 10000,
            total_liabilities: 1200,
            net_worth: 8800,
            asset_breakdown: [{ label: 'Investimentos', amount: 10000, share: 100 }],
            liability_breakdown: [{ label: 'Cartões', amount: 1200, share: 100 }],
          },
          {
            id: 'snap-2',
            user_id: 'user-1',
            snapshot_date: '2026-03-31',
            total_assets: 11200,
            total_liabilities: 1500,
            net_worth: 9700,
            asset_breakdown: [{ label: 'Investimentos', amount: 11200, share: 100 }],
            liability_breakdown: [{ label: 'Cartões', amount: 1500, share: 100 }],
          },
        ],
      }),
      userId: 'user-1',
      startDate: '2026-02-01',
      endDate: '2026-03-31',
      dataAsOfDate: '2026-04-06',
    });

    expect(context.balanceSheet).toMatchObject({
      totalAssets: 11200,
      totalLiabilities: 1500,
      netWorth: 9700,
      assetBreakdown: [{ label: 'Investimentos', amount: 11200, share: 100 }],
      liabilityBreakdown: [{ label: 'Cartões', amount: 1500, share: 100 }],
      netWorthHistory: [
        { month: '2026-02', netWorth: 8800 },
        { month: '2026-03', netWorth: 9700 },
      ],
    });
    expect(context.quality.balanceSheet).toEqual({
      source: 'internal_calculation',
      completeness: 'complete',
    });
  });

  it('prefers live same-day balance sheet totals over an older persisted snapshot in the current month', async () => {
    const context = await buildReportIntelligenceContext({
      supabase: createSupabaseStub({
        accounts: [
          {
            id: 'acc-1',
            user_id: 'user-1',
            name: 'Conta principal',
            type: 'checking',
            current_balance: 5000,
            is_active: true,
          },
        ],
        transactions: [],
        credit_card_transactions: [],
        credit_cards: [
          {
            id: 'card-1',
            user_id: 'user-1',
            name: 'Nubank',
            credit_limit: 2000,
            available_limit: 1500,
            is_active: true,
            is_archived: false,
          },
        ],
        credit_card_invoices: [],
        financial_goals: [],
        payable_bills: [
          {
            id: 'bill-1',
            user_id: 'user-1',
            amount: 300,
            due_date: '2026-04-06',
            status: 'pending',
          },
        ],
        portfolio_snapshots: [
          {
            id: 'snap-1',
            user_id: 'user-1',
            snapshot_date: '2026-04-01',
            total_assets: 10000,
            total_liabilities: 1000,
            net_worth: 9000,
            asset_breakdown: [{ label: 'Investimentos', amount: 10000, share: 100 }],
            liability_breakdown: [{ label: 'Cartões', amount: 1000, share: 100 }],
          },
        ],
      }),
      userId: 'user-1',
      startDate: '2026-04-01',
      endDate: '2026-04-06',
      dataAsOfDate: '2026-04-06',
      supabaseUrl: 'https://example.supabase.co',
    });

    expect(context.balanceSheet).toMatchObject({
      totalAssets: 5000,
      totalLiabilities: 800,
      netWorth: 4200,
      netWorthHistory: [{ month: '2026-04', netWorth: 4200 }],
    });
  });

  it('formats investment planning highlights with pt-BR currency style', async () => {
    const { buildInvestmentIntelligenceContext } = await import('../../../supabase/functions/_shared/investment-intelligence.ts');
    vi.mocked(buildInvestmentIntelligenceContext).mockResolvedValueOnce({
      generatedAt: '2026-04-30T12:00:00.000Z',
      fingerprint: 'investment-fingerprint',
      portfolio: {
        totalInvested: 10000,
        currentValue: 10000,
        totalReturn: 0,
        returnPercentage: 0,
        investmentCount: 1,
        allocation: [
          {
            assetClass: 'fixed_income',
            label: 'Renda Fixa',
            value: 10000,
            percentage: 100,
            count: 1,
          },
        ],
        topPerformers: [],
        concentrationPercentage: 100,
        healthBreakdown: {
          diversification: 0,
          concentration: 0,
          returns: 0,
          risk: 0,
          total: 0,
        },
      },
      market: {
        benchmarkPeriod: '1Y',
        benchmarks: [],
      },
      planning: {
        selectedGoal: {
          id: 'goal-1',
          name: 'Aposentadoria 2041',
          category: 'retirement',
          currentAmount: 0,
          targetAmount: 10000,
          monthlyContribution: 0,
          expectedReturnRate: 0,
          yearsToGoal: 10,
          projectedGap: 10000,
        },
      },
      opportunities: {
        items: [],
      },
      rebalance: {
        isBalanced: false,
        totalAllocated: 100,
        actions: [
          {
            action: 'SELL',
            assetClass: 'Renda Fixa',
            amount: 7000,
          },
        ],
      },
      gamification: {
        unlockedCount: 0,
        trackedCount: 0,
        level: null,
        xp: null,
        totalXp: null,
        currentStreak: null,
        bestStreak: null,
      },
      ana: {
        cached: false,
        insight: null,
        strengths: [],
        warnings: [],
        recommendations: [],
        nextSteps: [],
      },
      quality: {},
    } as any);

    const context = await buildReportIntelligenceContext({
      supabase: createSupabaseStub({
        accounts: [],
        transactions: [],
        credit_card_transactions: [],
        credit_cards: [],
        credit_card_invoices: [],
        financial_goals: [],
        payable_bills: [],
        portfolio_snapshots: [],
      }),
      userId: 'user-1',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      dataAsOfDate: '2026-04-30',
      supabaseUrl: 'https://example.supabase.co',
    });

    expect(context.investments?.planningHighlights).toContain(
      'Meta foco: Aposentadoria 2041 com gap projetado de R$ 10.000,00.',
    );
    expect(context.investments?.planningHighlights).toContain(
      'Redução sugerida em Renda Fixa: R$ 7.000,00.',
    );
  });

  it('groups credit card spending by invoice competence month when available', async () => {
    const context = await buildReportIntelligenceContext({
      supabase: createSupabaseStub({
        accounts: [],
        transactions: [],
        credit_card_transactions: [
          {
            id: 'cc-1',
            user_id: 'user-1',
            amount: 120,
            purchase_date: '2026-03-28',
            category_id: 'cat-food',
            category: { name: 'Alimentação' },
            invoice: { reference_month: '2026-04-01' },
          },
        ],
        credit_cards: [],
        credit_card_invoices: [
          {
            id: 'inv-1',
            user_id: 'user-1',
            status: 'open',
            total_amount: 120,
            remaining_amount: 120,
            due_date: '2026-04-20',
            reference_month: '2026-04-01',
          },
        ],
        financial_goals: [],
        payable_bills: [],
      }),
      userId: 'user-1',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      dataAsOfDate: '2026-04-30',
    });

    expect(context.spending?.categoryBreakdown).toEqual([
      expect.objectContaining({
        categoryName: 'Alimentação',
        amount: 120,
        transactionCount: 1,
      }),
    ]);
    expect(context.spending?.monthOverMonthChanges).toEqual([
      expect.objectContaining({
        month: '2026-04',
        amount: 120,
      }),
    ]);
  });

  it('keeps credit card purchases out of bank-month cashflow and counts invoice payments instead', async () => {
    const context = await buildReportIntelligenceContext({
      supabase: createSupabaseStub({
        accounts: [],
        transactions: [
          {
            id: 'tx-income',
            user_id: 'user-1',
            type: 'income',
            amount: 1000,
            transaction_date: '2026-04-05',
            category_id: null,
          },
          {
            id: 'tx-invoice-payment',
            user_id: 'user-1',
            type: 'expense',
            amount: 200,
            transaction_date: '2026-04-10',
            category_id: null,
            description: 'Pagamento da fatura do cartao',
            is_paid: true,
            payment_method: 'pix',
            credit_card_id: null,
          },
          {
            id: 'tx-debit-expense',
            user_id: 'user-1',
            type: 'expense',
            amount: 50,
            transaction_date: '2026-04-11',
            category_id: null,
            description: 'Mercado',
            is_paid: true,
            payment_method: 'debit',
            credit_card_id: null,
          },
        ],
        credit_card_transactions: [
          {
            id: 'cc-2',
            user_id: 'user-1',
            amount: 120,
            purchase_date: '2026-04-12',
            category_id: 'cat-food',
            category: { name: 'Alimentação' },
            invoice: { reference_month: '2026-05-01' },
          },
        ],
        credit_cards: [],
        credit_card_invoices: [],
        financial_goals: [],
        payable_bills: [],
      }),
      userId: 'user-1',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      dataAsOfDate: '2026-04-30',
    });

    expect(context.cashflow).toMatchObject({
      incomeTotal: 1000,
      expenseTotal: 250,
      netTotal: 750,
    });
    expect(context.cashflow?.monthlySeries).toEqual([
      expect.objectContaining({
        month: '2026-04',
        income: 1000,
        expenses: 250,
        net: 750,
      }),
    ]);
  });

  it('keeps backdated obligations unavailable instead of using live card utilization snapshots', async () => {
    const context = await buildReportIntelligenceContext({
      supabase: createSupabaseStub({
        accounts: [],
        transactions: [],
        credit_card_transactions: [],
        credit_cards: [
          {
            id: 'card-1',
            user_id: 'user-1',
            name: 'Nubank',
            credit_limit: 2000,
            available_limit: 250,
            is_active: true,
            is_archived: false,
          },
        ],
        credit_card_invoices: [],
        financial_goals: [],
        payable_bills: [],
      }),
      userId: 'user-1',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      dataAsOfDate: '2026-04-06',
    });

    expect(context.obligations).toBeNull();
    expect(context.quality.obligations).toEqual({
      source: 'unavailable',
      completeness: 'unavailable',
    });
  });

  it('keeps historical card forecasts without leaking live utilization snapshots', () => {
    const section = buildObligationsSection({
      billAnalytics: null,
      payableBills: [],
      creditCards: [
        {
          id: 'card-1',
          name: 'Nubank',
          credit_limit: 3000,
          available_limit: 500,
        },
      ],
      cardInvoices: [
        {
          id: 'inv-1',
          status: 'open',
          total_amount: 800,
          remaining_amount: 650,
          due_date: '2026-03-15',
          reference_month: '2026-02-01',
        },
      ],
      endDate: '2026-02-28',
      dataAsOfDate: '2026-04-06',
    });

    expect(section).toMatchObject({
      creditCardUsed: 0,
      creditCardLimit: 0,
      creditCardUtilization: 0,
      forecastNextMonths: [
        {
          month: '2026-03',
          amount: 650,
        },
      ],
    });
  });
});
