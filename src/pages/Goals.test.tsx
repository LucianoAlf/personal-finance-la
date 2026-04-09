/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Goals } from './Goals';

const useGamificationMock = vi.fn();
const useSettingsMock = vi.fn();
const goalsHookState = {
  goals: [
    {
      id: 'goal-1',
      goal_type: 'savings',
      name: 'Viagem',
      target_amount: 1000,
      current_amount: 250,
      percentage: 25,
      status: 'active',
    },
  ],
  loading: false,
};

vi.mock('@/components/layout/Header', () => ({
  Header: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
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
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('framer-motion', () => ({
  MotionConfig: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGoals', () => ({
  useGoals: () => ({
    goals: goalsHookState.goals,
    loading: goalsHookState.loading,
    getGoalsByType: (type: string) =>
      type === 'savings'
        ? [
            {
              id: 'goal-1',
              goal_type: 'savings',
              name: 'Viagem',
              target_amount: 1000,
              current_amount: 250,
              percentage: 25,
              status: 'active',
            },
          ]
        : [],
    deleteGoal: vi.fn(),
    getGoalById: vi.fn(),
    refreshGoals: vi.fn(),
  }),
}));

vi.mock('@/hooks/useInvestmentGoals', () => ({
  useInvestmentGoals: () => ({
    goals: [],
    loading: false,
    activeGoals: [],
    deleteGoal: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    addContribution: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSpendingGoalsPlanning', () => ({
  useSpendingGoalsPlanning: () => ({
    goals: [],
    planningItems: [],
    heroPlanningItems: [],
    heroSummaryMonth: '2026-04',
    heroTotalPlanned: 0,
    heroTotalActual: 0,
    totalPlanned: 0,
    totalActual: 0,
    totalDifference: 0,
    copyFromPreviousMonth: vi.fn(),
    applySuggestions: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGamification', () => ({
  useGamification: (...args: unknown[]) => useGamificationMock(...args),
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: (...args: unknown[]) => useSettingsMock(...args),
}));

vi.mock('@/hooks/useGoalNotifications', () => ({
  useGoalNotifications: vi.fn(),
}));

vi.mock('@/components/goals/SavingsGoalCard', () => ({
  SavingsGoalCard: () => <div>savings-goal-card-mounted</div>,
}));

vi.mock('@/components/budget/BudgetSummaryCards', () => ({
  BudgetSummaryCards: () => <div>budget-summary-mounted</div>,
}));

vi.mock('@/components/budget/BudgetInsights', () => ({
  BudgetInsights: () => <div>budget-insights-mounted</div>,
}));

vi.mock('@/components/settings/financial/FinancialSettingsCard', () => ({
  FinancialSettingsCard: () => <div>financial-settings-mounted</div>,
}));

vi.mock('@/components/settings/cycles/FinancialCyclesManager', () => ({
  FinancialCyclesManager: () => <div>financial-cycles-mounted</div>,
}));

vi.mock('@/components/gamification/XPProgressBar', () => ({
  XPProgressBar: () => <div>xp-progress-mounted</div>,
}));

vi.mock('@/components/gamification/NextAchievements', () => ({
  NextAchievements: () => <div>next-achievements-mounted</div>,
}));

vi.mock('@/components/gamification/AchievementGrid', () => ({
  AchievementGrid: () => <div>achievement-grid-mounted</div>,
}));

vi.mock('@/components/gamification/GamificationToaster', () => ({
  GamificationToaster: () => <div>gamification-toaster-mounted</div>,
}));

vi.mock('@/components/gamification/AchievementUnlockedModal', () => ({
  AchievementUnlockedModal: () => <div>achievement-modal-mounted</div>,
}));

vi.mock('@/components/gamification/StreakHeatmap', () => ({
  StreakHeatmap: () => <div>streak-heatmap-mounted</div>,
}));

vi.mock('@/components/gamification/GamificationStats', () => ({
  GamificationStats: () => <div>gamification-stats-mounted</div>,
}));

vi.mock('@/components/goals/SpendingGoalCard', () => ({
  SpendingGoalCard: () => <div>spending-goal-card-mounted</div>,
}));

vi.mock('@/components/investment-goals/InvestmentGoalCard', () => ({
  InvestmentGoalCard: () => <div>investment-goal-card-mounted</div>,
}));

vi.mock('@/components/shared/MonthSelector', () => ({
  MonthSelector: () => <div>month-selector-mounted</div>,
}));

vi.mock('@/components/goals/CreateGoalDialog', () => ({
  CreateGoalDialog: () => <div>create-goal-dialog-mounted</div>,
}));

vi.mock('@/components/goals/EditGoalDialog', () => ({
  EditGoalDialog: () => <div>edit-goal-dialog-mounted</div>,
}));

vi.mock('@/components/goals/AddValueDialog', () => ({
  AddValueDialog: () => <div>add-value-dialog-mounted</div>,
}));

vi.mock('@/components/investment-goals/InvestmentGoalDialog', () => ({
  InvestmentGoalDialog: () => <div>investment-goal-dialog-mounted</div>,
}));

vi.mock('@/components/investment-goals/ContributionDialog', () => ({
  ContributionDialog: () => <div>contribution-dialog-mounted</div>,
}));

describe('Goals initial render', () => {
  beforeEach(() => {
    goalsHookState.loading = false;
    goalsHookState.goals = [
      {
        id: 'goal-1',
        goal_type: 'savings',
        name: 'Viagem',
        target_amount: 1000,
        current_amount: 250,
        percentage: 25,
        status: 'active',
      },
    ];

    useGamificationMock.mockReset();
    useGamificationMock.mockReturnValue({
      profile: null,
      badges: [],
      unlockedBadges: [],
      xpForNextLevel: 0,
      xpProgress: 0,
      levelTitle: 'Iniciante',
      loading: false,
      celebrationQueue: [],
      showCelebration: false,
      dismissCelebration: vi.fn(),
    });

    useSettingsMock.mockReset();
    useSettingsMock.mockReturnValue({
      userSettings: null,
      notificationPreferences: null,
      loading: false,
      updateUserSettings: vi.fn(),
      updateNotificationPreferences: vi.fn(),
      refresh: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('does not mount inactive heavy sections or closed dialogs on default savings tab', () => {
    render(
      <MemoryRouter initialEntries={['/metas']}>
        <Goals />
      </MemoryRouter>,
    );

    expect(screen.getByText('savings-goal-card-mounted')).not.toBeNull();
    expect(screen.queryByText('budget-summary-mounted')).toBeNull();
    expect(screen.queryByText('financial-settings-mounted')).toBeNull();
    expect(screen.queryByText('xp-progress-mounted')).toBeNull();
    expect(screen.queryByText('create-goal-dialog-mounted')).toBeNull();
    expect(screen.queryByText('add-value-dialog-mounted')).toBeNull();
    expect(screen.queryByText('edit-goal-dialog-mounted')).toBeNull();
    expect(screen.queryByText('investment-goal-dialog-mounted')).toBeNull();
    expect(screen.queryByText('contribution-dialog-mounted')).toBeNull();
    expect(useGamificationMock).not.toHaveBeenCalled();
    expect(useSettingsMock).not.toHaveBeenCalled();
  });

  it('renders the page shell instead of blocking the full page while goals load', () => {
    goalsHookState.loading = true;
    goalsHookState.goals = [];

    render(
      <MemoryRouter initialEntries={['/metas']}>
        <Goals />
      </MemoryRouter>,
    );

    expect(screen.getByText('Metas Financeiras')).not.toBeNull();
    expect(screen.getByText('Carregando metas...')).not.toBeNull();
    expect(screen.getByText('Economia')).not.toBeNull();
    expect(screen.queryByText('savings-goal-card-mounted')).toBeNull();
  });

  it('uses the premium page shell with semantic summaries and corrected visible copy', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/metas']}>
        <Goals />
      </MemoryRouter>,
    );

    expect(screen.getByText('Metas Financeiras')).not.toBeNull();
    expect(screen.getByText('Metas ativas de patrimônio')).not.toBeNull();
    expect(screen.getByText('Planejamento Mensal')).not.toBeNull();
    expect(screen.getByText('Configurações')).not.toBeNull();
    expect(container.firstElementChild?.className).toContain('bg-background');
  });

  it('renders the progress tab inside a premium shell instead of an old generic card', () => {
    useGamificationMock.mockReturnValue({
      profile: {
        id: 'profile-1',
        user_id: 'user-1',
        level: 3,
        xp: 68,
        total_xp: 450,
        current_streak: 1,
        best_streak: 3,
        total_badges_earned: 2,
        last_activity_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      badges: [],
      unlockedBadges: [],
      xpForNextLevel: 519,
      xpProgress: 13,
      levelTitle: 'Iniciante',
      loading: false,
      celebrationQueue: [],
      showCelebration: false,
      dismissCelebration: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/metas?tab=progress']}>
        <Goals />
      </MemoryRouter>,
    );

    const shell = screen.getByTestId('goals-progress-shell');
    expect(shell.className).toContain('bg-surface');
    expect(shell.className).toContain('rounded-[28px]');
  });
});
