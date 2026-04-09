import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TrendingUp, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMonthlyReturns } from '@/hooks/useMonthlyReturns';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

function getHeatColor(returnPct: number): string {
  if (returnPct > 10) return 'bg-emerald-600/90 hover:bg-emerald-600';
  if (returnPct > 5) return 'bg-emerald-500/85 hover:bg-emerald-500';
  if (returnPct > 2) return 'bg-emerald-400/85 hover:bg-emerald-400';
  if (returnPct > 0) return 'bg-emerald-300/90 hover:bg-emerald-300';
  if (returnPct === 0) return 'bg-slate-300/90 hover:bg-slate-300';
  if (returnPct > -2) return 'bg-rose-300/90 hover:bg-rose-300';
  if (returnPct > -5) return 'bg-rose-400/85 hover:bg-rose-400';
  if (returnPct > -10) return 'bg-rose-500/85 hover:bg-rose-500';
  return 'bg-rose-600/90 hover:bg-rose-600';
}

function getPerformanceLabel(returnPct: number): string {
  if (returnPct > 10) return 'Excelente';
  if (returnPct > 5) return 'Muito bom';
  if (returnPct > 2) return 'Bom';
  if (returnPct > 0) return 'Positivo';
  if (returnPct === 0) return 'Neutro';
  if (returnPct > -2) return 'Levemente negativo';
  if (returnPct > -5) return 'Negativo';
  if (returnPct > -10) return 'Muito negativo';
  return 'Crítico';
}

const shellClassName =
  'rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]';

function normalizeNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PerformanceHeatMap() {
  const monthlyReturns = useMonthlyReturns();
  const avgReturn = monthlyReturns.reduce((sum, m) => sum + m.return, 0) / monthlyReturns.length;
  const bestMonth = monthlyReturns.reduce(
    (best, m) => (m.return > best.return ? m : best),
    monthlyReturns[0] || { return: 0, month: '' }
  );
  const worstMonth = monthlyReturns.reduce(
    (worst, m) => (m.return < worst.return ? m : worst),
    monthlyReturns[0] || { return: 0, month: '' }
  );

  return (
    <Card className={shellClassName}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Performance Mensal Estimada (12 meses)
          </CardTitle>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Informações sobre a visualização de performance mensal"
                  className="rounded-full border border-border/70 bg-surface-elevated/45 p-2 text-muted-foreground transition hover:bg-surface-elevated/60 hover:text-foreground"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs rounded-2xl border border-border/70 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-xl">
                <p className="text-sm">
                  Visualização estilo GitHub baseada no replay das transações. Ainda não usa marcação a
                  mercado histórica por mês.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-6 gap-2 md:grid-cols-12">
          {monthlyReturns.map((month, index) => (
            <TooltipProvider key={month.date.toISOString()}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    type="button"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.04,
                      type: 'spring',
                    }}
                    className={cn(
                      'aspect-square rounded-md border border-transparent shadow-sm transition-all',
                      'hover:scale-110 hover:border-border/70',
                      getHeatColor(month.return)
                    )}
                    aria-label={`${month.month}: ${month.return.toFixed(2)}%`}
                  />
                </TooltipTrigger>
                <TooltipContent className="rounded-2xl border border-border/70 bg-popover/95 p-3 text-popover-foreground shadow-xl backdrop-blur-xl">
                  <div className="space-y-1 text-center">
                    <p className="font-semibold tracking-tight text-foreground">{month.month}</p>
                    <p
                      className={cn(
                        'text-lg font-bold',
                        month.return >= 0
                          ? 'text-emerald-500 dark:text-emerald-400'
                          : 'text-rose-500'
                      )}
                    >
                      {month.return >= 0 ? '+' : ''}
                      {month.return.toFixed(2)}%
                    </p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(month.value)}</p>
                    <p className="text-xs text-muted-foreground">{getPerformanceLabel(month.return)}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Menos</span>
          <div className="h-4 w-4 rounded border border-border/60 bg-rose-600/90" />
          <div className="h-4 w-4 rounded border border-border/60 bg-rose-400/85" />
          <div className="h-4 w-4 rounded border border-border/60 bg-rose-200/90" />
          <div className="h-4 w-4 rounded border border-border/60 bg-slate-300/90" />
          <div className="h-4 w-4 rounded border border-border/60 bg-emerald-200/90" />
          <div className="h-4 w-4 rounded border border-border/60 bg-emerald-400/85" />
          <div className="h-4 w-4 rounded border border-border/60 bg-emerald-600/90" />
          <span>Mais</span>
        </div>

        <div className="grid grid-cols-3 gap-4 rounded-2xl border border-border/60 bg-surface-elevated/45 p-4">
          <div className="text-center">
            <p className="mb-1 text-xs text-muted-foreground">Retorno médio</p>
            <p
              className={cn(
                'text-lg font-bold tracking-tight',
                avgReturn >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500'
              )}
            >
              {avgReturn >= 0 ? '+' : ''}
              {normalizeNumber(avgReturn).toFixed(2)}%
            </p>
          </div>

          <div className="text-center border-x border-border/70">
            <p className="mb-1 text-xs text-muted-foreground">Melhor mês</p>
            <p className="text-lg font-bold tracking-tight text-emerald-500 dark:text-emerald-400">
              +{normalizeNumber(bestMonth.return).toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">{bestMonth.month}</p>
          </div>

          <div className="text-center">
            <p className="mb-1 text-xs text-muted-foreground">Pior mês</p>
            <p className="text-lg font-bold tracking-tight text-rose-500">
              {normalizeNumber(worstMonth.return).toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">{worstMonth.month}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-border/60 bg-surface-elevated/35 p-4 text-sm text-muted-foreground">
          Esta seção é uma estimativa operacional baseada no histórico de transações e no custo médio.
          Para leitura patrimonial histórica real, use a evolução por snapshots.
        </div>
      </CardContent>
    </Card>
  );
}
