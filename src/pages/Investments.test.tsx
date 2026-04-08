/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Investments } from './Investments';

const investmentsHookState = {
  investments: [
    {
      id: 'inv-1',
      name: 'Tesouro IPCA',
      type: 'treasury',
      category: 'fixed_income',
      quantity: 1,
      purchase_price: 1000,
      current_price: 1000,
      current_value: 1000,
      total_invested: 1000,
      is_active: true,
    },
  ],
  loading: false,
};

vi.mock('@/components/layout/Header', () => ({
  Header: ({
    title,
    subtitle,
    actions,
  }: {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
      {actions ? <div>{actions}</div> : null}
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/useInvestments', () => ({
  useInvestments: () => ({
    investments: investmentsHookState.investments,
    loading: investmentsHookState.loading,
    refresh: vi.fn(),
    addInvestment: vi.fn(),
    updateInvestment: vi.fn(),
    deleteInvestment: vi.fn(),
  }),
}));

vi.mock('@/hooks/useInvestmentGoals', () => ({
  useInvestmentGoals: () => ({
    goals: [],
  }),
}));

vi.mock('@/hooks/useInvestmentTransactions', () => ({
  useInvestmentTransactions: () => ({
    transactions: [],
    addTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useInvestmentAlerts', () => ({
  useInvestmentAlerts: () => ({
    alerts: [],
    addAlert: vi.fn(),
    deleteAlert: vi.fn(),
    toggleAlert: vi.fn(),
  }),
}));

vi.mock('@/hooks/useInvestmentPrices', () => ({
  useInvestmentPrices: () => ({
    quotes: new Map(),
    loading: false,
    lastUpdate: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePortfolioMetrics', () => ({
  usePortfolioMetrics: () => ({
    totalInvested: 1000,
    currentValue: 1000,
    totalReturn: 0,
    returnPercentage: 0,
    allocation: {
      fixed_income: { name: 'Renda Fixa', value: 1000, percentage: 100 },
    },
    performanceByType: [],
    monthlyEvolution: [],
    topPerformers: [],
    worstPerformers: [],
    diversificationScore: 80,
  }),
}));

vi.mock('@/hooks/useDividendCalendar', () => ({
  useDividendCalendar: () => [],
  useDividendHistory: () => [],
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    formatCurrency: (value: number) => `R$ ${value.toFixed(2)}`,
  }),
}));

vi.mock('@/components/investments/MarketStatus', () => ({
  MarketStatus: () => <div>market-status-mounted</div>,
}));

vi.mock('@/components/investments/PriceUpdater', () => ({
  PriceUpdater: () => <div>price-updater-mounted</div>,
}));

vi.mock('@/components/investments/InvestmentReportDialog', () => ({
  InvestmentReportDialog: () => <div>investment-report-trigger</div>,
}));

vi.mock('@/components/investments/InvestmentDialog', () => ({
  InvestmentDialog: () => <div>investment-dialog-mounted</div>,
}));

vi.mock('@/components/investments/TransactionDialog', () => ({
  TransactionDialog: () => <div>investment-transaction-dialog-mounted</div>,
}));

vi.mock('@/components/investments/AlertDialog', () => ({
  AlertDialog: () => <div>investment-alert-dialog-mounted</div>,
}));

vi.mock('@/components/investments/PortfolioSummaryCards', () => ({
  PortfolioSummaryCards: () => <div>portfolio-summary-mounted</div>,
}));

vi.mock('@/components/investments/TransactionTimeline', () => ({
  TransactionTimeline: () => <div>transaction-timeline-mounted</div>,
}));

vi.mock('@/components/investments/AlertsList', () => ({
  AlertsList: () => <div>alerts-list-mounted</div>,
}));

vi.mock('@/components/investments/AssetAllocationChart', () => ({
  AssetAllocationChart: () => <div>allocation-chart-mounted</div>,
}));

vi.mock('@/components/investments/PortfolioEvolutionChart', () => ({
  PortfolioEvolutionChart: () => <div>evolution-chart-mounted</div>,
}));

vi.mock('@/components/investments/PerformanceBarChart', () => ({
  PerformanceBarChart: () => <div>performance-chart-mounted</div>,
}));

vi.mock('@/components/investments/DividendCalendar', () => ({
  DividendCalendar: () => <div>dividend-calendar-mounted</div>,
}));

vi.mock('@/components/investments/DividendHistoryTable', () => ({
  DividendHistoryTable: () => <div>dividend-history-mounted</div>,
}));

vi.mock('@/components/investments/OpportunityFeed', () => ({
  OpportunityFeed: () => <div>opportunity-feed-mounted</div>,
}));

vi.mock('@/components/investments/SmartRebalanceWidget', () => ({
  SmartRebalanceWidget: () => <div>rebalance-mounted</div>,
}));

vi.mock('@/components/investments/AnaInvestmentInsights', () => ({
  AnaInvestmentInsights: () => <div>ana-insights-mounted</div>,
}));

vi.mock('@/components/investments/InvestmentPlanningCalculator', () => ({
  InvestmentPlanningCalculator: () => <div>planning-calculator-mounted</div>,
}));

vi.mock('@/components/investments/BadgesDisplay', () => ({
  BadgesDisplay: () => <div>badges-mounted</div>,
}));

vi.mock('@/components/investments/DiversificationScoreCard', () => ({
  DiversificationScoreCard: () => <div>diversification-mounted</div>,
}));

vi.mock('@/components/investments/PerformanceHeatMap', () => ({
  PerformanceHeatMap: () => <div>heatmap-mounted</div>,
}));

vi.mock('@/components/investments/BenchmarkComparison', () => ({
  BenchmarkComparison: () => <div>benchmark-mounted</div>,
}));

describe('Investments initial render', () => {
  beforeEach(() => {
    investmentsHookState.loading = false;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the investments shell while data is loading', () => {
    investmentsHookState.loading = true;

    render(
      <MemoryRouter initialEntries={['/investimentos']}>
        <Investments />
      </MemoryRouter>,
    );

    expect(screen.getByText('Investimentos')).not.toBeNull();
    expect(screen.getByText('Acompanhe sua carteira de investimentos')).not.toBeNull();
    expect(screen.getByText('Carregando investimentos...')).not.toBeNull();
    expect(screen.queryByText('portfolio-summary-mounted')).toBeNull();
  });

  it('does not mount closed dialogs on initial render', () => {
    render(
      <MemoryRouter initialEntries={['/investimentos']}>
        <Investments />
      </MemoryRouter>,
    );

    expect(screen.queryByText('investment-dialog-mounted')).toBeNull();
    expect(screen.queryByText('investment-transaction-dialog-mounted')).toBeNull();
    expect(screen.queryByText('investment-alert-dialog-mounted')).toBeNull();
    expect(screen.getByText('investment-report-trigger')).not.toBeNull();
  });
});
