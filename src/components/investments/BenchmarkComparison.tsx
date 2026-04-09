import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { BarChart2, TrendingUp, TrendingDown, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBenchmarks, getBenchmarkDescription } from '@/hooks/useBenchmarks';
import { usePortfolioReturn } from '@/hooks/useMonthlyReturns';
import { cn } from '@/lib/utils';

type Period = '1M' | '3M' | '6M' | '1Y';

const PERIOD_LABELS: Record<Period, string> = {
  '1M': '1 mês',
  '3M': '3 meses',
  '6M': '6 meses',
  '1Y': '1 ano',
};

const shellClassName =
  'rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]';

export function BenchmarkComparison() {
  const [period, setPeriod] = useState<Period>('1Y');
  const [isExpanded, setIsExpanded] = useState(false);

  const portfolioReturn = usePortfolioReturn(period);
  const benchmarks = useBenchmarks(period);

  return (
    <Card className={shellClassName}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <BarChart2 className="h-5 w-5 text-purple-500" />
            Comparação com benchmarks
          </CardTitle>

          <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <SelectTrigger className="w-full rounded-xl border-border/70 bg-surface/80 lg:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1M">{PERIOD_LABELS['1M']}</SelectItem>
              <SelectItem value="3M">{PERIOD_LABELS['3M']}</SelectItem>
              <SelectItem value="6M">{PERIOD_LABELS['6M']}</SelectItem>
              <SelectItem value="1Y">{PERIOD_LABELS['1Y']}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-surface-elevated/45 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border/60 bg-surface/80 p-2.5">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Seu portfólio</p>
              <p
                className={cn(
                  'text-2xl font-semibold tracking-tight',
                  portfolioReturn >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500'
                )}
              >
                {portfolioReturn >= 0 ? '+' : ''}
                {portfolioReturn.toFixed(2)}%
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              portfolioReturn >= 0
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
            )}
          >
            {portfolioReturn >= 0 ? 'Acima da média' : 'Abaixo da média'}
          </Badge>
        </motion.div>

        <div className="rounded-2xl border border-border/60 bg-surface-elevated/35 p-4 text-sm text-muted-foreground">
          A comparação usa benchmarks externos reais quando disponíveis. O retorno do portfólio ainda é
          calculado a partir do histórico interno disponível no app.
        </div>

        <Separator className="bg-border/70" />

        {benchmarks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface-elevated/35 p-4 text-sm text-muted-foreground">
            Benchmarks indisponíveis no momento. A comparação só é exibida quando a fonte real responde.
          </div>
        ) : (
          <div className="space-y-3">
            {benchmarks.map((bench, index) => {
              const diff = portfolioReturn - bench.return;
              const isWinning = diff > 0;
              const Icon = isWinning ? TrendingUp : TrendingDown;

              return (
                <motion.div
                  key={bench.name}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.08 }}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-surface-elevated/45 p-4 transition-colors hover:bg-surface-elevated/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full border border-border/60 bg-surface/80 p-2">
                      <span className="text-sm font-semibold text-muted-foreground">{bench.name}</span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Ver detalhes sobre ${bench.name}`}
                            className="rounded-full border border-border/70 bg-surface-elevated/45 p-2 text-muted-foreground transition hover:bg-surface-elevated/60 hover:text-foreground"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs rounded-2xl border border-border/70 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-xl">
                          <p className="text-sm">{getBenchmarkDescription(bench.name)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {bench.return >= 0 ? '+' : ''}
                        {bench.return.toFixed(2)}%
                      </p>
                      <p className="text-xs text-muted-foreground">{PERIOD_LABELS[period]}</p>
                    </div>
                    <Badge
                      variant={isWinning ? 'default' : 'destructive'}
                      className={cn(
                        'min-w-[96px] justify-center rounded-full px-3 py-1 text-xs font-medium',
                        isWinning
                          ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                      )}
                    >
                      <Icon className="mr-1 h-3.5 w-3.5" />
                      {Math.abs(diff).toFixed(2)}%
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2 rounded-full border border-border/60 bg-surface/70 px-4 text-muted-foreground hover:border-border/80 hover:bg-surface-elevated/55 hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Recolher informações
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Ver como interpretar
              </>
            )}
          </Button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 overflow-hidden pt-2"
            >
              <div className="rounded-2xl border border-border/60 bg-blue-500/10 p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 text-blue-500" />
                  <div>
                    <p className="mb-2 text-sm font-semibold text-foreground">Como interpretar</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>
                        <strong className="text-emerald-500">Verde (↑):</strong> seu portfólio superou o benchmark
                      </li>
                      <li>
                        <strong className="text-rose-500">Vermelho (↓):</strong> seu portfólio ficou abaixo do benchmark
                      </li>
                      <li>
                        <strong>CDI:</strong> referência para renda fixa conservadora
                      </li>
                      <li>
                        <strong>IPCA:</strong> inflação - deve sempre ser superada
                      </li>
                      <li>
                        <strong>IBOVESPA:</strong> referência para ações nacionais
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {portfolioReturn > 0 ? (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"
                >
                  <p className="text-sm text-foreground">
                    <strong className="text-emerald-500">✓ Performance positiva!</strong> Seu portfólio teve
                    retorno de <strong>{portfolioReturn.toFixed(2)}%</strong> em {PERIOD_LABELS[period].toLowerCase()}.
                  </p>
                </motion.div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
