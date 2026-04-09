import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, Info, TrendingUp } from 'lucide-react';

import { useInvestments } from '@/hooks/useInvestments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  calculateDiversificationScore,
  getDiversificationLabel,
  getMaxPoints,
  getScoreColor,
  getScoreDescription,
  type DiversificationBreakdown,
} from '@/utils/diversificationScore';
import type { Investment } from '@/types/database.types';

interface DiversificationScoreCardProps {
  investments?: Investment[];
}

const panelClassName =
  'overflow-hidden border-border/70 bg-card/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]';

const breakdownSurfaceClassName = 'rounded-2xl border border-border/70 bg-surface/55 p-4';

export function DiversificationScoreCard({
  investments: providedInvestments,
}: DiversificationScoreCardProps) {
  const { investments: fetchedInvestments } = useInvestments();
  const investments = providedInvestments ?? fetchedInvestments;
  const [isExpanded, setIsExpanded] = useState(false);

  const { score, breakdown, recommendations, details } = useMemo(
    () => calculateDiversificationScore(investments),
    [investments]
  );

  const scoreColor = getScoreColor(score);
  const scoreDescription = getScoreDescription(score);

  return (
    <Card className={panelClassName}>
      <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/8 via-card to-card pb-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
              <TrendingUp className="h-5 w-5" />
            </span>
            Pontuação de Diversificação
          </CardTitle>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-surface/85 text-muted-foreground shadow-sm transition hover:bg-surface-elevated hover:text-foreground"
                  aria-label="Entenda como o score é calculado"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm rounded-2xl border border-border/70 bg-card/95 p-4 text-sm shadow-[0_18px_44px_rgba(15,23,42,0.16)]">
                Score calculado com base em 4 critérios: diversificação de classes,
                concentração de ativos, número de investimentos e exposição geográfica.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="grid gap-5 lg:grid-cols-[minmax(0,220px),1fr]"
        >
          <div className="rounded-[1.75rem] border border-border/70 bg-surface/55 p-6 text-center">
            <div className={`mb-2 text-5xl font-semibold tracking-tight ${scoreColor}`}>{score}</div>
            <p className="text-sm text-muted-foreground">de 100</p>
            <Badge variant="outline" className="mt-4 rounded-full px-3 py-1 text-xs font-semibold">
              {scoreDescription}
            </Badge>
          </div>

          <div className="space-y-4">
            {(Object.entries(breakdown) as [keyof DiversificationBreakdown, number][]).map(
              ([key, value], index) => {
                const label = getDiversificationLabel(key);
                const maxValue = getMaxPoints(key);
                const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

                return (
                  <motion.div
                    key={key}
                    initial={{ x: -18, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.28, delay: index * 0.05 }}
                    className={breakdownSurfaceClassName}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      <span className="text-sm font-semibold text-primary">
                        {Math.round(value)}/{maxValue}
                      </span>
                    </div>

                    <Progress value={percentage} className="h-2.5" />
                  </motion.div>
                );
              }
            )}
          </div>
        </motion.div>

        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((current) => !current)}
            className="gap-2 rounded-full border border-border/70 bg-surface/85 px-4 text-sm font-semibold text-primary shadow-sm hover:bg-surface-elevated"
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

        <AnimatePresence>
          {isExpanded ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className={breakdownSurfaceClassName}>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Classes de Ativos
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{details.totalClasses}</p>
                </div>
                <div className={breakdownSurfaceClassName}>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Total de Ativos
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{details.totalAssets}</p>
                </div>
                <div className={breakdownSurfaceClassName}>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Concentração Máx.
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {details.maxConcentration.toFixed(1)}%
                  </p>
                </div>
                <div className={breakdownSurfaceClassName}>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Internacional
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {details.hasInternational ? 'Sim ✓' : 'Não'}
                  </p>
                </div>
              </div>

              {recommendations.length > 0 ? (
                <motion.div
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-[1.45rem] border border-amber-500/25 bg-amber-500/10 p-5"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300">
                      <AlertTriangle className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Recomendações</p>
                      <p className="text-sm text-muted-foreground">
                        Siga estas dicas para melhorar sua diversificação.
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {recommendations.map((recommendation, index) => (
                      <motion.li
                        key={recommendation}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.22, delay: index * 0.04 }}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>{recommendation}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ) : null}

              {recommendations.length === 0 && score >= 80 ? (
                <motion.div
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-[1.45rem] border border-emerald-500/25 bg-emerald-500/10 p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                      <TrendingUp className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Parabéns! Portfólio bem diversificado
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Seu portfólio apresenta excelente diversificação. Continue monitorando e
                        rebalanceando conforme necessário.
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
