import { useMemo, useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Target, PiggyBank, Shield, Flame, AlertTriangle, Trophy, Zap, Copy, Sparkles, Settings, ChevronDown, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import { motion, MotionConfig } from 'framer-motion';
import { useGoals } from '@/hooks/useGoals';
import { useSearchParams } from 'react-router-dom';
import { useGoalNotifications } from '@/hooks/useGoalNotifications';
import { SlidingPillTabs } from '@/components/ui/sliding-pill-tabs';
import { useGoalsActiveTab, type GoalsTab } from '@/hooks/useGoalsActiveTab';
import { GoalsHeroCard } from '@/components/goals/GoalsHeroCard';
import { SavingsGoalCardList } from '@/components/goals/SavingsGoalCardList';
import { SpendingGoalCardList } from '@/components/goals/SpendingGoalCardList';
import { SpendingMonthSelector } from '@/components/goals/SpendingMonthSelector';
import { InvestmentGoalCardList, type InvestmentGoalItem } from '@/components/goals/InvestmentGoalCardList';
import { GamificationMobileLayout, type Achievement } from '@/components/goals/GamificationMobileLayout';
import { GoalsConfigMobileLayout, type ConfigSection } from '@/components/goals/GoalsConfigMobileLayout';
import { format as formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SpendingGoalCard } from '@/components/goals/SpendingGoalCard';
import { CreateGoalDialog } from '@/components/goals/CreateGoalDialog';
import { EditGoalDialog } from '@/components/goals/EditGoalDialog';
import { AddValueDialog } from '@/components/goals/AddValueDialog';
import { XPProgressBar } from '@/components/gamification/XPProgressBar';
import { NextAchievements } from '@/components/gamification/NextAchievements';
import { AchievementGrid } from '@/components/gamification/AchievementGrid';
import { GamificationToaster } from '@/components/gamification/GamificationToaster';
import { AchievementUnlockedModal } from '@/components/gamification/AchievementUnlockedModal';
import { StreakHeatmap } from '@/components/gamification/StreakHeatmap';
import { GamificationStats } from '@/components/gamification/GamificationStats';
import { getAchievementById, ACHIEVEMENTS } from '@/config/achievements';
import { useToast } from '@/hooks/use-toast';
import type { FinancialGoalWithCategory } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import { MonthSelector } from '@/components/shared/MonthSelector';
import { BudgetSummaryCards } from '@/components/budget/BudgetSummaryCards';
import { BudgetInsights } from '@/components/budget/BudgetInsights';
import { SavingsGoalCard } from '@/components/goals/SavingsGoalCard';
import { FinancialCyclesManager } from '@/components/settings/cycles/FinancialCyclesManager';
import { FinancialSettingsCard } from '@/components/settings/financial/FinancialSettingsCard';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useInvestmentGoals } from '@/hooks/useInvestmentGoals';
import { InvestmentGoalCard } from '@/components/investment-goals/InvestmentGoalCard';
import { InvestmentGoalDialog } from '@/components/investment-goals/InvestmentGoalDialog';
import { ContributionDialog } from '@/components/investment-goals/ContributionDialog';
import { useSpendingGoalsPlanning } from '@/hooks/useSpendingGoalsPlanning';
import type { BudgetAllocation, NotificationPreferences, UserSettings } from '@/types/settings.types';
import { useGamification } from '@/hooks/useGamification';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/cn';

const DEFAULT_BUDGET_ALLOCATION: BudgetAllocation = {
  essentials: 50,
  investments: 20,
  leisure: 20,
  others: 10,
};

interface FinancialSettingsDraft {
  savingsGoalPercentage: number;
  closingDay: number;
  budgetAllocation: BudgetAllocation;
  budgetAlertThreshold: number;
}

function buildFinancialSettingsDraft(
  userSettings: UserSettings | null,
  notificationPreferences: NotificationPreferences | null
): FinancialSettingsDraft {
  return {
    savingsGoalPercentage: userSettings?.monthly_savings_goal_percentage ?? 20,
    closingDay: userSettings?.monthly_closing_day ?? 1,
    budgetAllocation: userSettings?.budget_allocation ?? DEFAULT_BUDGET_ALLOCATION,
    budgetAlertThreshold:
      notificationPreferences?.budget_alert_threshold_percentage ??
      userSettings?.budget_alert_threshold ??
      80,
  };
}

function buildBudgetThresholds(
  primaryThreshold: number,
  notificationPreferences: NotificationPreferences | null
) {
  const preservedHigherThresholds =
    notificationPreferences?.budget_alert_thresholds?.filter((value) => value > primaryThreshold) ?? [];

  return Array.from(new Set([primaryThreshold, ...preservedHigherThresholds, 100]))
    .filter((value) => value >= 50 && value <= 100)
    .sort((a, b) => a - b);
}

interface GoalsProgressContentProps {
  active: boolean;
  totalGoalCount: number;
  activeGoalCount: number;
  successRate: number;
}

type SummaryGradient = 'blue' | 'orange' | 'purple' | 'green';

interface GoalsSummaryCardProps {
  title: string;
  subtitle: string;
  value: string;
  valueSuffix?: string;
  icon: LucideIcon;
  gradient: SummaryGradient;
  loading?: boolean;
  metrics: Array<{
    label: string;
    value: string;
    tone?: 'default' | 'success' | 'warning' | 'danger';
    icon?: LucideIcon;
  }>;
}

const summaryAccentStyles: Record<
  SummaryGradient,
  {
    line: string;
    glow: string;
    ring: string;
    icon: string;
    value: string;
  }
