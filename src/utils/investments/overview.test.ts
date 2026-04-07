import { describe, expect, it } from 'vitest';

import {
  buildInvestmentPriceItems,
  buildOverviewPlanningDefaults,
  shouldRefreshOpportunityFeed,
} from '@/utils/investments/overview';

describe('investments overview helpers', () => {
  it('builds quote lookup items using the correct market source type', () => {
    expect(
      buildInvestmentPriceItems([
        { id: '1', name: 'Tesouro IPCA', ticker: 'IPCA2029', type: 'treasury' },
        { id: '2', name: 'PETR4', ticker: 'PETR4', type: 'stock' },
        { id: '3', name: 'BTC', ticker: 'BTC', type: 'crypto' },
        { id: '4', name: 'HGLG11', ticker: 'HGLG11', type: 'real_estate' },
      ])
    ).toEqual([
      { investmentId: '1', ticker: 'IPCA2029', type: 'treasury' },
      { investmentId: '2', ticker: 'PETR4', type: 'stock' },
      { investmentId: '3', ticker: 'BTC', type: 'crypto' },
      { investmentId: '4', ticker: 'HGLG11', type: 'stock' },
    ]);
  });

  it('uses the primary goal from the database when no goalId is selected', () => {
    const result = buildOverviewPlanningDefaults({
      goals: [
        {
          id: 'goal-1',
          status: 'active',
          target_date: '2041-12-31',
          target_amount: 10000,
          monthly_contribution: 500,
          expected_return_rate: 8,
          category: 'general',
          metrics: {
            effective_current_amount: 10000,
          },
        },
      ],
      metrics: {
        currentValue: 10000,
      },
      selectedGoalId: null,
    });

    expect(result.selectedGoal?.id).toBe('goal-1');
    expect(result.targetAmount).toBe(10000);
    expect(result.monthlyContribution).toBe(500);
    expect(result.currentAmount).toBe(10000);
    expect(result.annualReturnRate).toBe(8);
  });

  it('keeps the URL-selected goal as the planning source', () => {
    const result = buildOverviewPlanningDefaults({
      goals: [
        {
          id: 'goal-late',
          status: 'active',
          target_date: '2045-12-31',
          target_amount: 900000,
          monthly_contribution: 1500,
          expected_return_rate: 10,
          category: 'general',
        },
        {
          id: 'goal-selected',
          status: 'active',
          target_date: '2035-12-31',
          target_amount: 300000,
          monthly_contribution: 700,
          expected_return_rate: 7,
          category: 'retirement',
        },
      ],
      metrics: {
        currentValue: 25000,
      },
      selectedGoalId: 'goal-selected',
    });

    expect(result.selectedGoal?.id).toBe('goal-selected');
    expect(result.targetAmount).toBe(300000);
    expect(result.monthlyContribution).toBe(700);
    expect(result.desiredMonthlyIncome).toBe(30000);
  });

  it('refreshes opportunities when the portfolio changed after the last generation', () => {
    expect(
      shouldRefreshOpportunityFeed({
        latestInvestmentUpdatedAt: '2026-04-06T12:00:00.000Z',
        latestOpportunityCreatedAt: '2026-04-06T09:00:00.000Z',
      })
    ).toBe(true);

    expect(
      shouldRefreshOpportunityFeed({
        latestInvestmentUpdatedAt: '2026-04-06T12:00:00.000Z',
        latestOpportunityCreatedAt: '2026-04-06T12:30:00.000Z',
      })
    ).toBe(false);
  });
});
