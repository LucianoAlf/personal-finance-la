import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MoreVertical,
  Edit2,
  Trash2,
  TrendingDown,
  Flame,
  Utensils,
  Car,
  Gamepad2,
  Heart,
  GraduationCap,
  Wallet,
  AlertTriangle,
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
import { formatCurrency, parseDateOnly } from '@/utils/formatters';
import { useGoalProgress } from '@/hooks/useGoalProgress';
import type { FinancialGoalWithCategory } from '@/types/database.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SpendingCategoryTrendChart } from './charts/SpendingCategoryTrendChart';
import { CategoryTransactionsDrawer } from './CategoryTransactionsDrawer';

interface SpendingGoalCardProps {
  goal: FinancialGoalWithCategory;
  onEdit: (goal: FinancialGoalWithCategory) => void;
  onDelete: (id: string) => void;
  onViewTransactions?: (categoryId: string) => void;
}

function getCategoryIcon(name: string) {
  if (name === 'Alimentação') return Utensils;
  if (name === 'Transporte') return Car;
  if (name === 'Lazer') return Gamepad2;
  if (name === 'Saúde') return Heart;
  if (name === 'Educação') return GraduationCap;
  return Wallet;
}

export function SpendingGoalCard({
  goal,
  onEdit,
  onDelete,
}: SpendingGoalCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [transactionsDrawerOpen, setTransactionsDrawerOpen] = useState(false);
  const progress = useGoalProgress({ goal });

  const periodLabel =
    goal.period_type === 'monthly'
      ? 'Mensal'
      : goal.period_type === 'quarterly'
        ? 'Trimestral'
        : 'Anual';

  const CategoryIcon = getCategoryIcon(goal.category_name || '');

  const statusTone =
    progress.status === 'exceeded'
      ? 'bg-danger-subtle text-danger'
      : progress.status === 'warning'
        ? 'bg-warning-subtle text-warning'
        : 'bg-success-subtle text-success';

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
        <div
          className={`absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-80 ${
            progress.status === 'exceeded'
              ? 'via-danger/80'
              : progress.status === 'warning'
                ? 'via-warning/80'
                : 'via-success/80'
          }`}
        />

        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${statusTone}`}>
              <CategoryIcon className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground">{goal.category_name || goal.name}</h3>
              <p className="text-sm text-muted-foreground">{periodLabel}</p>
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
              <DropdownMenuItem onSelect={() => onEdit(goal)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Ajustar Limite
              </DropdownMenuItem>
              {goal.category_id ? (
                <DropdownMenuItem onSelect={() => setTransactionsDrawerOpen(true)}>
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Ver Transações
                </DropdownMenuItem>
              ) : null}
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
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusTone}`}>
              {progress.percentage}%
            </span>
          </div>

          <GoalProgress
            current={goal.current_amount}
            target={goal.target_amount}
            status={progress.status}
            showLabel={false}
            inverse
          />
        </div>

        <div className="space-y-3 rounded-[1.5rem] border border-border/60 bg-surface-elevated/45 p-4">
          {goal.streak_count > 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <Flame className="h-4 w-4 text-warning" />
              <span className="font-semibold text-warning">
                {goal.streak_count} {goal.streak_count === 1 ? 'mês' : 'meses'} consecutivos
              </span>
              {goal.best_streak > goal.streak_count ? (
                <span className="text-muted-foreground">(recorde: {goal.best_streak})</span>
              ) : null}
            </div>
          ) : null}

          <div className="text-sm">
            {progress.remaining > 0 ? (
              <span className="text-muted-foreground">
                Faltam <strong className="text-foreground">{formatCurrency(progress.remaining)}</strong> para o limite
              </span>
            ) : (
              <span className="font-semibold text-danger">
                Excedeu em {formatCurrency(Math.abs(progress.remaining))}
              </span>
            )}
          </div>

          {progress.projected_total && progress.projected_total > goal.target_amount ? (
            <div className="flex items-center gap-2 rounded-2xl bg-warning-subtle/80 p-2 text-sm text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                No ritmo atual, você vai gastar <strong>{formatCurrency(progress.projected_total)}</strong>
              </span>
            </div>
          ) : null}
        </div>

        {goal.category_id ? (
          <div className="mt-6">
            <SpendingCategoryTrendChart goal={goal} />
          </div>
        ) : null}

        {goal.period_start && goal.period_end ? (
          <div className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            {format(parseDateOnly(goal.period_start), 'dd/MM/yyyy', { locale: ptBR })} até{' '}
            {format(parseDateOnly(goal.period_end), 'dd/MM/yyyy', { locale: ptBR })}
            {progress.days_left !== undefined && progress.days_left >= 0 ? (
              <span className="ml-2">
                • {progress.days_left} {progress.days_left === 1 ? 'dia' : 'dias'} restantes
              </span>
            ) : null}
          </div>
        ) : null}

        {goal.category_id ? (
          <CategoryTransactionsDrawer
            open={transactionsDrawerOpen}
            onOpenChange={setTransactionsDrawerOpen}
            categoryId={goal.category_id}
            categoryName={goal.category_name || goal.name}
            categoryIcon={(() => {
              const name = goal.category_name || '';
              if (name === 'Alimentação') return 'Utensils';
              if (name === 'Transporte') return 'Car';
              if (name === 'Lazer') return 'Gamepad2';
              if (name === 'Saúde') return 'Heart';
              if (name === 'Educação') return 'GraduationCap';
              return 'Wallet';
            })()}
            categoryColor={(() => {
              if (progress.status === 'exceeded') return '#dc2626';
              if (progress.status === 'warning') return '#ea580c';
              return '#16a34a';
            })()}
            goalId={goal.id}
            periodStart={goal.period_start}
            periodEnd={goal.period_end}
          />
        ) : null}
      </Card>
    </motion.div>
  );
}
