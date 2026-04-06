import { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Edit2, Trash2, TrendingDown, Flame, Utensils, Car, Gamepad2, Heart, GraduationCap, Wallet, AlertTriangle } from 'lucide-react';
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

export function SpendingGoalCard({
  goal,
  onEdit,
  onDelete,
  onViewTransactions,
}: SpendingGoalCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [transactionsDrawerOpen, setTransactionsDrawerOpen] = useState(false);
  const progress = useGoalProgress({ goal });

  const periodLabel = goal.period_type === 'monthly' ? 'Mensal' :
                      goal.period_type === 'quarterly' ? 'Trimestral' : 'Anual';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className={`
        relative overflow-hidden p-6 transition-all duration-300
        ${isHovered ? 'shadow-xl scale-[1.02]' : 'shadow-md'}
        ${progress.status === 'exceeded' ? 'border-l-4 border-l-red-500' : ''}
        ${progress.status === 'warning' ? 'border-l-4 border-l-orange-500' : ''}
        ${progress.status === 'safe' ? 'border-l-4 border-l-green-500' : ''}
      `}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Ícone da categoria (Lucide) */}
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center
              ${progress.status === 'exceeded' ? 'bg-red-100 text-red-600' : ''}
              ${progress.status === 'warning' ? 'bg-orange-100 text-orange-600' : ''}
              ${progress.status === 'safe' ? 'bg-green-100 text-green-600' : ''}
            `}>
              {(() => {
                const name = goal.category_name || '';
                if (name === 'Alimentação') return <Utensils className="h-6 w-6" />;
                if (name === 'Transporte') return <Car className="h-6 w-6" />;
                if (name === 'Lazer') return <Gamepad2 className="h-6 w-6" />;
                if (name === 'Saúde') return <Heart className="h-6 w-6" />;
                if (name === 'Educação') return <GraduationCap className="h-6 w-6" />;
                return <Wallet className="h-6 w-6" />;
              })()}
            </div>
            
            <div>
              <h3 className="font-semibold text-lg text-gray-900">
                {goal.category_name || goal.name}
              </h3>
              <p className="text-sm text-gray-500">{periodLabel}</p>
            </div>
          </div>

          {/* Menu de ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(goal)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Ajustar Limite
              </DropdownMenuItem>
              {goal.category_id && (
                <DropdownMenuItem onSelect={() => setTransactionsDrawerOpen(true)}>
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Ver Transações
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onSelect={() => onDelete(goal.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Meta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Valores */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(goal.current_amount)}
              </span>
              <span className="text-gray-500 mx-2">/</span>
              <span className="text-lg font-semibold text-gray-600">
                {formatCurrency(goal.target_amount)}
              </span>
            </div>
            <span className={`
              text-sm font-semibold px-3 py-1 rounded-full
              ${progress.status === 'exceeded' ? 'bg-red-100 text-red-700' : ''}
              ${progress.status === 'warning' ? 'bg-orange-100 text-orange-700' : ''}
              ${progress.status === 'safe' ? 'bg-green-100 text-green-700' : ''}
            `}>
              {progress.percentage}%
            </span>
          </div>

          {/* Progress Bar */}
          <GoalProgress
            current={goal.current_amount}
            target={goal.target_amount}
            status={progress.status}
            showLabel={false}
            inverse={true}
          />
        </div>

        {/* Informações adicionais */}
        <div className="space-y-2">
          {/* Streak */}
          {goal.streak_count > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-orange-600">
                {goal.streak_count} {goal.streak_count === 1 ? 'mês' : 'meses'} consecutivos
              </span>
              {goal.best_streak > goal.streak_count && (
                <span className="text-gray-500">
                  (recorde: {goal.best_streak})
                </span>
              )}
            </div>
          )}

          {/* Restante */}
          <div className="flex items-center justify-between text-sm">
            {progress.remaining > 0 ? (
              <span className="text-gray-600">
                Faltam <strong className="text-gray-900">{formatCurrency(progress.remaining)}</strong> para o limite
              </span>
            ) : (
              <span className="text-red-600 font-semibold">
                Excedeu em {formatCurrency(Math.abs(progress.remaining))}
              </span>
            )}
          </div>

          {/* Projeção */}
          {progress.projected_total && progress.projected_total > goal.target_amount && (
            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded-lg">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>No ritmo atual, você vai gastar <strong>{formatCurrency(progress.projected_total)}</strong></span>
            </div>
          )}
        </div>

        {/* Gráfico de tendência de gastos da categoria (últimos 6 meses) */}
        {goal.category_id && (
          <div className="mt-6">
            <SpendingCategoryTrendChart goal={goal} />
          </div>
        )}

        {/* Período */}
        {goal.period_start && goal.period_end && (
          <div className="text-xs text-gray-500 pt-2 border-t mt-4">
            {format(parseDateOnly(goal.period_start), 'dd/MM/yyyy', { locale: ptBR })} até{' '}
            {format(parseDateOnly(goal.period_end), 'dd/MM/yyyy', { locale: ptBR })}
            {progress.days_left !== undefined && progress.days_left >= 0 && (
              <span className="ml-2">
                • {progress.days_left} {progress.days_left === 1 ? 'dia' : 'dias'} restantes
              </span>
            )}
          </div>
        )}

        {/* Drawer de Transações */}
        {goal.category_id && (
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
        )}
      </Card>
    </motion.div>
  );
}
