// SPRINT 5: Heat Map de Performance Mensal (estilo GitHub)
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

/**
 * Retorna cor CSS baseada no retorno percentual
 */
function getHeatColor(returnPct: number): string {
  // Verde para positivo, vermelho para negativo, cinza para zero
  if (returnPct > 10) return 'bg-green-700 hover:bg-green-800';
  if (returnPct > 5) return 'bg-green-600 hover:bg-green-700';
  if (returnPct > 2) return 'bg-green-400 hover:bg-green-500';
  if (returnPct > 0) return 'bg-green-200 hover:bg-green-300';
  if (returnPct === 0) return 'bg-gray-200 hover:bg-gray-300';
  if (returnPct > -2) return 'bg-red-200 hover:bg-red-300';
  if (returnPct > -5) return 'bg-red-400 hover:bg-red-500';
  if (returnPct > -10) return 'bg-red-600 hover:bg-red-700';
  return 'bg-red-700 hover:bg-red-800';
}

/**
 * Retorna descrição textual da performance
 */
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

export function PerformanceHeatMap() {
  const monthlyReturns = useMonthlyReturns();

  // Calcular estatísticas
  const avgReturn = monthlyReturns.reduce((sum, m) => sum + m.return, 0) / monthlyReturns.length;
  const bestMonth = monthlyReturns.reduce((best, m) => (m.return > best.return ? m : best), monthlyReturns[0] || { return: 0, month: '' });
  const worstMonth = monthlyReturns.reduce((worst, m) => (m.return < worst.return ? m : worst), monthlyReturns[0] || { return: 0, month: '' });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Performance Mensal (12 meses)
          </CardTitle>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Visualização estilo GitHub mostrando o retorno mensal do portfólio.
                  Verde = ganho, Vermelho = perda, Cinza = neutro.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent>
        {/* Heat Map Grid */}
        <div className="mb-6">
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {monthlyReturns.map((month, index) => (
              <TooltipProvider key={month.date.toISOString()}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        type: 'spring',
                      }}
                      className={cn(
                        'aspect-square rounded-md transition-all cursor-pointer',
                        'border border-transparent hover:border-gray-400 hover:scale-110',
                        getHeatColor(month.return)
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border border-gray-200 shadow-lg">
                    <div className="text-center space-y-1 p-1">
                      <p className="font-semibold text-gray-900">{month.month}</p>
                      <p
                        className={cn(
                          'text-lg font-bold',
                          month.return >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {month.return >= 0 ? '+' : ''}
                        {month.return.toFixed(2)}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(month.value)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getPerformanceLabel(month.return)}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Legenda de Cores */}
        <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground mb-6">
          <span>Menos</span>
          <div className="w-4 h-4 bg-red-700 rounded border border-gray-300" />
          <div className="w-4 h-4 bg-red-400 rounded border border-gray-300" />
          <div className="w-4 h-4 bg-red-200 rounded border border-gray-300" />
          <div className="w-4 h-4 bg-gray-200 rounded border border-gray-300" />
          <div className="w-4 h-4 bg-green-200 rounded border border-gray-300" />
          <div className="w-4 h-4 bg-green-400 rounded border border-gray-300" />
          <div className="w-4 h-4 bg-green-700 rounded border border-gray-300" />
          <span>Mais</span>
        </div>

        {/* Estatísticas Resumidas */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Retorno Médio</p>
            <p
              className={cn(
                'text-lg font-bold',
                avgReturn >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {avgReturn >= 0 ? '+' : ''}
              {avgReturn.toFixed(2)}%
            </p>
          </div>

          <div className="text-center border-l border-r border-gray-300">
            <p className="text-xs text-muted-foreground mb-1">Melhor Mês</p>
            <p className="text-lg font-bold text-green-600">
              +{bestMonth.return.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">{bestMonth.month}</p>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Pior Mês</p>
            <p className="text-lg font-bold text-red-600">
              {worstMonth.return.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">{worstMonth.month}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
