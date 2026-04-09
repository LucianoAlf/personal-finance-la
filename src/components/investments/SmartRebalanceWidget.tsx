import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, TrendingDown, CheckCircle2, Settings, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAllocationTargets } from '@/hooks/useAllocationTargets';
import { usePortfolioMetrics } from '@/hooks/usePortfolioMetrics';
import { calculateRebalancing, isPortfolioBalanced } from '@/utils/smartRebalance';
import { formatCurrency } from '@/utils/formatters';
import type { Investment } from '@/types/database.types';
import { cn } from '@/lib/utils';

interface SmartRebalanceWidgetProps {
  investments: Investment[];
}

const shellClassName =
  'rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]';

export function SmartRebalanceWidget({ investments }: SmartRebalanceWidgetProps) {
  const { targets, loading: targetsLoading, setDefaultTargets, totalAllocated } = useAllocationTargets();
  const metrics = usePortfolioMetrics(investments);

  const { actions, isBalanced } = useMemo(() => {
    if (targets.length === 0 || metrics.currentValue === 0) {
      return { actions: [], isBalanced: false };
    }

    const currentAllocation = Object.entries(metrics.allocation).map(([assetClass, data]) => ({
      assetClass,
      percentage: data.percentage,
      value: data.value,
    }));

    const rebalanceActions = calculateRebalancing(currentAllocation, targets, metrics.currentValue, 5);
    const balanced = isPortfolioBalanced(currentAllocation, targets, 5);

    return { actions: rebalanceActions, isBalanced: balanced };
  }, [targets, metrics]);

  if (targetsLoading) {
    return (
      <Card className={shellClassName}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Target className="h-5 w-5 text-purple-500" />
            Rebalanceamento Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface-elevated/35 py-10 text-muted-foreground">
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (targets.length === 0) {
    return (
      <Card className={shellClassName}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Target className="h-5 w-5 text-purple-500" />
            Rebalanceamento Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface-elevated/35 px-4 py-10 text-center">
            <div className="mb-4 rounded-full border border-border/60 bg-surface/80 p-4">
              <Settings className="h-8 w-8 text-purple-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
              Configure suas metas de alocação
            </h3>
            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
              Defina quanto deseja alocar em cada classe de ativo e receba sugestões automáticas de
              rebalanceamento.
            </p>
            <Button onClick={setDefaultTargets} className="rounded-full bg-purple-500 hover:bg-purple-600">
              Usar metas padrão
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalAllocated !== 100) {
    return (
      <Card className={shellClassName}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Target className="h-5 w-5 text-amber-500" />
            Rebalanceamento Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface-elevated/35 px-4 py-10 text-center">
            <p className="mb-2 font-medium text-amber-500">A soma das metas deve ser 100%</p>
            <p className="text-sm text-muted-foreground">Atualmente: {totalAllocated.toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isBalanced) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className={cn(shellClassName, 'border-emerald-500/20')}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Target className="h-5 w-5 text-emerald-500" />
              Rebalanceamento Inteligente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-4 py-10 text-center">
              <div className="mb-4 rounded-full border border-emerald-500/20 bg-emerald-500/10 p-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-emerald-500">
                Portfólio balanceado
              </h3>
              <p className="text-sm text-muted-foreground">
                Sua alocação está dentro das metas estabelecidas.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className={shellClassName}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Target className="h-5 w-5 text-purple-500" />
            Rebalanceamento Sugerido
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ajuste seu portfólio para atingir as metas estabelecidas
          </p>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {actions.map((action, index) => (
                <motion.div
                  key={action.assetClass}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    'rounded-2xl border border-border/60 p-4',
                    action.action === 'BUY'
                      ? 'border-l-4 border-l-emerald-500 bg-emerald-500/10'
                      : 'border-l-4 border-l-rose-500 bg-rose-500/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div
                        className={cn(
                          'rounded-2xl border border-border/60 p-2.5',
                          action.action === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        )}
                      >
                        {action.action === 'BUY' ? (
                          <TrendingUp className="h-5 w-5" />
                        ) : (
                          <TrendingDown className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold tracking-tight text-foreground">
                            {action.assetClass}
                          </h4>
                          <Badge
                            variant="outline"
                            className={cn(
                              'rounded-full border px-2.5 py-1 text-xs font-medium',
                              action.action === 'BUY'
                                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                            )}
                          >
                            {action.action === 'BUY' ? 'Comprar' : 'Vender'}
                          </Badge>
                        </div>
                        <p className="mb-3 text-sm leading-6 text-muted-foreground">{action.reason}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium text-foreground">
                              {action.currentPercentage.toFixed(1)}% → {action.targetPercentage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min((action.currentPercentage / action.targetPercentage) * 100, 100)}
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold tracking-tight text-purple-500">
                        {formatCurrency(action.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {action.percentage.toFixed(1)}% de ajuste
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>

          <div className="mt-6 flex gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
            <Lightbulb className="h-5 w-5 flex-shrink-0 text-purple-500" />
            <p className="text-sm text-foreground/90">
              <strong className="text-foreground">Dica:</strong> estas são sugestões baseadas nas suas metas.
              Analise cada ação antes de executar.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
