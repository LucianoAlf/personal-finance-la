import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Target, PiggyBank, Shield, Flame, AlertTriangle, Trophy } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { useGoalNotifications } from '@/hooks/useGoalNotifications';
import { GoalBadges } from '@/components/goals/GoalBadges';
import { SpendingGoalCard } from '@/components/goals/SpendingGoalCard';
import { SavingsGoalCard } from '@/components/goals/SavingsGoalCard';
import { CreateGoalDialog } from '@/components/goals/CreateGoalDialog';
import { EditGoalDialog } from '@/components/goals/EditGoalDialog';
import { AddValueDialog } from '@/components/goals/AddValueDialog';
import { useToast } from '@/hooks/use-toast';
import type { FinancialGoalWithCategory } from '@/types/database.types';
import { GoalSegmentedControl } from '@/components/goals/GoalSegmentedControl';
import { formatCurrency } from '@/utils/formatters';

export function Goals() {
  const { goals, loading, getGoalsByType, getStats, deleteGoal, getGoalById, refreshGoals } = useGoals();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addValueDialogOpen, setAddValueDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoalWithCategory | null>(null);
  const [defaultGoalType, setDefaultGoalType] = useState<'savings' | 'spending_limit'>('savings');
  const [activeTab, setActiveTab] = useState<'savings' | 'spending'>('savings');

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
  const unlockedBadges = [
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
    setCreateDialogOpen(true);
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
          <Button size="lg" onClick={() => setCreateDialogOpen(true)}>
            <Plus size={16} className="mr-1" />
            Nova Meta
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto">
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

        {/* Segmented Control */}
        <div className="mb-6">
          <GoalSegmentedControl
            active={activeTab}
            onChange={(tab) => setActiveTab(tab)}
            savingsCount={savingsGoals.length}
            spendingCount={spendingGoals.length}
            savingsMetric={totalSavingsTarget > 0 ? `${formatCurrency(totalSavingsCurrent)} de ${formatCurrency(totalSavingsTarget)}` : undefined}
            spendingMetric={`${limitsComplied} OK${limitsExceeded > 0 ? `, ${limitsExceeded} excedida${limitsExceeded > 1 ? 's' : ''}` : ''}`}
          />
        </div>

        {/* Conteúdo por Tab */}
        {activeTab === 'savings' ? (
          <div>
            {savingsGoals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma meta de economia</h3>
                <p className="text-gray-600 mb-6">Crie sua primeira meta e comece a economizar!</p>
                <Button onClick={() => handleCreateGoal('savings')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Meta de Economia
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            )}
          </div>
        ) : (
          <div>
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
          </div>
        )}

        {/* Gamificação (sempre visível) */}
        <div className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-900">Suas Conquistas</h2>
            <span className="text-sm text-gray-600">({unlockedBadges}/8 desbloqueadas)</span>
          </div>
          <GoalBadges stats={stats} goals={goals} />
        </div>
      </div>

      {/* Dialogs */}
      <CreateGoalDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultType={defaultGoalType}
        onCreated={async (goal) => {
          // Garantir lista atualizada e buscar versão enriquecida
          let created = getGoalById(goal.id);
          if (!created) {
            // Garantir que a lista esteja atualizada
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
    </div>
  );
}
