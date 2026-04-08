import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, ArrowRight, TrendingUp, AlertCircle, Flame, Trophy } from 'lucide-react';
import { useGoalsQuery } from '@/hooks/useGoalsQuery';
import { formatCurrency } from '@/utils/formatters';
import { formatMonthKey, getSpendingGoalsForMonth } from '@/utils/spendingGoalPlanning';
import type { FinancialGoalWithCategory } from '@/types/database.types';

export function GoalsSummaryWidget() {
  const { goals, loading, getStats } = useGoalsQuery();
  const navigate = useNavigate();
  const stats = getStats();
  const currentMonth = formatMonthKey(new Date());

  const savingsGoals = goals.filter(g => g.goal_type === 'savings');
  const spendingGoals = getSpendingGoalsForMonth(goals as FinancialGoalWithCategory[], currentMonth);

  const totalSavingsTarget = savingsGoals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalSavingsCurrent = savingsGoals.reduce((sum, g) => sum + g.current_amount, 0);
  const savingsPercentage = totalSavingsTarget > 0 
    ? Math.round((totalSavingsCurrent / totalSavingsTarget) * 100) 
    : 0;

  const limitsComplied = spendingGoals.filter(g => g.status === 'active').length;
  const limitsExceeded = spendingGoals.filter(g => g.status === 'exceeded').length;
  const totalSpendingGoals = spendingGoals.length;

  // Contar badges desbloqueados
  const unlockedBadges = [
    stats.total_goals >= 1,
    stats.best_streak >= 3,
    stats.best_streak >= 6,
    stats.completed_goals >= 1,
    stats.total_savings >= 10000,
  ].filter(Boolean).length;

  const showSkeleton = loading && goals.length === 0;

  if (showSkeleton) {
    return (
      <Card className="border-border/70 bg-surface/95 p-6 shadow-[0_22px_55px_rgba(3,8,20,0.28)] backdrop-blur-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/3 rounded bg-surface-elevated"></div>
          <div className="h-4 w-2/3 rounded bg-surface-elevated"></div>
          <div className="h-4 w-1/2 rounded bg-surface-elevated"></div>
        </div>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card className="border-border/70 bg-surface/95 p-6 shadow-[0_22px_55px_rgba(3,8,20,0.28)] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Suas Metas
          </h3>
        </div>
        <div className="text-center py-8">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/70 bg-surface-elevated/80">
            <Target className="h-8 w-8 text-primary/80" />
          </div>
          <p className="mb-4 text-foreground/80">Você ainda não tem metas</p>
          <Button onClick={() => navigate('/metas')} size="sm">
            Criar Primeira Meta
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-surface/95 p-6 h-full flex flex-col shadow-[0_22px_55px_rgba(3,8,20,0.28)] backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Suas Metas
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/metas')}
          className="rounded-xl border border-border/70 bg-surface-elevated/70 text-foreground/80 hover:bg-surface-overlay hover:text-foreground"
        >
          Ver Todas <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-4 flex-1">
        {/* Metas de Economia */}
        {savingsGoals.length > 0 && (
          <div className="rounded-xl border border-primary/15 bg-surface-elevated/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/15">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {savingsGoals.length} {savingsGoals.length === 1 ? 'meta' : 'metas'} de economia ativas
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(totalSavingsCurrent)}
              </span>
              <span className="text-sm text-foreground/75">
                / {formatCurrency(totalSavingsTarget)} ({savingsPercentage}%)
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-surface-overlay/80 overflow-hidden">
              <div 
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(130,92,255,0.92),rgba(91,164,255,0.88))] transition-all duration-500"
                style={{ width: `${Math.min(savingsPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Metas de Gastos */}
        {spendingGoals.length > 0 && (
          <div
            className={`rounded-xl border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${
              limitsExceeded > 0
                ? 'border-danger-border bg-surface-elevated/80'
                : 'border-emerald-500/20 bg-surface-elevated/80'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ring-1 ${
                  limitsExceeded > 0
                    ? 'bg-danger-subtle ring-danger-border'
                    : 'bg-emerald-500/12 ring-emerald-500/20'
                }`}
              >
                <AlertCircle className={`h-4 w-4 ${limitsExceeded > 0 ? 'text-danger' : 'text-success dark:text-emerald-300'}`} />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {limitsComplied} de {totalSpendingGoals} limites cumpridos neste mês
              </span>
            </div>
            {limitsExceeded > 0 && (
              <p className="text-sm text-foreground/80">
                {limitsExceeded} {limitsExceeded === 1 ? 'meta excedida' : 'metas excedidas'}
              </p>
            )}
          </div>
        )}

        {/* Melhor Streak */}
        {stats.best_streak > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-foreground/80">Melhor streak:</span>
            </div>
            <span className="font-bold text-orange-600">
              {stats.best_streak} {stats.best_streak === 1 ? 'mês' : 'meses'}
            </span>
          </div>
        )}

        {/* Conquistas */}
        {unlockedBadges > 0 && (
          <div className="flex items-center justify-between border-t border-border/60 pt-3 text-sm">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span className="text-foreground/80">Conquistas desbloqueadas:</span>
            </div>
            <span className="font-bold text-yellow-600">
              {unlockedBadges}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
