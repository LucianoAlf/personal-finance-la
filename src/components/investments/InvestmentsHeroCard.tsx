import { cn } from '@/lib/cn';

interface InvestmentsHeroCardProps {
  currentValue: number;
  totalInvested: number;
  totalReturn: number;
  totalReturnPct: number;
  monthlyYield: number;
  formatCurrency: (value: number) => string;
}

export function InvestmentsHeroCard({
  currentValue,
  totalInvested,
  totalReturn,
  totalReturnPct,
  monthlyYield,
  formatCurrency,
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
    </section>
  );
}
