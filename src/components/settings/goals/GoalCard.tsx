import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreVertical, Edit, DollarSign, BarChart3, Trash2, Loader2, Target, Plane, Home, Car, GraduationCap, Palmtree, Heart, Smartphone, Gamepad2 } from 'lucide-react';
import type { GoalWithStats } from '@/types/settings.types';
import { LABELS } from '@/types/settings.types';

// Mapeamento de ícones
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'Meta': Target,
  'Viagem': Plane,
  'Casa': Home,
  'Carro': Car,
  'Educação': GraduationCap,
  'Dinheiro': DollarSign,
  'Férias': Palmtree,
  'Casamento': Heart,
  'Eletrônico': Smartphone,
  'Lazer': Gamepad2,
  'Target': Target, // fallback
};

interface GoalCardProps {
  goal: GoalWithStats;
  onEdit: () => void;
  onDelete: () => void;
  onAddContribution: (amount: number) => Promise<boolean>;
}

export function GoalCard({ goal, onEdit, onDelete, onAddContribution }: GoalCardProps) {
  const [showContributionDialog, setShowContributionDialog] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusVariant = (goal: GoalWithStats) => {
    if (goal.percentage >= 100) return 'success';
    if (goal.isOverdue) return 'destructive';
    if (!goal.isOnTrack) return 'warning';
    return 'default';
  };

  const getStatusLabel = (goal: GoalWithStats) => {
    if (goal.percentage >= 100) return 'Concluída';
    if (goal.isOverdue) return 'Atrasada';
    if (!goal.isOnTrack) return 'Fora do Ritmo';
    return 'No Prazo';
  };

  const handleQuickAdd = async (amount: number) => {
    setIsAdding(true);
    try {
      await onAddContribution(amount);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCustomAdd = async () => {
    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsAdding(true);
    try {
      const success = await onAddContribution(amount);
      if (success) {
        setShowContributionDialog(false);
        setContributionAmount('');
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {(() => {
                  const IconComponent = ICON_MAP[goal.icon || 'Target'] || Target;
                  return <IconComponent className="h-6 w-6 text-primary" />;
                })()}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{goal.name}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge variant={getPriorityVariant(goal.priority)}>
                    {LABELS.goalPriority[goal.priority]}
                  </Badge>
                  <Badge variant="outline">
                    {LABELS.goalCategory[goal.category]}
                  </Badge>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowContributionDialog(true)}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Adicionar Valor
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">
                  R$ {goal.current_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-muted-foreground">
                  {goal.percentage.toFixed(1)}% de R${' '}
                  {goal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Progress value={goal.percentage} className="h-3" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Faltam</p>
                <p className="font-semibold text-lg">
                  R$ {goal.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Prazo</p>
                <p className="font-semibold text-lg">
                  {goal.daysRemaining} {goal.daysRemaining === 1 ? 'dia' : 'dias'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Sugestão Mensal</p>
                <p className="font-semibold text-blue-600 dark:text-blue-400">
                  R$ {goal.suggestedMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant={getStatusVariant(goal)}>{getStatusLabel(goal)}</Badge>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAdd(100)}
                disabled={isAdding}
              >
                + R$ 100
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAdd(500)}
                disabled={isAdding}
              >
                + R$ 500
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowContributionDialog(true)}
                disabled={isAdding}
                className="flex-1"
              >
                Valor Customizado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contribution Dialog */}
      <Dialog open={showContributionDialog} onOpenChange={setShowContributionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Contribuição</DialogTitle>
            <DialogDescription>
              Quanto você deseja adicionar à meta "{goal.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomAdd();
                  }
                }}
              />
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
              <p className="text-muted-foreground">Após esta contribuição:</p>
              <p className="font-semibold mt-1">
                R${' '}
                {(goal.current_amount + (parseFloat(contributionAmount) || 0)).toLocaleString(
                  'pt-BR',
                  { minimumFractionDigits: 2 }
                )}{' '}
                de R$ {goal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {(
                  ((goal.current_amount + (parseFloat(contributionAmount) || 0)) /
                    goal.target_amount) *
                  100
                ).toFixed(1)}
                % da meta
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowContributionDialog(false)}
              disabled={isAdding}
            >
              Cancelar
            </Button>
            <Button onClick={handleCustomAdd} disabled={isAdding || !contributionAmount}>
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                'Adicionar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
