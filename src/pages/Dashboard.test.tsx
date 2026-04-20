/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sparkles, Wallet } from 'lucide-react';

import { Dashboard } from './Dashboard';
import { ChartCard } from '@/components/dashboard/charts/ChartCard';
import { AnaDashboardWidget } from '@/components/dashboard/AnaDashboardWidget';
import { TransactionItem } from '@/components/dashboard/TransactionItem';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

const {
  navigateMock,
  useTransactionsQueryMock,
  useAccountsQueryMock,
  useCreditCardsQueryMock,
  useInvoicesQueryMock,
  useGoalsQueryMock,
  useAnaDashboardInsightsMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useTransactionsQueryMock: vi.fn(() => ({
    transactions: [],
    loading: false,
  })),
  useAccountsQueryMock: vi.fn(() => ({
    accounts: [],
    getTotalBalance: () => 0,
    loading: false,
  })),
  useCreditCardsQueryMock: vi.fn(() => ({
    cards: [],
    getTotalUsed: () => 0,
    loading: false,
  })),
  useInvoicesQueryMock: vi.fn(() => ({
    invoices: [],
    loading: false,
  })),
  useGoalsQueryMock: vi.fn(() => ({
    goals: [],
  })),
  useAnaDashboardInsightsMock: vi.fn(() => ({
    insights: {
      primary: {
        type: 'positive',
        title: 'Reserva protegida',
        message: 'Voce manteve o caixa sob controle.',
      },
      secondary: [
        {
          type: 'tip',
          title: 'Ajuste fino',
          message: 'Continue priorizando gastos essenciais.',
        },
      ],
      motivationalQuote: 'Clareza financeira traz tranquilidade.',
      healthBreakdown: {
        bills: 24,
        investments: 23,
        budget: 16,
        planning: 17,
      },
    },
    healthScore: 80,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    meta: {
      hasSufficientData: true,
      streak: 3,
    },
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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

vi.mock('@/components/shared/MonthSelector', () => ({
  MonthSelector: () => <div>month-selector</div>,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'ana@example.com' },
    profile: { full_name: 'Ana Premium' },
  }),
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    userSettings: {},
  }),
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    formatCurrency: (value: number) => `R$ ${value.toFixed(2)}`,
  }),
}));

vi.mock('@/hooks/useTransactionsQuery', () => ({
  useTransactionsQuery: useTransactionsQueryMock,
}));

vi.mock('@/hooks/useAccountsQuery', () => ({
  useAccountsQuery: useAccountsQueryMock,
}));

vi.mock('@/hooks/useCreditCardsQuery', () => ({
  useCreditCardsQuery: useCreditCardsQueryMock,
}));

vi.mock('@/hooks/useInvoicesQuery', () => ({
  useInvoicesQuery: useInvoicesQueryMock,
}));

vi.mock('@/hooks/useGoalsQuery', () => ({
  useGoalsQuery: useGoalsQueryMock,
}));

vi.mock('@/hooks/usePayableBillsQuery', () => ({
  usePayableBillsQuery: () => ({
    overdueBills: [],
    upcomingBills: [],
    bills: [],
    summary: { overdue_count: 0 },
    loading: false,
  }),
}));

vi.mock('@/components/dashboard/DashboardAlertCard', () => ({
  DashboardAlertCard: () => null,
}));

vi.mock('@/hooks/useAnaDashboardInsights', () => ({
  useAnaDashboardInsights: useAnaDashboardInsightsMock,
}));

vi.mock('@/components/dashboard/AnaInsightCard', () => ({
  AnaInsightCard: ({ insight }: { insight: { title: string } }) => <div>{insight.title}</div>,
}));

