import { cn } from '@/lib/cn';
import type { FinancialGoalWithCategory } from '@/types/database.types';

interface SavingsGoalCardListProps {
  goals: FinancialGoalWithCategory[];
  onCardTap: (goal: FinancialGoalWithCategory) => void;
  onAddValue: (goal: FinancialGoalWithCategory) => void;
  formatCurrency: (value: number) => string;
}

export function SavingsGoalCardList({
  goals,
  onCardTap,
  onAddValue,
  formatCurrency,
}: SavingsGoalCardListProps) {
  if (goals.length === 0) {
    return (
      <div className="lg:hidden px-2 py-10 text-center text-sm text-muted-foreground">
        Nenhuma meta de economia ainda.
      </div>
    );
  }

  return (
    <ul role="list" className="lg:hidden space-y-2 px-2 pb-4 pt-2">
      {goals.map((goal) => {
        const pct = Math.max(0, Math.min(100, goal.percentage ?? 0));
        const isActive = goal.status === 'active';
        const daysLabel = goal.days_left != null ? `${goal.days_left}d` : '';
        return (
          <li key={goal.id} role="listitem">
            <div className="rounded-xl border-l-[3px] border-l-emerald-500 bg-surface-elevated/60 px-3 py-3">
              <button
                type="button"
                onClick={() => onCardTap(goal)}
                aria-label={goal.name}
                className="block w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-base">{goal.icon ?? '🎯'}</span>
                  <span className="flex-1 truncate text-sm font-bold text-foreground">{goal.name}</span>
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300">
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progresso de ${goal.name}`}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/40"
                >
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{formatCurrency(goal.current_amount ?? 0)} / {formatCurrency(goal.target_amount ?? 0)}</span>
                  {daysLabel ? <span>{daysLabel}</span> : null}
                </div>
              </button>
              {isActive ? (
                <button
                  type="button"
                  onClick={() => onAddValue(goal)}
                  aria-label="Adicionar valor"
                  className={cn(
                    'mt-3 inline-flex w-full items-center justify-center rounded-lg bg-purple-500/15 px-3 py-2 text-xs font-semibold text-purple-300 transition-colors hover:bg-purple-500/25',
                  )}
                >
                  + Adicionar valor
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
