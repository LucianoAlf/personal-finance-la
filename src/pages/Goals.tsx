import { useMemo, useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Target, PiggyBank, Shield, Flame, AlertTriangle, Trophy, Zap, Calendar, Copy, Sparkles, Settings, ChevronDown, TrendingUp } from 'lucide-react';
import { motion, MotionConfig } from 'framer-motion';
import { useGoals } from '@/hooks/useGoals';
import { useSearchParams } from 'react-router-dom';
import { useGoalNotifications } from '@/hooks/useGoalNotifications';
import { useGamification } from '@/hooks/useGamification';
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
import { useBudgets } from '@/hooks/useBudgets';
import { BudgetSummaryCards } from '@/components/budget/BudgetSummaryCards';
import { BudgetInsights } from '@/components/budget/BudgetInsights';
import { BudgetGrid } from '@/components/budget/BudgetGrid';
import { AddBudgetCategoryDialog } from '@/components/budget/AddBudgetCategoryDialog';
import { SavingsGoalsManager } from '@/components/settings/goals/SavingsGoalsManager';
import { FinancialCyclesManager } from '@/components/settings/cycles/FinancialCyclesManager';
import { FinancialSettingsCard } from '@/components/settings/financial/FinancialSettingsCard';
import { useSettings } from '@/hooks/useSettings';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useInvestmentGoals } from '@/hooks/useInvestmentGoals';
import { InvestmentGoalCard } from '@/components/investment-goals/InvestmentGoalCard';
import { InvestmentGoalDialog } from '@/components/investment-goals/InvestmentGoalDialog';
import { ContributionDialog } from '@/components/investment-goals/ContributionDialog';

