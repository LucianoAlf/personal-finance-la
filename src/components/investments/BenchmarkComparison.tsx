// SPRINT 5: Comparação de Performance vs Benchmarks
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
import { useBenchmarks, getBenchmarkDescription, type Benchmark } from '@/hooks/useBenchmarks';
import { usePortfolioReturn } from '@/hooks/useMonthlyReturns';
import { cn } from '@/lib/utils';

type Period = '1M' | '3M' | '6M' | '1Y';

const PERIOD_LABELS: Record<Period, string> = {
  '1M': '1 mês',
  '3M': '3 meses',
  '6M': '6 meses',
  '1Y': '1 ano',
};

export function BenchmarkComparison() {
  const [period, setPeriod] = useState<Period>('1Y');
  const [isExpanded, setIsExpanded] = useState(false);

  const portfolioReturn = usePortfolioReturn(period);
  const benchmarks = useBenchmarks(period);
  const inflationBenchmark = benchmarks.find((b) => b.name === 'IPCA');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-purple-600" />
            Performance vs Benchmarks
          </CardTitle>

          {/* Selector de Período */}
          <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <SelectTrigger className="w-[120px]">
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

      <CardContent>
        {/* Seu Portfólio */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg mb-4"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span className="font-semibold text-gray-900">Seu Portfólio</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-2xl font-bold',
                portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {portfolioReturn >= 0 ? '+' : ''}
              {portfolioReturn.toFixed(2)}%
            </span>
          </div>
        </motion.div>

        <div className="mb-4 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          A comparação usa benchmarks externos reais quando disponíveis. O retorno do portfólio ainda é
          calculado a partir do histórico interno disponível no app.
        </div>

        <Separator className="my-4" />

        {/* Benchmarks */}
        {benchmarks.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Benchmarks indisponíveis no momento. A comparação só é exibida quando a fonte real responde.
          </div>
        ) : (
          <div className="space-y-3">
            {benchmarks.map((bench, index) => {
              const diff = portfolioReturn - bench.return;
              const isWinning = diff > 0;
              const icon = isWinning ? TrendingUp : TrendingDown;
              const Icon = icon;

              return (
                <motion.div
                  key={bench.name}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{bench.name}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">{getBenchmarkDescription(bench.name)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      {bench.return >= 0 ? '+' : ''}
                      {bench.return.toFixed(2)}%
                    </span>

                    <Badge
                      variant={isWinning ? 'default' : 'destructive'}
                      className="min-w-[80px] justify-center"
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {Math.abs(diff).toFixed(2)}%
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Botão Expandir/Recolher */}
        <div className="flex justify-center mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
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

        {/* Legenda/Info e Análise - Colapsável */}
        <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 mt-6"
          >
        <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Como interpretar:
              </p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>
                  • <strong>Verde (↑):</strong> Seu portfólio superou o benchmark
                </li>
                <li>
                  • <strong>Vermelho (↓):</strong> Seu portfólio ficou abaixo do benchmark
                </li>
                <li>
                  • <strong>CDI:</strong> Referência para renda fixa conservadora
                </li>
                <li>
                  • <strong>IPCA:</strong> Inflação - deve sempre superar
                </li>
                <li>
                  • <strong>IBOVESPA:</strong> Referência para ações nacionais
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Análise Rápida */}
        {portfolioReturn > 0 ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mt-4 p-3 bg-green-50 rounded-lg"
          >
            <p className="text-sm text-green-900">
              <strong>✓ Performance positiva!</strong> Seu portfólio teve retorno de{' '}
              <strong>{portfolioReturn.toFixed(2)}%</strong> em {PERIOD_LABELS[period].toLowerCase()}.
              {inflationBenchmark && portfolioReturn > inflationBenchmark.return &&
                ' Você está vencendo a inflação!'}
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