> = {
  blue: {
    line: 'via-sky-300/80',
    glow: 'bg-sky-400/12',
    ring: 'ring-sky-300/20',
    icon: 'from-sky-500 to-blue-600',
    value: 'text-foreground',
  },
  orange: {
    line: 'via-amber-300/80',
    glow: 'bg-amber-400/12',
    ring: 'ring-amber-300/20',
    icon: 'from-amber-500 to-orange-600',
    value: 'text-foreground',
  },
  purple: {
    line: 'via-primary/80',
    glow: 'bg-primary/12',
    ring: 'ring-primary/20',
    icon: 'from-violet-500 to-purple-600',
    value: 'text-foreground',
  },
  green: {
    line: 'via-emerald-300/80',
    glow: 'bg-emerald-400/12',
    ring: 'ring-emerald-300/20',
    icon: 'from-emerald-500 to-teal-600',
    value: 'text-foreground',
  },
};

const goalsTabsListClassName =
  'mb-6 grid h-auto w-full grid-cols-5 rounded-[1.4rem] border border-border/70 bg-card/95 p-1 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_42px_rgba(2,6,23,0.24)]';

const goalsTabsTriggerClassName =
  'flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15';

function GoalsSummaryCard({
  title,
  subtitle,
  value,
  valueSuffix,
  icon: Icon,
  gradient,
  loading = false,
  metrics,
}: GoalsSummaryCardProps) {
  const accent = summaryAccentStyles[gradient];
  const shouldStackValueSuffix = Boolean(valueSuffix?.trim().startsWith('/'));

  return (
    <Card className="group relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-surface/92 p-6 shadow-[0_18px_38px_rgba(8,15,32,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:bg-surface-elevated/90 dark:shadow-[0_20px_40px_rgba(2,6,23,0.28)]">
      <div
        className={cn(
          'absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-80',
          accent.line
        )}
      />
      <div className={cn('absolute -right-10 top-4 h-24 w-24 rounded-full blur-3xl', accent.glow)} />

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="max-w-[15rem] text-[0.87rem] leading-snug text-muted-foreground">{subtitle}</p>
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ring-1 shadow-[0_14px_24px_rgba(5,10,24,0.22)]',
            accent.ring,
            accent.icon
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-9 w-40 animate-pulse rounded-full bg-surface-elevated" />
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded-full bg-surface-elevated" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-surface-elevated" />
          </div>
        </div>
      ) : (
        <>
          <div
            className={cn(
              'mb-5 min-w-0',
              shouldStackValueSuffix ? 'space-y-1' : 'flex items-end gap-2'
            )}
          >
            <span
              className={cn(
                shouldStackValueSuffix ? 'block' : 'shrink-0',
                'text-[1.62rem] font-semibold leading-tight tracking-tight sm:text-[1.78rem]',
                accent.value
              )}
            >
              {value}
            </span>
            {valueSuffix ? (
              <span
                className={cn(
                  'max-w-full font-medium leading-snug text-muted-foreground',
                  shouldStackValueSuffix ? 'block text-[0.9rem]' : 'pb-1 text-base'
                )}
              >
                {valueSuffix}
              </span>
            ) : null}
          </div>

          <div className="space-y-2.5 border-t border-border/60 pt-4">
            {metrics.map(({ label, value: metricValue, tone = 'default', icon: MetricIcon }) => (
              <div key={label} className="flex items-center justify-between gap-3 text-[0.8rem]">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  {MetricIcon ? <MetricIcon className="h-4 w-4" /> : null}
                  {label}
                </span>
                <span
                  className={cn(
                    'text-[0.82rem] font-medium',
                    tone === 'default' && 'text-foreground/78',
                    tone === 'success' && 'text-success/90',
                    tone === 'warning' && 'text-warning/90',
                    tone === 'danger' && 'text-danger/90'
                  )}
                >
                  {metricValue}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function GoalsProgressContent({
  active,
  totalGoalCount,
  activeGoalCount,
  successRate,
}: GoalsProgressContentProps) {
  const {
    profile,
    badges,
    unlockedBadges,
    xpForNextLevel,
    xpProgress,
    levelTitle,
    loading: gamificationLoading,
    celebrationQueue,
    showCelebration,
    dismissCelebration,
  } = useGamification();

  const content = (
    <>
        {gamificationLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando progresso...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {profile && (
              <XPProgressBar
                level={profile.level}
                xp={profile.xp}
                xpForNextLevel={xpForNextLevel}
                levelTitle={levelTitle}
                totalXP={profile.total_xp}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <NextAchievements badges={badges} />
              </div>
              <div>
                <div
                  data-testid="goals-progress-shell"
                  className="rounded-[28px] border border-border/70 bg-surface/92 p-6 shadow-[0_20px_42px_rgba(8,15,32,0.16)]"
                >
                  <StreakHeatmap
                    currentStreak={profile?.current_streak ?? 0}
                    bestStreak={profile?.best_streak ?? 0}
                    lastActivityDate={profile?.last_activity_date ?? null}
                    subtitle="Resumo visual do streak diário baseado na última atividade real registrada no app. Não representa histórico mensal."
                  />
                  <div className="my-5 border-t border-border/60" />
                  <GamificationStats
                    profile={profile}
                    unlockedBadgesCount={unlockedBadges.length}
                    totalBadges={ACHIEVEMENTS.length}
                    levelTitle={levelTitle}
                    xpForNextLevel={xpForNextLevel}
                    xpProgress={xpProgress}
                    totalGoals={totalGoalCount}
                    activeGoals={activeGoalCount}
                    successRate={successRate}
                  />
                </div>
              </div>
            </div>

            <AchievementGrid badges={badges} />
          </div>
        )}
    </>
  );

  return (
    <>
      {active ? (
        <TabsContent value="progress">{content}</TabsContent>
      ) : (
        <div className="hidden" aria-hidden="true">
          {content}
        </div>
      )}

      <GamificationToaster />

      {celebrationQueue && celebrationQueue.length > 0 && (() => {
        const current = celebrationQueue[0];
        const achievement = getAchievementById(current.badge_id);
        if (!achievement) return null;
        return (
          <AchievementUnlockedModal
            open={showCelebration}
            onOpenChange={(open) => {
              if (!open) dismissCelebration();
            }}
            achievementName={achievement.name}
            achievementDescription={achievement.description}
            tier={current.tier}
            xpReward={Number(current.xp_reward || achievement.tiers.find(t => t.tier === current.tier)?.xp_reward || 0)}
            icon={achievement.icon}
          />
        );
      })()}
    </>
  );
}

function GoalsConfigContent() {
  const { toast } = useToast();
  const {
    userSettings,
    notificationPreferences,
    loading: settingsLoading,
    updateUserSettings,
    updateNotificationPreferences,
    refresh: refreshSettings,
  } = useSettings();
  const [financialSettingsDraft, setFinancialSettingsDraft] = useState<FinancialSettingsDraft>(
    buildFinancialSettingsDraft(null, null)
  );
  const [isSavingFinancialSettings, setIsSavingFinancialSettings] = useState(false);

  const persistedFinancialSettings = useMemo(
    () => buildFinancialSettingsDraft(userSettings, notificationPreferences),
    [notificationPreferences, userSettings]
  );

  useEffect(() => {
    if (!settingsLoading && userSettings && notificationPreferences) {
      setFinancialSettingsDraft(persistedFinancialSettings);
    }
  }, [notificationPreferences, persistedFinancialSettings, settingsLoading, userSettings]);

  const isFinancialSettingsDirty = useMemo(
    () => JSON.stringify(financialSettingsDraft) !== JSON.stringify(persistedFinancialSettings),
    [financialSettingsDraft, persistedFinancialSettings]
  );

  const handleSaveFinancialSettings = async () => {
    const allocationTotal =
      financialSettingsDraft.budgetAllocation.essentials +
      financialSettingsDraft.budgetAllocation.investments +
      financialSettingsDraft.budgetAllocation.leisure +
      financialSettingsDraft.budgetAllocation.others;

    if (allocationTotal !== 100) {
      toast({
        title: 'Alocação inválida',
        description: 'A soma da alocação do planejamento deve ser exatamente 100%.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingFinancialSettings(true);

    try {
      await Promise.all([
        updateUserSettings(
          {
            monthly_savings_goal_percentage: financialSettingsDraft.savingsGoalPercentage,
            monthly_closing_day: financialSettingsDraft.closingDay,
            budget_allocation: financialSettingsDraft.budgetAllocation,
          },
          { showSuccessToast: false }
        ),
        updateNotificationPreferences(
          {
            budget_alert_threshold_percentage: financialSettingsDraft.budgetAlertThreshold,
            budget_alert_thresholds: buildBudgetThresholds(
              financialSettingsDraft.budgetAlertThreshold,
              notificationPreferences
            ),
          },
          { showSuccessToast: false }
        ),
      ]);

      await refreshSettings();

      toast({
        title: 'Configurações financeiras salvas',
        description: 'A Ana Clara, os alertas e o planejamento já usam essas preferências atualizadas.',
      });
    } catch {
      await refreshSettings();
    } finally {
      setIsSavingFinancialSettings(false);
    }
  };

  return (
    <TabsContent value="config">
      <div className="space-y-6">
        <FinancialSettingsCard
          savingsGoal={financialSettingsDraft.savingsGoalPercentage}
          onSavingsGoalChange={(value) =>
            setFinancialSettingsDraft((current) => ({
              ...current,
              savingsGoalPercentage: Math.min(100, Math.max(0, value)),
            }))
          }
          closingDay={financialSettingsDraft.closingDay}
          onClosingDayChange={(value) =>
            setFinancialSettingsDraft((current) => ({
              ...current,
              closingDay: Math.min(28, Math.max(1, value)),
            }))
          }
          budgetAllocation={financialSettingsDraft.budgetAllocation}
          onBudgetAllocationChange={(allocation) =>
            setFinancialSettingsDraft((current) => ({ ...current, budgetAllocation: allocation }))
          }
          budgetAlertThreshold={financialSettingsDraft.budgetAlertThreshold}
          onBudgetAlertThresholdChange={(threshold) =>
            setFinancialSettingsDraft((current) => ({
              ...current,
              budgetAlertThreshold: Math.min(100, Math.max(50, threshold)),
            }))
          }
          isLoading={settingsLoading && (!userSettings || !notificationPreferences)}
          isSaving={isSavingFinancialSettings}
          isDirty={isFinancialSettingsDirty}
          onSave={handleSaveFinancialSettings}
          onReset={() => setFinancialSettingsDraft(persistedFinancialSettings)}
        />

        <FinancialCyclesManager />
      </div>
    </TabsContent>
  );
}

export function Goals() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { goals, loading, getGoalsByType, deleteGoal, getGoalById, refreshGoals } = useGoals();
  const { goals: investmentGoals, loading: investmentLoading, activeGoals: activeInvestmentGoals, deleteGoal: deleteInvestmentGoal, createGoal: createInvestmentGoal, updateGoal: updateInvestmentGoal, addContribution } = useInvestmentGoals();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [defaultGoalType, setDefaultGoalType] = useState<'savings' | 'spending_limit'>('savings');
  const [addValueDialogOpen, setAddValueDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoalWithCategory | null>(null);
  const [activeTab, setActiveTab] = useGoalsActiveTab((() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'budget') return 'spending';
    if (tabParam === 'spending' || tabParam === 'investments' || tabParam === 'progress' || tabParam === 'config') {
      return tabParam as GoalsTab;
    }
    return 'savings';
  })());
  const [selectedPlanningDate, setSelectedPlanningDate] = useState<Date>(new Date());
  const [createDialogAllowedTypes, setCreateDialogAllowedTypes] = useState<Array<'savings' | 'spending_limit'>>(['savings', 'spending_limit']);
  const [createDialogSource, setCreateDialogSource] = useState<'default' | 'planning'>('default');
  const [createDialogExcludedCategoryIds, setCreateDialogExcludedCategoryIds] = useState<string[]>([]);
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [selectedInvestmentGoal, setSelectedInvestmentGoal] = useState<any>(null);
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [goalToContribute, setGoalToContribute] = useState<any>(null);
  const [shouldWarmProgressTab, setShouldWarmProgressTab] = useState(false);

  useEffect(() => {
    if (searchParams.get('tab') === 'budget') {
      setSearchParams({ tab: 'spending' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (activeTab === 'progress' || shouldWarmProgressTab) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldWarmProgressTab(true);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, shouldWarmProgressTab]);

  const selectedMonthStr = useMemo(() => {
    const y = selectedPlanningDate.getFullYear();
    const m = String(selectedPlanningDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [selectedPlanningDate]);

  const heroPlanningMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const {
    goals: monthlySpendingGoals,
    planningItems,
    heroPlanningItems,
    heroSummaryMonth,
    heroTotalPlanned,
    heroTotalActual,
    totalPlanned,
    totalActual,
    totalDifference,
    copyFromPreviousMonth,
    applySuggestions,
  } = useSpendingGoalsPlanning({
    month: selectedMonthStr,
    heroSummaryMonth: heroPlanningMonthStr,
    goals,
    refreshGoals,
  });

  // Hook de notificações
  useGoalNotifications({ goals });

  const savingsGoals = getGoalsByType('savings');
  const spendingGoals = getGoalsByType('spending_limit');
  const spendingGoalsBestStreak = spendingGoals.length
    ? Math.max(0, ...spendingGoals.map((g) => g.best_streak))
    : 0;

  // Métricas derivadas para Hero e Segmented Control
  const totalSavingsTarget = savingsGoals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalSavingsCurrent = savingsGoals.reduce((sum, g) => sum + g.current_amount, 0);
  const avgSavingsProgress = savingsGoals.length > 0
    ? Math.round(savingsGoals.reduce((sum, g) => sum + (g.percentage || 0), 0) / savingsGoals.length)
    : 0;

  const limitsComplied = spendingGoals.filter(g => g.status === 'active').length;
  const limitsExceeded = spendingGoals.filter(g => g.status === 'exceeded').length;
  const attentionCategory = spendingGoals.reduce<FinancialGoalWithCategory | null>((acc, g) => {
    if (!acc) return g;
    return (g.percentage || 0) > (acc.percentage || 0) ? g : acc;
  }, spendingGoals[0] || null);

  const totalGoalCount = goals.length + investmentGoals.length;
  const activeGoalCount =
    goals.filter((goal) => goal.status === 'active').length +
    investmentGoals.filter((goal) => goal.status === 'active').length;
  const completedGoalCount =
    goals.filter((goal) => goal.status === 'completed').length +
    investmentGoals.filter((goal) => goal.status === 'completed').length;
  const successRate = totalGoalCount > 0
    ? Math.round((completedGoalCount / totalGoalCount) * 100)
    : 0;

  const investmentHero = useMemo(() => {
    const active = activeInvestmentGoals ?? [];
    const count = active.length;
    if (count === 0) {
      return { count: 0, totalCurrent: 0, totalTarget: 0, avgProgress: 0, onTrackCount: 0 };
    }
    const totalTarget = active.reduce((s, g) => s + Number(g.target_amount || 0), 0);
    const totalCurrent = active.reduce(
      (s, g) => s + Number(g.metrics?.effective_current_amount ?? g.current_amount ?? 0),
      0
    );
    const avgProgress = Math.round(
      active.reduce((s, g) => s + Number(g.metrics?.percentage ?? 0), 0) / count
    );
    const onTrackCount = active.filter((g) => g.metrics?.is_on_track).length;
    return { count, totalCurrent, totalTarget, avgProgress, onTrackCount };
  }, [activeInvestmentGoals]);

  const heroPlanningUsagePct =
    heroTotalPlanned > 0 ? Math.min(100, Math.round((heroTotalActual / heroTotalPlanned) * 100)) : 0;

  // --- Mobile mappings ---
  const mobileMonthLabel = useMemo(
    () => formatDate(new Date(), 'MMMM yyyy', { locale: ptBR }),
    [],
  );

  const mobileSavingsGoals = useMemo(
    () => goals.filter((g) => g.goal_type === 'savings'),
    [goals],
  );
  const mobileSpendingGoals = useMemo(
    () => goals.filter((g) => g.goal_type === 'spending_limit'),
    [goals],
  );

  const mobileSavingsCurrentTotal = mobileSavingsGoals.reduce(
    (acc, g) => acc + (g.current_amount ?? 0),
    0,
  );
  const mobileSavingsTargetTotal = mobileSavingsGoals.reduce(
    (acc, g) => acc + (g.target_amount ?? 0),
    0,
  );
  const mobileSpendingLimitsOkCount = mobileSpendingGoals.filter(
    (g) => (g.percentage ?? 0) <= 100,
  ).length;
  const mobileSpendingLimitsTotal = mobileSpendingGoals.length;
  const mobileInvestmentsCurrentTotal = (investmentGoals ?? []).reduce(
    (acc, g) => acc + Number(g.current_amount ?? 0),
    0,
  );
  const mobileInvestmentsTargetTotal = (investmentGoals ?? []).reduce(
    (acc, g) => acc + Number(g.target_amount ?? 0),
    0,
  );
  // useGamification is called inside GoalsProgressContent, not at page level.
  // For mobile we derive streak from spendingGoals best_streak as a proxy.
  const mobileCurrentStreakDays = spendingGoalsBestStreak;

  const mobileInvestmentGoalItems = useMemo<InvestmentGoalItem[]>(
    () =>
      (investmentGoals ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon ?? null,
        target_amount: Number(g.target_amount ?? 0),
        current_amount: Number(
          g.current_amount ?? g.metrics?.effective_current_amount ?? 0,
        ),
        percentage: Number(g.metrics?.percentage ?? g.percentage ?? 0),
      })),
    [investmentGoals],
  );

  const handleInvestmentGoalTap = (goal: InvestmentGoalItem) => {
    navigate(`/investimentos?goalId=${goal.id}`);
  };

  // TODO: extract FinancialSettingsCard + FinancialCyclesManager into section children
  // when GoalsConfigContent is refactored into lift-able sub-components.
  const mobileConfigSections = useMemo<ConfigSection[]>(() => [], []);

  const handleEditGoal = (goal: FinancialGoalWithCategory) => {
    setSelectedGoal(goal);
    setEditDialogOpen(true);
  };

  const handleAddValueClick = (goal: FinancialGoalWithCategory) => {
    setSelectedGoal(goal);
    setAddValueDialogOpen(true);
  };

  const mobileAchievements = useMemo<Achievement[]>(() => [], []);
  // Mobile gamification fields are not available at page scope (hook lives in GoalsProgressContent).
  // They are passed as zeroed defaults; the desktop tab remains the full gamification view.
  const mobileGamificationLevel = 1;
  const mobileGamificationLevelName = '';
  const mobileGamificationXp = 0;
  const mobileGamificationXpToNext = 0;
  const mobileGamificationXpPct = 0;

  const handleEdit = (goal: FinancialGoalWithCategory) => {
    setSelectedGoal(goal);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      await deleteGoal(id);
    }
  };

  const handleAddValue = (goal: FinancialGoalWithCategory) => {
    setSelectedGoal(goal);
    setAddValueDialogOpen(true);
  };

  // Ações do Header
  const openSavingsFromHeader = () => {
    setActiveTab('savings');
    setDefaultGoalType('savings');
    setCreateDialogAllowedTypes(['savings']);
    setCreateDialogSource('default');
    setCreateDialogExcludedCategoryIds([]);
    setCreateDialogOpen(true);
  };

  const openSpendingFromHeader = () => {
    setActiveTab('spending');
    setDefaultGoalType('spending_limit');
    setCreateDialogAllowedTypes(['spending_limit']);
    setCreateDialogSource('default');
    setCreateDialogExcludedCategoryIds([]);
    setCreateDialogOpen(true);
  };

  const openSpendingPlanningDialog = () => {
    setActiveTab('spending');
    setDefaultGoalType('spending_limit');
    setCreateDialogAllowedTypes(['spending_limit']);
    setCreateDialogSource('planning');
    setCreateDialogExcludedCategoryIds(planningItems.map((item) => item.category_id));
    setCreateDialogOpen(true);
  };

  const openInvestmentsFromHeader = () => {
    setActiveTab('investments');
    setSelectedInvestmentGoal(null);
    setInvestmentDialogOpen(true);
  };

  const handleSaveInvestmentGoal = async (input: any) => {
    if (selectedInvestmentGoal) {
      // Editar meta existente
      return await updateInvestmentGoal(selectedInvestmentGoal.id, input);
    } else {
      // Criar nova meta
      const result = await createInvestmentGoal(input);
      return result !== null;
    }
  };

  const handleEditInvestmentGoal = (goal: any) => {
    setSelectedInvestmentGoal(goal);
    setInvestmentDialogOpen(true);
  };

  const handleContributeToGoal = (goal: any) => {
    setGoalToContribute(goal);
    setContributionDialogOpen(true);
  };

  const handleOpenInvestmentPortfolio = (goal: any) => {
    navigate(`/investimentos?goalId=${goal.id}`);
  };

  // Sincronizar activeTab com URL
  const handleTabChange = (newTab: string) => {
    const normalizedTab = newTab === 'budget' ? 'spending' : newTab;
    setActiveTab(normalizedTab as GoalsTab);
    setSearchParams({ tab: normalizedTab });
  };
  const showPageShell = loading;

  const primaryButtonClass =
    'rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] hover:bg-primary/90';

  const secondaryButtonClass =
    'rounded-xl border-border/70 bg-surface/85 px-4 shadow-sm hover:bg-surface-elevated dark:bg-surface-elevated/80 dark:hover:bg-surface-overlay';

  const savingsOverviewMetrics = [
    { label: 'Metas ativas', value: `${savingsGoals.length}` },
    { label: 'Progresso médio', value: `${avgSavingsProgress}%` },
  ];

  const spendingOverviewMetrics = [
    {
      label: 'Melhor streak',
      value:
        spendingGoals.length === 0
          ? '—'
          : `${spendingGoalsBestStreak} ${spendingGoalsBestStreak === 1 ? 'mês' : 'meses'}`,
      icon: Flame,
      tone: 'warning' as const,
    },
    attentionCategory
      ? {
          label: 'Atenção',
          value: `${attentionCategory.category_name || attentionCategory.name} (${attentionCategory.percentage}%)`,
          icon: AlertTriangle,
          tone: 'danger' as const,
        }
      : { label: 'Categorias no limite', value: `${limitsComplied}/${spendingGoals.length || 0}` },
  ];

  const investmentsOverviewMetrics = [
    { label: 'Metas ativas', value: `${investmentHero.count}` },
    { label: 'Progresso médio', value: `${investmentHero.avgProgress}%` },
    {
      label: 'No caminho',
      value: `${investmentHero.onTrackCount} de ${investmentHero.count}`,
      tone: 'success' as const,
    },
  ];

  const planningOverviewMetrics = [
    { label: 'Uso dos limites', value: heroTotalPlanned > 0 ? `${heroPlanningUsagePct}%` : '—' },
    { label: 'Categorias no mês', value: `${heroPlanningItems.length}` },
  ];

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.08),transparent_34%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.06),transparent_28%)]" />
      <Header
        title="Metas Financeiras"
        subtitle="Acompanhe seus objetivos e controle seus gastos"
        icon={<Target size={24} />}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className={primaryButtonClass}>
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nova Meta</span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 rounded-2xl border-border/70 bg-surface/95 shadow-[0_24px_48px_rgba(2,6,23,0.28)]">
              <DropdownMenuItem onClick={openSavingsFromHeader}>
                <PiggyBank className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">Meta de Economia</div>
                  <div className="text-xs text-muted-foreground">Economizar para um objetivo</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openSpendingFromHeader}>
                <Shield className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">Meta de Gasto</div>
                  <div className="text-xs text-muted-foreground">Limitar gastos por categoria</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openInvestmentsFromHeader}>
                <TrendingUp className="h-4 w-4 mr-2 text-purple-500" />
                <div>
                  <div className="font-medium">Meta de Investimento</div>
                  <div className="text-xs text-muted-foreground">Crescer patrimônio com rentabilidade</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="relative space-y-6 p-6">
        {showPageShell ? (
          <>
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card
                  key={index}
                  className="h-full animate-pulse rounded-[1.75rem] border-border/70 bg-surface/92 p-6 shadow-[0_18px_38px_rgba(8,15,32,0.12)]"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-surface-elevated" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 rounded-full bg-surface-elevated" />
                      <div className="h-3 w-32 rounded-full bg-surface-elevated/80" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-8 w-36 rounded-full bg-surface-elevated" />
                    <div className="h-3 w-full rounded-full bg-surface-elevated/80" />
                    <div className="h-3 w-2/3 rounded-full bg-surface-elevated/80" />
                  </div>
                </Card>
              ))}
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
              <TabsList className={goalsTabsListClassName}>
                <TabsTrigger value="savings" className={goalsTabsTriggerClassName}>
                  <PiggyBank className="h-4 w-4" />
                  Economia
                </TabsTrigger>
                <TabsTrigger value="spending" className={goalsTabsTriggerClassName}>
                  <Shield className="h-4 w-4" />
                  Gastos
                </TabsTrigger>
                <TabsTrigger value="investments" className={goalsTabsTriggerClassName}>
                  <TrendingUp className="h-4 w-4" />
                  Investimentos
                </TabsTrigger>
                <TabsTrigger value="progress" className={goalsTabsTriggerClassName}>
                  <Zap className="h-4 w-4" />
                  Progresso
                </TabsTrigger>
                <TabsTrigger value="config" className={goalsTabsTriggerClassName}>
                  <Settings className="h-4 w-4" />
                  Configurações
                </TabsTrigger>
              </TabsList>

              <Card className="rounded-[1.8rem] border-border/70 bg-surface/92 p-10 shadow-[0_18px_38px_rgba(8,15,32,0.12)]">
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary" />
                  <span>Carregando metas...</span>
                </div>
              </Card>
            </Tabs>
          </>
        ) : (
          <>
            {/* Desktop-only: summary cards + Radix Tabs */}
            <div className="hidden lg:block">
            {/* Hero: visão geral (mês atual para orçamento) */}
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <GoalsSummaryCard
                title="Economia"
                subtitle="Total economizado"
                value={formatCurrency(totalSavingsCurrent)}
                valueSuffix={totalSavingsTarget > 0 ? `/ ${formatCurrency(totalSavingsTarget)}` : undefined}
                icon={PiggyBank}
                gradient="blue"
                loading={loading}
                metrics={savingsOverviewMetrics}
              />

              <GoalsSummaryCard
                title="Controle de Gastos"
                subtitle="Categorias dentro do limite"
                value={`${limitsComplied}`}
                valueSuffix={`de ${spendingGoals.length}`}
                icon={Shield}
                gradient="orange"
                loading={loading}
                metrics={spendingOverviewMetrics}
              />

              <GoalsSummaryCard
                title="Investimentos"
                subtitle="Metas ativas de patrimônio"
                value={investmentLoading ? 'Carregando...' : formatCurrency(investmentHero.totalCurrent)}
                valueSuffix={
                  !investmentLoading && investmentHero.totalTarget > 0
                    ? `/ ${formatCurrency(investmentHero.totalTarget)}`
                    : undefined
                }
                icon={TrendingUp}
                gradient="purple"
                loading={investmentLoading}
                metrics={investmentsOverviewMetrics}
              />

              <GoalsSummaryCard
                title="Planejamento Mensal"
                subtitle={`Mês atual (${heroSummaryMonth})`}
                value={formatCurrency(heroTotalActual)}
                valueSuffix={`/ ${formatCurrency(heroTotalPlanned)}`}
                icon={Wallet}
                gradient="green"
                loading={loading}
                metrics={planningOverviewMetrics}
              />
            </div>

        {/* Tabs de Navegação */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
          <TabsList className={goalsTabsListClassName}>
            <TabsTrigger value="savings" className={goalsTabsTriggerClassName}>
              <PiggyBank className="h-4 w-4" />
              Economia
            </TabsTrigger>
            <TabsTrigger value="spending" className={goalsTabsTriggerClassName}>
              <Shield className="h-4 w-4" />
              Gastos
            </TabsTrigger>
            <TabsTrigger value="investments" className={goalsTabsTriggerClassName}>
              <TrendingUp className="h-4 w-4" />
              Investimentos
            </TabsTrigger>
            <TabsTrigger value="progress" className={goalsTabsTriggerClassName}>
              <Zap className="h-4 w-4" />
              Progresso
            </TabsTrigger>
            <TabsTrigger value="config" className={goalsTabsTriggerClassName}>
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Tab: Economia - Sistema Unificado Superior */}
          {activeTab === 'savings' ? (
            <TabsContent value="savings" className="mt-0">
              {savingsGoals.length === 0 ? (
                <Card className="rounded-[1.8rem] border border-dashed border-border/70 bg-surface/88 px-8 py-14 text-center shadow-[0_18px_38px_rgba(8,15,32,0.12)]">
                  <PiggyBank className="mx-auto mb-4 h-16 w-16 text-muted-foreground/40" />
                  <h3 className="mb-2 text-lg font-semibold text-foreground">Nenhuma meta de economia</h3>
                  <p className="mb-6 text-muted-foreground">
                    Crie uma meta para acompanhar aportes, prazo e progresso sem esperar outro carregamento da página.
                  </p>
                  <Button className={primaryButtonClass} onClick={openSavingsFromHeader}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Meta de Economia
                  </Button>
                </Card>
              ) : (
                <div className="space-y-6">
                  <Card className="rounded-[1.75rem] border-border/70 bg-surface/92 p-6 shadow-[0_18px_38px_rgba(8,15,32,0.12)]">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Metas Ativas</p>
                        <p className="text-3xl font-semibold text-foreground">{savingsGoals.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Economizado</p>
                        <p className="text-3xl font-semibold text-emerald-500">{formatCurrency(totalSavingsCurrent)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Meta Total</p>
                        <p className="text-3xl font-semibold text-foreground">{formatCurrency(totalSavingsTarget)}</p>
                      </div>
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {savingsGoals.map((goal) => (
                      <SavingsGoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAddValue={handleAddValue}
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          ) : null}

          {/* Tab: Gastos */}
          {activeTab === 'spending' ? (
            <TabsContent value="spending" className="mt-0">
            <MotionConfig reducedMotion="never">
              <motion.div
                key={`spending-${selectedMonthStr}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                  <div className="max-w-[36rem]">
                    <h3 className="text-[1.55rem] font-semibold tracking-tight text-foreground">Planejamento mensal por categoria</h3>
                    <p className="mt-1 text-[0.9rem] leading-relaxed text-muted-foreground">
                      Meta de Gasto agora concentra o planejamento do mês, os limites e o acompanhamento por categoria.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <MonthSelector selectedDate={selectedPlanningDate} onDateChange={setSelectedPlanningDate} />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        className={cn(secondaryButtonClass, 'text-sm')}
                        onClick={async () => {
                          await copyFromPreviousMonth();
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar mês anterior
                      </Button>
                      <Button
                        className={cn(primaryButtonClass, 'text-sm')}
                        onClick={async () => {
                          await applySuggestions();
                        }}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Aplicar sugestões
                      </Button>
                    </div>
                  </div>
                </div>

                <BudgetSummaryCards
                  totalPlanned={totalPlanned}
                  totalActual={totalActual}
                  totalDifference={totalDifference}
                  month={selectedMonthStr}
                />

                <BudgetInsights budgets={planningItems} totalDifference={totalDifference} month={selectedMonthStr} />

                <Card
                  className="cursor-pointer rounded-[1.85rem] border-2 border-dashed border-border/80 bg-surface/88 transition-all duration-300 hover:border-primary/50 hover:bg-surface-elevated/88 hover:shadow-[0_20px_40px_rgba(8,15,32,0.14)]"
                  onClick={openSpendingPlanningDialog}
                >
                  <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                      <Plus className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-foreground">Adicionar categoria</h4>
                      <p className="text-sm text-muted-foreground">
                        Inclua uma nova meta de gasto no planejamento mensal sem duplicar os cards abaixo.
                      </p>
                    </div>
                    <Button variant="outline" className={secondaryButtonClass} onClick={openSpendingPlanningDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova categoria
                    </Button>
                  </div>
                </Card>

                {monthlySpendingGoals.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-semibold text-foreground">Detalhe das metas do mês</h4>
                      <p className="text-sm text-muted-foreground">
                        Aqui você acompanha projeção, streak e histórico de cada categoria planejada.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {monthlySpendingGoals.map((goal) => (
                        <SpendingGoalCard
                          key={goal.id}
                          goal={goal}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </MotionConfig>
            </TabsContent>
          ) : null}

          {/* Tab: Investimentos */}
          {activeTab === 'investments' ? (
            <TabsContent value="investments" className="mt-0">
            {investmentLoading ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Carregando metas de investimento...</p>
              </div>
            ) : activeInvestmentGoals.length === 0 ? (
              <Card className="rounded-[1.8rem] border border-dashed border-border/70 bg-surface/88 px-8 py-14 text-center shadow-[0_18px_38px_rgba(8,15,32,0.12)]">
                <TrendingUp className="mx-auto mb-4 h-16 w-16 text-muted-foreground/40" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">Nenhuma meta de investimento</h3>
                <p className="mb-6 text-muted-foreground">
                  Crie metas de longo prazo para crescer seu patrimônio com rentabilidade!
                </p>
                <Button className={primaryButtonClass} onClick={openInvestmentsFromHeader}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Meta de Investimento
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeInvestmentGoals.map((goal) => (
                  <InvestmentGoalCard
                    key={goal.id}
                    goal={goal}
                    metrics={goal.metrics}
                    onEdit={handleEditInvestmentGoal}
                    onContribute={handleContributeToGoal}
                    onDelete={deleteInvestmentGoal}
                    onOpenPortfolio={handleOpenInvestmentPortfolio}
                  />
                ))}
              </div>
            )}
            </TabsContent>
          ) : null}

          {/* Tab: Progresso (Gamificação) */}
          {activeTab === 'progress' || shouldWarmProgressTab ? (
            <GoalsProgressContent
              active={activeTab === 'progress'}
              totalGoalCount={totalGoalCount}
              activeGoalCount={activeGoalCount}
              successRate={successRate}
            />
          ) : null}

          {/* Tab: Configurações */}
          {activeTab === 'config' ? <GoalsConfigContent /> : null}
        </Tabs>
            </div>{/* end hidden lg:block */}

            {/* Mobile subtree */}
            <div className="lg:hidden">
              <GoalsHeroCard
                monthLabel={mobileMonthLabel}
                savingsCurrent={mobileSavingsCurrentTotal}
                savingsTarget={mobileSavingsTargetTotal}
                spendingLimitsOk={mobileSpendingLimitsOkCount}
                spendingLimitsTotal={mobileSpendingLimitsTotal}
                investmentsCurrent={mobileInvestmentsCurrentTotal}
                investmentsTarget={mobileInvestmentsTargetTotal}
                streakDays={mobileCurrentStreakDays}
                formatCurrency={formatCurrency}
              />

              <div className="mx-2 mt-3">
                <SlidingPillTabs
                  tabs={[
                    { value: 'savings', label: 'Econ' },
                    { value: 'spending', label: 'Gastos' },
                    { value: 'investments', label: 'Invest' },
                    { value: 'progress', label: 'Progr' },
                    { value: 'config', label: 'Config' },
                  ]}
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as GoalsTab)}
                  ariaLabel="Abas de metas"
                />
              </div>

              {activeTab === 'savings' && (
                <SavingsGoalCardList
                  goals={mobileSavingsGoals}
                  onCardTap={handleEditGoal}
                  onAddValue={handleAddValueClick}
                  formatCurrency={formatCurrency}
                />
              )}
              {activeTab === 'spending' && (
                <>
                  <SpendingMonthSelector
                    selectedMonth={selectedPlanningDate}
                    onChange={setSelectedPlanningDate}
                  />
                  <SpendingGoalCardList
                    goals={mobileSpendingGoals}
                    onCardTap={handleEditGoal}
                    formatCurrency={formatCurrency}
                  />
                </>
              )}
              {activeTab === 'investments' && (
                <InvestmentGoalCardList
                  goals={mobileInvestmentGoalItems}
                  onCardTap={handleInvestmentGoalTap}
                  formatCurrency={formatCurrency}
                />
              )}
              {activeTab === 'progress' && (
                <GamificationMobileLayout
                  level={mobileGamificationLevel}
                  levelName={mobileGamificationLevelName}
                  xp={mobileGamificationXp}
                  xpToNextLevel={mobileGamificationXpToNext}
                  xpProgressPct={mobileGamificationXpPct}
                  streakDays={mobileCurrentStreakDays}
                  achievements={mobileAchievements}
                />
              )}
              {activeTab === 'config' && (
                <GoalsConfigMobileLayout sections={mobileConfigSections} />
              )}
            </div>
          </>
        )}
      </div>

      {/* Dialogs */}
      {createDialogOpen ? (
        <CreateGoalDialog
          key={`${createDialogSource}-${defaultGoalType}-${createDialogAllowedTypes.join(',')}-${createDialogExcludedCategoryIds.join(',')}`}
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setCreateDialogSource('default');
              setCreateDialogExcludedCategoryIds([]);
            }
          }}
          defaultType={defaultGoalType}
          allowedTypes={createDialogAllowedTypes}
          excludedCategoryIds={createDialogExcludedCategoryIds}
          onCreated={async (goal) => {
            if (createDialogSource === 'planning') {
              return;
            }
            let created = getGoalById(goal.id);
            if (!created) {
              await refreshGoals();
              created = getGoalById(goal.id);
            }
            if (created) {
              setSelectedGoal(created);
              setEditDialogOpen(true);
            }
          }}
        />
      ) : null}

      {addValueDialogOpen ? (
        <AddValueDialog
          open={addValueDialogOpen}
          onOpenChange={setAddValueDialogOpen}
          goal={selectedGoal}
        />
      ) : null}

      {editDialogOpen ? (
        <EditGoalDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          goal={selectedGoal}
        />
      ) : null}

      {investmentDialogOpen ? (
        <InvestmentGoalDialog
          open={investmentDialogOpen}
          onOpenChange={(open) => {
            setInvestmentDialogOpen(open);
            if (!open) {
              setSelectedInvestmentGoal(null);
            }
          }}
          goal={selectedInvestmentGoal}
          onSave={handleSaveInvestmentGoal}
        />
      ) : null}

      {contributionDialogOpen ? (
        <ContributionDialog
          open={contributionDialogOpen}
          onOpenChange={(open) => {
            setContributionDialogOpen(open);
            if (!open) {
              setGoalToContribute(null);
            }
          }}
          goal={goalToContribute}
          onSave={addContribution}
        />
      ) : null}
    </div>
  );
}
