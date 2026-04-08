/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { GoalsSummaryWidget } from '@/components/goals/GoalsSummaryWidget';
import { BudgetComplianceWidget } from '@/components/budget/BudgetComplianceWidget';
import { CreditCardsWidget } from '@/components/creditcards/CreditCardsWidget';
import { InvestmentsWidget } from '@/components/dashboard/InvestmentsWidget';
import { HealthScoreBar } from '@/components/dashboard/HealthScoreBar';
import { AnaInsightCard } from '@/components/dashboard/AnaInsightCard';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { INSIGHT_COLORS } from '@/types/ana-insights.types';

const {
  navigateMock,
  useGoalsQueryMock,
  useCreditCardsQueryMock,
  useInvestmentsQueryMock,
  spendingGoalsForMonthMock,
  budgetItemsMock,
  budgetSummaryMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useGoalsQueryMock: vi.fn(),
  useCreditCardsQueryMock: vi.fn(),
  useInvestmentsQueryMock: vi.fn(),
  spendingGoalsForMonthMock: vi.fn(),
  budgetItemsMock: vi.fn(),
  budgetSummaryMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/hooks/useGoalsQuery', () => ({
  useGoalsQuery: useGoalsQueryMock,
}));

vi.mock('@/hooks/useCreditCardsQuery', () => ({
  useCreditCardsQuery: useCreditCardsQueryMock,
}));

vi.mock('@/hooks/useInvestmentsQuery', () => ({
  useInvestmentsQuery: useInvestmentsQueryMock,
}));

vi.mock('@/utils/spendingGoalPlanning', () => ({
  formatMonthKey: () => '2026-04',
  getSpendingGoalsForMonth: () => spendingGoalsForMonthMock(),
  toBudgetItemsFromSpendingGoals: () => budgetItemsMock(),
  summarizeBudgetItems: () => budgetSummaryMock(),
}));

function renderInTheme(ui: React.ReactElement, theme: 'light' | 'dark' = 'dark') {
  return render(
    <ThemeProvider defaultTheme={theme} storageKey={`dashboard-widget-premium-polish-${theme}`}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>,
  );
}

