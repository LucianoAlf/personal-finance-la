import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus, Loader2 } from 'lucide-react';
import { useGoalsManager } from '@/hooks/useGoalsManager';
import { GoalDialog } from './GoalDialog';
import { GoalCard } from './GoalCard';
import type { SavingsGoal, CreateGoalInput, UpdateGoalInput } from '@/types/settings.types';

interface SavingsGoalsManagerProps {
  // Quando este número for incrementado pelo pai, abre o diálogo de criação
  requestCreate?: number;
}

export function SavingsGoalsManager({ requestCreate = 0 }: SavingsGoalsManagerProps) {
  const {
    goalsWithStats,
    activeGoals,
    totalSaved,
    totalTarget,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution,
  } = useGoalsManager();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const prevRequestCreate = useRef(requestCreate);

  const handleOpenDialog = (goal?: SavingsGoal) => {
    setSelectedGoal(goal || null);
    setDialogOpen(true);
  };

  // Abrir o diálogo quando o pai solicitar (apenas quando houver mudança real)
  useEffect(() => {
    if (requestCreate > 0 && requestCreate !== prevRequestCreate.current) {
      handleOpenDialog();
      prevRequestCreate.current = requestCreate;
    }
  }, [requestCreate]);

  const handleSave = async (input: CreateGoalInput | UpdateGoalInput) => {
    if (selectedGoal) {
      return await updateGoal(selectedGoal.id, input as UpdateGoalInput);
    } else {
      const result = await createGoal(input as CreateGoalInput);
      return result !== null;
    }
  };

  const handleDelete = async (id: string) => {
    return await deleteGoal(id);
  };

  const handleAddContribution = async (goalId: string, amount: number) => {
    return await addContribution({ goal_id: goalId, amount });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          {/* Summary */}
          {activeGoals.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Metas Ativas</p>
                  <p className="text-2xl font-bold">{activeGoals.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Economizado</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    R$ {totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Meta Total</p>
                  <p className="text-2xl font-bold">
                    R$ {totalTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Goals List */}
          {goalsWithStats.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma meta criada</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando sua primeira meta de economia
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Meta
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {goalsWithStats.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => handleOpenDialog(goal)}
                  onDelete={() => handleDelete(goal.id)}
                  onAddContribution={(amount) => handleAddContribution(goal.id, amount)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        goal={selectedGoal}
        onSave={handleSave}
        onDelete={selectedGoal ? () => handleDelete(selectedGoal.id) : undefined}
      />
    </>
  );
}
