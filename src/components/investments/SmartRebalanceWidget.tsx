// SPRINT 4 DIA 2: Smart Rebalance Widget
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

interface SmartRebalanceWidgetProps {
  investments: Investment[];
}

export function SmartRebalanceWidget({ investments }: SmartRebalanceWidgetProps) {
  const { targets, loading: targetsLoading, setDefaultTargets, totalAllocated } = useAllocationTargets();
  const metrics = usePortfolioMetrics(investments);

  // Calcular ações de rebalanceamento
  const { actions, isBalanced } = useMemo(() => {
    if (targets.length === 0 || metrics.currentValue === 0) {
      return { actions: [], isBalanced: false };
    }

    // Converter allocation do metrics para o formato esperado
    const currentAllocation = Object.entries(metrics.allocation).map(([assetClass, data]) => ({
      assetClass,
      percentage: data.percentage,
      value: data.value,
    }));

    const rebalanceActions = calculateRebalancing(
      currentAllocation,
      targets,
      metrics.currentValue,
      5 // threshold 5%
    );

    const balanced = isPortfolioBalanced(currentAllocation, targets, 5);

    return { actions: rebalanceActions, isBalanced: balanced };
  }, [targets, metrics]);

  if (targetsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Rebalanceamento Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se não tem metas, sugerir criar
  if (targets.length === 0) {
    return (
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Rebalanceamento Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="p-4 bg-purple-100 rounded-full mb-4">
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Configure suas metas de alocação</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Defina quanto deseja alocar em cada classe de ativo e receba sugestões automáticas de rebalanceamento.
            </p>
            <Button onClick={setDefaultTargets} className="bg-purple-600 hover:bg-purple-700">
              Usar Metas Padrão
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Validar soma das metas
  if (totalAllocated !== 100) {
    return (
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-600" />
            Rebalanceamento Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <p className="text-amber-600 font-medium mb-2">
              A soma das metas deve ser 100%
            </p>
            <p className="text-sm text-muted-foreground">
              Atualmente: {totalAllocated.toFixed(1)}%
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Portfólio balanceado
  if (isBalanced) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Rebalanceamento Inteligente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="p-4 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                ✅ Portfólio Balanceado!
              </h3>
              <p className="text-sm text-green-700">
                Sua alocação está dentro das metas estabelecidas.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Mostrar ações de rebalanceamento
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Rebalanceamento Sugerido
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
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
                  className={`p-4 rounded-lg border-l-4 ${
                    action.action === 'BUY'
                      ? 'border-l-green-500 bg-green-50'
                      : 'border-l-red-500 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`p-2 rounded-lg ${
                          action.action === 'BUY' ? 'bg-green-100' : 'bg-red-100'
                        }`}
                      >
                        {action.action === 'BUY' ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{action.assetClass}</h4>
                          <Badge
                            variant="outline"
                            className={
                              action.action === 'BUY'
                                ? 'bg-green-100 text-green-700 border-green-300'
                                : 'bg-red-100 text-red-700 border-red-300'
                            }
                          >
                            {action.action === 'BUY' ? 'COMPRAR' : 'VENDER'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{action.reason}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium">
                              {action.currentPercentage.toFixed(1)}% → {action.targetPercentage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress
                            value={(action.currentPercentage / action.targetPercentage) * 100}
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
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

          <div className="mt-6 flex gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
            <Lightbulb className="h-5 w-5 flex-shrink-0 text-purple-500" />
            <p className="text-sm text-purple-900">
              <strong>Dica:</strong> Estas são sugestões baseadas nas suas metas. Analise cada ação antes de executar.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
