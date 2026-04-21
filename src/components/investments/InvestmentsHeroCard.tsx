import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';

interface InvestmentsHeroCardProps {
  currentValue: number;
  totalInvested: number;
  totalReturn: number;
  totalReturnPct: number;
  monthlyYield: number;
  formatCurrency: (value: number) => string;
  marketStatusLabel?: string;
  lastUpdateLabel?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  marketIsOpen?: boolean;
}

export function InvestmentsHeroCard({
  currentValue,
  totalInvested,
  totalReturn,
  totalReturnPct,
  monthlyYield,
  formatCurrency,
  marketStatusLabel,
  lastUpdateLabel,
  onRefresh,
  refreshing,
  marketIsOpen,
}: InvestmentsHeroCardProps) {
  const positive = totalReturn >= 0;
  return (
    <section
      aria-label="Resumo do portfolio"
      className="lg:hidden mx-4 mt-4 rounded-2xl border border-border/60 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-4 text-foreground"
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Patrimônio
      </div>
      <div className="mt-1 text-3xl font-extrabold leading-none text-foreground">
        {formatCurrency(currentValue)}
      </div>
      <div
        data-testid="hero-delta"
        className={cn(
          'mt-2 text-sm font-semibold',
          positive ? 'text-emerald-400' : 'text-red-400',
        )}
      >
        <span>{positive ? '▲' : '▼'}</span>
        <span className="ml-1">
          {Math.abs(totalReturnPct).toFixed(1).replace('.', ',')}%
        </span>
        <span className="ml-2 text-xs opacity-80">
          {positive ? '+' : '-'}
          {formatCurrency(Math.abs(totalReturn))} total
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Investido
          </div>
          <div className="mt-0.5 text-sm font-bold text-foreground">
            {formatCurrency(totalInvested)}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Yield/mês
          </div>
          <div className="mt-0.5 text-sm font-bold text-foreground">
            {formatCurrency(monthlyYield)}
          </div>
        </div>
      </div>
      {(marketStatusLabel || lastUpdateLabel || onRefresh) ? (
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {marketStatusLabel ? (
              <span className="flex items-center gap-1">
                <span className={cn('h-1.5 w-1.5 rounded-full', marketIsOpen ? 'bg-emerald-400' : 'bg-slate-500')} />
                {marketStatusLabel}
              </span>
            ) : null}
            {marketStatusLabel && lastUpdateLabel ? <span className="text-muted-foreground/40">·</span> : null}
            {lastUpdateLabel ? <span>{lastUpdateLabel}</span> : null}
          </span>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Atualizar cotações"
              className="inline-flex items-center gap-1 text-purple-300 hover:text-purple-200 disabled:opacity-50"
            >
              <RefreshCw size={11} className={cn(refreshing && 'animate-spin')} aria-hidden="true" />
              <span>Atualizar</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
