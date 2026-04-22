import { Shield } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { FinancialGoalWithCategory } from '@/types/goals.types';

interface SpendingGoalCardListProps {
  goals: FinancialGoalWithCategory[];
  onCardTap: (goal: FinancialGoalWithCategory) => void;
  formatCurrency: (value: number) => string;
}

function badgeClass(pct: number): string {
  if (pct > 100) return 'bg-red-500/15 text-red-300';
  if (pct >= 80) return 'bg-orange-500/15 text-orange-300';
  return 'bg-emerald-500/15 text-emerald-300';
}

export function SpendingGoalCardList({
  goals,
  onCardTap,
  formatCurrency,
}: SpendingGoalCardListProps) {
  if (goals.length === 0) {
    return (
      <div className="lg:hidden px-2 py-10 text-center text-sm text-muted-foreground">
        Nenhum limite de gasto cadastrado.
      </div>
    );
  }

  return (
    <ul role="list" className="lg:hidden space-y-2 px-2 pb-4 pt-2">
      {goals.map((goal) => {
        const pct = Math.max(0, goal.percentage ?? 0);
        const fillWidth = Math.min(100, pct);
        const overspent = pct > 100 ? (goal.current_amount ?? 0) - (goal.target_amount ?? 0) : 0;
        return (
          <li key={goal.id} role="listitem">
            <button
              type="button"
              data-testid="spending-card"
              onClick={() => onCardTap(goal)}
              aria-label={goal.name}
              className={cn(
                'block w-full rounded-xl border-l-[3px] border-l-orange-500 bg-surface-elevated/60 px-3 py-3 text-left transition-colors hover:bg-surface-elevated',
              )}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                <span className="flex-1 truncate text-sm font-bold text-foreground">{goal.name}</span>
                <span
                  data-testid="pct-badge"
                  className={cn(
                    'rounded-md px-2 py-0.5 text-xs font-bold',
                    badgeClass(pct),
                  )}
                >
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={fillWidth}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Uso do limite ${goal.name}`}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/40"
              >
                <div className="h-full bg-orange-500" style={{ width: `${fillWidth}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{formatCurrency(goal.current_amount ?? 0)} / {formatCurrency(goal.target_amount ?? 0)}</span>
                {overspent > 0 ? (
                  <span className="text-red-300 font-semibold">+{formatCurrency(overspent)} acima</span>
                ) : (
                  <span>resta {formatCurrency(Math.max(0, (goal.target_amount ?? 0) - (goal.current_amount ?? 0)))}</span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
