import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/utils/formatters';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalsQuery } from '@/hooks/useGoalsQuery';
import { summarizeBudgetItems, toBudgetItemsFromSpendingGoals } from '@/utils/spendingGoalPlanning';
import type { FinancialGoalWithCategory } from '@/types/database.types';

interface BudgetComplianceWidgetProps {
  monthKey?: string;
}

export function BudgetComplianceWidget({ monthKey }: BudgetComplianceWidgetProps) {
  const navigate = useNavigate();
  const currentMonth = useMemo(() => {
    if (monthKey) return monthKey;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [monthKey]);

  const { goals, loading } = useGoalsQuery();
  const budgets = useMemo(
    () => toBudgetItemsFromSpendingGoals(goals as FinancialGoalWithCategory[], currentMonth),
    [currentMonth, goals]
  );
  const { totalPlanned, totalActual, totalDifference } = useMemo(
    () => summarizeBudgetItems(budgets),
    [budgets]
  );

  const exceeded = budgets.filter((b) => b.status === 'exceeded').length;
  const warning = budgets.filter((b) => b.status === 'warning').length;
  const ok = budgets.filter((b) => b.status === 'ok').length;
  const compliance = budgets.length > 0 ? Math.round((ok / budgets.length) * 100) : 0;

  const showSkeleton = loading && budgets.length === 0;
  if (showSkeleton) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
        <div className="h-4 w-full bg-gray-200 rounded mb-2" />
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
      </Card>
    );
  }

  if (budgets.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Metas de Gasto do Mês</h3>
            <p className="text-xs text-gray-500">Nenhum limite mensal definido</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Defina limites por categoria na aba de metas para acompanhar o planejamento mensal.
        </p>
        <Button size="sm" onClick={() => navigate('/metas?tab=spending')} className="w-full">
          Planejar Gastos
        </Button>
      </Card>
    );
  }

  const isOverBudget = totalDifference < 0;
  const statusColor = isOverBudget ? 'text-red-600' : 'text-green-600';
  const statusBg = isOverBudget ? 'bg-red-50' : 'bg-green-50';
  const StatusIcon = isOverBudget ? AlertTriangle : CheckCircle2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full"
    >
      <Card className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${statusBg} flex items-center justify-center`}>
              <StatusIcon className={`h-5 w-5 ${statusColor}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Metas de Gasto do Mês</h3>
              <p className="text-xs text-gray-500">{budgets.length} categorias</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate('/metas?tab=spending')}>
            Ver Detalhes
          </Button>
        </div>

        {/* Barra de Compliance */}
        <div className="mb-4 flex-1">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Conformidade</span>
            <span className="font-semibold text-gray-900">{compliance}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-green-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${compliance}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{ok}</div>
            <div className="text-xs text-gray-600">OK</div>
          </div>
          <div className="p-2 bg-yellow-50 rounded-lg">
            <div className="text-lg font-bold text-yellow-600">{warning}</div>
            <div className="text-xs text-gray-600">Atenção</div>
          </div>
          <div className="p-2 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">{exceeded}</div>
            <div className="text-xs text-gray-600">Excedido</div>
          </div>
        </div>

        {/* Total */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Gasto / Limite</span>
            <span className={`font-semibold ${statusColor}`}>
              {formatCurrency(totalActual)} / {formatCurrency(totalPlanned)}
            </span>
          </div>
          {totalPlanned > 0 && (
            <div className="text-xs text-right text-gray-500">
              {((totalActual / totalPlanned) * 100).toFixed(0)}% dos limites
              {totalActual > totalPlanned && (
                <span className="text-red-600 font-semibold ml-1">
                  (+{(((totalActual / totalPlanned) * 100) - 100).toFixed(0)}%)
                </span>
              )}
            </div>
          )}
        </div>

        {isOverBudget && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-700">
                Você ultrapassou os limites do mês em {formatCurrency(Math.abs(totalDifference))}
              </p>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}
