import { cn } from '@/lib/cn';
import type { Investment } from '@/types/database.types';

interface PortfolioCardListProps {
  investments: Investment[];
  onCardTap: (investment: Investment) => void;
  formatCurrency: (value: number) => string;
  isLoading?: boolean;
}

const TYPE_BORDER: Record<string, string> = {
  stock: 'border-l-blue-500',
  fund: 'border-l-purple-500',
  treasury: 'border-l-emerald-500',
  crypto: 'border-l-orange-500',
  real_estate: 'border-l-amber-500',
  other: 'border-l-slate-500',
};

const TYPE_LABEL: Record<string, string> = {
  stock: 'Ação',
  fund: 'FII',
  treasury: 'TD',
  crypto: 'Crypto',
  real_estate: 'Imóvel',
  other: 'Outro',
};

const TYPE_BADGE: Record<string, string> = {
  stock: 'bg-blue-500/15 text-blue-300',
  fund: 'bg-purple-500/15 text-purple-300',
  treasury: 'bg-emerald-500/15 text-emerald-300',
  crypto: 'bg-orange-500/15 text-orange-300',
  real_estate: 'bg-amber-500/15 text-amber-300',
  other: 'bg-slate-500/15 text-slate-300',
};

export function PortfolioCardList({
  investments,
  onCardTap,
  formatCurrency,
}: PortfolioCardListProps) {
  if (investments.length === 0) {
    return (
      <div className="lg:hidden px-4 py-10 text-center text-sm text-muted-foreground">
        Nenhum ativo cadastrado ainda.
      </div>
    );
  }

  return (
    <ul role="list" className="lg:hidden space-y-2 px-4 pb-4 pt-2">
      {investments.map((inv) => {
        const type = inv.type ?? 'other';
        const borderClass = TYPE_BORDER[type] ?? TYPE_BORDER.other;
        const badgeClass = TYPE_BADGE[type] ?? TYPE_BADGE.other;
        const badgeLabel = TYPE_LABEL[type] ?? TYPE_LABEL.other;
        const returnAbs = (inv.current_value ?? 0) - (inv.total_invested ?? 0);
        const returnPct =
          inv.total_invested && inv.total_invested > 0
            ? (returnAbs / inv.total_invested) * 100
            : 0;
        const positive = returnAbs >= 0;
        return (
          <li key={inv.id} role="listitem">
            <button
              type="button"
              aria-label={inv.ticker ?? inv.name}
              data-testid="portfolio-card"
              onClick={() => onCardTap(inv)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border-l-[3px] bg-surface-elevated/60 px-3 py-3 text-left transition-colors hover:bg-surface-elevated',
                borderClass,
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{inv.ticker}</span>
                  <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold', badgeClass)}>
                    {badgeLabel}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{inv.name}</div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {inv.quantity} un · {formatCurrency(inv.purchase_price ?? 0)}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-sm font-bold text-foreground">
                  {formatCurrency(inv.current_value ?? 0)}
                </div>
                <div
                  data-testid="return-pct"
                  className={cn(
                    'mt-0.5 text-xs font-semibold',
                    positive ? 'text-emerald-400' : 'text-red-400',
                  )}
                >
                  {positive ? '▲' : '▼'} {Math.abs(returnPct).toFixed(1).replace('.', ',')}%
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
