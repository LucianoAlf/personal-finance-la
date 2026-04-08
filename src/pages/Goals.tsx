import { useMemo, useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Target, PiggyBank, Shield, Flame, AlertTriangle, Trophy, Zap, Copy, Sparkles, Settings, ChevronDown, TrendingUp, Wallet } from 'lucide-react';
import { motion, MotionConfig } from 'framer-motion';
import { useGoals } from '@/hooks/useGoals';
import { useSearchParams } from 'react-router-dom';
import { useGoalNotifications } from '@/hooks/useGoalNotifications';
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
                <Card className="p-6">
                  <StreakHeatmap
                    currentStreak={profile?.current_streak ?? 0}
                    bestStreak={profile?.best_streak ?? 0}
                    lastActivityDate={profile?.last_activity_date ?? null}
                    subtitle="Resumo visual do streak diário baseado na última atividade real registrada no app. Não representa histórico mensal."
                  />
                  <div className="my-4 border-t" />
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
                </Card>
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
  const [activeTab, setActiveTab] = useState<'savings' | 'spending' | 'investments' | 'progress' | 'config'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'budget') {
      return 'spending';
    }
    if (tabParam === 'spending' || tabParam === 'investments' || tabParam === 'progress' || tabParam === 'config') {
      return tabParam as 'savings' | 'spending' | 'investments' | 'progress' | 'config';
    }
    return 'savings';
  });
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
    setActiveTab(normalizedTab as any);
    setSearchParams({ tab: normalizedTab });
  };
  const showPageShell = loading;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Metas Financeiras"
        subtitle="Acompanhe seus objetivos e controle seus gastos"
        icon={<Target size={24} />}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Meta
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
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

      <div className="p-6 space-y-6">
        {showPageShell ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="p-6 h-full animate-pulse">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gray-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-24 rounded bg-gray-200" />
                      <div className="h-3 w-32 rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-8 w-36 rounded bg-gray-200" />
                    <div className="h-3 w-full rounded bg-gray-100" />
                    <div className="h-3 w-2/3 rounded bg-gray-100" />
                  </div>
                </Card>
              ))}
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="savings" className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Economia
                </TabsTrigger>
                <TabsTrigger value="spending" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Gastos
                </TabsTrigger>
                <TabsTrigger value="investments" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Investimentos
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Progresso
                </TabsTrigger>
                <TabsTrigger value="config" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configurações
                </TabsTrigger>
              </TabsList>

              <Card className="p-10">
                <div className="flex items-center justify-center gap-3 text-gray-500">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
                  <span>Carregando metas...</span>
                </div>
              </Card>
            </Tabs>
          </>
        ) : (
          <>
            {/* Hero: visão geral (mês atual para orçamento) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              <Card className="p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <PiggyBank className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-gray-900">Economia</h3>
                      <p className="text-sm text-gray-600">Total economizado</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900">{formatCurrency(totalSavingsCurrent)}</span>
                  {totalSavingsTarget > 0 && (
                    <span className="text-sm text-gray-600">/ {formatCurrency(totalSavingsTarget)}</span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600">Metas ativas</span>
                    <span className="font-semibold text-gray-900">{savingsGoals.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600">Progresso médio</span>
                    <span className="font-semibold text-gray-900">{avgSavingsProgress}%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-gray-900">Controle de Gastos</h3>
                      <p className="text-sm text-gray-600">Categorias dentro do limite</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-gray-900">{limitsComplied}</span>
                  <span className="text-gray-600">de {spendingGoals.length}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-gray-600">
                      <Flame className="h-4 w-4 text-orange-500" />
                      Melhor streak
                    </span>
                    <span className="font-semibold text-gray-900">
                      {spendingGoals.length === 0
                        ? '—'
                        : `${spendingGoalsBestStreak} ${spendingGoalsBestStreak === 1 ? 'mês' : 'meses'}`}
                    </span>
                  </div>
                  {attentionCategory && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-gray-600">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Atenção
                      </span>
                      <span className="font-semibold text-red-700 text-right">
                        {attentionCategory.category_name || attentionCategory.name} ({attentionCategory.percentage}%)
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6 h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-gray-900">Investimentos</h3>
                  <p className="text-sm text-gray-600">Metas ativas de patrimônio</p>
                </div>
              </div>
            </div>
            {investmentLoading ? (
              <p className="text-sm text-gray-500">Carregando…</p>
            ) : investmentHero.count === 0 ? (
              <p className="text-sm text-gray-600">Nenhuma meta de investimento ativa.</p>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900">{formatCurrency(investmentHero.totalCurrent)}</span>
                  {investmentHero.totalTarget > 0 && (
                    <span className="text-sm text-gray-600">/ {formatCurrency(investmentHero.totalTarget)}</span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600">Metas ativas</span>
                    <span className="font-semibold text-gray-900">{investmentHero.count}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600">Progresso médio</span>
                    <span className="font-semibold text-gray-900">{investmentHero.avgProgress}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600">No caminho</span>
                    <span className="font-semibold text-emerald-700">
                      {investmentHero.onTrackCount} de {investmentHero.count}
                    </span>
                  </div>
                </div>
              </>
            )}
          </Card>

          <Card className="p-6 h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-gray-900">Planejamento Mensal</h3>
                  <p className="text-sm text-gray-600">Mês atual ({heroSummaryMonth})</p>
                </div>
              </div>
            </div>
            {loading ? (
              <p className="text-sm text-gray-500">Carregando…</p>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900">{formatCurrency(heroTotalActual)}</span>
                  <span className="text-sm text-gray-600">/ {formatCurrency(heroTotalPlanned)}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600">Uso dos limites</span>
                    <span className="font-semibold text-gray-900">
                      {heroTotalPlanned > 0 ? `${heroPlanningUsagePct}%` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600">Categorias no mês</span>
                    <span className="font-semibold text-gray-900">{heroPlanningItems.length}</span>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Tabs de Navegação */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="savings" className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Economia
            </TabsTrigger>
            <TabsTrigger value="spending" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Gastos
            </TabsTrigger>
            <TabsTrigger value="investments" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Investimentos
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Progresso
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Tab: Economia - Sistema Unificado Superior */}
          {activeTab === 'savings' ? (
            <TabsContent value="savings">
              {savingsGoals.length === 0 ? (
                <div className="text-center py-12">
                  <PiggyBank className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma meta de economia</h3>
                  <p className="text-gray-600 mb-6">
                    Crie uma meta para acompanhar aportes, prazo e progresso sem esperar outro carregamento da página.
                  </p>
                  <Button onClick={openSavingsFromHeader}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Meta de Economia
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <Card className="p-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Metas Ativas</p>
                        <p className="text-3xl font-bold text-gray-900">{savingsGoals.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Total Economizado</p>
                        <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totalSavingsCurrent)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Meta Total</p>
                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalSavingsTarget)}</p>
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
            <TabsContent value="spending">
            <MotionConfig reducedMotion="never">
              <motion.div
                key={`spending-${selectedMonthStr}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Planejamento mensal por categoria</h3>
                    <p className="text-sm text-gray-600">
                      Meta de Gasto agora concentra o planejamento do mês, os limites e o acompanhamento por categoria.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <MonthSelector selectedDate={selectedPlanningDate} onDateChange={setSelectedPlanningDate} />
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await copyFromPreviousMonth();
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar mês anterior
                    </Button>
                    <Button
                      onClick={async () => {
                        await applySuggestions();
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Aplicar sugestões
                    </Button>
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
                  className="border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer"
                  onClick={openSpendingPlanningDialog}
                >
                  <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Plus className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">Adicionar categoria</h4>
                      <p className="text-sm text-gray-600">
                        Inclua uma nova meta de gasto no planejamento mensal sem duplicar os cards abaixo.
                      </p>
                    </div>
                    <Button variant="outline" onClick={openSpendingPlanningDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova categoria
                    </Button>
                  </div>
                </Card>

                {monthlySpendingGoals.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">Detalhe das metas do mês</h4>
                      <p className="text-sm text-gray-600">
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
            <TabsContent value="investments">
            {investmentLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Carregando metas de investimento...</p>
              </div>
            ) : activeInvestmentGoals.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma meta de investimento</h3>
                <p className="text-gray-600 mb-6">
                  Crie metas de longo prazo para crescer seu patrimônio com rentabilidade!
                </p>
                <Button onClick={openInvestmentsFromHeader}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Meta de Investimento
                </Button>
              </div>
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
