import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
      <Card className="border-border/70 bg-surface/95 p-6 animate-pulse shadow-[0_22px_55px_rgba(3,8,20,0.28)] backdrop-blur-sm">
        <div className="mb-4 h-6 w-32 rounded bg-surface-elevated" />
        <div className="mb-2 h-4 w-full rounded bg-surface-elevated" />
        <div className="h-4 w-3/4 rounded bg-surface-elevated" />
      </Card>
    );
  }

  if (budgets.length === 0) {
    return (
      <Card className="border-border/70 bg-surface/95 p-6 shadow-[0_22px_55px_rgba(3,8,20,0.28)] backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-surface-elevated/80">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Metas de Gasto do Mês</h3>
            <p className="text-xs text-foreground/75">Nenhum limite mensal definido</p>
          </div>
        </div>
        <p className="mb-4 text-sm text-foreground/80">
          Defina limites por categoria na aba de metas para acompanhar o planejamento mensal.
        </p>
        <Button size="sm" onClick={() => navigate('/metas?tab=spending')} className="w-full">
          Planejar Gastos
        </Button>
      </Card>
    );
  }

  const isOverBudget = totalDifference < 0;
  const statusColor = isOverBudget ? 'text-danger' : 'text-emerald-300';
  const statusBg = isOverBudget
    ? 'border-danger-border bg-danger-subtle'
    : 'border-emerald-500/20 bg-emerald-500/12';
  const StatusIcon = isOverBudget ? AlertTriangle : CheckCircle2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full"
    >
      <Card className="border-border/70 bg-surface/95 p-6 h-full flex flex-col shadow-[0_22px_55px_rgba(3,8,20,0.28)] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${statusBg}`}>
              <StatusIcon className={`h-5 w-5 ${statusColor}`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Metas de Gasto do Mês</h3>
              <p className="text-xs text-foreground/75">{budgets.length} categorias</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/metas?tab=spending')}
            className="rounded-xl border border-border/70 bg-surface-elevated/70 text-foreground/80 hover:bg-surface-overlay hover:text-foreground"
          >
            Ver Detalhes
          </Button>
        </div>

        {/* Barra de Compliance */}
        <div className="mb-4 flex-1">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-foreground/80">Conformidade</span>
            <span className="font-semibold text-foreground">{compliance}%</span>
          </div>
          <div className="w-full rounded-full h-2 overflow-hidden bg-surface-overlay/80">
            <motion.div
              className="h-2 rounded-full bg-[linear-gradient(90deg,rgba(56,189,248,0.92),rgba(52,211,153,0.88))]"
              initial={{ width: 0 }}
              animate={{ width: `${compliance}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-emerald-500/15 bg-surface-elevated/75 p-2">
            <div className="text-lg font-bold text-emerald-300">{ok}</div>
            <div className="text-xs text-foreground/75">OK</div>
          </div>
          <div className="rounded-xl border border-amber-500/15 bg-surface-elevated/75 p-2">
            <div className="text-lg font-bold text-amber-300">{warning}</div>
            <div className="text-xs text-foreground/75">Atenção</div>
          </div>
          <div className="rounded-xl border border-danger-border bg-surface-elevated/75 p-2">
            <div className="text-lg font-bold text-danger">{exceeded}</div>
            <div className="text-xs text-foreground/75">Excedido</div>
          </div>
        </div>

        {/* Total */}
        <div className="mt-4 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-foreground/80">Gasto / Limite</span>
            <span className={`font-semibold ${statusColor}`}>
              {formatCurrency(totalActual)} / {formatCurrency(totalPlanned)}
            </span>
          </div>
          {totalPlanned > 0 && (
            <div className="text-xs text-right text-foreground/75">
              {((totalActual / totalPlanned) * 100).toFixed(0)}% dos limites
              {totalActual > totalPlanned && (
                <span className="ml-1 font-semibold text-danger">
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
            className="mt-3 rounded-xl border border-danger-border bg-[linear-gradient(135deg,rgba(127,29,29,0.18),rgba(15,23,42,0.9))] p-3"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger flex-shrink-0" />
              <p className="text-xs text-foreground/80">
                Você ultrapassou os limites do mês em {formatCurrency(Math.abs(totalDifference))}
              </p>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}
