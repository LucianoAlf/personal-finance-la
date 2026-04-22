import { cn } from '@/lib/cn';

export interface InvestmentGoalItem {
  id: string;
  name: string;
  icon?: string | null;
  target_amount: number;
  current_amount: number;
  percentage: number;
}

interface InvestmentGoalCardListProps {
  goals: InvestmentGoalItem[];
  onCardTap: (goal: InvestmentGoalItem) => void;
  formatCurrency: (value: number) => string;
}

export function InvestmentGoalCardList({
  goals,
  onCardTap,
  formatCurrency,
}: InvestmentGoalCardListProps) {
  if (goals.length === 0) {
    return (
      <div className="lg:hidden px-2 py-10 text-center text-sm text-muted-foreground">
        Nenhuma meta de investimento cadastrada.
      </div>
    );
  }

  return (
    <ul role="list" className="lg:hidden space-y-2 px-2 pb-4 pt-2">
      {goals.map((goal) => {
        const pct = Math.max(0, Math.min(100, goal.percentage ?? 0));
        return (
          <li key={goal.id} role="listitem">
            <button
              type="button"
              data-testid="invest-goal-card"
              onClick={() => onCardTap(goal)}
              aria-label={goal.name}
              className={cn(
                'block w-full rounded-xl border-l-[3px] border-l-blue-500 bg-surface-elevated/60 px-3 py-3 text-left transition-colors hover:bg-surface-elevated',
              )}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-base">{goal.icon ?? '📈'}</span>
                <span className="flex-1 truncate text-sm font-bold text-foreground">{goal.name}</span>
                <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-xs font-bold text-blue-300">
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
                <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
