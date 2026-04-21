import { RefreshCw, Wallet } from 'lucide-react';
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
      className="relative lg:hidden mx-2 mt-4 overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-[#1a1a2e] via-[#1a1f3a] to-[#16213e] p-5 text-foreground shadow-[0_18px_44px_rgba(15,23,42,0.45)]"
    >
      {/* subtle radial accent top-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-purple-500/25 to-transparent blur-2xl"
      />
      {/* thin top inner highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      {/* Top row: title block + icon */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-foreground">Patrimônio</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Carteira atual</p>
        </div>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-[0_10px_24px_rgba(79,70,229,0.4)]">
          <Wallet className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
      </div>

      {/* Big value + comparison */}
      <div className="relative mt-4">
        <div className="text-[2rem] font-extrabold leading-none text-foreground [font-variant-numeric:tabular-nums]">
          {formatCurrency(currentValue)}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          / {formatCurrency(totalInvested)} investido
        </div>
      </div>

      {/* Secondary key-value rows */}
      <div className="relative mt-4 space-y-2 border-t border-white/[0.08] pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Rendimento total</span>
          <span
            data-testid="hero-delta"
            className={cn(
              'inline-flex items-center gap-1 font-bold [font-variant-numeric:tabular-nums]',
              positive ? 'text-emerald-300' : 'text-red-300',
            )}
          >
            <span>{positive ? '▲' : '▼'}</span>
            <span>{Math.abs(totalReturnPct).toFixed(1).replace('.', ',')}%</span>
            <span className="text-xs font-medium opacity-80">
              ({positive ? '+' : '-'}
              {formatCurrency(Math.abs(totalReturn))})
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Yield / mês</span>
          <span className="font-bold text-foreground [font-variant-numeric:tabular-nums]">
            {formatCurrency(monthlyYield)}
          </span>
        </div>
      </div>

      {(marketStatusLabel || lastUpdateLabel || onRefresh) ? (
        <div className="relative mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-2">
            {marketStatusLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className={cn(
                      'absolute inline-flex h-full w-full rounded-full opacity-60',
                      marketIsOpen ? 'animate-ping bg-emerald-400' : 'bg-slate-500',
                    )}
                  />
                  <span
                    className={cn(
                      'relative inline-flex h-1.5 w-1.5 rounded-full',
                      marketIsOpen ? 'bg-emerald-400' : 'bg-slate-500',
                    )}
                  />
                </span>
                <span className="font-medium">{marketStatusLabel}</span>
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
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-purple-300 transition-colors hover:bg-purple-500/10 hover:text-purple-200 disabled:opacity-50"
            >
              <RefreshCw size={11} className={cn(refreshing && 'animate-spin')} aria-hidden="true" />
              <span className="font-medium">Atualizar</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
