/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { ReportsSpendingSection } from './ReportsSpendingSection';
import { ReportsTrendSection } from './ReportsTrendSection';
import { ReportsBalanceSheetSection } from './ReportsBalanceSheetSection';
import { ReportsObligationsSection } from './ReportsObligationsSection';
import { ReportsGoalsSection } from './ReportsGoalsSection';
import { ReportsInvestmentsSection } from './ReportsInvestmentsSection';
import { createEmptyReportContext } from '@/utils/reports/intelligence-contract';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
  Legend: () => <div>legend-mounted</div>,
  Tooltip: () => <div>tooltip-mounted</div>,
  CartesianGrid: () => <div />,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
}));

describe('Reports analytics premium shell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the analytical family with premium shells and corrected portuguese copy', () => {
    const context = createEmptyReportContext();
    context.overview = {
      financialScore: 48,
      savingsRate: 0.12,
      netWorth: 14875,
      goalsReached: 0,
      activeGoals: 2,
      hasSufficientData: true,
    };
    context.spending = {
      categoryBreakdown: [
        {
          categoryId: 'sports',
          categoryName: 'Esportes',
          amount: 200,
          share: 0.678,
          transactionCount: 1,
        },
        {
          categoryId: 'food',
          categoryName: 'Alimentação',
          amount: 95,
          share: 0.322,
          transactionCount: 2,
        },
      ],
      topCategories: [
        {
          categoryId: 'sports',
          categoryName: 'Esportes',
          amount: 200,
          share: 0.678,
          transactionCount: 1,
        },
        {
          categoryId: 'food',
          categoryName: 'Alimentação',
          amount: 95,
          share: 0.322,
          transactionCount: 2,
        },
      ],
      monthOverMonthChanges: [],
      uncategorizedShare: 0,
      topTags: [],
    };
    context.cashflow = {
      incomeTotal: 5000,
      expenseTotal: 475,
      netTotal: 4525,
      monthlySeries: [
        { month: '2026-02', income: 5000, expenses: 300, net: 4700, savingsRate: 0.4 },
        { month: '2026-03', income: 5000, expenses: 425, net: 4575, savingsRate: 0.35 },
      ],
      largestIncomeMonth: null,
      largestExpenseMonth: null,
      averageMonthlySavingsRate: 0.37,
      trend: 'stable',
    };
    context.balanceSheet = {
      totalAssets: 15619,
      totalLiabilities: 744,
      netWorth: 14875,
      netWorthHistory: [{ month: '2026-04', netWorth: 14875 }],
      assetBreakdown: [{ label: 'Investimentos', amount: 10000, share: 64.02 }],
      liabilityBreakdown: [{ label: 'Contas em aberto', amount: 744, share: 100 }],
    };
    context.obligations = {
      openBillsCount: 2,
      overdueBillsCount: 0,
      pendingBillsAmount: 99,
      creditCardUsed: 0,
      creditCardLimit: 0,
      creditCardUtilization: 0,
      forecastNextMonths: [
        { month: '2026-04', amount: 1906 },
        { month: '2026-05', amount: 1750 },
      ],
    };
    context.goals = {
      active: 2,
      completed: 0,
      atRisk: 0,
      completionRate: 0,
      progressByGoal: [
        {
          id: 'goal-1',
          name: 'Viagem Europa',
          type: 'savings',
          status: 'active',
          currentAmount: 500,
          targetAmount: 15000,
          progressPercentage: 3.33,
          remainingAmount: 14500,
          deadline: '2026-12-31',
          onTrack: false,
        },
      ],
    };
    context.investments = {
      portfolioValue: 10000,
      totalReturn: 0,
      allocationSummary: [
        {
          assetClass: 'fixed_income',
          label: 'Renda Fixa',
          value: 10000,
          percentage: 100,
        },
      ],
      opportunitySignals: [],
      planningHighlights: ['Aporte mensal constante mantido.'],
    };
    context.quality.spending = { source: 'internal_calculation', completeness: 'complete' };
    context.quality.cashflow = { source: 'internal_calculation', completeness: 'complete' };
    context.quality.balanceSheet = { source: 'internal_calculation', completeness: 'partial' };
    context.quality.obligations = { source: 'internal_calculation', completeness: 'complete' };
    context.quality.goals = { source: 'database_state', completeness: 'complete' };
    context.quality.investments = { source: 'internal_calculation', completeness: 'complete' };

    const { container } = render(
      <div className="space-y-6">
        <ReportsSpendingSection context={context} />
        <ReportsTrendSection context={context} />
        <ReportsBalanceSheetSection context={context} />
        <ReportsObligationsSection context={context} />
        <ReportsGoalsSection context={context} />
        <ReportsInvestmentsSection context={context} />
      </div>,
    );

    const spendingTitle = screen.getByText('Composição das despesas');
    const trendTitle = screen.getByText('Tendências do período');
    const balanceTitle = screen.getByText('Balanço patrimonial');
    const obligationsTitle = screen.getByText('Obrigações e pressão de caixa');

    expect(spendingTitle).not.toBeNull();
    expect(trendTitle).not.toBeNull();
    expect(balanceTitle).not.toBeNull();
    expect(obligationsTitle).not.toBeNull();
    expect(screen.getByText('Taxa de conclusão')).not.toBeNull();
    expect(screen.getAllByText('Investimentos').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.rounded-\\[32px\\]').length).toBeGreaterThan(3);
    expect(container.textContent).not.toContain('Ã');
  });
});
