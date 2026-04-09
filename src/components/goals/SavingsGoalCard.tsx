import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MoreVertical,
  Edit2,
  Trash2,
  Plus,
  TrendingUp,
  PiggyBank,
  Calendar,
  DollarSign,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GoalProgress } from './GoalProgress';
import { formatCurrency } from '@/utils/formatters';
import { useGoalProgress } from '@/hooks/useGoalProgress';
import type { FinancialGoalWithCategory } from '@/types/database.types';
import { differenceInMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoalProgressHistoryChart } from './charts/GoalProgressHistoryChart';
import { GradientIcon } from '@/components/ui/GradientIcon';

interface SavingsGoalCardProps {
  goal: FinancialGoalWithCategory;
  onEdit: (goal: FinancialGoalWithCategory) => void;
  onDelete: (id: string) => void;
  onAddValue: (goal: FinancialGoalWithCategory) => void;
}

export function SavingsGoalCard({
  goal,
  onEdit,
  onDelete,
  onAddValue,
}: SavingsGoalCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const progress = useGoalProgress({ goal });

  const monthsRemaining = goal.deadline
    ? Math.max(1, differenceInMonths(new Date(goal.deadline), new Date()))
    : 1;
  const suggestedMonthlyContribution =
    progress.remaining > 0 ? progress.remaining / monthsRemaining : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.01, y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card
        className={`relative overflow-hidden rounded-[1.9rem] border border-border/70 bg-surface/92 p-6 transition-all duration-300 ${
          isHovered
            ? 'border-primary/20 bg-surface-elevated/88 shadow-[0_22px_48px_rgba(8,15,32,0.22)]'
            : 'shadow-[0_16px_34px_rgba(8,15,32,0.12)]'
        }`}
      >
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-80" />

        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <GradientIcon icon={PiggyBank} colors={['#3b82f6', '#8b5cf6']} size="sm" />

            <div>
              <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
              <p className="text-sm text-muted-foreground">Meta de Economia</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 rounded-xl border border-border/60 bg-surface-elevated/60 p-0 text-muted-foreground hover:bg-surface-overlay hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onAddValue(goal)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Valor
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(goal)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Editar Meta
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDelete(goal.id)} className="text-danger">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Meta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <span className="text-2xl font-semibold text-foreground">
                {formatCurrency(goal.current_amount)}
              </span>
              <span className="mx-2 text-muted-foreground">/</span>
              <span className="text-lg font-semibold text-muted-foreground">
                {formatCurrency(goal.target_amount)}
              </span>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                progress.status === 'exceeded' ? 'bg-success-subtle text-success' : ''
              } ${progress.status === 'warning' ? 'bg-primary/10 text-primary' : ''} ${
                progress.status === 'safe' ? 'bg-surface-elevated text-foreground' : ''
              }`}
            >
              {progress.percentage}%
            </span>
          </div>

          <GoalProgress
            current={goal.current_amount}
            target={goal.target_amount}
            status={progress.status}
            showLabel={false}
            inverse={false}
          />
        </div>

        <div className="space-y-2 rounded-[1.5rem] border border-border/60 bg-surface-elevated/45 p-4">
          {goal.deadline ? (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Prazo
              </span>
              <span className="font-semibold text-foreground">
                {format(new Date(goal.deadline), 'MMM/yyyy', { locale: ptBR })}
              </span>
            </div>
          ) : null}

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Faltam
            </span>
            <span className="font-semibold text-foreground">
              {formatCurrency(Math.max(0, progress.remaining))}
            </span>
          </div>

          {progress.remaining > 0 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Aporte sugerido
              </span>
              <span className="font-semibold text-primary">
                {formatCurrency(suggestedMonthlyContribution)}/mês
              </span>
            </div>
          ) : null}

          {progress.percentage >= 100 ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-success-subtle/80 p-2 text-center text-sm font-semibold text-success">
              <Trophy className="h-4 w-4" />
              Meta alcançada! Parabéns!
            </div>
          ) : null}

          {progress.days_left !== undefined && progress.days_left >= 0 ? (
            <div className="border-t border-border/60 pt-2 text-xs text-muted-foreground">
              {progress.days_left} {progress.days_left === 1 ? 'dia' : 'dias'} restantes
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-surface-elevated/60 p-3 transition-colors hover:bg-surface-overlay"
            onClick={() => setShowChart((value) => !value)}
            aria-expanded={showChart}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <TrendingUp className="h-4 w-4" />
              Progresso no Tempo
            </div>
            {showChart ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showChart ? (
            <div className="mt-4">
              <GoalProgressHistoryChart goal={goal} />
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex gap-2">
          <Button className="flex-1" size="sm" onClick={() => onAddValue(goal)}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar Valor
          </Button>
          <Button
            className="flex-1 rounded-xl border-border/70 bg-surface/80 shadow-sm hover:bg-surface-elevated"
            size="sm"
            variant="outline"
            onClick={() => onEdit(goal)}
          >
            <Edit2 className="mr-1 h-4 w-4" />
            Editar
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
