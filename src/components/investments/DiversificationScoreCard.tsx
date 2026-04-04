// SPRINT 5: Card de Pontuação de Diversificação
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  calculateDiversificationScore,
  getDiversificationLabel,
  getMaxPoints,
  getScoreColor,
  getScoreDescription,
  type DiversificationBreakdown,
} from '@/utils/diversificationScore';
import { useInvestments } from '@/hooks/useInvestments';

export function DiversificationScoreCard() {
  const { investments } = useInvestments();
  const [isExpanded, setIsExpanded] = useState(false);

  const { score, breakdown, recommendations, details } = useMemo(
    () => calculateDiversificationScore(investments),
    [investments]
  );

  const scoreColor = getScoreColor(score);
  const scoreDescription = getScoreDescription(score);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Pontuação de Diversificação
          </CardTitle>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Score calculado com base em 4 critérios: diversificação de classes,
                  concentração de ativos, número de investimentos e exposição geográfica.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Score Principal */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="text-center mb-6"
        >
          <div className={`text-6xl font-bold ${scoreColor} mb-2`}>{score}</div>
          <p className="text-lg text-muted-foreground">de 100</p>
          <Badge
            variant="outline"
            className="mt-2 text-sm"
          >
            {scoreDescription}
          </Badge>
        </motion.div>

        {/* Breakdown dos Critérios - Sempre visível */}
        <div className="space-y-4 mb-6">
          {(Object.entries(breakdown) as [keyof DiversificationBreakdown, number][]).map(
            ([key, value], index) => {
              const label = getDiversificationLabel(key);
              const maxValue = getMaxPoints(key);
              const percentage = (value / maxValue) * 100;

              return (
                <motion.div
                  key={key}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    <span className="text-sm font-bold text-purple-600">
                      {Math.round(value)}/{maxValue}
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className="h-2"
                  />
                </motion.div>
              );
            }
          )}
        </div>

        {/* Botão Expandir/Recolher */}
        <div className="flex justify-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Recolher detalhes
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Ver detalhes completos
              </>
            )}
          </Button>
        </div>

        {/* Detalhes e Recomendações - Colapsável */}
        <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Classes de Ativos</p>
            <p className="text-lg font-semibold">{details.totalClasses}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total de Ativos</p>
            <p className="text-lg font-semibold">{details.totalAssets}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Concentração Máx.</p>
            <p className="text-lg font-semibold">{details.maxConcentration.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Internacional</p>
            <p className="text-lg font-semibold">
              {details.hasInternational ? 'Sim ✓' : 'Não'}
            </p>
          </div>
        </div>

        {/* Recomendações */}
        {recommendations.length > 0 ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-lg"
          >
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">Recomendações</p>
                <p className="text-xs text-amber-700">
                  Siga estas dicas para melhorar sua diversificação
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {recommendations.map((rec, i) => (
                <motion.li
                  key={i}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
                  className="text-sm text-amber-900 flex items-start gap-2"
                >
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{rec}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : score >= 80 ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="p-4 bg-green-50 border-l-4 border-green-400 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900 text-sm">
                  Parabéns! Portfólio bem diversificado
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Seu portfólio apresenta excelente diversificação. Continue monitorando
                  e rebalanceando conforme necessário.
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
          </motion.div>
        )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
