import { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Edit2, Trash2, Plus, TrendingUp, PiggyBank, Calendar, DollarSign, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
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
import { format, differenceInMonths } from 'date-fns';
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

  // Calcular aporte sugerido
  const monthsRemaining = goal.deadline 
    ? Math.max(1, differenceInMonths(new Date(goal.deadline), new Date()))
    : 1;
  const suggestedMonthlyContribution = progress.remaining > 0 
    ? progress.remaining / monthsRemaining 
    : 0;

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
        ${progress.status === 'exceeded' ? 'border-l-4 border-l-green-500' : ''}
        ${progress.status === 'warning' ? 'border-l-4 border-l-blue-500' : ''}
        ${progress.status === 'safe' ? 'border-l-4 border-l-gray-400' : ''}
      `}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Ícone (Lucide + gradiente) */}
            <GradientIcon icon={PiggyBank} colors={["#3b82f6", "#8b5cf6"]} size="sm" />

            <div>
              <h3 className="font-semibold text-lg text-gray-900">
                {goal.name}
              </h3>
              <p className="text-sm text-gray-500">Meta de Economia</p>
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
              <DropdownMenuItem onSelect={() => onAddValue(goal)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Valor
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(goal)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Editar Meta
              </DropdownMenuItem>
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
              ${progress.status === 'exceeded' ? 'bg-green-100 text-green-700' : ''}
              ${progress.status === 'warning' ? 'bg-blue-100 text-blue-700' : ''}
              ${progress.status === 'safe' ? 'bg-gray-100 text-gray-700' : ''}
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
            inverse={false}
          />
        </div>

        {/* Informações adicionais */}
        <div className="space-y-2">
          {/* Prazo */}
          {goal.deadline && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-2"><Calendar className="h-4 w-4" /> Prazo:</span>
              <span className="font-semibold text-gray-900">
                {format(new Date(goal.deadline), 'MMM/yyyy', { locale: ptBR })}
              </span>
            </div>
          )}

          {/* Restante */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-2"><DollarSign className="h-4 w-4" /> Faltam:</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(Math.max(0, progress.remaining))}
            </span>
          </div>

          {/* Aporte sugerido */}
          {progress.remaining > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Aporte sugerido:</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(suggestedMonthlyContribution)}/mês
              </span>
            </div>
          )}

          {/* Meta alcançada */}
          {progress.percentage >= 100 && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded-lg font-semibold text-center flex items-center justify-center gap-2">
              <Trophy className="h-4 w-4" /> Meta alcançada! Parabéns!
            </div>
          )}

          {/* Dias restantes */}
          {progress.days_left !== undefined && progress.days_left >= 0 && (
            <div className="text-xs text-gray-500 pt-2 border-t">
              {progress.days_left} {progress.days_left === 1 ? 'dia' : 'dias'} restantes
            </div>
          )}
        </div>

        {/* Gráfico de histórico (colapsável) */}
        <div className="mt-6">
          <button
            type="button"
            className="w-full flex items-center justify-between rounded-lg border p-3 bg-white hover:bg-gray-50 transition-colors"
            onClick={() => setShowChart((v) => !v)}
            aria-expanded={showChart}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <TrendingUp className="h-4 w-4" /> Progresso no Tempo
            </div>
            {showChart ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          </button>
          {showChart && (
            <div className="mt-4">
              <GoalProgressHistoryChart goal={goal} />
            </div>
          )}
        </div>

        {/* Botões de ação */}
        <div className="mt-6 flex gap-2">
          <Button
            className="flex-1"
            size="sm"
            onClick={() => onAddValue(goal)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Valor
          </Button>
          <Button
            className="flex-1"
            size="sm"
            variant="outline"
            onClick={() => onEdit(goal)}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Editar
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