vi.mock('@/components/dashboard/HealthScoreBar', () => ({
  HealthScoreBar: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock('@/components/dashboard/GamificationBadges', () => ({
  GamificationBadges: () => <div>gamification-badges</div>,
}));

vi.mock('@/components/dashboard/AnaInsightsHistoryDialog', () => ({
  AnaInsightsHistoryDialog: () => null,
}));

vi.mock('@/components/dashboard/PreferencesDialog', () => ({
  PreferencesDialog: () => null,
}));

vi.mock('@/components/dashboard/InvestmentsWidget', () => ({
  InvestmentsWidget: () => <div>investments-widget</div>,
}));

vi.mock('@/components/goals/GoalsSummaryWidget', () => ({
  GoalsSummaryWidget: () => <div>goals-summary-widget</div>,
}));

vi.mock('@/components/budget/BudgetComplianceWidget', () => ({
  BudgetComplianceWidget: () => <div>budget-compliance-widget</div>,
}));

vi.mock('@/components/creditcards/CreditCardsWidget', () => ({
  CreditCardsWidget: () => <div>credit-cards-widget</div>,
}));

vi.mock('@/components/payable-bills/PayableBillsWidget', () => ({
  PayableBillsWidget: () => <div>payable-bills-widget</div>,
}));

vi.mock('@/components/dashboard/charts/ExpensesByCategoryChart', () => ({
  ExpensesByCategoryChart: () => <div>expenses-chart</div>,
}));

vi.mock('@/components/dashboard/charts/MonthlyTrendChart', () => ({
  MonthlyTrendChart: () => <div>monthly-trend-chart</div>,
}));

vi.mock('@/utils/profileIdentity', () => ({
  resolveUserDisplayName: () => 'Ana Premium',
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    getCategoryById: () => ({ id: 'cat-1', name: 'Moradia', icon: 'Wallet' }),
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('Dashboard premium dark mode regression', () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
    useTransactionsQueryMock.mockClear();
    useAccountsQueryMock.mockClear();
    useCreditCardsQueryMock.mockClear();
    useInvoicesQueryMock.mockClear();
    useGoalsQueryMock.mockClear();
    useAnaDashboardInsightsMock.mockClear();
  });

  it('uses premium shell tokens for the dashboard root and recent-transactions empty state', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Dashboard />
      </MemoryRouter>,
    );

    const root = container.querySelector('.min-h-screen');
    const emptyTitle = screen.getByText(/Nenhuma transa/i);
    const emptyIconSurface = emptyTitle.previousElementSibling as HTMLElement | null;

    expect(root?.className).toContain('bg-background');
    expect(root?.className).toContain('text-foreground');
    expect(screen.getByTestId('app-page-content').className).not.toContain('max-w-7xl');
    expect(emptyIconSurface?.className).toContain('bg-surface-elevated');
    expect(emptyIconSurface?.className).toContain('ring-1');
  });

  it('uses consistent premium surfaces across card, chart, Ana widget, transaction row, and skeleton states', () => {
    const { container: chartContainer } = render(
      <ChartCard
        title="Distribuicao"
        icon={Sparkles}
        isEmpty
        emptyMessage="Sem dados"
      >
        <div>chart-content</div>
      </ChartCard>,
    );

    const chartCard = chartContainer.firstElementChild as HTMLElement | null;
    const chartHeader = screen.getByText('Distribuicao').closest('div[class*="border-b"]');
    const chartEmptyIcon = screen.getByText('Sem dados').previousElementSibling as HTMLElement | null;

    expect(chartCard?.className).toContain('bg-surface');
    expect(chartCard?.className).toContain('border-border/70');
    expect(chartHeader?.className).toContain('bg-[linear-gradient');
    expect(chartEmptyIcon?.className).toContain('bg-surface-elevated');

    cleanup();

    const { container: anaContainer } = render(<AnaDashboardWidget autoRefresh />);
    const anaCard = screen.getByText('Ana Clara').closest('.rounded-lg');

    expect(anaCard?.className).toContain('border-primary/20');
    expect(anaCard?.className).toContain('bg-surface');
    expect(anaContainer.textContent).toMatch(/Financeira/i);

    cleanup();

    const { container: transactionContainer } = render(
      <TransactionItem
        type="expense"
        description="Aluguel"
        category_id="cat-1"
        date="2026-04-01"
        amount={1350}
        is_paid={false}
        is_recurring
        extraBadgeText="Contrato"
      />,
    );

    const transactionRow = transactionContainer.firstElementChild as HTMLElement | null;
    const amount = screen.getByText(/1[.,]350/);

    expect(transactionRow?.className).toContain('rounded-2xl');
    expect(transactionRow?.className).toContain('border-l-danger');
    expect(amount.className).toContain('text-danger');

    cleanup();

    const { container: skeletonContainer } = render(<DashboardSkeleton />);
    const skeletonRoot = skeletonContainer.querySelector('.min-h-screen');
    const skeletonCard = skeletonContainer.querySelector('.animate-pulse.rounded-lg');

    expect(skeletonRoot?.className).toContain('bg-background');
    expect(skeletonRoot?.className).toContain('text-foreground');
    expect(skeletonCard?.className).toContain('bg-surface');
    expect(skeletonCard?.className).toContain('border-border');
  });
});