describe('Dashboard widget premium polish regression', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + 3);
    const upcomingDateIso = upcomingDate.toISOString().slice(0, 10);

    useGoalsQueryMock.mockReturnValue({
      goals: [
        {
          id: 'goal-savings',
          goal_type: 'savings',
          target_amount: 10000,
          current_amount: 6500,
        },
        {
          id: 'goal-spending',
          goal_type: 'spending',
          target_amount: 2500,
          current_amount: 2700,
        },
      ],
      loading: false,
      getStats: () => ({
        total_goals: 4,
        best_streak: 6,
        completed_goals: 2,
        total_savings: 12000,
      }),
    });

    spendingGoalsForMonthMock.mockReturnValue([
      { id: 'food', status: 'active' },
      { id: 'transport', status: 'active' },
      { id: 'leisure', status: 'exceeded' },
    ]);

    budgetItemsMock.mockReturnValue([
      { id: 'food', status: 'ok' },
      { id: 'transport', status: 'warning' },
      { id: 'leisure', status: 'exceeded' },
    ]);

    budgetSummaryMock.mockReturnValue({
      totalPlanned: 2500,
      totalActual: 2700,
      totalDifference: -200,
    });

    useCreditCardsQueryMock.mockReturnValue({
      cards: [
        {
          id: 'card-1',
          name: 'Nubank Ultravioleta',
          color: '#8B5CF6',
          credit_limit: 10000,
          available_limit: 3500,
          current_due_date: upcomingDateIso,
          current_invoice_amount: 2200,
        },
        {
          id: 'card-2',
          name: 'Visa Black',
          color: '#38BDF8',
          credit_limit: 8000,
          available_limit: 4400,
          current_due_date: upcomingDateIso,
          current_invoice_amount: 1400,
        },
      ],
      loading: false,
    });

    useInvestmentsQueryMock.mockReturnValue({
      investments: [
        {
          id: 'asset-1',
          quantity: 10,
          purchase_price: 100,
          current_price: 123,
          total_invested: 1000,
          current_value: 1230,
          status: 'active',
        },
      ],
      loading: false,
    });
  });

  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
    useGoalsQueryMock.mockReset();
    useCreditCardsQueryMock.mockReset();
    useInvestmentsQueryMock.mockReset();
    spendingGoalsForMonthMock.mockReset();
    budgetItemsMock.mockReset();
    budgetSummaryMock.mockReset();
  });

  it('keeps goals and budget widgets on premium dark surfaces with darker rails and readable support labels', async () => {
    const { container: goalsContainer } = renderInTheme(<GoalsSummaryWidget />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    const goalsCard = goalsContainer.firstElementChild as HTMLElement | null;
    const savingsPanel = screen.getByText(/meta de economia ativa|metas de economia ativas/i).closest('div[class*="rounded"]') as HTMLElement | null;
    const savingsRail = savingsPanel?.querySelector('.overflow-hidden') as HTMLElement | null;
    const spendingPanel = screen.getByText(/limites cumpridos neste m[eê]s/i).closest('div[class*="rounded"]') as HTMLElement | null;
    const streakLabel = screen.getByText(/Melhor streak/i);
    const badgesLabel = screen.getByText(/Conquistas desbloqueadas/i);

    expect(goalsCard?.className).toContain('bg-surface');
    expect(goalsCard?.className).toContain('border-border/70');
    expect(savingsPanel?.className).toContain('bg-surface-elevated');
    expect(savingsPanel?.className).not.toMatch(/bg-blue-50|bg-green-50|bg-red-50/);
    expect(savingsRail?.className).toContain('bg-surface-overlay');
    expect(savingsRail?.className).not.toMatch(/bg-blue-200|bg-gray-200/);
    expect(spendingPanel?.className).toContain('bg-surface-elevated');
    expect(spendingPanel?.className).not.toMatch(/bg-green-50|bg-red-50/);
    expect(streakLabel.className).toContain('text-foreground/80');
    expect(badgesLabel.className).toContain('text-foreground/80');

    cleanup();

    renderInTheme(<BudgetComplianceWidget monthKey="2026-04" />);

    const budgetCard = screen.getByText(/Metas de Gasto do M[eê]s/i).closest('.rounded-lg') as HTMLElement | null;
    const complianceLabel = screen.getByText(/Conformidade/i);
    const complianceRail = complianceLabel.parentElement?.nextElementSibling as HTMLElement | null;
    const okTile = screen.getByText('OK').closest('div[class*="rounded"]') as HTMLElement | null;
    const totalLabel = screen.getByText(/Gasto \/ Limite/i);

    expect(budgetCard?.className).toContain('bg-surface');
    expect(budgetCard?.className).toContain('border-border/70');
    expect(complianceLabel.className).toContain('text-foreground/80');
    expect(complianceRail?.className).toContain('bg-surface-overlay');
    expect(complianceRail?.className).not.toContain('bg-gray-200');
    expect(okTile?.className).toContain('bg-surface-elevated');
    expect(okTile?.className).not.toMatch(/bg-green-50|bg-yellow-50|bg-red-50/);
    expect(totalLabel.className).toContain('text-foreground/80');
    expect(totalLabel.className).toContain('dark:text-foreground/80');
  });

  it('removes bright progress rails and washed support text from the credit cards widget', async () => {
    const { container } = renderInTheme(<CreditCardsWidget />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    const root = container.firstElementChild?.firstElementChild as HTMLElement | null;
    const usageLabel = screen.getByText(/Uso Total/i);
    const usageRail = usageLabel.parentElement?.nextElementSibling as HTMLElement | null;
    const usageSupport = screen.getAllByText(/de R\$/i)[0];
    const dueAlert = screen.getByText(/vencimento/i).closest('div[class*="rounded"]') as HTMLElement | null;
    const cardRow = screen.getAllByText('Nubank Ultravioleta').at(-1)?.closest('div[class*="cursor-pointer"]') as HTMLElement | null;
    const cardRail = cardRow?.querySelector('.rounded-full.h-1') as HTMLElement | null;

    expect(root?.className).toContain('bg-surface');
    expect(root?.className).toContain('border-border/70');
    expect(usageLabel.className).toContain('text-foreground/80');
    expect(usageRail?.className).toContain('bg-surface-overlay');
    expect(usageRail?.className).not.toContain('bg-gray-200');
    expect(usageSupport.className).toContain('text-foreground/75');
    expect(dueAlert?.className).toContain('bg-surface-elevated');
    expect(dueAlert?.className).not.toContain('bg-yellow-50');
    expect(cardRow?.className).toContain('bg-surface-elevated');
    expect(cardRail?.className).toContain('bg-surface-overlay');
    expect(dueAlert?.className).toContain('dark:bg-surface-elevated');
  });

  it('keeps ana cards and health score bars inside the premium dark system without forcing dark slabs into light mode', async () => {
    const insight = {
      priority: 'celebration' as const,
      type: 'goal_achievement' as const,
      headline: 'Reserva blindada',
      description: 'Sua reserva segue acima da meta e continua protegendo o caixa.',
      action: {
        label: 'Ver metas',
        route: '/metas',
      },
      visualization: {
        type: 'progress' as const,
        data: {
          percentage: 72,
        },
      },
    };

    const { container: insightContainer } = renderInTheme(<AnaInsightCard insight={insight} size="large" />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    const insightCard = insightContainer.querySelector('.rounded-lg') as HTMLElement | null;
    const insightIconPill = screen.getByText('Reserva blindada').previousElementSibling as HTMLElement | null;
    const insightDescription = screen.getByText(/Sua reserva segue acima da meta/i);
    const insightProgressRail = screen.getByText(/Progresso/i).parentElement?.nextElementSibling as HTMLElement | null;

    expect(insightCard?.className).toContain('border-border/70');
    expect(insightCard?.className).not.toMatch(/from-purple-50|from-pink-50|from-amber-50|from-orange-50|from-red-50|from-blue-50/);
    expect(insightIconPill?.className).toContain('bg-surface-elevated');
    expect(insightIconPill?.className).not.toContain('bg-white/50');
    expect(insightDescription.className).toContain('text-foreground/80');
    expect(insightProgressRail?.className).toContain('bg-surface-overlay');
    expect(insightProgressRail?.className).not.toContain('bg-gray-200');
    expect(insightCard?.className).toContain('dark:bg-[');
    expect(insightCard?.className).toContain('dark:shadow-[');

    cleanup();

    const { container: healthContainer } = renderInTheme(
      <HealthScoreBar
        score={72}
        label="Health Score"
        defaultExpanded
        breakdown={{
          bills: 24,
          investments: 22,
          budget: 14,
          planning: 12,
        }}
      />,
    );

    const healthCard = healthContainer.querySelector('.rounded-lg') as HTMLElement | null;
    const mainRail = healthContainer.querySelector('.h-3.overflow-hidden') as HTMLElement | null;
    const breakdownRail = healthContainer.querySelector('.h-1\\.5.overflow-hidden') as HTMLElement | null;
    const label = screen.getByText('Health Score');
    const breakdownLabel = screen.getByText(/Contas em Dia/i);

    expect(healthCard?.className).toContain('bg-surface');
    expect(healthCard?.className).toContain('border-border/70');
    expect(label.className).toContain('text-foreground/80');
    expect(mainRail?.className).toContain('bg-surface-overlay');
    expect(mainRail?.className).not.toContain('bg-gray-200');
    expect(breakdownLabel.className).toContain('text-foreground/80');
    expect(breakdownRail?.className).toContain('bg-surface-overlay');
    expect(breakdownRail?.className).not.toContain('bg-gray-200');

    cleanup();

    renderInTheme(<AnaInsightCard insight={insight} size="large" />, 'light');

    const lightInsightCard = screen.getByText('Reserva blindada').closest('.rounded-lg') as HTMLElement | null;
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(INSIGHT_COLORS.celebration.bg).toContain('dark:bg-[');
    expect(INSIGHT_COLORS.celebration.bg).toContain('rgba(255,255,255,0.96)');
    expect(INSIGHT_COLORS.celebration.bg).toContain('dark:bg-[linear-gradient');
    expect(lightInsightCard?.className).toContain('rgba(255,255,255,0.96)');
    expect(lightInsightCard?.className).toContain('dark:bg-[linear-gradient');
  });

  it('improves investment support-text contrast without reintroducing light cards', async () => {
    const { container } = renderInTheme(<InvestmentsWidget />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    const root = container.firstElementChild as HTMLElement | null;
    const supportLabel = screen.getByText(/Valor Atual/i);
    const returnStrip = screen.getByText(/\+23\.00%/i).closest('div[class*="rounded"]') as HTMLElement | null;
    const investedSupport = screen.getByText(/investido/i);

    expect(root?.className).toContain('bg-surface');
    expect(root?.className).toContain('border-border/70');
    expect(supportLabel.className).toContain('text-foreground/80');
    expect(returnStrip?.className).toContain('bg-surface-elevated');
    expect(returnStrip?.className).not.toContain('bg-gray-50');
    expect(investedSupport.className).toContain('text-foreground/75');
    expect(returnStrip?.className).toContain('dark:bg-surface-elevated');
  });
});