export function Goals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { goals, loading, getGoalsByType, getStats, deleteGoal, getGoalById, refreshGoals } = useGoals();
  const { goals: investmentGoals, loading: investmentLoading, activeGoals: activeInvestmentGoals, deleteGoal: deleteInvestmentGoal, createGoal: createInvestmentGoal, updateGoal: updateInvestmentGoal, addContribution } = useInvestmentGoals();
  const { profile, badges, unlockedBadges, xpForNextLevel, xpProgress, levelTitle, loading: gamificationLoading, celebrationQueue, showCelebration, dismissCelebration } = useGamification();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [defaultGoalType, setDefaultGoalType] = useState<'savings' | 'spending_limit'>('savings');
  const [addValueDialogOpen, setAddValueDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoalWithCategory | null>(null);
  const [activeTab, setActiveTab] = useState<'savings' | 'spending' | 'investments' | 'progress' | 'budget' | 'config'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'budget' || tabParam === 'spending' || tabParam === 'investments' || tabParam === 'progress' || tabParam === 'config') {
      return tabParam as 'savings' | 'spending' | 'investments' | 'progress' | 'budget' | 'config';
    }
    return 'savings';
  });
  const [selectedBudgetDate, setSelectedBudgetDate] = useState<Date>(new Date());
  const [addBudgetDialogOpen, setAddBudgetDialogOpen] = useState(false);
  const [savingsCreateTick, setSavingsCreateTick] = useState(0);
  const [createDialogAllowedTypes, setCreateDialogAllowedTypes] = useState<Array<'savings' | 'spending_limit'>>(['savings', 'spending_limit']);
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [selectedInvestmentGoal, setSelectedInvestmentGoal] = useState<any>(null);
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [goalToContribute, setGoalToContribute] = useState<any>(null);

  const selectedMonthStr = useMemo(() => {
    const y = selectedBudgetDate.getFullYear();
    const m = String(selectedBudgetDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [selectedBudgetDate]);

  const { budgets, loading: budgetsLoading, totalPlanned, totalActual, totalDifference, copyFromPreviousMonth, getSuggestions, saveBudget, refreshBudgets } = useBudgets(selectedMonthStr);
  const { userSettings, updateUserSettings } = useSettings();

  // Estados para configurações financeiras
  const [savingsGoalPercentage, setSavingsGoalPercentage] = useState(userSettings?.monthly_savings_goal_percentage || 20);
  const [closingDay, setClosingDay] = useState(userSettings?.monthly_closing_day || 1);
  const [budgetAllocation, setBudgetAllocation] = useState(userSettings?.budget_allocation || { essentials: 50, investments: 20, leisure: 20, others: 10 });
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState(userSettings?.budget_alert_threshold || 80);

  // Sincronizar com userSettings
  useEffect(() => {
    if (userSettings) {
      setSavingsGoalPercentage(userSettings.monthly_savings_goal_percentage || 20);
      setClosingDay(userSettings.monthly_closing_day || 1);
      setBudgetAllocation(userSettings.budget_allocation || { essentials: 50, investments: 20, leisure: 20, others: 10 });
      setBudgetAlertThreshold(userSettings.budget_alert_threshold || 80);
    }
  }, [userSettings]);

  // Handlers para atualizar configurações
  const handleSavingsGoalChange = async (value: number) => {
    setSavingsGoalPercentage(value);
    await updateUserSettings({ monthly_savings_goal_percentage: value });
  };

  const handleClosingDayChange = async (value: number) => {
    setClosingDay(value);
    await updateUserSettings({ monthly_closing_day: value });
  };

  const handleBudgetAllocationChange = async (allocation: any) => {
    setBudgetAllocation(allocation);
    await updateUserSettings({ budget_allocation: allocation });
  };

  const handleBudgetAlertThresholdChange = async (threshold: number) => {
    setBudgetAlertThreshold(threshold);
    await updateUserSettings({ budget_alert_threshold: threshold });
  };

  // Hook de notificações
  useGoalNotifications({ goals });

  const savingsGoals = getGoalsByType('savings');
  const spendingGoals = getGoalsByType('spending_limit');
  const stats = getStats();

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

  // Contagem simples de badges desbloqueadas (coincide com widget)
  const unlockedBadgesCount = [
    stats.total_goals >= 1,
    stats.best_streak >= 3,
    stats.best_streak >= 6,
    stats.completed_goals >= 1,
    stats.total_savings >= 10000,
  ].filter(Boolean).length;

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

  const handleCreateGoal = (type: 'savings' | 'spending_limit') => {
    setDefaultGoalType(type);
    // Restringe os tipos permitidos quando for meta de gasto
    if (type === 'spending_limit') {
      setCreateDialogAllowedTypes(['spending_limit']);
    } else {
      setCreateDialogAllowedTypes(['savings', 'spending_limit']);
    }
    setCreateDialogOpen(true);
  };

  // Ações do Header
  const openSavingsFromHeader = () => {
    setActiveTab('savings');
    setSavingsCreateTick((t) => t + 1);
  };

  const openSpendingFromHeader = () => {
    setActiveTab('spending');
    setDefaultGoalType('spending_limit');
    setCreateDialogAllowedTypes(['spending_limit']);
    setCreateDialogOpen(true);
  };

  const openInvestmentsFromHeader = () => {
    setActiveTab('investments');
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

  // Sincronizar activeTab com URL
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab as any);
    setSearchParams({ tab: newTab });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando metas...</p>
        </div>
      </div>
    );
  }

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
        {/* Hero Metrics (2 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <PiggyBank className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">Economia</h3>
                  <p className="text-sm text-gray-600">Total economizado</p>
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold text-gray-900">{formatCurrency(totalSavingsCurrent)}</span>
              {totalSavingsTarget > 0 && (
                <span className="text-gray-600">/ {formatCurrency(totalSavingsTarget)}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Metas ativas</div>
                <div className="font-semibold text-gray-900">{savingsGoals.length}</div>
              </div>
              <div>
                <div className="text-gray-600">Progresso médio</div>
                <div className="font-semibold text-gray-900">{avgSavingsProgress}%</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">Controle de Gastos</h3>
                  <p className="text-sm text-gray-600">Categorias dentro do limite</p>
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-bold text-gray-900">{limitsComplied}</span>
              <span className="text-gray-600">de {spendingGoals.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-orange-600">
                <Flame className="h-4 w-4" />
                <span>Melhor streak: {stats.best_streak} {stats.best_streak === 1 ? 'mês' : 'meses'}</span>
              </div>
              {attentionCategory && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Atenção: {attentionCategory.category_name || attentionCategory.name} ({attentionCategory.percentage}%)</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Tabs de Navegação */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
          <TabsList className="grid w-full grid-cols-6 mb-6">
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
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Orçamento
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Tab: Economia - Sistema Unificado Superior */}
          <TabsContent value="savings">
            <SavingsGoalsManager requestCreate={savingsCreateTick} />
          </TabsContent>

          {/* Tab: Gastos */}
          <TabsContent value="spending">
            {spendingGoals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma meta de gasto</h3>
                <p className="text-gray-600 mb-6">Defina limites de gastos por categoria e mantenha o controle!</p>
                <Button onClick={() => handleCreateGoal('spending_limit')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Meta de Gasto
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {spendingGoals.map((goal) => (
                  <SpendingGoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Investimentos */}
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
                    onEdit={handleEditInvestmentGoal}
                    onContribute={handleContributeToGoal}
                    onDelete={deleteInvestmentGoal}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Progresso (Gamificação) */}
          <TabsContent value="progress">
            {gamificationLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Carregando progresso...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Hero: Barra de XP */}
                {profile && (
                  <XPProgressBar
                    level={profile.level}
                    xp={profile.xp}
                    xpForNextLevel={xpForNextLevel}
                    levelTitle={levelTitle}
                    totalXP={profile.total_xp}
                  />
                )}

                {/* Grid: Próximas Conquistas + Streak */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <NextAchievements badges={badges} />
                  </div>
                  <div>
                    <Card className="p-6">
                      <StreakHeatmap
                        currentStreak={profile?.current_streak ?? 0}
                        bestStreak={profile?.best_streak ?? 0}
                      />
                      <div className="my-4 border-t" />
                      <GamificationStats
                        profile={profile}
                        unlockedBadgesCount={unlockedBadges.length}
                        totalBadges={ACHIEVEMENTS.length}
                        levelTitle={levelTitle}
                        xpForNextLevel={xpForNextLevel}
                        xpProgress={xpProgress}
                        goals={goals}
                      />
                    </Card>
                  </div>
                </div>

                {/* Grid de Todas as Conquistas */}
                <AchievementGrid badges={badges} />
              </div>
            )}
          </TabsContent>

          {/* Tab: Orçamento */}
          <TabsContent value="budget">
            <MotionConfig reducedMotion="never">
              <motion.div
                key={`${activeTab}-${selectedMonthStr}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
              {/* Header com ações */}
              <div className="flex items-center justify-between">
                <MonthSelector selectedDate={selectedBudgetDate} onDateChange={setSelectedBudgetDate} />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={async () => { await copyFromPreviousMonth(); toast({ title: 'Orçamento copiado do mês anterior.', description: selectedMonthStr }); }}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Mês Anterior
                  </Button>
                  <Button onClick={async () => { const s = await getSuggestions(); toast({ title: 'Sugestões calculadas', description: `${s.length} categorias com sugestão` }); }}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sugestões Inteligentes
                  </Button>
                </div>
              </div>

              {/* Cards de resumo */}
              <BudgetSummaryCards
                totalPlanned={totalPlanned}
                totalActual={totalActual}
                totalDifference={totalDifference}
                month={selectedMonthStr}
              />

              {/* Insights & Grid */}
              <BudgetInsights budgets={budgets} totalDifference={totalDifference} month={selectedMonthStr} />

              <BudgetGrid
                budgets={budgets}
                loading={budgetsLoading}
                onEdit={async (categoryId, amount) => { await saveBudget(categoryId, amount); toast({ title: 'Orçamento atualizado' }); await refreshBudgets(); }}
                onAddCategory={() => setAddBudgetDialogOpen(true)}
                month={selectedMonthStr}
              />

              <AddBudgetCategoryDialog
                open={addBudgetDialogOpen}
                onOpenChange={setAddBudgetDialogOpen}
                onAdd={async (categoryId, amount, notes) => { await saveBudget(categoryId, amount, notes); await refreshBudgets(); }}
                existingCategories={budgets.map((b) => b.category_id)}
                month={selectedMonthStr}
              />
              </motion.div>
            </MotionConfig>
          </TabsContent>

          {/* Tab: Configurações */}
          <TabsContent value="config">
            <div className="space-y-6">
              {/* Configurações Financeiras */}
              <FinancialSettingsCard
                savingsGoal={savingsGoalPercentage}
                onSavingsGoalChange={handleSavingsGoalChange}
                closingDay={closingDay}
                onClosingDayChange={handleClosingDayChange}
                budgetAllocation={budgetAllocation}
                onBudgetAllocationChange={handleBudgetAllocationChange}
                budgetAlertThreshold={budgetAlertThreshold}
                onBudgetAlertThresholdChange={handleBudgetAlertThresholdChange}
              />

              {/* Ciclos Financeiros */}
              <FinancialCyclesManager />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Toaster de Gamificação */}
      <GamificationToaster />

      {/* Modal de celebração de conquista */}
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

      {/* Dialogs */}
      <CreateGoalDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultType={defaultGoalType}
        allowedTypes={createDialogAllowedTypes}
        onCreated={async (goal) => {
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
      
      <AddValueDialog
        open={addValueDialogOpen}
        onOpenChange={setAddValueDialogOpen}
        goal={selectedGoal}
      />

      <EditGoalDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        goal={selectedGoal}
      />

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
    </div>
  );
}
